"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import type { QuestionImage } from "@/lib/quiz-types";
import styles from "./question-image-field.module.css";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const SUPPORTED_TYPES = ["image/jpeg", "image/png"];

type QuestionImageFieldProps = {
  image?: QuestionImage;
  onChange: (image?: QuestionImage) => void;
  onError: (message: string) => void;
};

export function QuestionImageField({
  image,
  onChange,
  onError,
}: QuestionImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  function selectFile(file?: File) {
    if (!file) return;
    if (!SUPPORTED_TYPES.includes(file.type)) {
      onError("Bitte verwende ein PNG- oder JPG-Bild.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      onError("Das Bild darf höchstens 2 MB gross sein.");
      return;
    }

    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({
          dataUrl: reader.result,
          fileName: file.name,
          alt: image?.alt ?? "",
        });
      }
      setReading(false);
    };
    reader.onerror = () => {
      onError("Das Bild konnte nicht gelesen werden.");
      setReading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={styles.imageField}>
      <div className={styles.heading}>
        <span>Fragebild (optional)</span>
        <small>PNG oder JPG · maximal 2 MB</small>
      </div>
      {image ? (
        <div className={styles.preview}>
          <Image
            alt={image.alt || "Bild zur Frage"}
            height={420}
            src={image.dataUrl}
            unoptimized
            width={720}
          />
          <div className={styles.previewInfo}>
            <span>
              <strong>{image.fileName}</strong>
              <small>Wird in Prüfung, Fragenpool und Export angezeigt.</small>
            </span>
            <button
              aria-label="Fragebild entfernen"
              onClick={() => onChange(undefined)}
              type="button"
            >
              <Trash2 aria-hidden="true" /> Entfernen
            </button>
          </div>
          <label>
            <span>Alternativtext</span>
            <input
              onChange={(event) =>
                onChange({ ...image, alt: event.target.value })
              }
              placeholder="Kurze Bildbeschreibung"
              value={image.alt}
            />
          </label>
        </div>
      ) : (
        <button
          className={styles.upload}
          disabled={reading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <ImagePlus aria-hidden="true" />
          <span>
            <strong>{reading ? "Bild wird geladen …" : "Bild hinzufügen"}</strong>
            <small>Vom Computer auswählen</small>
          </span>
        </button>
      )}
      <input
        accept={SUPPORTED_TYPES.join(",")}
        className={styles.fileInput}
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}
