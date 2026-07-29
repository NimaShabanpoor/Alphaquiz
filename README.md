# AlphaQuiz

AlphaQuiz ist eine Next.js-Anwendung zum Erstellen, Organisieren, Testen und
Exportieren von Quizzes. Das Design basiert auf dem freigegebenen Mockup; die
Seiten sind als echte App-Router-Routen umgesetzt und besitzen jeweils eine
eigene CSS-Moduldatei.

## Funktionen

- Quizverwaltung mit Status, Kategorien und beliebig vielen Fragen
- Single Choice, Multiple Choice, Wahr/Falsch, Text, Reihenfolge, Zuordnung
  und Skala
- zentraler Fragenpool und Kategorienverwaltung
- spielbare Vorschau mit Punkteauswertung
- Import von Access (`.accdb`/`.mdb`), CSV und AlphaQuiz-JSON
- echte DOCX- und PDF-Dateien für den Microsoft-Forms-Schnellimport
- CSV-Prüfliste und JSON-Sicherung
- automatische lokale Speicherung im Browser
- optionale Supabase-Synchronisierung über das Next.js-Backend

## Lokal starten

```bash
npm install
npm run dev
```

Danach `http://localhost:3000` öffnen.

## Supabase einrichten

1. `.env.example` als `.env` kopieren.
2. PostgreSQL-Verbindungsadresse, Secret-Key und IPv4-Pooler-Host aus
   Supabase eintragen.
3. `npm run db:setup` ausführen. Das idempotente Skript richtet
   `supabase/schema.sql` ein und prüft alle Tabellen.
4. Den Entwicklungsserver neu starten und unter **Einstellungen** die
   Verbindung prüfen.

Der Service-Role-Key wird nur in Next.js-Route-Handlern verwendet und niemals
an den Browser ausgeliefert.

## Prüfung

```bash
npm run lint
npm run build
```

Die analysierte Struktur der ursprünglichen Access-Datei steht in
`docs/access-mapping.md`.
