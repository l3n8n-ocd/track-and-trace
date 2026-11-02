import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
vi.mock("server-only", () => ({}));
import { recordsPdf } from "@/server/records-pdf";

describe("administrative PDF exports", () => {
  it("produces a valid PDF for an empty range", async () => {
    const pdf = await PDFDocument.load(await recordsPdf([], { type: "reports", from: null, to: null }));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toContain("reports");
  });
  it("embeds Unicode names and paginates long values without dropping records", async () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ record_id: i + 1, item: "Cable / Power bank", reporter: "María Peña", details: "A long description of the administrative record with spaces and a serial code. ".repeat(40), serial: "A".repeat(250) }));
    const bytes = await recordsPdf(rows, { type: "reports", from: "2026-10-01", to: "2026-11-02" });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(6);
    if (process.env.PDF_QA_OUTPUT) {
      const target = path.resolve(process.env.PDF_QA_OUTPUT);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
  });
});
