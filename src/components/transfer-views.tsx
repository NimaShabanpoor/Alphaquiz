"use client";

import {
  ChevronRight,
  Database,
  Download,
  Sparkles,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import PageHeader from "@/components/section-header";
import { accessMappings } from "@/lib/mock-data";
import type { Question } from "@/lib/mock-data";

type ExportFormat = "DOCX" | "PDF" | "XLSX" | "JSON";

const exportOptions: {
  id: ExportFormat;
  title: string;
  description: string;
}[] = [
  {
    id: "DOCX",
    title: "Word-Dokument · für Forms",
    description:
      "Vertikal formatierte Fragen und Antworten für den Schnellimport in Microsoft Forms.",
  },
  {
    id: "PDF",
    title: "PDF · für Forms",
    description:
      "Alternative für den Forms-Schnellimport, unveränderlich und gut zur Freigabe.",
  },
  {
    id: "XLSX",
    title: "Excel-Arbeitsmappe",
    description:
      "Eine Zeile pro Frage mit Typ, Antworten, Lösung und Punkten zur Kontrolle.",
  },
  {
    id: "JSON",
    title: "JSON-Sicherung",
    description:
      "Vollständiges Quiz inklusive Kategorien und Lösungen, später wieder importierbar.",
  },
];

export function ImportView({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("Quiz.accdb");
  const [dragging, setDragging] = useState(false);

  const acceptFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    onToast(`${file.name} wurde für die Zuordnung vorgemerkt.`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title="Fragen übernehmen."
        lead="Access-Datenbank, Excel, CSV oder JSON hochladen und die erkannten Felder Supabase zuordnen."
      />

      <section
        className="aq-dropzone"
        data-dragging={dragging}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          acceptFile(event.dataTransfer.files[0]);
        }}
      >
        <span className="aq-dropzone-icon">
          <Database aria-hidden="true" />
        </span>
        <strong>Datei hier ablegen</strong>
        <p>.accdb · .mdb · .xlsx · .csv · .json · maximal 25 MB</p>
        <button
          className="aq-button"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Upload aria-hidden="true" />
          Datei auswählen
        </button>
        <input
          accept=".accdb,.mdb,.xlsx,.csv,.json"
          hidden
          onChange={(event) => acceptFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
      </section>

      <section className="aq-card" style={{ marginTop: 16, overflow: "hidden" }}>
        <div className="aq-import-summary">
          <div>
            <strong>{fileName}</strong>
            <span>3 Tabellen · 2 Fragen · 6 Antworten erkannt</span>
          </div>
          <button
            className="aq-button aq-button-primary"
            onClick={() =>
              onToast("2 Fragen wurden im Mockup erfolgreich zugeordnet.")
            }
            type="button"
          >
            <Sparkles aria-hidden="true" />
            2 Fragen importieren
          </button>
        </div>
        {accessMappings.map(([source, target]) => (
          <div className="aq-mapping-row" key={source}>
            <code>{source}</code>
            <ChevronRight aria-hidden="true" />
            <select aria-label={`Zielfeld für ${source}`} defaultValue={target}>
              <option>{target}</option>
              <option>Nicht importieren</option>
            </select>
          </div>
        ))}
      </section>
    </>
  );
}

export function ExportView({
  questions,
  onToast,
}: {
  questions: Question[];
  onToast: (message: string) => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("DOCX");

  const generateExport = () => {
    if (format === "JSON") {
      const content = JSON.stringify(
        { title: "Excel Grundlagen", questions },
        null,
        2,
      );
      const url = URL.createObjectURL(
        new Blob([content], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "excel-grundlagen.json";
      link.click();
      URL.revokeObjectURL(url);
      onToast("JSON-Sicherung wurde heruntergeladen.");
      return;
    }
    onToast(`${format}-Erzeugung ist im Mockup als nächster Backend-Schritt markiert.`);
  };

  const selected = exportOptions.find((option) => option.id === format)!;

  return (
    <>
      <PageHeader
        eyebrow="Export · Excel Grundlagen"
        title="Für Forms vorbereiten."
        lead="Format wählen, Datei erzeugen und über den Schnellimport in Microsoft Forms prüfen."
      />
      <section className="aq-export-layout">
        <article className="aq-card">
          {exportOptions.map((option) => (
            <button
              aria-pressed={format === option.id}
              className="aq-export-option"
              data-active={format === option.id}
              key={option.id}
              onClick={() => setFormat(option.id)}
              type="button"
            >
              <span className="aq-filetype">{option.id}</span>
              <span>
                <strong>{option.title}</strong>
                <p>{option.description}</p>
              </span>
            </button>
          ))}
        </article>
        <aside className="aq-card aq-export-side">
          <p className="aq-eyebrow">Ausgewählt</p>
          <h2>{selected.id}</h2>
          <p>{selected.description}</p>
          <button
            className="aq-button aq-button-primary"
            onClick={generateExport}
            type="button"
          >
            <Download aria-hidden="true" />
            Datei erzeugen
          </button>
          <div className="aq-notice">
            Forms importiert Word/PDF, unterstützt dabei aber nur
            Multiple-Choice- und offene Textfragen zuverlässig. Zuordnung,
            Reihenfolge und Skala werden deshalb als „Nachbearbeitung nötig“
            gekennzeichnet.
          </div>
        </aside>
      </section>
    </>
  );
}
