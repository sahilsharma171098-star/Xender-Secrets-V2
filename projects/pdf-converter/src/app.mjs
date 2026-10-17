import { LIMITS, validateFiles, fitImage, parsePages, safeFilename, formatBytes, editPDF } from "./core.mjs";
import { createZip } from "./zip.mjs";

const $ = id => document.getElementById(id);
const PDFLib = window.PDFLib;
const TOOLS = {
  images: { title: "Images to PDF", description: "Turn your images into a tidy PDF. Arrange them in the order you want.", action: "Create PDF", accept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" },
  render: { title: "PDF to images", description: "Export selected PDF pages as PNG or JPG. Multiple pages download together in a ZIP.", action: "Convert to images", accept: "application/pdf,.pdf" },
  merge: { title: "Merge PDFs", description: "Bring your PDFs together. Arrange the files below to set the page order.", action: "Merge PDFs", accept: "application/pdf,.pdf" },
  extract: { title: "Extract pages", description: "Save selected pages in a new PDF. Enter pages in the order you want them.", action: "Extract pages", accept: "application/pdf,.pdf" },
  rotate: { title: "Rotate PDF", description: "Rotate selected pages clockwise and save the entire document as a new PDF.", action: "Rotate PDF", accept: "application/pdf,.pdf" }
};
let tool = "images", files = [], busy = false, cancelRequested = false, resultURL = null;
const pause = () => new Promise(resolve => setTimeout(resolve, 0));
function status(message = "", isError = false) { $("status").textContent = message; $("status").classList.toggle("error", isError); }
function clearResult() {
  if (resultURL) URL.revokeObjectURL(resultURL);
  resultURL = null; $("result").hidden = true; $("download").removeAttribute("href");
}
function setBusy(value) {
  busy = value;
  for (const el of document.querySelectorAll("button, input, select")) el.disabled = value;
  $("cancel").disabled = false; $("cancel").hidden = !value;
  $("progress").hidden = !value;
  $("run").disabled = value || files.length === 0;
}
async function step(current, total, message = "Processing") {
  $("progress").value = Math.round(current / total * 100);
  status(`${message} · ${current} of ${total}`);
  await pause();
  if (cancelRequested) throw new DOMException("Cancelled", "AbortError");
}
function renderFiles() {
  $("file-list").replaceChildren();
  files.forEach((file, index) => {
    const item = document.createElement("li"); item.className = "file-item";
    const number = document.createElement("span"); number.className = "file-index"; number.textContent = String(index + 1).padStart(2, "0");
    const info = document.createElement("div"); info.className = "file-info";
    const name = document.createElement("span"); name.className = "file-name"; name.textContent = file.name; name.title = file.name;
    const size = document.createElement("span"); size.className = "file-meta"; size.textContent = formatBytes(file.size);
    info.append(name, size);
    const controls = document.createElement("div"); controls.className = "file-controls";
    for (const [label, symbol, move] of [["Move up", "↑", -1], ["Move down", "↓", 1], ["Remove", "×", 0]]) {
      const button = document.createElement("button"); button.type = "button"; button.textContent = symbol; button.setAttribute("aria-label", `${label} ${file.name}`);
      button.disabled = move === -1 && index === 0 || move === 1 && index === files.length - 1;
      button.addEventListener("click", () => {
        if (busy) return;
        if (!move) files.splice(index, 1);
        else [files[index], files[index + move]] = [files[index + move], files[index]];
        clearResult(); status(); renderFiles();
      }); controls.append(button);
    }
    item.append(number, info, controls); $("file-list").append(item);
  });
  $("run").disabled = files.length === 0;
}
function addFiles(incoming) {
  if (busy || !incoming.length) return;
  try {
    const proposed = ["images", "merge"].includes(tool) ? [...files, ...incoming] : [...incoming];
    // Merging may be prepared one file at a time; only enforce its minimum on run.
    validateFiles(proposed, tool === "merge" && proposed.length === 1 ? "rotate" : tool);
    files = proposed; clearResult(); status(); renderFiles();
  } catch (error) { status(error.message, true); }
  $("file-input").value = "";
}
function selectTool(next) {
  if (busy) return;
  tool = next; files = []; clearResult(); status(); renderFiles();
  $("pages").value = ""; $("progress").value = 0;
  for (const button of document.querySelectorAll("[data-tool]")) {
    const active = button.dataset.tool === tool;
    button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active));
  }
  $("tool-title").textContent = TOOLS[tool].title;
  $("tool-description").textContent = TOOLS[tool].description;
  $("run").textContent = `${TOOLS[tool].action} →`;
  $("file-input").accept = TOOLS[tool].accept;
  $("file-input").multiple = ["images", "merge"].includes(tool);
  $("drop-title").textContent = tool === "images" ? "Drop images here" : tool === "merge" ? "Drop PDFs here" : "Drop a PDF here";
  $("accepted-types").textContent = tool === "images" ? "JPG, PNG or WebP · up to 30 files / 80 MB total" : tool === "merge" ? "PDF files · up to 30 files / 80 MB total" : "One PDF · up to 80 MB";
  for (const [id, visible] of [["page-options", ["render", "extract", "rotate"].includes(tool)], ["paper-options", tool === "images"], ["format-options", tool === "render"], ["resolution-options", tool === "render"], ["rotation-options", tool === "rotate"]]) $(id).hidden = !visible;
}
function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not create the image. Try a lower resolution.")), type, quality));
}
async function imagesToPDF() {
  const output = await PDFLib.PDFDocument.create();
  for (let index = 0; index < files.length; index++) {
    let bitmap;
    const canvas = document.createElement("canvas");
    try {
      bitmap = await createImageBitmap(files[index], { imageOrientation: "from-image" });
      if (bitmap.width * bitmap.height > LIMITS.pixels) throw new Error("An image is larger than 16 megapixels. Resize it before converting.");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image rendering is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0);
      const jpeg = /image\/jpeg/.test(files[index].type) || /\.jpe?g$/i.test(files[index].name);
      const imageBlob = await canvasBlob(canvas, jpeg ? "image/jpeg" : "image/png", .94);
      const bytes = new Uint8Array(await imageBlob.arrayBuffer());
      const image = jpeg ? await output.embedJpg(bytes) : await output.embedPng(bytes);
      const fit = fitImage(image.width, image.height, $("paper-size").value);
      output.addPage(fit.page).drawImage(image, fit);
    } finally { bitmap?.close(); canvas.width = canvas.height = 0; }
    await step(index + 1, files.length, "Adding images");
  }
  return { blob: new Blob([await output.save()], { type: "application/pdf" }), ext: "pdf", detail: `${files.length} ${files.length === 1 ? "page" : "pages"}` };
}
async function pdfToImages() {
  const pdfjs = await import("./vendor/pdfjs/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.mjs", import.meta.url).href;
  const loading = pdfjs.getDocument({ data: new Uint8Array(await files[0].arrayBuffer()), isEvalSupported: false, cMapUrl: new URL("./vendor/pdfjs/cmaps/", import.meta.url).href, cMapPacked: true, standardFontDataUrl: new URL("./vendor/pdfjs/standard_fonts/", import.meta.url).href, wasmUrl: new URL("./vendor/pdfjs/wasm/", import.meta.url).href });
  loading.onPassword = () => { loading.destroy(); };
  let doc;
  try {
    doc = await loading.promise;
    const indices = parsePages($("pages").value, doc.numPages);
    if (indices.length > LIMITS.renderPages) throw new Error("Select 50 pages or fewer per image export.");
    const entries = [], format = $("image-format").value, ext = format === "jpeg" ? "jpg" : "png";
    let totalBytes = 0;
    for (let index = 0; index < indices.length; index++) {
      const page = await doc.getPage(indices[index] + 1);
      const canvas = document.createElement("canvas");
      try {
        const viewport = page.getViewport({ scale: Number($("resolution").value) });
        if (viewport.width * viewport.height > LIMITS.pixels) throw new Error("A page exceeds the 16-megapixel export limit. Choose a lower resolution.");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Image rendering is unavailable in this browser.");
        await page.render({ canvasContext: context, canvas, viewport, background: "rgb(255,255,255)" }).promise;
        const blob = await canvasBlob(canvas, `image/${format}`, .92);
        totalBytes += blob.size;
        if (totalBytes > LIMITS.outputBytes) throw new Error("The image export exceeds 200 MB. Select fewer pages or a lower resolution.");
        entries.push({ name: `page-${String(indices[index] + 1).padStart(4, "0")}.${ext}`, bytes: new Uint8Array(await blob.arrayBuffer()) });
      } finally { canvas.width = canvas.height = 0; page.cleanup(); }
      await step(index + 1, indices.length, "Rendering pages");
    }
    return entries.length === 1 ? { blob: new Blob([entries[0].bytes], { type: `image/${format}` }), ext, detail: "1 page" } : { blob: createZip(entries), ext: "zip", detail: `${entries.length} page images` };
  } finally { await loading.destroy(); }
}
function friendlyError(error) {
  if (error.name === "AbortError") return "Cancelled. Your original files are unchanged.";
  if (/encrypt|password|worker was destroyed/i.test(error.message)) return "Password-protected PDFs are not supported. Choose an unencrypted copy.";
  if (/invalid pdf|pdf header|parse|offset|end of file|invalid image|source image|encodingerror/i.test(error.message)) return "This file could not be read. Check that it is a valid, unencrypted PDF or supported image.";
  return error.message || "Conversion failed. Try a smaller file.";
}
$("run").addEventListener("click", async () => {
  if (busy) return;
  clearResult(); status();
  try {
    validateFiles(files, tool); cancelRequested = false; setBusy(true);
    await step(0, 1, "Preparing files");
    let result;
    if (tool === "images") result = await imagesToPDF();
    else if (tool === "render") result = await pdfToImages();
    else {
      const inputs = [];
      for (const file of files) inputs.push(new Uint8Array(await file.arrayBuffer()));
      const output = await editPDF(inputs, tool, $("pages").value, Number($("angle").value), PDFLib, step);
      result = { blob: new Blob([output.bytes], { type: "application/pdf" }), ext: "pdf", detail: `${output.pages} ${output.pages === 1 ? "page" : "pages"}` };
    }
    if (cancelRequested) throw new DOMException("Cancelled", "AbortError");
    if (result.blob.size > LIMITS.outputBytes) throw new Error("The output exceeds 200 MB. Convert fewer files at once.");
    resultURL = URL.createObjectURL(result.blob);
    $("download").href = resultURL; $("download").download = safeFilename($("output-name").value, result.ext);
    $("result-details").textContent = `${result.detail} · ${formatBytes(result.blob.size)} · ${$("download").download}`;
    $("result").hidden = false; status("Done. Choose Download to save your file.");
    $("download").focus();
  } catch (error) { status(friendlyError(error), true); }
  finally { setBusy(false); renderFiles(); }
});
for (const button of document.querySelectorAll("[data-tool]")) button.addEventListener("click", () => selectTool(button.dataset.tool));
$("choose-files").addEventListener("click", () => $("file-input").click());
$("file-input").addEventListener("change", event => addFiles([...event.target.files]));
$("clear").addEventListener("click", () => { if (busy) return; files = []; clearResult(); status(); $("file-input").value = ""; renderFiles(); });
$("cancel").addEventListener("click", () => { cancelRequested = true; status("Cancelling after the current page finishes…"); });
for (const eventName of ["dragenter", "dragover"]) $("dropzone").addEventListener(eventName, event => { event.preventDefault(); if (!busy) $("dropzone").classList.add("dragover"); });
for (const eventName of ["dragleave", "drop"]) $("dropzone").addEventListener(eventName, event => { event.preventDefault(); $("dropzone").classList.remove("dragover"); });
$("dropzone").addEventListener("drop", event => addFiles([...event.dataTransfer.files]));
for (const input of document.querySelectorAll("#options input, #options select")) input.addEventListener("input", () => { clearResult(); status(); });
window.addEventListener("pagehide", () => { clearResult(); files = []; });
