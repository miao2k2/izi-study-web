/**
 * Parser văn bản pháp luật từ file .docx
 *
 * Cấu trúc văn bản pháp luật VN gồm các cấp:
 *   - Chương (Chapter)        : "Chương I", "Chương II"...
 *   - Mục   (Section)         : "Mục 1.", "Mục 2..."   (không phải chương nào cũng có)
 *   - Điều  (Article)         : "Điều 1.", "Điều 2..."  (bold)
 *   - Khoản (Clause)          : "1.", "2.", "a)", "b)"  hoặc bắt đầu bằng số/chữ cái đầu dòng
 *   - Điểm  (Point)           : "a)", "b)", "c)"...
 *
 * Đặc biệt: 1 chương có thể không có mục nào - các điều nằm trực tiếp dưới chương.
 *
 * === Lưu ý về cách lưu vào DB ===
 * - `number` lưu phần số/định danh thuần: "I", "1", "a"
 * - `title`  lưu tiêu đề đầy đủ để hiển thị luôn: "Chương I: NHỮNG QUY ĐỊNH CHUNG",
 *   "Điều 1: Phạm vi điều chỉnh", "Khoản 1: ...", "Điểm a) ..."
 * - `content` lưu phần text của Khoản/Điểm/Điều (nội dung sau tiêu đề nếu có)
 *
 * Nếu 1 Chương chỉ có dòng "Chương I" mà không có tiêu đề phía sau, parser sẽ
 * gom dòng text đứng ngay sau đó vào title cho đến khi gặp cấp mới.
 */

export type SectionKind = "CHAPTER" | "SECTION" | "ARTICLE" | "CLAUSE" | "POINT";

export type ParsedNode = {
  kind: SectionKind;
  number: string; // "I", "1", "a"
  title?: string; // "Chương I: NHỮNG QUY ĐỊNH CHUNG", "Điều 1: Phạm vi điều chỉnh"
  content?: string; // Phần nội dung (Khoản/Điểm/Điều không có tiêu đề riêng)
  children: ParsedNode[];
};

const KIND_LABEL: Record<SectionKind, string> = {
  CHAPTER: "Chương",
  SECTION: "Mục",
  ARTICLE: "Điều",
  CLAUSE: "Khoản",
  POINT: "Điểm",
};

/** Build tiêu đề đầy đủ theo kind. Nếu titleRest rỗng trả về undefined. */
function buildTitle(
  kind: SectionKind,
  number: string,
  titleRest?: string,
): string | undefined {
  const label = KIND_LABEL[kind];
  const rest = titleRest?.trim();
  if (!rest) return undefined;
  // Khoản/Điểm/Điều/Mục: "Khoản 1: ..."  • Chương: "Chương I: ..."
  return `${label} ${number}: ${rest}`;
}

/**
 * Phân tích các đoạn văn bản trích xuất từ file docx (đã là plain text theo từng paragraph).
 * Mỗi phần tử có dạng { text: string, bold: boolean }.
 */
export function parseLawText(
  paragraphs: { text: string; bold: boolean }[],
): ParsedNode[] {
  const root: ParsedNode = { kind: "CHAPTER", number: "", children: [] };

  let currentChapter = root;
  let currentSection: ParsedNode | null = null;
  let currentArticle: ParsedNode | null = null;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const p = para.text.trim();
    const bold = para.bold;
    if (!p) continue;

    // 1. Chương
    const chapterMatch = p.match(/^Chương\s+([IVXLCDM]+)\b\s*$/i);
    if (chapterMatch) {
      currentChapter = {
        kind: "CHAPTER",
        number: chapterMatch[1],
        title: buildTitle("CHAPTER", chapterMatch[1], ""),
        children: [],
      };
      root.children.push(currentChapter);
      currentSection = null;
      currentArticle = null;
      continue;
    }
    // Chương kiểu gộp: "Chương I NHỮNG QUY ĐỊNH CHUNG"
    const chapterCombined = p.match(/^Chương\s+([IVXLCDM]+)\s+(.+)$/i);
    if (chapterCombined) {
      currentChapter = {
        kind: "CHAPTER",
        number: chapterCombined[1],
        title: buildTitle(
          "CHAPTER",
          chapterCombined[1],
          chapterCombined[2],
        ),
        children: [],
      };
      root.children.push(currentChapter);
      currentSection = null;
      currentArticle = null;
      continue;
    }

    // 1b. Nghị quyết: "I- QUAN ĐIỂM", "II- MỤC TIÊU" ...
    const romanSectionMatch = p.match(/^([IVXLCDM]+)\s*-\s*(.+)$/);
    if (romanSectionMatch) {
      currentChapter = {
        kind: "CHAPTER",
        number: romanSectionMatch[1],
        title: buildTitle(
          "CHAPTER",
          romanSectionMatch[1],
          romanSectionMatch[2],
        ),
        children: [],
      };
      root.children.push(currentChapter);
      currentSection = null;
      currentArticle = null;
      continue;
    }

    // 2. Mục
    const sectionMatch = p.match(/^Mục\s+(\d+)\s*(.*)$/);
    if (sectionMatch) {
      const num = sectionMatch[1];
      const titleRest = sectionMatch[2]?.replace(/^\.\s*/, "").trim();
      currentSection = {
        kind: "SECTION",
        number: num,
        title: buildTitle("SECTION", num, titleRest),
        children: [],
      };
      currentChapter.children.push(currentSection);
      currentArticle = null;
      continue;
    }

    // 3. Điều
    const articleMatch = p.match(/^Điều\s+(\d+)\s*\.?\s*(.*)$/);
    if (articleMatch) {
      const num = articleMatch[1];
      const titleRest = articleMatch[2]?.trim();
      currentArticle = {
        kind: "ARTICLE",
        number: num,
        title: buildTitle("ARTICLE", num, titleRest),
        content: titleRest || undefined,
        children: [],
      };
      // Article thuộc Mục (nếu có) hoặc thuộc Chương
      const container = currentSection ?? currentChapter;
      container.children.push(currentArticle);
      continue;
    }

    // 3b. Nghị quyết: item "1. Nâng cao nhận thức..." -> ARTICLE (1 cấp)
    const nqItemMatch = p.match(/^(\d+)\.\s+(.+)$/);
    if (nqItemMatch && currentChapter !== root) {
      const num = nqItemMatch[1];
      const titleRest = nqItemMatch[2].trim();
      // Reset currentSection để article tiếp theo rơi đúng vị trí
      currentArticle = {
        kind: "ARTICLE",
        number: num,
        title: buildTitle("ARTICLE", num, titleRest),
        content: titleRest,
        children: [],
      };
      const container = currentSection ?? currentChapter;
      container.children.push(currentArticle);
      continue;
    }

    // 4. Khoản / Điểm (chỉ hoạt động khi đang trong 1 điều)
    if (currentArticle) {
      // Điểm a) b) c) đ) e)...
      const pointMatch = p.match(/^([a-zđ])\)\s*(.+)$/i);
      if (pointMatch) {
        const num = `${pointMatch[1]})`;
        const text = pointMatch[2].trim();
        currentArticle.children.push({
          kind: "POINT",
          number: pointMatch[1],
          title: buildTitle("POINT", num, text),
          content: text,
          children: [],
        });
        continue;
      }
      // Khoản 1. 2. ...
      const clauseMatch = p.match(/^(\d+)\s*\.\s*(.+)$/);
      if (clauseMatch) {
        const num = clauseMatch[1];
        const text = clauseMatch[2].trim();
        currentArticle.children.push({
          kind: "CLAUSE",
          number: num,
          title: buildTitle("CLAUSE", num, text),
          content: text,
          children: [],
        });
        continue;
      }
      // Nội dung thuộc Điều nhưng không phải khoản/điểm: gộp vào content
      currentArticle.content =
        (currentArticle.content ? currentArticle.content + " " : "") + p;
    }
  }

  return root.children;
}

/**
 * Đếm tổng số node theo kind (đệ quy)
 */
export function countByKind(
  nodes: ParsedNode[],
): Record<SectionKind, number> {
  const acc: Record<SectionKind, number> = {
    CHAPTER: 0,
    SECTION: 0,
    ARTICLE: 0,
    CLAUSE: 0,
    POINT: 0,
  };
  function walk(arr: ParsedNode[]) {
    arr.forEach((n) => {
      acc[n.kind]++;
      walk(n.children);
    });
  }
  walk(nodes);
  return acc;
}