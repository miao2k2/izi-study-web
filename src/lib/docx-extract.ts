/**
 * Trích xuất plain text từ file .docx (không dùng mammoth ở đây để dễ test)
 * mammoth sẽ dùng ở server-side trong API route.
 *
 * Hàm này chỉ parse XML bên trong docx (file docx là 1 zip với file word/document.xml).
 */
import JSZip from "jszip";

export type ExtractedDoc = {
  paragraphs: { text: string; bold: boolean }[];
  fullText: string;
};

/**
 * Đọc nội dung text từ 1 file docx (Buffer hoặc ArrayBuffer)
 */
export async function extractDocxText(
  input: Buffer | ArrayBuffer | Uint8Array,
): Promise<ExtractedDoc> {
  const zip = await JSZip.loadAsync(input);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) {
    throw new Error("File docx không hợp lệ (thiếu word/document.xml)");
  }
  const paragraphs = extractParagraphsFromXml(docXml);
  return {
    paragraphs,
    fullText: paragraphs.map((p) => p.text).join("\n"),
  };
}

/**
 * Parse XML của document.xml và trích xuất text theo từng <w:p>.
 * Trả về cả flag bold cho mỗi paragraph để parser có thêm heuristic.
 */
export function extractParagraphsFromXml(xml: string): {
  text: string;
  bold: boolean;
}[] {
  const paraRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  const result: { text: string; bold: boolean }[] = [];
  let m: RegExpExecArray | null;
  while ((m = paraRegex.exec(xml)) !== null) {
    const para = m[1];
    const { text, bold } = extractTextAndBold(para);
    const trimmed = text.trim();
    if (trimmed.length > 0) result.push({ text: trimmed, bold });
  }
  return result;
}

function extractTextAndBold(paraXml: string): { text: string; bold: boolean } {
  let anyBold = false;
  const out: string[] = [];
  const runRegex = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
  let m: RegExpExecArray | null;
  while ((m = runRegex.exec(paraXml)) !== null) {
    const run = m[1];
    const isBold =
      /<w:b\s*(?:\/|w:val="(?:true|1)")\s*[^>]*>/.test(run) ||
      /<w:b\s+w:val="(?:true|1)"/.test(run);
    if (isBold) anyBold = true;
    const tokenRegex =
      /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>|<w:noBreakHyphen\s*\/>|<w:softHyphen\s*\/>|<w:sym[^>]*\/>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tokenRegex.exec(run)) !== null) {
      if (tm[0].startsWith("<w:t")) {
        out.push(decodeXml(tm[1]));
      } else if (tm[0] === "<w:tab/>") {
        out.push("\t");
      } else if (tm[0] === "<w:br/>") {
        out.push("\n");
      }
    }
  }
  return { text: out.join(""), bold: anyBold };
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}