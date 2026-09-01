import assert from "node:assert/strict";
import test from "node:test";
import { buildExamUrl, examQrFileName } from "../src/lib/exam-links";

test("Prüfungs-QR verwendet eine absolute URL", () => {
  assert.equal(
    buildExamUrl("https://quiz.example.ch", "excel-grundlagen"),
    "https://quiz.example.ch/exam/excel-grundlagen",
  );
});

test("Sonderzeichen im Prüfungs-Slug werden sicher codiert", () => {
  assert.equal(
    buildExamUrl("https://quiz.example.ch", "prüfung/eins"),
    "https://quiz.example.ch/exam/pr%C3%BCfung%2Feins",
  );
});

test("QR-Downloads erhalten einen verständlichen Dateinamen", () => {
  assert.equal(examQrFileName(" Excel Grundlagen "), "excel-grundlagen-qr-code.png");
  assert.equal(examQrFileName(""), "pruefung-qr-code.png");
});
