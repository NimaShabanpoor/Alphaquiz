# AlphaQuiz

Interaktiver Next.js-Mockup für einen Quiz-Manager auf Basis der vorhandenen
Access-Datenbank und des gelieferten AlphaQuiz-HTML-Designs.

## Mockup starten

```bash
npm install
npm run dev
```

Danach `http://localhost:3000` öffnen.

## Umfang dieses Branches

- Dashboard, Quiz-Editor, Fragenpool und Kategorien
- Fragetypen wie Single Choice, Multiple Choice, Wahr/Falsch, Text,
  Reihenfolge, Zuordnung und Skala
- Klickbarer Access-Importablauf mit der erkannten Feldzuordnung
- Quiz-Vorschau
- Exportauswahl für Word/PDF-Schnellimport in Microsoft Forms sowie
  JSON-Sicherung
- Ausschliesslich Mock-Daten im Browser; noch keine Supabase-Persistenz

Die analysierte Access-Struktur steht in `docs/access-mapping.md`. Verifizierte
Forms-/Supabase-Rahmenbedingungen stehen in `product-facts.md`.
