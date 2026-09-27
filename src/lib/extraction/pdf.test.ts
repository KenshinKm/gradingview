import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractFromBuffer, countPdfPages } from "./index";

describe("PDF fallback", () => {
  it("passes an unreadable PDF to the model as a document instead of failing", async () => {
    const broken = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\n(garbage, no xref)\n");
    const r = await extractFromBuffer(broken, "scan.pdf", "application/pdf");
    expect(r.status).toBe("extracted");
    expect(r.image?.mediaType).toBe("application/pdf");
    expect(r.image?.base64.length).toBeGreaterThan(0);
  });

  it("estimates page count without counting the Pages tree", () => {
    const b = Buffer.from("/Type /Pages /Kids [..] /Type /Page /Type/Page /Type /Page");
    expect(countPdfPages(b)).toBe(3);
  });

  it("refuses a PDF that looks far too long", async () => {
    const many = Buffer.from("%PDF-1.4\n" + "<< /Type /Page >>\n".repeat(500));
    const r = await extractFromBuffer(many, "big.pdf", "application/pdf");
    expect(r.status).toBe("failed");
    expect(r.error).toContain("limit");
  });
});
