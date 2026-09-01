# Zufallslogik für Prüfungen

## Architektur

Die Zufallslogik erweitert die bestehende `ExamPublication` und
`ExamAttempt`-Struktur. Es gibt kein zweites Prüfungssystem.

- `ExamPublication.randomization` enthält die Konfiguration der Lehrkraft.
- `POST /api/exam-attempts/start` erzeugt die Instanz serverseitig.
- `ExamAttempt.instance` enthält den unveränderlichen Snapshot für den
  laufenden Versuch.
- `exam_instances` speichert denselben Snapshot in Supabase.
- Die Prüfungsansicht verwendet nach dem Start ausschliesslich die gespeicherte
  Instanz und nicht mehr die aktuelle Quiz-Reihenfolge.

## Geschützte Fragen

Geschützte Fragen sind Positionsanker. Nach der zufälligen Auswahl wird ihre
Position in der ausgewählten Grundliste festgehalten. Die übrigen Fragen werden
gemäss Modus gemischt und füllen die freien Positionen. Diese Regel hat Vorrang
vor dem Mischen ganzer Unterkategorien.

## Wiederholte Versuche

- `reuse`: Die vorherige Instanz wird vollständig kopiert. Auswahl,
  Frage-Reihenfolge und Antwort-Reihenfolge bleiben identisch.
- `regenerate`: Eine neue Versuchs-ID erzeugt einen neuen Seed und damit eine
  neue Instanz.

Der Seed ist deterministisch aus Veröffentlichung und Versuchs-ID ableitbar.
Mehrere Starts mit derselben Versuchs-ID erzeugen deshalb dieselbe Reihenfolge.
In Supabase verhindert ein eindeutiger Index mehrere gleichzeitig aktive
Versuche derselben E-Mail-Adresse.

## Migration

Die Baseline in `supabase/migrations/00000000000000_baseline.sql` enthält:

- `exam_publications.randomization`
- die Tabelle `exam_instances`
- einen eindeutigen Teilindex für aktive Versuche

Künftige Änderungen werden als neue Datei in `supabase/migrations/` angelegt
und ausschliesslich mit der Supabase CLI ausgerollt. Der SQL Editor ist kein
Deployment-Weg.

## Sicherheitsgrenze des lokalen Modus

Der bestehende Demo-Modus hält den gesamten Anwendungszustand im Browser. Die
Generierung läuft zwar über eine Serverroute und die Prüfungsinstanz ist
unveränderlich gespeichert, aber ein technisch versierter Benutzer kann im
lokalen Demo-Modus weiterhin Browserdaten untersuchen. Für eine produktive
Schülerplattform müssen die öffentliche Prüfungsseite und die Bewertung
ausschliesslich aus Supabase geladen beziehungsweise serverseitig bewertet
werden. Die neue `exam_instances`-Tabelle ist die Grundlage für diesen Schritt.
