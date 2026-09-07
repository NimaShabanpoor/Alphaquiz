# Sicherheit und Hosting

## Betriebsmodell

AlphaQuiz verwendet ein Einzeladmin-Modell. In Produktion muss
`ADMIN_EMAIL` exakt der E-Mail-Adresse des in Supabase Auth angelegten
Administrators entsprechen. Alle Admin-Seiten und schreibenden Admin-APIs
prüfen zusätzlich zum Login eine serverseitig verifizierte Supabase-Sitzung.

Öffentliche Prüfungslinks laufen über `/exam/[slug]`. Beim Start erzeugt der
Server eine unveränderliche Prüfungsinstanz. Der Browser erhält keine
richtigen Antworten und keine vollständige Zufallskonfiguration. Antworten,
Regelverstösse und Resultate werden serverseitig in Supabase gespeichert und
ausgewertet.

## Erforderliche Einrichtung

1. Bei einer neuen, leeren Installation das Projekt mit der Supabase CLI
   verknüpfen und `supabase db push` ausführen. Alternativ kann
   `npm run db:setup` die Migrationen gegen eine ausdrücklich konfigurierte,
   leere PostgreSQL-Datenbank anwenden.
2. Die bereits verifizierte Dev-Datenbank entspricht der Baseline. Nach
   `supabase migration list` wird diese einmalig mit
   `supabase migration repair 00000000000000 --status applied` als angewendet
   registriert; die Baseline wird dort nicht erneut ausgeführt.
3. `supabase/migrations/` ist die einzige Quelle des Schemas. Jede Änderung
   wird als neue Migration versioniert, zuerst gegen eine leere
   Wegwerf-Datenbank geprüft und danach mit `supabase db push` ausgerollt.
   Schemaänderungen im SQL Editor oder Table Editor sind nicht erlaubt.
4. In Supabase Auth genau das Admin-Konto anlegen.
5. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `APP_ORIGIN`
   und `RATE_LIMIT_SECRET` setzen. `APP_ORIGIN` ist in Produktion die feste
   HTTPS-Adresse ohne Pfad oder abschliessenden Schrägstrich.
6. Optional `RESEND_API_KEY` und `RESEND_FROM_EMAIL` setzen.

## Auth-URL und Redirect-Allow-List

In Supabase unter **Authentication → URL Configuration** gelten exakt diese
Werte:

- **Site URL:** derselbe Wert wie `APP_ORIGIN`.
- **Redirect URLs:** `${APP_ORIGIN}/login`.
- Für die lokale Entwicklung zusätzlich `http://localhost:3000/login`.

Keine Wildcards für Produktionsdomains eintragen. Preview-Deployments erhalten
entweder ein separates Supabase-Projekt oder werden einzeln freigeschaltet.
Passwort-Links verwenden nie `Host`, `Origin` oder andere vom Request
beeinflussbare Header, sondern ausschliesslich `APP_ORIGIN`.

Der Service-Role-Key darf niemals mit `NEXT_PUBLIC_` beginnen und gehört nur
in die Server-Umgebung.

`RATE_LIMIT_SECRET` muss mindestens 32 zufällige Bytes enthalten und darf
ebenfalls nie an den Browser gelangen. Die Drosselungszähler liegen in der
nicht über PostgREST erreichbaren Datenbankstruktur `private`. Für Hostpoint
darf `TRUSTED_PROXY_HEADER` nur gesetzt werden, wenn der vorgeschaltete Proxy
eingehende gleichnamige Client-Header entfernt. Vercel wird automatisch über
`x-vercel-forwarded-for` erkannt.

Admin-Sitzungen werden durch `@supabase/ssr` in Supabase-eigenen Cookies
verwaltet und automatisch erneuert. `src/proxy.ts` führt ausschliesslich einen
optimistischen UX-Redirect aus. Autorisierung erfolgt in jedem geschützten
Route Handler erneut über `auth.getUser()` und `requireAdmin()`.

## Datenpfad und Service Role

Supabase ist die Quelle der Wahrheit für Kategorien, Unterkategorien, Fragen,
Quizzes, Exporte und Prüfungsdaten. `localStorage` enthält ausschliesslich den
letzten erfolgreich aus Supabase geladenen oder dort gespeicherten Stand als
temporären Anzeigecache. Ein leerer Datenbankstand bleibt leer und wird nicht
durch lokale Beispieldaten überschrieben. Ist Supabase nicht erreichbar, wird
der Cache ausschliesslich im Nur-Lese-Modus angezeigt und niemals automatisch
zurück in die Datenbank geschrieben.

Alle angemeldeten Admin-Zugriffe verwenden den request-scoped Supabase-Client
aus `requireAdmin()`. Dadurch wird die Benutzer-Session an PostgreSQL
weitergereicht und die RLS-Ownership-Policy ausgewertet. `user_id` wird für
direkt verwaltete Tabellen serverseitig aus `auth.getUser()` gesetzt.

Der Service-Role-Client verbleibt ausschliesslich in diesen öffentlichen
Prüfungsendpunkten:

- `GET/POST /api/public/exams/[slug]`: Teilnehmende besitzen bewusst kein
  Supabase-Konto. Der Server muss die nicht öffentlich lesbaren Prüfungsdaten
  laden und nach Eingabe von Name und E-Mail einen Versuch anlegen.
- `GET/PATCH/POST /api/public/exam-attempts/[attemptId]`: Der Zugriff wird mit
  einem zufälligen, nur gehasht gespeicherten Versuchstoken autorisiert. Der
  Server benötigt anschliessend Zugriff auf die RLS-geschützte Instanz, ohne
  dem Browser Tabellenrechte oder den Service-Role-Key zu geben.

In Admin-Endpunkten ist die Verwendung des Service-Role-Clients nicht erlaubt.

## Vercel

Das Projekt kann als normales Next.js-Projekt importiert werden. Die
Umgebungsvariablen werden in den Vercel-Projekteinstellungen gesetzt. Für
geschäftliche Nutzung müssen die Vertrags- und Datenschutzbedingungen des
gewählten Vercel-Tarifs separat geprüft werden.

Vor der Freigabe müssen Produktions-, Preview- und Entwicklungsvariablen
getrennt gesetzt sein. Preview-Deployments dürfen weder den produktiven
Service-Role-Key noch echte Prüfungsdaten erhalten.

Ein Push auf `main` erzeugt durch die Vercel-Git-Integration wieder ein
Production-Deployment, auch wenn der bisherige Projekt-Alias entfernt wurde.
Vor der echten Freigabe müssen deshalb zuerst alle erforderlichen
Production-Environment-Variablen gesetzt und geprüft sein. Das Entfernen eines
Alias deaktiviert die Git-Integration nicht. Änderungen vor der Freigabe über
einen separaten Branch als Preview prüfen.

## Hostpoint

Die App erzeugt mit `output: "standalone"` einen portablen Node.js-Server.
Für Hostpoint ist ein Angebot mit Node.js-Unterstützung und dauerhaftem
Prozess nötig. Nach dem Build werden `.next/standalone`, `.next/static` und
`public` bereitgestellt. Der Health-Check ist unter `/api/health` verfügbar.

## Supabase Free

Der Free-Tarif eignet sich für Entwicklung und kleine Tests. Backups müssen
regelmässig ausserhalb von Supabase erstellt und verschlüsselt aufbewahrt
werden. Für einen produktiven Prüfungsbetrieb sind Speicher-, Log-, Backup-
und Verfügbarkeitsgrenzen vor dem Start erneut zu prüfen.

## Datenschutz-Betrieb

- Nur notwendige Namen, E-Mail-Adressen, Antworten und Resultate erfassen.
- In einer Datenschutzerklärung Zweck, Rechtsgrundlage, Empfänger,
  Aufbewahrungsfrist und Betroffenenrechte beschreiben.
- Mit Supabase, Hosting- und E-Mail-Anbieter die erforderlichen
  Auftragsbearbeitungsvereinbarungen abschliessen.
- Resultate nach der festgelegten Frist löschen oder anonymisieren.
- Keine echten Prüfungsdaten in Demo-, Preview- oder Entwicklungsumgebungen
  kopieren.

## Sicherheitsbetrieb vor Produktivstart

- Die CSP wird zunächst als `Content-Security-Policy-Report-Only` ausgeliefert.
  Meldungen in Browser- und Hosting-Logs prüfen, notwendige Quellen eng
  ergänzen und die Richtlinie erst danach auf `Content-Security-Policy`
  umstellen. `unsafe-inline` soll in einem separaten Schritt durch Nonces
  ersetzt werden.
- Supabase MFA für das Admin-Konto aktivieren, Service-Role-, Datenbank-,
  Resend- und Rate-Limit-Schlüssel regelmässig rotieren.
- Mit Supabase, Vercel/Hostpoint und Resend Auftragsbearbeitungsverträge sowie
  Region, Unterauftragsbearbeiter und Löschfristen dokumentieren.
- Eine feste Löschfrist für Namen, E-Mail-Adressen, Antworten, Ereignisse und
  Resultate definieren. Löschung und Auskunft vor Produktivstart als
  administrativen Prozess testen.
- Verschlüsselte Backups erstellen und eine Wiederherstellung in einer
  getrennten Umgebung testen. Ein Backup gilt erst nach erfolgreichem Restore
  als geprüft.
- Sicherheitsvorfälle mit Zeitpunkt, betroffenen Daten, Massnahmen und
  Meldeentscheid dokumentieren. Secrets bei Verdacht sofort widerrufen.
- Imports bleiben trotz Signatur-, Grössen- und Strukturprüfung nicht
  virengeprüft. Dateien nur von vertrauenswürdigen Lehrpersonen annehmen und
  bei erweitertem Nutzerkreis einen Malware-Scanner vorsehen.

## Automatische Prüfungen

Der Workflow `.github/workflows/ci.yml` führt bei Pushes und Pull Requests
Installation aus dem Lockfile, Produktions-Audit, Linter, Tests, Typecheck und
Build aus. Dependabot prüft npm- und GitHub-Actions-Abhängigkeiten wöchentlich.
Ein roter Workflow darf nicht produktiv ausgerollt werden.

Die technischen Massnahmen unterstützen den sicheren Betrieb, ersetzen aber
keine rechtliche Prüfung für den konkreten Einsatz.
