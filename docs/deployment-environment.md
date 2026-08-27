# Deploy- und Umgebungsvariablen

## Node.js-Version

AlphaQuiz verwendet Node.js 22. `package.json`, `.nvmrc` und die GitHub-CI
sind auf dieselbe Hauptversion festgelegt. Lokal kann sie mit `nvm use`
aktiviert werden.

## Vollständiges Inventar

`Ja` bedeutet, dass die vollständige Anwendung in der jeweiligen Umgebung die
Variable benötigt. `Bedingt` ist bei der beschriebenen Funktion oder
Infrastruktur erforderlich. Preview darf nie dieselben geheimen Werte oder
echten Daten wie Production verwenden.

| Name | Fundstelle | Production | Preview | Development | Geheim | Verhalten ohne Wert |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/config.ts:16` | Ja | Ja, separates Projekt | Ja | Nein | Supabase-Clients können nicht erstellt werden; Login und Admin-Datenzugriff sind nicht verfügbar. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `src/lib/supabase/config.ts:17-18` | Ja | Ja, separater Key | Ja | Nein | Gleich wie bei fehlender öffentlicher Supabase-URL. |
| `APP_ORIGIN` | `src/lib/app-origin.ts:13` | Ja | Ja, exakte Preview-URL | Bedingt bei anderer URL als `http://localhost:3000` | Nein | Production/Preview lehnen sicherheitsrelevante Mutationen beziehungsweise Passwort-Redirects geschlossen ab; Development verwendet `http://localhost:3000`. |
| `SUPABASE_URL` | `src/lib/supabase-admin.ts:33`; `scripts/setup-supabase.mjs:21`; `scripts/audit-rls.mjs:59` | Ja | Ja, separates Projekt | Ja | Ja, wenn PostgreSQL-Zugangsdaten enthalten sind | Öffentliche Prüfungsendpunkte haben keinen Service-Client; `db:setup` und `db:audit-rls` brechen ohne PostgreSQL-URL ab. |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase-admin.ts:35` | Ja | Ja, separater Key | Ja | Ja | Öffentliche Prüfungsstarts und -versuche melden Supabase als nicht konfiguriert und liefern keine Prüfungsdaten. |
| `ADMIN_EMAIL` | `src/lib/admin-auth.ts:21`; `src/app/api/auth/reset/route.ts:57` | Ja | Ja | Empfohlen | Nein | Production/Preview bleiben geschlossen; in Development ist ohne Wert jedes gültig angemeldete Supabase-Konto zugelassen. Passwort-Reset bleibt in Production geschlossen. |
| `PRIVACY_CONTACT_EMAIL` | `src/app/privacy/page.tsx:10` | Ja für den Betrieb | Empfohlen | Optional | Nein | Die Datenschutzseite zeigt „Betreiberangaben nicht konfiguriert“. |
| `RATE_LIMIT_SECRET` | `src/lib/rate-limit.ts:34` | Ja, mindestens 32 Zeichen | Ja, eigener Wert | Optional | Ja | Production/Preview verweigern gedrosselte Aktionen bei der Schlüsselbildung; Development verwendet einen nicht geheimen lokalen Ersatz. |
| `TRUSTED_PROXY_HEADER` | `src/lib/rate-limit.ts:23` | Bedingt bei selbst betriebenem vertrauenswürdigem Proxy | Nein auf Vercel | Optional | Nein | Vercel verwendet weiterhin `x-vercel-forwarded-for`; andernfalls wird die Adresse als unbekannt behandelt. Niemals setzen, wenn der Proxy Clientwerte nicht entfernt. |
| `SUPABASE_POOLER_HOST` | `scripts/setup-supabase.mjs:22`; `scripts/audit-rls.mjs:60` | Bedingt für DB-Skripte über IPv4-Pooler | Bedingt für CI-Audit | Bedingt für lokale DB-Skripte | Nein | Die Skripte verwenden die direkte PostgreSQL-Adresse aus `SUPABASE_URL`; ohne erreichbare Direktverbindung schlagen sie fehl. |
| `RESEND_API_KEY` | `src/lib/result-email.ts:38` | Bedingt für Ergebnis-E-Mails | Bedingt, separater Test-Key | Optional | Ja | Es wird keine E-Mail gesendet; der Versuch erhält den Status `not-configured`. |
| `RESEND_FROM_EMAIL` | `src/lib/result-email.ts:39` | Bedingt für Ergebnis-E-Mails | Bedingt | Optional | Nein | Gleich wie bei fehlendem Resend API-Key. |
| `NODE_ENV` | `next.config.ts:9`; `src/lib/app-origin.ts:16`; `src/lib/admin-auth.ts:22`; `src/lib/rate-limit.ts:38` | Automatisch `production` | Automatisch `production` | Automatisch `development` | Nein | Wird von Next.js beziehungsweise der Hosting-Plattform gesetzt und darf nicht manuell als Anwendungs-Secret verwaltet werden. |

## Öffentlich gebündelte Variablen

Es gibt genau zwei `NEXT_PUBLIC_`-Variablen:

- `NEXT_PUBLIC_SUPABASE_URL` identifiziert das Supabase-Projekt.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ist ausdrücklich für Browser-Clients
  vorgesehen.

Beide Werte werden beim Build in den Browser-Code eingebettet und sind nicht
geheim. Zugriffsschutz darf deshalb nie auf diesen Werten beruhen, sondern auf
Supabase Auth und Row Level Security. `SUPABASE_SERVICE_ROLE_KEY`,
`RATE_LIMIT_SECRET`, `SUPABASE_URL` mit Datenbankpasswort und `RESEND_API_KEY`
dürfen niemals mit `NEXT_PUBLIC_` beginnen.

## Proxy, Webhooks und signaturbasierte Pfade

Der aktuelle Code enthält keinen Webhook und keinen Endpunkt, der eine
kryptografische Request-Signatur prüft. Deshalb wurde kein Webhook-Pfad
angelegt oder am Proxy geändert.

`src/proxy.ts:65-79` listet ausschliesslich geschützte HTML-Seiten auf und
enthält keinen Matcher für `/api/**`. Damit sind auch die tokenautorisierten
Prüfungspfade `/api/public/exams/[slug]` und
`/api/public/exam-attempts/[attemptId]` vom UX-Redirect ausgenommen. Die
Access-Dateisignatur in `src/app/api/import/route.ts:187-190` ist lediglich
eine Dateitypprüfung und keine Webhook- oder Request-Authentifizierung.

Wenn später ein Webhook ergänzt wird, muss sein konkreter API-Pfad weiterhin
aus dem Proxy-Matcher ausgenommen bleiben und die Signatur auf dem unveränderten
Raw Body geprüft werden.

## Vor dem ersten Deploy

1. Für Production und Preview getrennte Supabase-Projekte oder mindestens
   vollständig getrennte Schlüssel und Testdaten verwenden.
2. Alle als `Ja` markierten Variablen in der Hosting-Umgebung setzen.
3. Resend nur aktivieren, wenn Absenderdomain und Testversand geprüft wurden.
4. Die Supabase Redirect-Allow-List mit der exakten `APP_ORIGIN` abstimmen.
5. Für die GitHub-RLS-Prüfung `SUPABASE_URL` und bei Bedarf
   `SUPABASE_POOLER_HOST` als Repository-Secrets setzen.
