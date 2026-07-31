"use client";

import { Copy, Download, Printer, QrCode, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ui } from "@/components/ui";
import { examQrFileName } from "@/lib/exam-links";
import styles from "./exam-qr-dialog.module.css";

type ExamQrDialogProps = {
  examTitle: string;
  onClose: () => void;
  onCopy: (url: string) => void;
  url: string;
};

export default function ExamQrDialog({
  examTitle,
  onClose,
  onCopy,
  url,
}: ExamQrDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function createQrCode() {
      try {
        const { default: QRCode } = await import("qrcode");
        const nextDataUrl = await QRCode.toDataURL(url, {
          color: { dark: "#101a30", light: "#ffffff" },
          errorCorrectionLevel: "H",
          margin: 2,
          width: 720,
        });
        if (!cancelled) setDataUrl(nextDataUrl);
      } catch {
        if (!cancelled) setError("Der QR-Code konnte nicht erstellt werden.");
      }
    }

    void createQrCode();
    return () => {
      cancelled = true;
    };
  }, [url]);

  function download() {
    if (!dataUrl) return;
    const downloadLink = document.createElement("a");
    downloadLink.download = examQrFileName(examTitle);
    downloadLink.href = dataUrl;
    downloadLink.click();
  }

  return (
    <dialog
      aria-labelledby="exam-qr-title"
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      ref={dialogRef}
    >
      <section className={styles.card}>
        <header>
          <span className={styles.icon}>
            <QrCode aria-hidden="true" />
          </span>
          <div>
            <small>Prüfungszugang</small>
            <h2 id="exam-qr-title">QR-Code für {examTitle}</h2>
          </div>
          <button
            aria-label="QR-Code schliessen"
            className={styles.close}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.content}>
          {dataUrl ? (
            <div className={styles.image}>
              <Image
                alt={`QR-Code für die Prüfung ${examTitle}`}
                height={280}
                priority
                src={dataUrl}
                unoptimized
                width={280}
              />
            </div>
          ) : error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : (
            <div
              aria-label="QR-Code wird erstellt"
              className={styles.loading}
              role="status"
            />
          )}
          <p>
            Teilnehmende scannen diesen Code und gelangen direkt zur Anmeldung
            der Prüfung.
          </p>
          <label className={styles.link}>
            <span>Öffentlicher Prüfungslink</span>
            <input readOnly value={url} />
          </label>
        </div>

        <footer>
          <button className={ui.button} onClick={() => onCopy(url)} type="button">
            <Copy aria-hidden="true" /> Link kopieren
          </button>
          <button
            className={ui.button}
            disabled={!dataUrl}
            onClick={() => window.print()}
            type="button"
          >
            <Printer aria-hidden="true" /> Drucken
          </button>
          <button
            className={`${ui.button} ${ui.primary}`}
            disabled={!dataUrl}
            onClick={download}
            type="button"
          >
            <Download aria-hidden="true" /> PNG herunterladen
          </button>
        </footer>
      </section>
    </dialog>
  );
}
