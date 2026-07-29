# Access-Analyse und Zielmodell

Analysierte Datei: `D:\Quiz.accdb` (nur lesend über eine temporäre Kopie).

## Vorhandene Tabellen

| Access | Felder | Beziehung |
| --- | --- | --- |
| `tbl_Produkt` | `IDX_Produkt`, `Produkt` | 1:n zu `tbl_Fragen` |
| `tbl_Fragen` | `IDX_Fragen`, `IDX_ProduktUF`, `Frage`, `Beschreibung` | 1:n zu `tbl_Antworten` |
| `tbl_Antworten` | `IDX_Antworten`, `IDX_FragenUF`, `Antwort`, `RichtigFalsch` | Antwort gehört zu einer Frage |

## Vorhandene Formulare

- `frm_Quiz_Produkt`: Produkt/Kategorie als Hauptdatensatz
- `subfrm_Fragen`: verschachtelte Fragen pro Produkt
- `subfrm_Antworten`: verschachtelte Antworten pro Frage, inklusive Richtig/Falsch-Markierung

## Übertragung in den Web-Mockup

```text
categories
  └─ questions
       └─ answers
```

Für die spätere produktive Version kommen zusätzlich `quizzes`,
`quiz_questions`, `profiles` und `exports` hinzu. Dadurch kann eine Frage aus
dem zentralen Fragenpool in mehreren Quizzes wiederverwendet werden.
