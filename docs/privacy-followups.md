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
