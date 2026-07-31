import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Question, Quiz } from "@/lib/quiz-types";
import { questionTypeLabels } from "@/lib/quiz-types";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type ExportFormat = "docx" | "pdf" | "csv" | "json";

type ExportPayload = {
  quiz: Quiz;
  questions: Question[];
  format: ExportFormat;
};

function decodeImage(dataUrl?: string) {
  const match = dataUrl?.match(
    /^data:image\/(png|jpeg);base64,([a-z0-9+/=\s]+)$/i,
  );
  if (!match) return null;
  return {
    bytes: Buffer.from(match[2], "base64"),
    type: match[1].toLowerCase() === "jpeg" ? ("jpg" as const) : ("png" as const),
  };
}

function safeName(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "quiz"
  );
}

function quoteCsv(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function createDocx(quiz: Quiz, questions: Question[]) {
  const children: Paragraph[] = [
    new Paragraph({ text: quiz.title, heading: HeadingLevel.TITLE }),
    new Paragraph({
      text:
        quiz.description ||
        "Für den Schnellimport in Microsoft Forms vorbereitet.",
    }),
  ];

  questions.forEach((question, index) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
        children: [
          new TextRun({
            text: `${index + 1}. ${question.title}`,
            bold: true,
          }),
        ],
      }),
    );
    if (question.description) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: question.description, italics: true }),
          ],
        }),
      );
    }
    const image = decodeImage(question.image?.dataUrl);
    if (image) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: image.bytes,
              type: image.type,
              transformation: { width: 480, height: 270 },
            }),
          ],
        }),
      );
      if (question.image?.alt) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: question.image.alt, italics: true }),
            ],
          }),
        );
      }
    }
    if (question.type === "text") {
      children.push(new Paragraph({ text: "Antwort: ____________________" }));
    } else {
      question.answers.forEach((answer, answerIndex) => {
        children.push(
          new Paragraph({
            text: `${String.fromCharCode(65 + answerIndex)}. ${answer.text}`,
            indent: { left: 360 },
          }),
        );
      });
    }
  });

  const document = new Document({
    creator: "AlphaQuiz",
    title: quiz.title,
    description: "Microsoft Forms Schnellimport",
    sections: [{ children }],
  });
  return Packer.toBuffer(document);
}

function wrapText(text: string, width = 82) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function createPdf(quiz: Quiz, questions: Question[]) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;

  const addLine = (
    value: string,
    options: { size?: number; strong?: boolean; indent?: number } = {},
  ) => {
    const size = options.size ?? 11;
    const lines = wrapText(value);
    for (const line of lines) {
      if (y < 55) {
        page = pdf.addPage([595, 842]);
        y = 790;
      }
      page.drawText(line, {
        x: 46 + (options.indent ?? 0),
        y,
        size,
        font: options.strong ? bold : regular,
        color: rgb(0.12, 0.25, 0.26),
      });
      y -= size + 6;
    }
  };

  addLine(quiz.title, { size: 24, strong: true });
  y -= 8;
  addLine(quiz.description || "Microsoft Forms Schnellimport");
  y -= 18;

  for (const [index, question] of questions.entries()) {
    addLine(`${index + 1}. ${question.title}`, { size: 13, strong: true });
    const image = decodeImage(question.image?.dataUrl);
    if (image) {
      const embedded =
        image.type === "png"
          ? await pdf.embedPng(image.bytes)
          : await pdf.embedJpg(image.bytes);
      const scale = Math.min(480 / embedded.width, 220 / embedded.height, 1);
      const width = embedded.width * scale;
      const height = embedded.height * scale;
      if (y - height < 55) {
        page = pdf.addPage([595, 842]);
        y = 790;
      }
      y -= height;
      page.drawImage(embedded, {
        x: 46,
        y,
        width,
        height,
      });
      y -= 8;
      if (question.image?.alt) addLine(question.image.alt, { indent: 14 });
    }
    if (question.description) addLine(question.description);
    if (question.type === "text") {
      addLine("Antwort: ____________________", { indent: 14 });
    } else {
      question.answers.forEach((answer, answerIndex) =>
        addLine(`${String.fromCharCode(65 + answerIndex)}. ${answer.text}`, {
          indent: 14,
        }),
      );
    }
    y -= 14;
  }

  return Buffer.from(await pdf.save());
}

function createCsv(quiz: Quiz, questions: Question[]) {
  const rows = [
    [
      "Quiz",
      "Frage",
      "Typ",
      "Punkte",
      "Bild",
      "Antworten",
      "Richtige Antworten",
    ],
    ...questions.map((question) => [
      quiz.title,
      question.title,
      questionTypeLabels[question.type],
      question.points,
      question.image?.fileName ?? "",
      question.answers.map((answer) => answer.text).join(" | "),
      question.answers
        .filter((answer) => answer.correct)
        .map((answer) => answer.text)
        .join(" | "),
    ]),
  ];
  return Buffer.from(
    `\uFEFF${rows.map((row) => row.map(quoteCsv).join(";")).join("\r\n")}`,
    "utf8",
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const payload = (await request.json()) as ExportPayload;
    const { quiz, questions, format } = payload;
    if (!quiz || !Array.isArray(questions)) {
      return Response.json(
        { error: "Quizdaten fehlen oder sind ungültig." },
        { status: 400 },
      );
    }

    let buffer: Buffer;
    let contentType: string;
    if (format === "docx") {
      buffer = await createDocx(quiz, questions);
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (format === "pdf") {
      buffer = await createPdf(quiz, questions);
      contentType = "application/pdf";
    } else if (format === "csv") {
      buffer = createCsv(quiz, questions);
      contentType = "text/csv; charset=utf-8";
    } else if (format === "json") {
      buffer = Buffer.from(
        JSON.stringify({ version: 1, quiz, questions }, null, 2),
        "utf8",
      );
      contentType = "application/json; charset=utf-8";
    } else {
      return Response.json(
        { error: "Unbekanntes Exportformat." },
        { status: 400 },
      );
    }

    const responseBody = Uint8Array.from(buffer).buffer;
    return new Response(responseBody, {
      headers: {
        "Content-Disposition": `attachment; filename="${safeName(quiz.title)}.${format}"`,
        "Content-Type": contentType,
      },
    });
  } catch {
    return Response.json(
      { error: "Die Exportdatei konnte nicht erzeugt werden." },
      { status: 500 },
    );
  }
}
