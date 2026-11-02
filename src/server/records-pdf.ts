import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PageSizes, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const brand = rgb(103/255, 0, 1/255);
const muted = rgb(0.36, 0.34, 0.34);
let fontBytes: Promise<Buffer> | undefined;

function wrap(text: string, font: PDFFont, width: number, size: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    let line = "";
    for (const token of paragraph.split(/(\s+)/)) {
      if (font.widthOfTextAtSize(line + token, size) > width && line) { lines.push(line.trimEnd()); line = ""; }
      if (!line && /^\s+$/.test(token)) continue;
      // Unbroken identifiers and URLs must fit too.
      for (const char of token) {
        if (font.widthOfTextAtSize(line + char, size) > width && line) { lines.push(line.trimEnd()); line = ""; }
        line += char;
      }
    }
    lines.push(line || " ");
  }
  return lines;
}

export async function recordsPdf(rows: Record<string, unknown>[], options: { type: string; from: string | null; to: string | null }) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // Static instance of the OFL-licensed UI font; fontkit cannot subset its
  // variable WOFF2 source reliably. Keep the PDF font out of the client bundle.
  fontBytes ??= readFile(path.join(process.cwd(), "public/fonts/dm-sans-pdf.ttf"));
  const font = await pdf.embedFont(await fontBytes, { subset: true });
  pdf.setTitle(`Track-and-Trace ${options.type} records`);
  pdf.setAuthor("Track-and-Trace - Bulacan State University");
  const [width, height] = PageSizes.A4;
  const margin = 40;
  let page: PDFPage;
  let y = 0;
  const text = (value: string, x: number, top: number, size = 10, color = muted) => page.drawText(value, { x, y: top, font, size, color });
  const newPage = () => {
    page = pdf.addPage(PageSizes.A4);
    text("Track-and-Trace", margin, height - 46, 20, brand);
    text(`${options.type[0].toUpperCase()}${options.type.slice(1)} records`, margin, height - 67, 13, brand);
    text(`Date range: ${options.from || "All dates"} to ${options.to || "Latest"} | ${rows.length} record(s)`, margin, height - 85, 9);
    page.drawLine({ start: { x: margin, y: height - 96 }, end: { x: width - margin, y: height - 96 }, thickness: 1, color: brand });
    y = height - 119;
  };
  newPage();
  if (!rows.length) text("No records match the selected date range.", margin, y);
  rows.forEach((row, index) => {
    if (y < 130) newPage();
    text(`Record ${index + 1}`, margin, y, 12, brand);
    y -= 21;
    for (const [key, value] of Object.entries(row)) {
      const label = key.replace(/_/g, " ");
      const formatted = value instanceof Date ? value.toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : value == null ? "-" : String(value);
      const labelLines = wrap(label, font, 145, 9);
      const valueLines = wrap(formatted, font, width - 2*margin - 160, 10);
      const length = Math.max(labelLines.length, valueLines.length);
      for (let i = 0; i < length; i++) {
        if (y < 55) { newPage(); text(`Record ${index + 1} (continued)`, margin, y, 11, brand); y -= 20; }
        if (labelLines[i]) text(labelLines[i], margin, y, 9);
        if (valueLines[i]) text(valueLines[i], margin + 160, y, 10);
        y -= 14;
      }
      y -= 4;
    }
    y -= 10;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.4, color: rgb(.82,.80,.76) });
    y -= 22;
  });
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Page ${i + 1} of ${pages.length} | Administrative record - keep private`, { x: margin, y: 25, size: 8, font, color: muted });
  });
  return pdf.save();
}
