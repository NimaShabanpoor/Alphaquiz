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

1. Bei einer neuen Installation `npm run db:setup` ausführen. Das aktuelle
   `supabase/schema.sql` enthält Ownership, Indizes und Policies.
2. Bei einer bestehenden Installation die versionierten Migrationen mit der
   Supabase CLI (`supabase link`, danach `supabase db push`) anwenden. Keine
   Änderungen direkt im SQL Editor oder Table Editor vornehmen.
3. In Supabase Auth genau das Admin-Konto anlegen.
4. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` und `ADMIN_EMAIL` setzen.
5. Optional `RESEND_API_KEY` und `RESEND_FROM_EMAIL` setzen.

Der Service-Role-Key darf niemals mit `NEXT_PUBLIC_` beginnen und gehört nur
in die Server-Umgebung.

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

Die technischen Massnahmen unterstützen den sicheren Betrieb, ersetzen aber
keine rechtliche Prüfung für den konkreten Einsatz.
