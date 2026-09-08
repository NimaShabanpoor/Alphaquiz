# Datenschutz-Nacharbeiten

## studentKey und Prüfungs-Snapshots

Die neue Migration `20260907000000_remove_snapshot_identity.sql` entfernt
`exam_instances.studentKey` sowie die strukturierten Wurzelfelder `studentKey`,
`name` und `email` aus bestehenden Snapshots. Ein Check verhindert ihre erneute
Speicherung. Die Baseline bleibt unverändert.

`readExamSnapshot` validiert gespeicherte Instanzen und reduziert jedes
strukturierte Objekt auf erlaubte Felder. Generierung und Wiederholung verwenden
dieselbe Reduktion. Prüfungsinhalt, Bewertung, Fragen- und Antwortreihenfolge
bleiben erhalten. Freitext in Fragen oder Bildern wird nicht auf Personendaten
untersucht; dies ist keine allgemeine Anonymisierung von Unterrichtsinhalten.

Die CI-Migrationsprüfung legt vor der neuen Migration einen synthetischen alten
Snapshot an und prüft danach Bereinigung, Inhaltserhalt, Spaltenentfernung und
die Zurückweisung erneuter Identitätsfelder. Sie verwendet ausschliesslich die
lokale Wegwerf-Datenbank. Unit-Tests prüfen Lesen und Wiederholen alter Snapshots
einschliesslich unveränderter Bewertung.

Migration und Anwendung müssen koordiniert ausgerollt werden: alte Writer mit
`studentKey` funktionieren nach der Migration nicht mehr. Die neue Anwendung
kann vor der Migration wegen der alten NOT-NULL-Spalte keine Instanz anlegen.
Die echte Dev-Datenbank wird durch diese Codeänderung nicht automatisch verändert.
F5 und `candidate_identities` bleiben bis zur Produktentscheidung offen.

## Öffentlicher Einstieg

Die Startseite zeigt ohne Sitzung nur den Hinweis auf den Prüfungslink der
Prüfungsleitung. Ohne Supabase-Sitzungscookie wird kein Supabase-Client
initialisiert. Bei vorhandenen Sitzungscookies wird die Adminberechtigung
serverseitig geprüft; nur berechtigte Admins erhalten das bisherige Dashboard.
Öffentliche Seiten binden den Admin-Datenprovider nicht ein.

Unbekannte öffentliche Pfade haben eine eigene neutrale Fehlerseite. Der
öffentliche Prüfungsendpunkt beantwortet unbekannte und deaktivierte Slugs
gleichermassen mit 404 und demselben Fehlertext (GET und POST). Zeitliche
Freigabegrenzen aktiver Prüfungen bleiben davon unberührt.

Die Integrationstests prüfen die anonyme Startseite, die öffentliche 404,
das Dashboard für Admins und identische GET-Antworten bei unbekannten bzw.
deaktivierten Slugs. Dies ersetzt keine visuelle Browserprüfung.

## Fehlerlogs: vollständige Liste der umgestellten Stellen

Die zentrale Funktion `src/lib/error-redaction.ts` erhält SQLSTATE-/PostgREST-
Codes und gibt sichere Diagnosemeldungen aus. Ungeprüfter Meldungstext wird
bewusst nicht erhalten: Auch `message` kann Name, E-Mail oder Zeilenwerte
enthalten. Unbekannte Codes erhalten eine generische Meldung. `details`, `hint`,
Abfragen, Ursachen und ursprüngliche Stacktraces werden nicht übernommen.

Fehlerlogs:

- `src/lib/admin-api.ts`: `databaseFailure`, `databaseReadFailure`.
- `src/lib/admin-auth.ts`: ungültige Origin-Konfiguration.
- `src/lib/rate-limit.ts`: fehlende vertrauenswürdige Herkunft und RPC-Ausfall.
- `src/app/api/admin/status/route.ts`: Abfragefehler und Catch.
- `src/app/api/import/route.ts`: Import-Catch.
- `src/app/api/exam-results/send/route.ts`: Versand-Catch.
- `src/app/api/public/exams/[slug]/route.ts`: fehlgeschlagener Versuch und Start-Catch.

Fehlerweitergabe (vor dem Werfen werden Anbieterfehler reduziert):

- `src/lib/admin-ownership.ts`: Veröffentlichung, Quiz, Versuch.
- `src/lib/admin-resource-sync.ts`: Upsert, Bestandsabfragen, Löschungen und Quiz-Verknüpfungen.
- `src/lib/admin-state.ts`: Versuche, Instanzen, Ereignisse und Gesamtzustand.
- `src/lib/exam-data.ts`: Veröffentlichung, Quiz, Verknüpfungen, Fragen, Antworten und Themen.
- `src/lib/public-exam-service.ts`: Lesen, Speichern, Abschluss und Aufsichtsereignisse.
- `src/lib/result-email.ts`: Versuchsabfrage und externe Versandantwort.
- `src/lib/rate-limit.ts`: Rate-Limit-RPC.
- `src/app/api/admin/exam-attempts/[attemptId]/reset/route.ts`: Update und Ereignis.
- `src/app/api/admin/exam-publications/[publicationId]/route.ts`: Löschung.
- `src/app/api/public/exam-attempts/[attemptId]/route.ts`: Antwortspeicherung.
- `src/app/api/public/exams/[slug]/route.ts`: Instanzspeicherung.

Die Ressourcen-Handler für Kategorien, Themen, Fragen, Quizzes, Exporte,
Veröffentlichungen, Aktivität und Gesamtzustand reichen gefangene Fehler an
`databaseFailure` bzw. `databaseReadFailure` weiter; dort wird vor jedem Log
redigiert. Die öffentlichen Antworttexte bleiben generisch.

Bewusst getrennt: feste eigene Validierungs-/Konfigurationsmeldungen sind keine
ungeprüften Anbieterfehler. Das CSP-Protokoll schreibt strukturierte,
bereits begrenzte Meldungen, keine Fehlerobjekte. Das angeforderte Löschprotokoll
enthält weiterhin Typ, Anzahl, Admin-user_id und Zeit. Bestehende Providerlogs,
Backups oder bereits aufgezeichnete Meldungen werden hierdurch nicht gelöscht.

## Konfigurierbare Aufbewahrungslöschung

Die Mechanik ist standardmässig inaktiv. Nur positive, ganze Tageswerte in den
folgenden Server-Variablen aktivieren den jeweiligen Teil:

- `EXAM_RESULT_RETENTION_DAYS`: löscht abgeschlossene `exam_attempts`, deren
  `submittedAt` vor dem Stichtag liegt. Datenbank-Cascades löschen die zugehörigen
  `exam_instances` und `exam_events`.
- `EXAM_SUPERVISION_RETENTION_DAYS`: löscht `exam_events` abgeschlossener
  Versuche vor dem Stichtag, ohne Resultat und Prüfungsinstanz zu löschen.

Fehlt eine Variable, wird ihr Teil nicht ausgeführt. Ungültige Werte führen zu
einem Fehler und aktivieren keine Löschung. Laufende Versuche und Versuche ohne
Abschlusszeit werden nie ausgewählt. Stichtage werden in
`src/lib/exam-retention-policy.ts` ohne Datenbankzugriff berechnet; nur
`src/lib/exam-retention.ts` greift auf Supabase zu und bleibt mit `server-only`
gegen die Verwendung in Client-Komponenten geschützt.

Ausgelöst wird die Löschung mit `POST /api/admin/retention` aus einer gültigen
Admin-Sitzung und mit gültigem `Origin`-Header. Es existiert bewusst weder ein
Frontend-Schalter noch ein automatischer Zeitplan. Für den späteren Betrieb muss
der Verantwortliche Fristen festlegen, die Variablen serverseitig setzen und
einen authentifizierten Auslöser planen. Der Endpunkt antwortet mit der Zahl der
gelöschten Versuche, Instanzen und Ereignisse.

Nicht erreicht werden zugestellte E-Mails, Datenbank-/Provider-Backups,
heruntergeladene Exporte sowie Kopien ausserhalb dieser Datenbank. Die separate
Aufsichtsfrist löscht die detaillierten Ereignisse, nicht den aggregierten
`violationCount` oder den Abschlussstatus im Ergebnisdatensatz; diese verschwinden
mit der Resultatfrist. Ob diese Zusammenfassung ebenfalls früher anonymisiert
werden muss, ist vor der Verarbeitung echter Schülerdaten organisatorisch zu
entscheiden.
