# AlphaQuiz Projektübergabe

Stand 17. September 2026

Übergabe von Luca Schneider an die nachfolgende Projektbetreuung

Dieses Dokument erklärt, was im Projekt AlphaQuiz aufgebaut wurde, wie die Anwendung funktioniert und welche Arbeiten vor einer echten Prüfung noch nötig sind. Es ist zugleich Einstieg für die Weiterentwicklung und Checkliste für die technische Übergabe. Passwörter, Schlüssel und Datenbankinhalte gehören ausdrücklich nicht in dieses Dokument.

AlphaQuiz ist eine bereits weit entwickelte Prüfungsplattform für Werner. Aus einem Access-basierten Quizablauf entstand eine React-/Next.js-Webanwendung mit Supabase. Sie verwaltet Fragen, Themen und Quizzes, veröffentlicht eigene Prüfungslinks, wertet Versuche aus und unterstützt weiterhin den Export für Microsoft Forms. Es folgten mehrere Sicherheits- und Datenschutzrunden mit automatisierten Prüfungen.

Wichtig für die Übernahme: Der neueste Entwicklungsstand und der letzte Production-Stand sind nicht identisch. Die Datenschutz-Nacharbeiten liegen auf codex/privacy-followups. Die Identität von Prüfungsteilnehmenden ist weiterhin nicht durch eine bestätigte E-Mail abgesichert. Deshalb darf die vorhandene Funktionsvielfalt nicht mit einer Freigabe für unbeaufsichtigte echte Schülerprüfungen verwechselt werden.

## 1 Kurzüberblick und Übergabeaufwand

Für eine gemeinsame Einführung sind ungefähr ein bis zwei Stunden sinnvoll. Darin lassen sich Zugänge, Projektstart, eine Beispielprüfung und die offenen Punkte durchgehen. Eine entwickelnde Person mit Next.js- und Supabase-Erfahrung sollte zusätzlich etwa ein bis zwei Arbeitstage für die eigene Einarbeitung und Prüfung des Betriebsstands einplanen. Das ist eine Orientierung, keine Schätzung für die Fertigstellung aller offenen Arbeiten. Insbesondere die Kandidatenidentität benötigt zuerst eine Produktentscheidung.

Die ersten Aufgaben des Kollegen sind: Repository und Dienstzugänge übernehmen, den richtigen Branch auschecken, die Konfiguration sicher erhalten, eine Testprüfung durchführen und den Unterschied zwischen Preview und Production verstehen. Erst danach sollten neue Funktionen oder Deployments folgen.

| Bereich | Stand bei der Übergabe |
| --- | --- |
| Repository | Phantom-Luca/Alphaquiz auf GitHub |
| Lokales Projekt | C:\Users\lucas\OneDrive\Dokumente\Quiz |
| Aktueller Branch | codex/privacy-followups |
| Aktueller Commit | f8c027bc79ead3875d4f1b60f7b04915794e59c9 |
| main | 62c4bef8afdc1d433731cfef9601cdd1a391c30e |
| Letzter nachgewiesener CI-Lauf des aktuellen Stands | 69 Unit-/Architekturtests und 105 Autorisierungstests erfolgreich |
| Wichtigster offener Produktpunkt | F5: behauptete Kandidaten-E-Mail ist noch kein Identitätsnachweis |
| Zahlungsabwicklung | Nicht umgesetzt; Stripe wurde besprochen und verschoben |
| Selbsthosting | Als spätere Möglichkeit besprochen, nicht auf Hostpoint nachgewiesen |

Die CI-Aussage bezieht sich auf den erfolgreichen Lauf zum Commit f8c027b vom 8. September, dessen Status für diese Übergabe geprüft wurde. Für die Dokumenterstellung wurde kein neuer vollständiger Testlauf gestartet.

## 2 Ursprung und Entwicklungsverlauf

Ausgangspunkt waren die Access-Datei D:\Quiz.accdb und eine HTML-Designvorlage alphaquiz-mockup.html im Downloads-Ordner. Die Anwendung sollte ähnliche Arbeitsabläufe wie Access bieten, jedoch im Browser funktionieren. Microsoft Forms war zunächst der Zielort zum Spielen der exportierten Quizzes. Später kamen eigenständige Prüfungslinks hinzu; der Forms-Export blieb als Ausweichmöglichkeit bestehen.

Die Oberfläche wurde zunächst als Mockup entwickelt und danach in die Anwendung übernommen. Gewünscht waren eine Seitenleiste, ein Dashboard, separate Bereiche für Quizzes, Fragenpool, Kategorien, Import, Export und Einstellungen sowie ein Login. Das Branding wurde auf ALPHASOLUTION mit dem Zusatz ALPHAQUIZ abgestimmt. Die Texte wurden auf Deutsch Schweiz angepasst, insbesondere mit ss statt ß.

| Phase | Wesentliche Arbeiten und Nachweise |
| --- | --- |
| 29. Juli | Mockup bdfbcde; Anwendung und UI f7ab41f; Branding 6a5b479; Supabase-Login ce91b02; Logout aa7415e |
| 29. Juli | Themen und Auswertung b210009; Prüfungsveröffentlichung und Bilder 83d7f33; Schweizer Texte und E-Mail-Validierung 6bcc56a |
| 29. Juli | Prüfungen löschen und Resultatdetails a936c47; Zeiträume und manueller Mailversand 6709c15; kompakte Resultate 084018a; optionale Quiz-Unterthemen c4f4518 |
| 30. bis 31. Juli | Zufallslogik b2d2880; weitere Absicherung 16fa160; QR-Codes und Strukturarbeiten a238337 |
| 26. bis 27. August | Fünfstufiger Sicherheitsumbau: 845b5c8, f527efc, 8bf0ca2, 1f51dea, 3a73e3a |
| Ende August | Negativtests, echte Datenbankprüfungen, Baseline, reproduzierbare CI und Umgebungsreparaturen |
| 31. August bis 3. September | Weitere Audit-Behebung, Rate-Limits, Ownership, CSP und Login-Neuladefix |
| 7. bis 8. September | Stabile Schema-Vergleiche, weniger Identitätskopien, öffentlicher Einstieg, sichere Fehlerlogs und vorbereitete Aufbewahrungslöschung |

Die Entwicklung umfasste nicht nur sichtbare Funktionen. Ein erheblicher Teil der späteren Arbeiten betraf Autorisierung, Datenbankrechte, Testqualität und die Reproduzierbarkeit einer neuen Datenbank. Frühere Tests, die nur Textstellen im Quellcode kontrollierten, wurden teilweise ersetzt oder ausdrücklich als Architekturhinweise gekennzeichnet.

## 3 Git und aktueller Auslieferungsstand

codex/privacy-followups und der zugehörige origin-Branch stehen auf f8c027b. Vor Erstellung dieses Dokuments gab es keine geänderten verfolgten Dateien. Die Ordner .codex-pet-runs/ und docs/mockups/ waren unversioniert vorhanden; sie wurden nicht verändert. Die neue Übergabedokumentation wird separat hinzugefügt und wurde nicht automatisch committed oder gepusht.

main enthält den Sicherheitsumbau und den Login-Neuladefix. Die Sicherheits-PRs Nummer 1 und 4 sowie der Login-PR Nummer 10 wurden bereits zusammengeführt. Die folgende Differenz zum aktuellen Branch ist für jede Weiterarbeit entscheidend:

| Commit oberhalb von main | Inhalt |
| --- | --- |
| fc727ac | Schema-Inventar normalisiert Zeilenenden |
| 893646b | Identitätskopien aus Prüfungsinstanzen und Snapshots entfernen |
| b215e62 | Neutraler öffentlicher Einstieg und einheitliche Behandlung inaktiver Prüfungen |
| 2dd807d | Personendaten aus Fehlerbehandlung und Logs reduzieren |
| f8c027b | Konfigurierbare, standardmässig inaktive Aufbewahrungslöschung |

Bei der letzten Abfrage war für codex/privacy-followups noch kein Pull Request offen. Andere offene Dependency-PRs sind keine Freigabe dieser Änderungen. Vor einem Merge müssen der aktuelle PR- und CI-Stand erneut geprüft werden.

Historische Branches wie Mockup/test, test/links und die security-step-Branches dokumentieren Zwischenstände. Sie sollten nicht als neuer Ausgangspunkt verwendet werden. Der nächste Entwickler muss bewusst entscheiden, ob er den aktuellen Datenschutz-Branch weiterführt oder nach dessen geprüftem Merge von main startet.

## 4 Was die Anwendung fachlich kann

Das Dashboard zeigt Quizzes, Fragen, Kategorien und Exporte. Die Lehrkraft kann Fragen im Fragenpool pflegen, Kategorien und Unterkategorien erstellen und daraus Quizzes zusammenstellen. Fragen können aus dem Pool übernommen oder beim Bearbeiten ergänzt werden. Ein im Quiz ausgeblendetes Unterthema bleibt im Fragenpool erhalten.

Fragen unterstützen Titel, Beschreibung, Punkte, Antwortmöglichkeiten und optionale Bilder. In der Oberfläche und im Modell werden Single Choice, Multiple Choice, Wahr/Falsch, Textantwort, Reihenfolge, Zuordnung und Skala angeboten. Für einen produktiven Einsatz ist wichtig: Die serverseitige Bewertung behandelt Text gesondert und prüft andere Antworttypen über Antwort-IDs. Eine fachlich vollständige, positionsabhängige Bewertung von Reihenfolge, Zuordnung und Skala sollte vor ihrem Einsatz eigens geprüft werden. Allein die Auswahl eines Typs beweist dessen vollständige didaktische Auswertung nicht.

Quizzes können eine Gesamtbestehensgrenze oder eine Auswertung nach Themen verwenden. Dadurch lässt sich entscheiden, ob die Gesamtpunktzahl reicht oder einzelne Themen bestanden werden müssen. Die Resultatansicht unterscheidet erreichte und mögliche Punkte, Prozentwerte und Bestehen. Bei null möglichen Punkten soll keine erfolgreiche Prüfung behauptet werden; die Prüfungsinstanz-Auswertung berücksichtigt diese Grenze.

Prüfungsveröffentlichungen besitzen einen eigenen Link, Aktivstatus, Zeitraum und Zeitlimit. Zusätzlich können offene oder geschlossene Durchführung, erlaubte Verstösse und Ergebnisversand eingestellt werden. Zu den Links gibt es QR-Codes zum Anzeigen beziehungsweise Herunterladen. Ein QR-Code ist nur eine andere Darstellung des Links und kein zusätzlicher Identitätsnachweis.

Die Administrationsansicht zeigt Versuche und Aufsichtsereignisse. Einzelresultate lassen sich öffnen und nach Fehlern filtern. Eine erneute Freigabe ist durch die Lehrkraft möglich. Ergebnisübersichten sind nach Prüfungen gegliedert und platzsparend ausklappbar. Der Versand einer Ergebnis-E-Mail kann einzeln oder für mehrere abgeschlossene Resultate angestossen werden, sofern Resend konfiguriert ist.

## 5 Seiten und typische Bedienung

| Adresse | Aufgabe |
| --- | --- |
| / | Neutraler Einstieg für Gäste; Admin-Dashboard für berechtigte angemeldete Personen im aktuellen Branch |
| /login | Admin-Anmeldung und Passwort-Reset |
| /quizzes und /quizzes/[id] | Quizzes auswählen und bearbeiten |
| /questions | Fragenpool |
| /categories | Kategorien und Themen |
| /exams | Veröffentlichungen, Einstellungen, Links und QR-Codes |
| /exam/[slug] | Öffentliche Teilnahme an einer bestimmten Prüfung |
| /exam-activity | Prüfungsaktivität und Meldungen |
| /exam-activity/[attemptId] | Resultat und Verlauf eines Versuchs |
| /exam-results | Gruppierte Resultate und E-Mail-Versand |
| /import und /export | Daten übernehmen beziehungsweise Dokumente erzeugen |
| /preview | Interne Quiz-Vorschau |
| /settings | Verbindungs- und Anwendungseinstellungen |
| /privacy | Vorhandene Datenschutzinformation |

Ein sinnvoller Testablauf für den Kollegen beginnt mit einer Kategorie und einem Thema, zwei oder drei einfachen Choice-Fragen und einem Quiz. Danach wird das Quiz veröffentlicht, der Link in einem getrennten Browser geöffnet und ein Versuch mit synthetischen Kandidatendaten abgeschlossen. Anschliessend werden Punkte, Antwortkontrolle, Aufsichtsereignisse und gegebenenfalls der Mailversand verglichen.

Für diesen ersten Test sollen keine echten Schülerdaten verwendet werden. Der öffentliche Prüfungsstart verlangt Name und E-Mail, aber weder Passwort noch eine verifizierte Einladung. Die syntaktische E-Mail-Prüfung verhindert Tippformate wie fehlendes @, beweist jedoch nicht, wem ein Postfach gehört.

## 6 Zufallslogik und gespeicherte Prüfungsinstanz

Die Zufallslogik ist eingebaut und pro Veröffentlichung konfigurierbar. Sie wird nicht bei jedem Rendern im Browser neu ausgeführt. Beim tatsächlichen Prüfungsstart entsteht serverseitig eine gespeicherte Instanz. Diese enthält die ausgewählten Fragen, ihre Reihenfolge, Themen, Antwortreihenfolgen und die zur Generierung nötigen Daten. Ein Neuladen soll dieselbe Instanz verwenden.

Die vier Modi sind feste Reihenfolge, alle Fragen mischen, innerhalb der Unterkategorien mischen sowie Unterkategorien und Fragen mischen. Unterkategorien können berücksichtigt oder als gemeinsamer Pool ignoriert werden. Pro Themenbereich kann eine Anzahl vorgegeben werden. Pflichtfragen zählen zur Anzahl; eine Quote unterhalb der Pflichtfragen oder oberhalb des verfügbaren Bestands ist ungültig.

Geschützte Fragen behalten ihre Ankerposition innerhalb der ausgewählten Ausgangsliste. Das ist nicht zwingend dieselbe absolute Nummer wie in einem grösseren, ungekürzten Fragenpool. Diese Regel ist beim Kombinieren von Zufallsauswahl und Mischmodi wichtig: Eine geschützte Frage darf nicht durch beliebige Gruppierung unbemerkt verschoben werden.

Antworten können ebenfalls gemischt werden. Dabei sind die Einstellungen an Frage und Veröffentlichung sowie die Eignung des Antwortformats zu beachten. Für eine konkrete Prüfung sollte die Lehrkraft in der Vorschau und mit einem echten Testversuch kontrollieren, dass die gewünschte Darstellung entsteht.

Bei einem freigegebenen neuen Versuch kann eine neue Auswahl erzeugt oder die frühere Instanz wiederverwendet werden. Bei Wiederverwendung sollen Inhalt, Bewertung und Reihenfolge unverändert bleiben. Neue Zufallsauswahl bedeutet nicht, dass jeder mögliche Durchlauf zwingend anders aussieht; zufällig gleiche Ergebnisse sind möglich.

Die zentralen Dateien sind src/lib/exam-randomization.ts, exam-snapshot.ts und exam-scoring.ts. Der öffentliche Start erfolgt über POST /api/public/exams/[slug]. Ältere Dokumentation mit /api/exam-attempts/start beschreibt nicht den aktuellen Endpunkt.

Der Start legt Versuch und Instanz nacheinander an. Bei einem Fehler der Instanzspeicherung wird der angelegte Versuch bereinigt. Das ist ein kompensierender Ablauf, keine Behauptung einer einzigen umfassenden Datenbanktransaktion. Parallelität und Wiederverwendung werden in den vorhandenen Tests geprüft; neue Änderungen müssen diese Nachweise erhalten.

## 7 Prüfungsaufsicht und ihre Grenzen

Im geschlossenen Modus werden unter anderem Tabwechsel und das Verlassen des Vollbilds erfasst. Die Administrationsseite ruft die Aktivität regelmässig ab; sie ist keine uneingeschränkte Echtzeitüberwachung des Geräts. Bei Überschreiten der erlaubten Verstösse kann ein Versuch beendet werden. Im offenen Modus gelten andere Vorgaben.

Eine normale Webseite kann nicht zuverlässig verhindern, dass jemand andere Programme öffnet, ein zweites Gerät benutzt oder Betriebssystemfunktionen verwendet. Die vorhandene Logik erkennt bestimmte Browserereignisse und dokumentiert sie. Sie ersetzt keinen technisch verriegelten Prüfungsbrowser. Auch harmlose Unterbrechungen können Aufsichtsereignisse auslösen; ihre Bedeutung muss die Prüfungsleitung beurteilen.

Vor einem echten Einsatz müssen Teilnehmende verständlich über die Erfassung informiert werden. Zu klären sind insbesondere der Umgang mit technischen Unterbrechungen, die Freigabe eines weiteren Versuchs, Einsprachemöglichkeiten und die Aufbewahrung der Meldungen. Diese organisatorischen Entscheidungen sind nicht durch einen grünen Softwaretest erledigt.

## 8 Import und Export

Der Import unterstützt Access-Dateien sowie CSV und JSON. Access-Dateien werden nicht allein anhand ihrer Endung akzeptiert: Die Signaturprüfung soll verhindern, dass eine beliebige umbenannte Datei als .mdb eingelesen wird. Umfangsgrenzen und Rate-Limits ergänzen die Absicherung.

Die ursprüngliche fachliche Zuordnung war tbl_Produkt zu Kategorien, tbl_Fragen zu Fragen und tbl_Antworten zu Antworten. Die Access-IDs dienen bei der Übernahme als Zuordnungsgrundlage. Die genaue Feldzuordnung ist in docs/access-mapping.md beschrieben. Vor einer erneuten grossen Übernahme sollte der Kollege einen kleinen Import auf einer Testdatenbank prüfen.

Exporte sind als DOCX, PDF, CSV und JSON vorhanden. DOCX beziehungsweise PDF unterstützen den anschliessenden Import in Microsoft Forms. Das ist keine direkte Synchronisierung mit einem Forms-Konto. Nach einem Import in Forms müssen Fragetypen, richtige Antworten, Punkte und insbesondere Bilder geprüft werden. Die Anzeige in AlphaQuiz und die Übernahme durch Forms sind unterschiedliche Vorgänge.

Bilder können sensible Informationen enthalten. Die Reduktion von Kandidatenfeldern in Snapshots entfernt keine Personendaten aus Freitextfragen oder hochgeladenen Bildern. Dafür bleibt die erstellende Lehrkraft verantwortlich.

## 9 Architektur und Einstieg in den Code

Das Frontend verwendet React innerhalb von Next.js. Das Backend besteht aus Next.js Route Handlers. Supabase stellt PostgreSQL und die Admin-Authentifizierung bereit. Die Anwendung ist somit kein separates React-Projekt mit einem unabhängig gestarteten API-Server.

| Bestandteil | Verwendung |
| --- | --- |
| Node.js | Vorgesehen ist 22.x; .nvmrc und engines beachten |
| Next.js | Version 16.2.12, App Router, proxy.ts |
| React | Version 19.2.4 |
| TypeScript und Zod | Typen sowie serverseitige Eingabevalidierung |
| Supabase JS und SSR | Benutzergebundene Clients, Cookies, Datenbankzugriff |
| docx und pdf-lib | Dokumentexport |
| qrcode | Prüfungslinks als QR-Code |
| mdb-reader | Access-Import |
| pg und tsx | Datenbankwerkzeuge und Tests |

Die Next.js-Version darf nicht unbesehen nach älteren Beispielen umgebaut werden. Die Projektanweisung verweist ausdrücklich auf node_modules/next/dist/docs/, weil APIs und Konventionen gegenüber älteren Versionen abweichen können.

Wichtige Codebereiche sind src/app für Seiten und Endpunkte, src/lib für Fach- und Sicherheitslogik, die UI-Komponenten und Zustands-Hooks sowie tests und scripts für Prüfungen. Eine erste Code-Lesereihenfolge ist quiz-types.ts, admin-auth.ts, admin-api.ts, admin-state.ts, admin-resource-sync.ts, public-exam-service.ts und die drei Dateien zur Prüfungsinstanz.

Die Admin-Daten werden über einen an die Anfrage gebundenen Benutzer-Client gelesen und geschrieben. localStorage ist höchstens Anzeige-Cache und nicht mehr die verbindliche Datenquelle. Bei nicht verfügbarer Datenbank wird die letzte Anzeige gesperrt beziehungsweise schreibgeschützt. Eine 200-Antwort eines Statusendpunkts allein beweist deshalb nicht, dass alle Datenbankabfragen erfolgreich waren.

## 10 Datenbank und Migrationen

Die einzige verbindliche Schemaquelle ist supabase/migrations/. supabase/schema.sql ist keine zweite unabhängig zu pflegende Aufbauanleitung mehr. Die Baseline darf nicht nachträglich umgeschrieben werden. Jede zukünftige Änderung benötigt eine neue Migration und eine Prüfung auf einer Wegwerfdatenbank.

| Datei | Zweck |
| --- | --- |
| 00000000000000_baseline.sql | Ausgangsschema aus dem geprüften Dev-Stand |
| 20260831000000_rate_limit_service_role.sql | Rate-Limit-Funktion auf serverseitige Berechtigung begrenzen |
| 20260907000000_remove_snapshot_identity.sql | studentKey entfernen und vorhandene Snapshot-Identitätsfelder bereinigen |

| Tabelle | Hauptinhalt |
| --- | --- |
| categories | Kategorien mit Eigentümer |
| topics | Unterthemen einer Kategorie |
| questions | Fragen, Typ, Punkte, Thema und Bild |
| answers | Antworten und Korrektheitsmarkierung einer Frage |
| quizzes | Quiz-Metadaten, Bestehensregeln und ausgeblendete Themen |
| quiz_questions | Zuordnung und Reihenfolge von Fragen im Quiz |
| exports | Export-Metadaten mit Eigentümer |
| exam_publications | Link, Freigabe, Zeitlimit, Modus und Zufallskonfiguration |
| exam_attempts | Name, E-Mail, Antworten, Ergebnis, Zeiten, Status und Token-Hash |
| exam_instances | Unveränderlicher Prüfungsinhalt, Reihenfolgen, Seed und Wiederholungsreferenz |
| exam_events | Aufsichtsereignisse eines Versuchs |

Daneben existiert die private Rate-Limit-Datenhaltung. Supabase verwaltet seine Authentifizierungsobjekte selbst. Plattformobjekte sind nicht beliebig als eigene Anwendungsmigration zu behandeln.

Ownership ist für die Kernressourcen über user_id und für Untertabellen über ihre Elternbeziehungen abgesichert. RLS und SQL-Berechtigungen sind gemeinsam wichtig: Eine passende Policy ersetzt weder einen erforderlichen GRANT noch den Entzug unerwünschter Anon-Rechte.

Die echte Dev-Datenbank wurde im vorherigen Arbeitsablauf aus der Baseline aufgebaut und geprüft. Am 17. September wurde vor der Datenschutzmigration ein vollständiges Backup erstellt. Die damalige Prüfung dokumentierte die Entfernung von studentKey und die zusätzliche Snapshot-Bedingung als beabsichtigte Abweichungen. Dieser Vorgang wird hier als Übergabestand festgehalten, nicht als erneut ausgeführte Wiederherstellung.

## 11 Backup und Wiederanlauf

Das zuletzt dokumentierte vollständige Backup liegt ausserhalb des Repositories:

C:\Users\lucas\OneDrive\Dokumente\AlphaQuiz-Backups\dev-before-privacy-20260917\alphaquiz-dev-full.dump

Daneben liegen schema-before.json und schema-after.json. Die Dump-Datei war 348853 Byte gross; ihr Inhaltsverzeichnis konnte gelesen werden. Ein lesbares Inhaltsverzeichnis ist noch kein vollständiger Nachweis, dass ein Restore auf einer anderen Umgebung funktioniert.

Das Backup kann Authentifizierungs- und Anwendungsdaten enthalten. Es darf nicht ins Git-Repository, in einen öffentlichen Download oder in eine unverschlüsselte allgemeine Übergabemail gelangen. Der Kollege benötigt es nur über einen abgestimmten sicheren Übertragungsweg. Ein Wiederherstellungstest muss eine isolierte Datenbank verwenden und darf keine bestehenden Daten überschreiben.

Besonders kritisch ist die gemeinsame Auslieferung von Migration und Anwendung: Alte Writer mit studentKey funktionieren nach der neuen Migration nicht mehr. Umgekehrt kann die neue Anwendung an der alten NOT-NULL-Spalte scheitern. Der letzte main-Production-Stand ist älter als diese Änderung. Vor einem erneuten öffentlichen Start müssen Datenbank und Deployment daher gemeinsam geprüft werden.

## 12 Sicherheitsarbeiten und Nachweise

Die erste grosse Sicherheitsrunde bestand aus fünf Schritten: Ownership und RLS im Schema, Cookie-Authentifizierung über Supabase SSR, benutzergebundener Datenpfad statt pauschalem service_role-Zugriff, getrennte Ressourcenendpunkte mit Zod und anschliessende Härtung. Die Commits dafür sind 845b5c8, f527efc, 8bf0ca2, 1f51dea und 3a73e3a.

Jeder geschützte Handler muss selbst authentifizieren. proxy.ts dient der Navigation und ist keine ausreichende Sicherheitsschicht. ADMIN_EMAIL ist eine explizite Freigabe: Fehlt sie, ist niemand Admin, auch in der Entwicklung. Fremde Ressourcen dürfen nicht durch eine erratene ID zugänglich werden.

| Auditbereich | Umsetzung und Referenz |
| --- | --- |
| F1 Migrationen | Baseline statt ungeprüfter Alt-Kette; Aufbau und Inventarvergleich in CI, unter anderem 407b317 und ffe6a0e |
| F2 manipulierter Herkunftsheader | Vertrauenswürdige Headerwahl und zusätzlicher E-Mail-Bucket, 37e06eb |
| F3 gemeinsamer unbekannter Bucket | Fail-Closed bei fehlender vertrauenswürdiger Herkunft, 3f2b280 |
| F4 und F11 Body vor Auth | Authentifizierung vor Body-Verarbeitung, bf9a768 |
| F5 Kandidatenidentität | Bewusst offen; Name und behauptete E-Mail reichen weiterhin zum Start |
| F5b URL-Format | Gemeinsame Supabase-URL-Logik statt ausschliesslich .supabase.co, 2b5c1a9 |
| F6 fehlende Admin-Konfiguration | Immer geschlossen, e471838 |
| F7 öffentlicher Abruf | GET gedrosselt und Themen auf das Quiz eingeschränkt, fcd7139 |
| F8 Berechtigungen | Anon-GRANTs, Policy-Rollen, Default-Rechte und echte Proben im Audit, unter anderem 83dc7e4 und 436920e |
| F9 Rate-Limit-RPC | Nur serverseitiger Service-Role-Aufruf und Begrenzung, 3f17911 |
| F10 CSP | Nonce und gedrosselter Berichtsendpunkt, weiterhin Report-Only, dfdf346 |
| F12 explizite Ownership | Prüfung vor Reset, Publikationslöschung und Resultatversand, 376d745 |

Diese Zuordnung fasst die Auditbearbeitung zusammen. Sie behauptet nicht, dass jeder Commit allein einen Befund vollständig beweist. Die wesentlichen Nachweise liegen in der Kombination aus Autorisierungstests, Datenbank-Audit, Selbstprüfungen und CI-Aufbau.

Die Service-Role-Nutzung ist bewusst beschränkt. Direkte Verwendung besteht im Rate-Limit-Modul und in den erforderlichen öffentlichen Prüfungsrouten. Ein Modulgraph-Wächter prüft erlaubte direkte und transitive Abhängigkeiten. Dessen Selbsttest muss eine unerlaubte neue Importstelle erkennen. Beliebig zusammengesetzte dynamische Importpfade sind nicht mit einer vollständigen formalen Programmanalyse gleichzusetzen.

## 13 Eingaben und Schutz vor unbeabsichtigtem Löschen

Ressourcenendpunkte verwenden strikte Zod-Schemas. Unbekannte Felder und falsche Typen werden zurückgewiesen. Die Eigentümer-ID wird serverseitig aus der Sitzung bestimmt und nicht aus einem vom Browser behaupteten Wert übernommen. Datenbank-Payloads werden explizit zusammengestellt.

Ein wichtiger Sonderfall ist der Vollersatz einer Ressourcenliste. Nicht-leere Listen ersetzen den eigenen Bestand; fehlende IDs können dabei gelöscht werden. Eine leere Liste braucht ausdrücklich confirmDeleteAll: true. Ohne dieses Flag muss die Anfrage mit 400 scheitern und nichts löschen. Jede entsprechende Löschung wird mit Typ, Anzahl, Admin-user_id und Zeitpunkt protokolliert.

Bei Weiterentwicklung darf diese Serverregel nicht durch einen reinen Frontend-Dialog ersetzt werden. Ein Dialog schützt nicht gegen fehlerhafte oder direkte API-Anfragen. Für neue Ressourcen muss dieselbe Unterscheidung zwischen Einzeländerung, Vollersatz und bestätigter Leerung bewusst getroffen werden.

Öffentliche Versuche verwenden einen Zugriffstoken; seine Prüfungen müssen auch bei Antwortspeicherung und Abschluss greifen. Die API darf keine korrekten Antworten vor Prüfungsabschluss preisgeben. Die serverseitig vollständigen Snapshots dürfen deshalb nicht ungefiltert an den Kandidaten übertragen werden.

## 14 Tests und laufende Qualitätssicherung

Der geprüfte erfolgreiche GitHub-Lauf ist:

https://github.com/Phantom-Luca/Alphaquiz/actions/runs/34218022741

Er gehört zu f8c027b. Die Jobs migrations, quality und authorization waren erfolgreich. Nachgewiesen wurden 69 Unit-/Architekturtests, 105 Autorisierungstests, die RLS-Selbstprüfung mit sechs erkannten Testfällen, das RLS-Audit sowie Schema- und Anon-Prüfungen.

Die CI verwendet Wegwerf-Infrastruktur. Der Migrationsjob nutzt PostgreSQL 17; die Autorisierungsprüfung startet eine lokale Supabase-Instanz in der CI. Dafür wird keine echte Dev- oder Production-Datenbank benötigt. Ein früher verwendeter echter Connection-String als CI-Secret gehört nicht zurück in diesen Ablauf.

Die Tests decken unter anderem fehlende Sitzungen, Nicht-Admins, fremde Ressourcen, untergeordnete Tabellen, Tokenmissbrauch, ungültige Eingaben, Rate-Limits und Import-Signaturen ab. Nach fremden Schreib- oder Löschversuchen wird zusätzlich kontrolliert, dass die Daten unverändert geblieben sind. Das ist stärker als allein eine leere Antwortliste zu prüfen.

Der Startcheck muss eine nicht erreichbare Test-Supabase klar als Umgebungsfehler melden, bevor eine ganze Serie irreführender Testfehler entsteht. Lokal fehlendes Docker ist kein Nachweis einer Autorisierungslücke. Es ist aber auch kein grüner Testlauf; die Integrationsnachweise müssen dann in der CI erfolgen.

| Befehl | Zweck |
| --- | --- |
| npm ci | Abhängigkeiten anhand des Lockfiles installieren |
| npm run lint | Stil- und Qualitätsprüfung |
| npm run typecheck | TypeScript prüfen |
| npm run test:unit | Unit- und Architekturtests |
| npm run test:authorization | Autorisierung gegen bereitgestellte Testinstanz |
| npm test | Unit- und Autorisierungslauf |
| npm run build | Production-Build |
| npm run db:verify-migrations | Migrationsaufbau prüfen |
| npm run db:audit-rls:self-test | Audit-Wächter absichtlich auslösen, nur Wegwerfinstanz |
| npm run db:audit-rls | Rechte, RLS und negative Zugriffe prüfen |

Die Architekturtests sind unterschiedlich stark. Ein Textvergleich im Quellcode ist ein Hinweis, kein Verhaltensbeweis. Die verbliebenen solchen Tests dürfen bei der Übergabe nicht als Ersatz für echte Datenbank- oder HTTP-Prüfungen gezählt werden.

## 15 Datenschutzänderungen im aktuellen Branch

studentKey war eine unnötige zusätzliche Kopie der Kandidaten-E-Mail. Das Feld wurde aus Typen, Generator, Wiederverwendung und Datenbank entfernt. Die Migration bereinigt bestehende JSON-Snapshots tatsächlich und entfernt strukturierte Wurzelfelder studentKey, name und email. Eine Datenbankbedingung verhindert deren erneute Speicherung an dieser Stelle.

readExamSnapshot reduziert gespeicherte Objekte auf erlaubte Felder, statt sie nur als passenden TypeScript-Typ zu behandeln. Dadurch sollen unbekannte Altfelder nicht bei Wiederverwendung wieder auftauchen. Tests prüfen Inhaltserhalt, Reihenfolge, Bewertung und das Fehlen strukturierter Identitätsfelder. Der erwartete Speicherstand berücksichtigt, dass JSON.stringify undefined-Felder entfernt; die tatsächlich gespeicherte Seite des Vergleichs wird nicht nachträglich passend gemacht.

Der öffentliche Einstieg ist neutral. Ohne Sitzungscookie soll die Startseite keinen Supabase-Client initialisieren und keine Admin-Daten laden. Bei vorhandener Sitzung wird die Berechtigung serverseitig geprüft. Unbekannte und deaktivierte Prüfungs-Slugs liefern dieselbe öffentliche Fehlerantwort. Das reduziert eine einfache Unterscheidung vorhandener, aber abgeschalteter Links.

Fehlerobjekte werden zentral reduziert. Auch eine Rohmeldung kann Personendaten enthalten; deshalb bleiben sichere Codes und festgelegte Diagnosemeldungen erhalten, nicht beliebiger Anbietertext. Details, Hinweise, Zeilenwerte und ursprüngliche Stacktraces sollen nicht ungeprüft in Logs oder Antworten gelangen.

Diese Änderungen sind Datenminimierung, keine vollständige Anonymisierung. Name und E-Mail werden weiterhin im Versuch benötigt beziehungsweise gespeichert. Freitext, Bilder, versandte E-Mails, Downloads und alte Backups können Personendaten enthalten. F5 und ein mögliches zentrales Modell candidate_identities wurden bewusst nicht vorweggenommen.

## 16 Stellen der Fehlerredaktion

Die vollständige fachliche Liste steht zusätzlich in docs/privacy-followups.md. Der gemeinsame Einstieg ist src/lib/error-redaction.ts.

| Art | Umgestellte Stellen |
| --- | --- |
| Zentrale Datenbankfehler | src/lib/admin-api.ts mit databaseFailure und databaseReadFailure |
| Konfiguration und Drosselung | src/lib/admin-auth.ts und src/lib/rate-limit.ts |
| Handler mit Fehlerlogs | api/admin/status, api/import, api/exam-results/send, api/public/exams/[slug] |
| Fehlerweitergabe aus Datenzugriff | admin-ownership.ts, admin-resource-sync.ts, admin-state.ts, exam-data.ts |
| Öffentliche Verarbeitung und Versand | public-exam-service.ts, result-email.ts, rate-limit.ts |
| Einzelne Mutationshandler | api/admin/exam-attempts/[attemptId]/reset; api/admin/exam-publications/[publicationId]; api/public/exam-attempts/[attemptId]; api/public/exams/[slug] |

Die übrigen Ressourcenhandler reichen Fehler an die zentralen Datenbankfehlerfunktionen weiter. Bei neuen Handlern muss diese Kette erhalten bleiben. Ein neues console.error(error) kann den Datenschutzgewinn sonst wieder aufheben.

Bewusst separat sind eigene feste Validierungsmeldungen, begrenzte CSP-Berichte und die geforderten Löschprotokolle mit Admin-ID. Bereits gespeicherte externe Logs werden durch die Codeänderung nicht rückwirkend bereinigt. Aufbewahrung und Zugriff beim Hostinganbieter müssen daher zusätzlich geregelt werden.

## 17 Aufbewahrung und Löschmechanik

Die Mechanik ist vorhanden, aber ohne Konfiguration inaktiv. EXAM_RESULT_RETENTION_DAYS legt eine positive ganze Tageszahl für abgeschlossene Ergebnisdaten fest. EXAM_SUPERVISION_RETENTION_DAYS steuert die detaillierten Aufsichtsereignisse getrennt. Die Fristen wurden nicht durch die Entwicklung festgelegt; darüber entscheidet der Verantwortliche.

Die reine Berechnung liegt in src/lib/exam-retention-policy.ts. Der tatsächliche Datenbankzugriff in src/lib/exam-retention.ts behält server-only. Damit ist die Logik testbar, ohne den Schutz des datenbanknahen Moduls aufzuheben.

POST /api/admin/retention benötigt eine gültige Admin-Sitzung und den erwarteten Origin. Es gibt bewusst keinen automatischen Zeitplan und keinen Frontend-Schalter. Laufende Versuche und solche ohne Abschlusszeit werden nicht als fällige abgeschlossene Ergebnisse ausgewählt. Fehlerhafte Tageswerte aktivieren keine Löschung.

Die Resultatlöschung entfernt Versuche und über die Datenbankbeziehungen ihre Instanzen und Ereignisse. Eine reine Aufsichtslöschung entfernt nur die detaillierten Ereignisse. violationCount und Abschlussstatus verbleiben im Versuch bis zur Ergebnislöschung. Ob auch diese Zusammenfassung früher entfernt werden soll, ist noch zu entscheiden.

Nicht erreicht werden zugestellte Mails, Provider- und Datenbankbackups, exportierte Dateien und private Kopien. Ebenfalls fehlt ein vollständiger fachlicher Prozess für Auskunft, Berichtigung und personenbezogene Löschung über alle Systeme. Ein Admin-Konto samt sämtlichen Daten zu löschen ist nicht als fertiger betreuter Ablauf nachgewiesen.

## 18 Konfiguration ohne geheime Werte

Schlüssel müssen über einen sicheren Kanal oder direkt über die Dienstverwaltung übergeben werden. Die folgenden Namen gehören zur Konfiguration; ihre tatsächlichen Werte sind absichtlich nicht dokumentiert. NEXT_PUBLIC-Werte werden im Browser verfügbar und dürfen deshalb keine geheimen Schlüssel enthalten.

| Variable | Verwendung und Verhalten |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Öffentliche Projekt-API-Adresse; pro Umgebung bewusst wählen |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Für den Browser vorgesehener Supabase-Schlüssel; ersetzt keine RLS |
| SUPABASE_URL | Server-Konfiguration; Datenbankwerkzeuge erwarten hier einen PostgreSQL-Connection-String, nicht die HTTPS-API-Adresse |
| SUPABASE_SERVICE_ROLE_KEY | Geheimer serverseitiger Schlüssel; niemals NEXT_PUBLIC oder in Clientcode |
| ADMIN_EMAIL | Freigegebene Admin-Adresse; fehlt sie, bleibt der Adminzugang geschlossen |
| APP_ORIGIN | Exakte kanonische Adresse für Origin-Prüfung und Links |
| RATE_LIMIT_SECRET | Geheimer eigener Zufallswert; Production und Preview verschieden |
| TRUSTED_PROXY_HEADER | Für eine tatsächlich vertrauenswürdige Proxy-Umgebung ausserhalb Vercel |
| VERCEL | Laufzeitsignal der Plattform; nicht als lokale Umgehung setzen |
| PRIVACY_CONTACT_EMAIL | Kontaktangabe der Datenschutzinformation |
| RESEND_API_KEY | Optionaler geheimer Schlüssel für Ergebnisversand |
| RESEND_FROM_EMAIL | Absender des Ergebnisversands |
| EXAM_RESULT_RETENTION_DAYS | Optional; ohne Wert keine Ergebnisfrist aktiv |
| EXAM_SUPERVISION_RETENTION_DAYS | Optional; ohne Wert keine separate Aufsichtsfrist aktiv |

Für RATE_LIMIT_SECRET ist ein unabhängig erzeugter Zufallswert mit 32 Byte sinnvoll. Keine vorhandenen Werte in Chatnachrichten, Screenshots oder dieses Dokument kopieren. Der gleiche Supabase-Service-Key kann technisch mehrere Umgebungen erreichen; die Trennung der Projekte und Zugänge muss deshalb bewusst erfolgen.

Werkzeuge verwenden zusätzlich unter anderem DATABASE_URL, MIGRATION_DATABASE_URL, SUPABASE_POOLER_HOST und RLS_AUDIT_SELF_TEST. Deren Bedeutung ist am jeweiligen Skript zu prüfen. Ein Datenbank-Connection-String kann ein Passwort enthalten und ist geheim. Er ist nicht austauschbar mit einer Supabase-Projektadresse.

Die Dateien docs/deployment-environment.md und docs/security-and-hosting.md enthalten historische Aussagen, die nicht überall dem aktuellen Code entsprechen. Insbesondere ein offener Dev-Adminmodus bei fehlender ADMIN_EMAIL, ein gemeinsamer unbekannter Rate-Limit-Bucket und eine echte Supabase-Verbindung in der CI beschreiben nicht den aktuellen Sollzustand. Diese Dokumente sollten vor einer Betriebsfreigabe konsolidiert werden.

## 19 Vercel und Supabase bei der Übergabe

Das Vercel-Projekt heisst alphaquiz im Team cervio. Der zuletzt abgefragte neue Preview-Build gehört zu codex/privacy-followups und f8c027b. Seine Branch-Adresse ist https://alphaquiz-git-codex-privacy-followups-cervio.vercel.app. Die einzelne Deployment-Adresse lautet https://alphaquiz-i0s34vtqn-cervio.vercel.app.

Das letzte abgefragte Production-Deployment gehört dagegen zu main und 62c4bef. Seine einzelne Adresse ist https://alphaquiz-7pa6j45rd-cervio.vercel.app. Es ist älter als die Datenschutz-Nacharbeiten. Der Status READY eines Builds ist kein Nachweis erfolgreicher Anmeldung, Datenbankkompatibilität oder korrekter Schutzkonfiguration.

Die Production-Freigabe wurde angehalten. Für ein Demo war vorgesehen, dieselbe Dev-Supabase wie Preview zu verwenden. Eine getrennte echte Production-Datenbank ist nicht als eingerichtet nachgewiesen. Damit würden Änderungen aus beiden Umgebungen dieselben Daten betreffen. Für echte Schülerdaten ist diese Trennung vorab zu entscheiden.

Im vorangegangenen Konfigurationsschritt wurden acht Production-Variablen angelegt beziehungsweise geprüft: die beiden NEXT_PUBLIC-Supabase-Werte, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, APP_ORIGIN, RATE_LIMIT_SECRET und PRIVACY_CONTACT_EMAIL. Das ist kein Beleg, dass ein älteres Deployment bereits mit diesen Werten gebaut wurde. Änderungen an Variablen erfordern die bewusste Neubereitstellung des passenden Stands.

Die zuletzt geprüfte Supabase-Auth-Konfiguration zeigte als Site URL noch die security-round-2-Preview und als erlaubte Weiterleitungen deren /login sowie localhost:3000/login. Die Ergänzung der Production-Adresse wurde auf Wunsch angehalten. Vor einem Neustart sind Site URL und Redirect-Allow-List daher nochmals zu prüfen, insbesondere für Passwort-Reset und neue Preview-Adressen.

Der Projekt-Alias alphaquiz-psi.vercel.app wurde im früheren Ablauf gezielt entfernt, während Production-Deployments erhalten blieben. Die aktuelle Erreichbarkeit dieses Alias und aller zufälligen Deployment-Adressen muss vor einer Freigabe erneut direkt getestet werden. Eine Domainliste allein beweist weder Erreichbarkeit noch Schutz. Preview war zuvor mit Standard Protection vorgesehen; auch das ist vor Übergabe von externen Zugängen praktisch zu kontrollieren.

Ein Push auf main kann über die Git-Integration ein neues Production-Deployment erzeugen. Deshalb nicht beiläufig mergen oder auf main pushen, solange Konfiguration, Datenbankstand und gewünschte Freigabe nicht geklärt sind.

## 20 Lokal starten und Fehler eingrenzen

Nach dem Klonen zunächst Node 22 verwenden, den vereinbarten Branch auschecken und npm ci ausführen. Danach die benötigte lokale Konfiguration sicher bereitstellen. Für einen normalen Entwicklungsstart dient npm run dev. Bei einem anderen Port muss APP_ORIGIN zum tatsächlich verwendeten Origin passen.

Für Datenbank- und Autorisierungstests ist eine separate lokale Supabase beziehungsweise die dafür vorbereitete CI nötig. Auf dem bisherigen Rechner stand nicht durchgehend eine Docker-Umgebung bereit. Deshalb nicht erwarten, dass npm test ohne vorbereitete Infrastruktur sämtliche Integrationsprüfungen erfolgreich ausführen kann.

| Symptom | Zuerst prüfen |
| --- | --- |
| Supabase nicht konfiguriert | Vorhandensein und Format der URL- und Key-Variablen; Server nach Änderung neu gestartet? |
| Konfiguriert aber nicht erreichbar | Antwortinhalt, serverseitige sichere Diagnose, Sitzung, Rechte und Schema prüfen; HTTP 200 allein genügt nicht |
| permission denied for table | GRANT-Ebene und verwendete Rolle prüfen; RLS nicht abschalten |
| column user_id does not exist | Schema passt nicht zum Code; Migrationen und Historie prüfen, keine improvisierte Dashboard-Reparatur |
| 401 | Keine gültige Sitzung beziehungsweise fehlender Zugriffstoken |
| 403 | Gültige Sitzung ohne ausreichende Adminberechtigung oder nicht erlaubter Vorgang |
| 503 bei öffentlicher Prüfung | Vertrauenswürdige Herkunft, Rate-Limit-Konfiguration und Datenbankverbindung prüfen |
| ENOTFOUND im DB-Werkzeug | Host im Connection-String und DNS prüfen; API-URL nicht mit DB-Adresse verwechseln |
| Tests scheitern bereits im Setup | Wegwerf-Supabase gestartet und bereinigte CLI-Umgebung an Client und Server übergeben? |
| Instanzspeicherung nach Deployment defekt | studentKey-Migration und App-Version kompatibel? |

Eine 503 darf nicht durch das Akzeptieren von 503 in einem Erfolgstest kaschiert werden. Der öffentliche Abruf muss bei korrekter Umgebung tatsächlich 200 liefern und darf trotzdem keine Antwortschlüssel enthalten. Genau diese Unterscheidung war ein wichtiger Teil der Sicherheitsnacharbeiten.

## 21 Was bewusst offen bleibt

F5 ist der wichtigste offene Punkt vor einer echten Prüfung: Eine Person mit Prüfungslink kann eine fremde bekannte E-Mail behaupten und den einmaligen Versuch belegen. Der echte Kandidat ist dann auf eine Freigabe angewiesen. Formatvalidierung, Rate-Limit und zufälliger Slug lösen dieses Identitätsproblem nicht. Mögliche Richtungen sind bestätigte E-Mail-Links oder administrativ vergebene Einladungen. Die Entscheidung muss mit Werner erfolgen und gemeinsam mit der Datenmodellfrage behandelt werden.

Ein zentrales candidate_identities-Modell wurde nicht umgesetzt. Ebenso wenig existieren als fertige Produkte ein Schülerportal mit zugewiesenen Prüfungen, eine öffentliche Prüfungssuche, eine Zahlungsabwicklung oder eine bestätigte Hostpoint-Installation. Diese Ideen wurden besprochen, sind aber nicht Bestandteil der übernommenen Funktionszusage.

Die CSP ist weiterhin Report-Only. Nonces und Berichte sind vorhanden, aber eine scharfe Richtlinie soll erst nach Auswertung echter Preview-Berichte aktiviert werden. Schutz durch Berichtserfassung ist nicht dasselbe wie das Blockieren eines Verstosses.

Datenschutzseitig sind Verantwortlichkeit, belastbare Kontaktangaben, Aufbewahrungsfristen, Auftragsbearbeitungsverträge, Regionen der tatsächlichen Dienste, Auslandbekanntgabe und Prozesse für Betroffenenanfragen zu klären. Der Rahmen ist Schweizer revDSG und gegebenenfalls zusätzlich DSGVO. Dieses Dokument ist keine rechtliche Freigabe. Serverregionen und abgeschlossene Verträge wurden für die Übergabe nicht nachgewiesen.

Auch die fachliche Bewertung der komplexeren Fragetypen und das reale Forms-Verhalten mit Bildern brauchen gezielte Abnahmefälle. Eine grüne Sicherheitssuite beantwortet diese fachlichen Fragen nicht automatisch.

## 22 Empfohlene Reihenfolge für den Kollegen

Erstens die Zugänge übernehmen: GitHub-Repository, Vercel-Projekt, Supabase-Organisation und gegebenenfalls Resend. Persönliche Konten nicht einfach gemeinsam benutzen. Benötigte Mitgliedschaften vergeben und nach der Übergabe alte Zugänge bewusst überprüfen. Datenbankpasswörter und Service-Schlüssel nur koordiniert rotieren, damit bestehende Deployments nicht unerwartet ausfallen.

Zweitens den Arbeitsstand sichern und verstehen: codex/privacy-followups, fünf Commits Abstand zu main, CI-Belege und Backup. Danach lokal einen einfachen Test mit synthetischen Daten ausführen. Keine Datenbank zurücksetzen, bevor Ziel und Backup eindeutig sind.

Drittens die Veröffentlichung konsolidieren: Datenschutz-Branch nach Prüfung per PR übernehmen, Datenbankkompatibilität beachten und Auth-Weiterleitungen sowie Umgebungsvariablen korrigieren. Dabei ausdrücklich entscheiden, ob nur eine geschützte Demo oder bereits ein öffentlicher Betrieb beabsichtigt ist.

Viertens F5 mit Werner entscheiden und umsetzen. Parallel die organisatorischen Datenschutzfragen klären. Erst danach eine reale Schülerprüfung als Pilot freigeben.

Fünftens die Abnahme durchführen: anonyme Startseite neutral, Admin-API ohne Sitzung 401, fremde Ressourcen unzugänglich, öffentliche Prüfung funktionsfähig, feste gespeicherte Reihenfolge nach Neuladen, korrekte Bewertung und ein nachvollziehbarer Freigabeprozess. Bei unerwarteten 503 zuerst die Konfiguration untersuchen.

## 23 Abnahme und Übergabecheckliste

- Kollege kann das Repository und den richtigen Branch öffnen.
- Node-Version und Installation funktionieren auf seinem Rechner.
- Er kennt den Unterschied zwischen main, Preview und aktuellem Datenschutz-Branch.
- Dienstzugänge sind persönlich zugewiesen und Geheimnisse separat übertragen.
- Backup ist sicher zugänglich; Restore-Ziel und Vorgehen sind geklärt.
- Es wird keine echte Datenbank für CI-Tests verwendet.
- Eine synthetische Prüfung wurde erstellt, gestartet, neu geladen und abgeschlossen.
- Fragen- und Antwortreihenfolge bleiben beim Fortsetzen identisch.
- Ergebnis, Punkte und Fehleransicht wurden fachlich verglichen.
- Unbekannte und deaktivierte Links verhalten sich gleich.
- Admin-Zugriff und fremde Ownership wurden anhand der Tests erklärt.
- E-Mail-Versand wurde entweder real geprüft oder ausdrücklich als unkonfiguriert markiert.
- F5, Datenschutzfristen und komplexe Fragetypen stehen auf der offenen Liste.
- Eine öffentliche Production-Freigabe erfolgt nur als bewusste Entscheidung.

Für eine kurze gemeinsame Einführung bietet sich folgende Aufteilung an: 15 Minuten Überblick und Git-Stand, 20 Minuten Architektur und Konfiguration, 25 Minuten Beispielprüfung, 20 Minuten Sicherheit und offene Punkte sowie 10 bis 20 Minuten Zugänge und Fragen. Die praktische Einarbeitung des Kollegen kommt danach.

## 24 Referenzen und Grenzen des Übergabestands

Repository: https://github.com/Phantom-Luca/Alphaquiz

CI-Nachweis: https://github.com/Phantom-Luca/Alphaquiz/actions/runs/34218022741

Wichtige Dokumente im Repository sind README.md, docs/access-mapping.md, docs/exam-randomization.md, docs/privacy-followups.md, docs/deployment-environment.md und docs/security-and-hosting.md. Historische Anleitungen müssen mit aktuellem Code und Migrationen abgeglichen werden. Für den Datenschutz-Branch ist privacy-followups.md besonders hilfreich.

Wichtige technische Einstiegspunkte sind src/lib/quiz-types.ts, src/lib/admin-auth.ts, src/lib/admin-api.ts, src/lib/admin-resource-sync.ts, src/lib/admin-ownership.ts, src/lib/public-exam-service.ts, src/lib/public-exam-dto.ts, src/lib/exam-randomization.ts, src/lib/exam-snapshot.ts, src/lib/exam-scoring.ts, src/lib/rate-limit.ts und src/lib/error-redaction.ts.

Für Datenbank und CI sind supabase/migrations/, scripts/audit-rls.mjs, die Migrations- und Inventarwerkzeuge, tests/security-authorization.integration.ts und .github/workflows/ci.yml massgeblich. Tests dürfen nicht abgeschwächt werden, nur damit eine neue Änderung grün wird. Bei einem echten roten Verhaltensnachweis muss Ursache und Angriffsszenario geklärt werden.

Für diese Übergabe wurden Repository, Historie, Dokumentation und verfügbare Dienst-/CI-Stände ausgewertet. Nicht Bestandteil war ein neuer vollständiger Penetrationstest, ein vollständiger Backup-Restore, eine erneute Browser-Abnahme aller Seiten, eine Prüfung aller externen Logs oder eine juristische Datenschutzfreigabe. Aktuelle Dienstregionen, Verträge und die tatsächliche Erreichbarkeit jeder alten Deployment-Adresse müssen vor dem produktiven Einsatz separat bestätigt werden.

Mit dieser Übergabe soll der Kollege nachvollziehen können, was bereits gebaut wurde und wo er ansetzen muss. Der nächste sinnvolle Schritt ist eine gemeinsame Testprüfung und die Entscheidung zu F5, nicht eine neue Funktionsliste.
