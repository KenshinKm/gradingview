import sharp from "sharp";

/** Deterministic pseudo-random so runs are comparable. */
export function rng(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A phone-photo-sized JPEG of dense text (default 12 MP), slightly rotated and
 * noisy so it is as heavy as a real photo, not a tiny clean render.
 */
export async function textPhoto(lines: string[], opts: { w?: number; h?: number; seed?: number; font?: number } = {}) {
  const { w = 3024, h = 4032, seed = 1, font = 64 } = opts;
  const rand = rng(seed);
  const rows = lines
    .map((l, i) => `<text x="150" y="${220 + i * (font + 26)}" font-family="Comic Sans MS, Marker Felt, cursive" font-size="${font}" fill="#1b2a6b">${esc(l)}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f6f1e4"/>${rows}</svg>`;
  const noise = Buffer.alloc(w * h * 3);
  for (let i = 0; i < noise.length; i += 3) {
    const v = 200 + Math.floor(rand() * 55);
    noise[i] = v; noise[i + 1] = v; noise[i + 2] = v;
  }
  return sharp(Buffer.from(svg))
    .composite([{ input: noise, raw: { width: w, height: h, channels: 3 }, blend: "multiply" }])
    .rotate(1.5, { background: "#f6f1e4" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** A valid multi-page text PDF (correct xref), for extraction tests. */
export function makePdf(pages: number, linesPerPage = 40): Buffer {
  const objs: string[] = [];
  const kids: number[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  let n = 4;
  for (let p = 0; p < pages; p++) {
    const pageNum = n++;
    const contentNum = n++;
    kids.push(pageNum);
    const stream =
      "BT /F1 11 Tf 40 760 Td 14 TL " +
      Array.from({ length: linesPerPage }, (_, i) => `(Page ${p + 1} line ${i + 1}: the quick brown fox jumps over the lazy dog) Tj T*`).join(" ") +
      " ET";
    objs[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentNum} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`;
    objs[contentNum] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  objs[2] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${pages} >>`;
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < n; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${n}\n0000000000 65535 f \n`;
  for (let i = 1; i < n; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const SENTENCES = [
  "The novel presents the American Dream as both a promise and a trap for its characters.",
  "In the second chapter the author contrasts old money with new money through setting and dialogue.",
  "Fitzgerald uses color imagery, especially green and white, to suggest hope and false purity.",
  "The narrator claims to be honest, yet his account is shaped by his own admiration and bias.",
  "Because the parties are public and the grief is private, the ending feels earned rather than sudden.",
  "One might argue that the green light matters less than the distance it represents.",
  "The quotation \"so we beat on, boats against the current\" ties the individual to a larger history.",
  "This analysis will show how the structure of the book mirrors the structure of memory.",
];

/** Roughly `chars` characters of essay-like prose. */
export function essay(chars: number, seed = 3): string {
  const rand = rng(seed);
  let out = "";
  while (out.length < chars) {
    const para = Array.from({ length: 4 + Math.floor(rand() * 4) }, () => SENTENCES[Math.floor(rand() * SENTENCES.length)]).join(" ");
    out += para + "\n\n";
  }
  return out.slice(0, chars);
}
