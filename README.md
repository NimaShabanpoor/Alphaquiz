# AlphaQuiz

AlphaQuiz ist eine Next.js-Anwendung zum Erstellen, Organisieren, Testen und
Exportieren von Quizzes. Das Design basiert auf dem freigegebenen Mockup; die
Seiten sind als echte App-Router-Routen umgesetzt und besitzen jeweils eine
eigene CSS-Moduldatei.

## Funktionen

- Quizverwaltung mit Status, Kategorien und beliebig vielen Fragen
- Single Choice, Multiple Choice, Wahr/Falsch, Text, Reihenfolge, Zuordnung
  und Skala
- zentraler Fragenpool mit Kategorien, Unterkategorien und Fragebildern
- spielbare Vorschau mit Punkteauswertung
- veröffentlichbare Prüfungslinks mit Name und E-Mail-Adresse
- Open-Book- oder geschützter Prüfungsmodus mit Tabwechsel-Meldungen
- Gesamt- oder Unterthemen-Auswertung mit individuellen Bestehensgrenzen
- Prüfungsaktivität, einmalige Versuche und Freigabe durch Administratoren
- eigene Resultatseite mit Prüfungszeitraum, Kennzahlen und Fehlerdetails
- manueller Einzel- und Sammelversand von Ergebnis-E-Mails über Resend
- Import von Access (`.accdb`/`.mdb`), CSV und AlphaQuiz-JSON
- echte DOCX- und PDF-Dateien inklusive Fragebildern für den
  Microsoft-Forms-Schnellimport
- CSV-Prüfliste und JSON-Sicherung
- lokale Speicherung der Quiz-Inhalte ohne Teilnehmerdaten
- serverseitige Supabase-Speicherung für Prüfungsversuche und Resultate

## Lokal starten

```bash
npm install
npm run dev
```

Danach `http://localhost:3000` öffnen und mit dem in Supabase Auth angelegten
Admin-Konto anmelden. Prüfungslinks werden unter
`http://localhost:3000/exams` erstellt, laufende Versuche erscheinen unter
`http://localhost:3000/exam-activity`.

## Supabase einrichten

1. `.env.example` als `.env` kopieren.
2. Öffentliche Projekt-URL und Publishable Key sowie die serverseitige
   PostgreSQL-Verbindungsadresse, den Service-Role-Key und optional den
   IPv4-Pooler-Host aus Supabase eintragen.
3. `npm run db:setup` ausführen. Das idempotente Skript richtet
   `supabase/schema.sql` ein und prüft alle Tabellen.
4. Den Entwicklungsserver neu starten und unter **Einstellungen** die
   Verbindung prüfen.

Browser- und Benutzersitzungen verwenden den Publishable Key und
`@supabase/ssr`. Der Service-Role-Key wird niemals an den Browser ausgeliefert.
Supabase ist die zentrale Datenquelle; der Browser hält nur den letzten
erfolgreich gespeicherten Stand als lokalen Anzeigecache.

## Ergebnis-E-Mails

Für den optionalen Versand über Resend in `.env` zusätzlich
`RESEND_API_KEY` und `RESEND_FROM_EMAIL` setzen. Ohne diese Angaben werden
Prüfungsergebnisse weiterhin in Supabase gespeichert; die App zeigt
dann an, dass keine E-Mail versendet wurde.

Microsoft Forms kann eingebettete Abbildungen beim Schnellimport auslassen.
AlphaQuiz bettet sie in DOCX und PDF ein; nach dem Import müssen die Bilder in
der Forms-Überprüfung kontrolliert und bei Bedarf manuell ergänzt werden.

## Prüfung

```bash
npm run lint
npm run build
```

Die analysierte Struktur der ursprünglichen Access-Datei steht in
`docs/access-mapping.md`.

## Sicherheit und Hosting

Die Produktionskonfiguration, das Einzeladmin-Modell, die Supabase-Migration
und Hinweise für Vercel beziehungsweise Hostpoint sind in
`docs/security-and-hosting.md` dokumentiert.
