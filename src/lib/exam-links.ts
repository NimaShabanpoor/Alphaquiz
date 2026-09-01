export function buildExamUrl(origin: string, slug: string) {
  return new URL(`/exam/${encodeURIComponent(slug)}`, origin).toString();
}

export function examQrFileName(examTitle: string) {
  const title = examTitle
    .trim()
    .toLocaleLowerCase("de-CH")
    .replace(/[^a-z0-9äöü]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${title || "pruefung"}-qr-code.png`;
}
