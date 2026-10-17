export const LIMITS = Object.freeze({ files: 30, bytes: 80 * 1024 * 1024, pages: 5000, renderPages: 50, pixels: 16_000_000, outputBytes: 200 * 1024 * 1024 });

export function parsePages(value, count) {
  if (!Number.isInteger(count) || count < 1 || count > LIMITS.pages) throw new Error("This document has too many pages (maximum 5,000). Split it into smaller files first.");
  if (!value.trim()) return Array.from({ length: count }, (_, i) => i);
  const indices = new Set();
  for (const part of value.split(",")) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part.trim());
    if (!match) throw new Error("Enter pages like 1-3, 5, 8. Use positive page numbers and ascending ranges.");
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > count) throw new Error(`Page numbers must be between 1 and ${count}, with ranges in ascending order.`);
    for (let n = start; n <= end; n++) indices.add(n - 1);
  }
  return [...indices];
}

export function safeFilename(value, extension) {
  const base = String(value).replace(/\.(pdf|zip|png|jpe?g)$/i, "").replace(/[\u0000-\u001f\u007f<>:"/\\|?*\u202a-\u202e\u2066-\u2069]/g, "-").replace(/^[. ]+|[. ]+$/g, "").slice(0, 90) || "xender-document";
  return `${/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(base) ? `xender-${base}` : base}.${extension}`;
}

export function fileKind(file) {
  if (/\.(jpg|jpeg|png|webp)$/i.test(file.name) && /^(image\/(jpeg|png|webp))?$/.test(file.type)) return "image";
  if (/\.pdf$/i.test(file.name) && (!file.type || file.type === "application/pdf")) return "pdf";
  return "unsupported";
}

export function validateFiles(files, tool) {
  if (!files.length) throw new Error("Choose a file first.");
  if (files.length > LIMITS.files) throw new Error("Choose up to 30 files at a time.");
  if (["render", "extract", "rotate"].includes(tool) && files.length !== 1) throw new Error("This tool takes one PDF at a time.");
  if (tool === "merge" && files.length < 2) throw new Error("Choose at least two PDFs to merge.");
  if (files.reduce((sum, file) => sum + file.size, 0) > LIMITS.bytes) throw new Error("Keep the combined input size under 80 MB.");
  const expected = tool === "images" ? "image" : "pdf";
  if (files.some(file => !file.size || fileKind(file) !== expected)) throw new Error(expected === "image" ? "Choose non-empty JPG, PNG or WebP images." : "Choose non-empty PDF files.");
}

export function fitImage(width, height, paper = "a4") {
  if (!(width > 0 && height > 0)) throw new Error("The image has invalid dimensions.");
  if (paper === "image") return { page: [width * .75, height * .75], x: 0, y: 0, width: width * .75, height: height * .75 };
  const size = paper === "letter" ? [612, 792] : [595.28, 841.89];
  const page = width > height ? [...size].reverse() : size;
  const ratio = Math.min((page[0] - 48) / width, (page[1] - 48) / height);
  return { page, x: (page[0] - width * ratio) / 2, y: (page[1] - height * ratio) / 2, width: width * ratio, height: height * ratio };
}

export async function loadPDF(bytes, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
  if (doc.isEncrypted) throw new Error("Password-protected PDFs are not supported. Choose an unencrypted copy.");
  parsePages("", doc.getPageCount());
  return doc;
}

export async function editPDF(inputs, tool, pagesValue, angle, PDFLib, step = async () => {}) {
  if (tool === "merge") {
    const output = await PDFLib.PDFDocument.create();
    let count = 0;
    for (let n = 0; n < inputs.length; n++) {
      const source = await loadPDF(inputs[n], PDFLib);
      count += source.getPageCount();
      if (count > LIMITS.pages) throw new Error("The merged document would exceed 5,000 pages.");
      const pages = await output.copyPages(source, source.getPageIndices());
      for (const page of pages) output.addPage(page);
      await step(n + 1, inputs.length);
    }
    return { bytes: await output.save(), pages: count };
  }
  const source = await loadPDF(inputs[0], PDFLib);
  const indices = parsePages(pagesValue, source.getPageCount());
  if (tool === "rotate") {
    if (![90, 180, 270].includes(angle)) throw new Error("Choose a rotation of 90, 180 or 270 degrees.");
    for (const index of indices) {
      const page = source.getPage(index);
      page.setRotation(PDFLib.degrees((page.getRotation().angle + angle) % 360));
    }
    await step(1, 1);
    return { bytes: await source.save(), pages: source.getPageCount() };
  }
  if (tool !== "extract") throw new Error("Choose a supported PDF tool.");
  const output = await PDFLib.PDFDocument.create();
  for (const page of await output.copyPages(source, indices)) output.addPage(page);
  await step(1, 1);
  return { bytes: await output.save(), pages: indices.length };
}

export function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
