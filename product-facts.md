# AlphaQuiz – verifizierte Produktfakten

> Stand: 29.07.2026

## Microsoft Forms

- Microsoft Forms kann Word- und PDF-Dateien über **Schnellimport → Von diesem Gerät hochladen** in ein Formular oder Quiz umwandeln.
- Der Schnellimport unterstützt Titel, Untertitel, Multiple-Choice-Fragen und offene Textfragen.
- Zuordnungsfragen und Fragen mit mehreren Lücken werden als offene Textfragen umgewandelt und müssen danach geprüft werden.
- Richtige Antworten und Punkte müssen nach der Konvertierung in Forms überprüft beziehungsweise ergänzt werden.
- Die Dateigrössenbeschränkung beträgt 10 MB.
- Quelle: https://support.microsoft.com/de-de/forms/convert-a-word-or-pdf-form-or-quiz-to-microsoft-forms

## Supabase + Next.js

- Supabase empfiehlt für Next.js App Router getrennte Browser- und Server-Clients.
- Für serverseitige Sitzungen wird `@supabase/ssr` mit Cookie-basierten Sessions empfohlen; das Paket ist laut Dokumentation noch Beta.
- Im Mockup werden noch keine Supabase-Zugangsdaten und keine echte Persistenz verwendet.
- Quelle: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs

## Konsequenz für den Mockup

- Der primäre Forms-Export wird als **Word/PDF-Schnellimport** dargestellt.
- Nicht direkt unterstützte Fragetypen werden beim Export sichtbar als „Nachbearbeitung nötig“ markiert.
- Der erste Branch bleibt ein lokaler, interaktiver UI-Mockup; Datenbank, Authentifizierung und echte Dokumentgenerierung folgen nach Freigabe.
