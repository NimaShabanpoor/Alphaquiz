import MDBReader from "mdb-reader";
import type { Value } from "mdb-reader";
import type { Category, Question, QuestionType } from "@/lib/quiz-types";

export const runtime = "nodejs";

type Row = Record<string, Value>;

function id(prefix: string, value?: unknown) {
  const clean = String(value ?? crypto.randomUUID())
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `${prefix}-${clean}`;
}

function pick(row: Row, names: string[]) {
  const entries = Object.entries(row);
  for (const name of names) {
    const found = entries.find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    );
    if (found) return found[1];
  }
  return undefined;
}

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function bool(value: unknown) {
  return (
    value === true ||
    value === 1 ||
    ["true", "wahr", "ja", "-1"].includes(text(value).toLowerCase())
  );
}

function parseAccess(buffer: Buffer) {
  const reader = new MDBReader(buffer);
  const tableNames = reader.getTableNames();
  const findTable = (needle: RegExp) =>
    tableNames.find((name) => needle.test(name));
  const questionTable = findTable(/fragen/i);
  const answerTable = findTable(/antworten/i);
  const categoryTable = findTable(/produkt|kategor/i);

  if (!questionTable) {
    throw new Error(
      `Keine Fragentabelle gefunden. Erkannte Tabellen: ${tableNames.join(", ")}`,
    );
  }

  const questionRows = reader.getTable(questionTable).getData<Row>();
  const answerRows = answerTable
    ? reader.getTable(answerTable).getData<Row>()
    : [];
  const categoryRows = categoryTable
    ? reader.getTable(categoryTable).getData<Row>()
    : [];

  const categories: Category[] = categoryRows.map((row, index) => {
    const sourceId = pick(row, [
      "ID_Produkt",
      "IDX_Produkt",
      "ProduktID",
      "ID",
      "Produkt_ID",
    ]);
    return {
      id: id("category-import", sourceId ?? index + 1),
      name: text(pick(row, ["Produkt", "Kategorie", "Name"])) || "Import",
      color: "#6f8785",
    };
  });

  if (!categories.length) {
    categories.push({
      id: "category-import-allgemein",
      name: "Import",
      color: "#6f8785",
    });
  }

  const categoryBySource = new Map(
    categoryRows.map((row, index) => [
      text(
        pick(row, [
          "ID_Produkt",
          "IDX_Produkt",
          "ProduktID",
          "ID",
          "Produkt_ID",
        ]) ??
          index + 1,
      ),
      categories[index].id,
    ]),
  );

  const questions: Question[] = questionRows.map((row, index) => {
    const sourceId =
      pick(row, ["ID_Frage", "IDX_Fragen", "FrageID", "ID", "Frage_ID"]) ??
      index + 1;
    const questionId = id("question-import", sourceId);
    const relatedAnswers = answerRows.filter(
      (answer) =>
        text(
          pick(answer, [
            "IDX_FrageUF",
            "IDX_FragenUF",
            "FrageID",
            "Frage_ID",
            "ID_Frage",
          ]),
        ) === text(sourceId),
    );
    const answers = relatedAnswers.map((answer, answerIndex) => ({
      id: id(
        "answer-import",
        pick(answer, ["ID_Antwort", "IDX_Antworten", "AntwortID", "ID"]) ??
          `${sourceId}-${answerIndex + 1}`,
      ),
      text: text(pick(answer, ["Antwort", "Antworttext", "Text"])),
      correct: bool(
        pick(answer, ["RichtigFalsch", "Richtig", "IsCorrect", "Correct"]),
      ),
    }));
    const categorySource = text(
      pick(row, ["IDX_ProduktUF", "ProduktID", "KategorieID", "Produkt_ID"]),
    );
    const type: QuestionType =
      answers.length > 2 &&
      answers.filter((answer) => answer.correct).length > 1
        ? "multiple"
        : answers.length
          ? "single"
          : "text";

    return {
      id: questionId,
      title:
        text(pick(row, ["Frage", "Fragetext", "Titel", "Title"])) ||
        `Importierte Frage ${index + 1}`,
      description: text(
        pick(row, ["Beschreibung", "Description", "Hinweis"]),
      ),
      type,
      categoryId:
        categoryBySource.get(categorySource) ?? categories[0].id,
      points: Number(pick(row, ["Punkte", "Points"])) || 1,
      shuffle: true,
      answers:
        answers.length > 0
          ? answers
          : [
              {
                id: `${questionId}-answer`,
                text: "",
                correct: true,
              },
            ],
    };
  });

  return {
    questions,
    categories,
    details: {
      tables: tableNames,
      questionTable,
      answerTable,
      categoryTable,
    },
  };
}

function parseCsv(source: string) {
  const lines = source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) throw new Error("Die CSV-Datei enthält keine Daten.");
  const separator =
    (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const cells = (line: string) =>
    line
      .split(separator)
      .map((value) => value.trim().replace(/^"|"$/g, ""));
  const headers = cells(lines[0]).map((value) => value.toLowerCase());
  const category: Category = {
    id: "category-import-csv",
    name: "CSV-Import",
    color: "#6f8785",
  };
  const questions: Question[] = lines.slice(1).map((line, index) => {
    const values = cells(line);
    const get = (...names: string[]) => {
      const column = headers.findIndex((header) => names.includes(header));
      return column >= 0 ? values[column] ?? "" : "";
    };
    const answerTexts = [
      get("antwort 1", "answer 1", "a"),
      get("antwort 2", "answer 2", "b"),
      get("antwort 3", "answer 3", "c"),
      get("antwort 4", "answer 4", "d"),
    ].filter(Boolean);
    const correct = get("richtig", "correct", "lösung", "loesung");
    return {
      id: id("question-csv", index + 1),
      title: get("frage", "question", "titel", "title") || `Frage ${index + 1}`,
      description: get("beschreibung", "description"),
      type: (get("typ", "type") as QuestionType) || "single",
      categoryId: category.id,
      points: Number(get("punkte", "points")) || 1,
      shuffle: true,
      answers: (answerTexts.length ? answerTexts : [""]).map(
        (answer, answerIndex) => ({
          id: id("answer-csv", `${index + 1}-${answerIndex + 1}`),
          text: answer,
          correct:
            correct.toLowerCase() === answer.toLowerCase() ||
            Number(correct) === answerIndex + 1,
        }),
      ),
    };
  });
  return {
    questions,
    categories: [category],
    details: { tables: ["CSV"], questionTable: "CSV" },
  };
}

function parseJson(source: string) {
  const parsed = JSON.parse(source) as {
    questions?: Question[];
    categories?: Category[];
    state?: { questions?: Question[]; categories?: Category[] };
  };
  const questions = parsed.questions ?? parsed.state?.questions ?? [];
  const categories = parsed.categories ?? parsed.state?.categories ?? [];
  if (!Array.isArray(questions)) {
    throw new Error("Die JSON-Datei enthält keine gültige Fragenliste.");
  }
  return {
    questions,
    categories,
    details: { tables: ["JSON"], questionTable: "questions" },
  };
}

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Keine Datei empfangen." }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return Response.json(
        { error: "Die Datei ist größer als 25 MB." },
        { status: 413 },
      );
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    const bytes = Buffer.from(await file.arrayBuffer());
    const result =
      extension === "accdb" || extension === "mdb"
        ? parseAccess(bytes)
        : extension === "csv"
          ? parseCsv(bytes.toString("utf8"))
          : extension === "json"
            ? parseJson(bytes.toString("utf8"))
            : null;
    if (!result) {
      return Response.json(
        { error: "Unterstützt werden ACCDB, MDB, CSV und JSON." },
        { status: 415 },
      );
    }
    return Response.json({
      fileName: file.name,
      ...result,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Die Datei konnte nicht gelesen werden.",
      },
      { status: 400 },
    );
  }
}
