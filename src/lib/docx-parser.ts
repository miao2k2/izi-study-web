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
 * - `title` lưu tiêu đề để hiển thị luôn: "Chương I: NHỮNG QUY ĐỊNH CHUNG",
 *   "Điều 2: Đối tượng áp dụng", "Khoản 1", "Điểm a"
 *   - Khoản/Điểm: KHÔNG gắn nội dung vào title để tránh duplicate với content
 * - `content` lưu phần text của Khoản/Điểm/Điều (nội dung sau tiêu đề nếu có)
 *
 * Nếu 1 Chương chỉ có dòng "Chương I" mà không có tiêu đề phía sau, parser sẽ
 * gom dòng text đứng ngay sau đó vào title cho đến khi gặp cấp mới.
 */

export type SectionKind = "CHAPTER" | "SECTION" | "ARTICLE" | "CLAUSE" | "POINT";

export type ParsedNode = {
  kind: SectionKind;
  number: string;
  title?: string;
  content?: string;
  children: ParsedNode[];
};

const KIND_LABEL: Record<SectionKind, string> = {
  CHAPTER: "Chương",
  SECTION: "Mục",
  ARTICLE: "Điều",
  CLAUSE: "Khoản",
  POINT: "Điểm",
};

/**
 * Gom các dòng text kế tiếp ngay sau chapter/section chỉ có số (không có title).
 * Dừng khi gặp 1 dòng match cấp mới (chapter/section/article/clause/point).
 */
function collectTrailingText(
  paragraphs: { text: string; bold: boolean }[],
  i: number,
  kind: "CHAPTER" | "SECTION",
): string | undefined {
  const parts: string[] = [];
  let j = i + 1;
  while (j < paragraphs.length) {
    const next = paragraphs[j].text.trim();
    if (!next) {
      j++;
      continue;
    }
    if (
      /^Chương\s+[IVXLCDM]+\b/i.test(next) ||
      /^([IVXLCDM]+)\s*-\s*/.test(next) ||
      /^Mục\s+\d+/i.test(next) ||
      /^Điều\s+\d+/i.test(next)
    ) {
      break;
    }
    parts.push(next);
    j++;
    if (parts.length >= 5) break;
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/**
 * Build tiêu đề theo kind.
 * - Khoản/Điểm: chỉ "Khoản 1", "Điểm a" - KHÔNG gắn nội dung để tránh duplicate
 *   với content (vì content chính là phần titleRest).
 * - Chương/Mục/Điều: gắn titleRest nếu có, fallback "Chương I", "Điều 2".
 */
function buildTitle(
  kind: SectionKind,
  number: string,
  titleRest?: string,
): string {
  const label = KIND_LABEL[kind];
  const rest = titleRest?.trim();
  if (kind === "CLAUSE" || kind === "POINT") {
    return `${label} ${number}`;
  }
  if (!rest) return `${label} ${number}`;
  return `${label} ${number}: ${rest}`;
}

/**
 * Phân tích các đoạn văn bản trích xuất từ file docx.
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
    if (!p) continue;

    // 1. Chương
    const chapterMatch = p.match(/^Chương\s+([IVXLCDM]+)\b\s*(.*)$/i);
    if (chapterMatch) {
      const num = chapterMatch[1];
      let rest = chapterMatch[2]?.trim();
      // Chương chỉ có số ở dòng riêng - lấy title phía sau nếu có
      // (vd file .docx có "Chương I" rồi đến "NHỮNG QUY ĐỊNH CHUNG" ở dòng kế tiếp)
      if (!rest) {
        rest = collectTrailingText(paragraphs, i, "CHAPTER");
      }
      currentChapter = {
        kind: "CHAPTER",
        number: num,
        title: buildTitle("CHAPTER", num, rest),
        children: [],
      };
      root.children.push(currentChapter);
      currentSection = null;
      currentArticle = null;
      continue;
    }
    // Chương kiểu gộp
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

    // 1b. Nghị quyết:"I- QUAN ĐIỂM"
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
      let titleRest = sectionMatch[2]?.replace(/^\.\s*/, "").trim();
      // Mục chỉ có số ở dòng riêng - lấy title phía sau nếu có
      if (!titleRest) {
        titleRest = collectTrailingText(paragraphs, i, "SECTION");
      }
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
      // File bị cắt từ giữa Chương - tạo Chương ảo
      if (currentChapter === root) {
        currentChapter = {
          kind: "CHAPTER",
          number: "0",
          title: buildTitle("CHAPTER", "0", "Phần mở đầu"),
          children: [],
        };
        root.children.push(currentChapter);
        currentSection = null;
      }
      const num = articleMatch[1];
      const titleRest = articleMatch[2]?.trim();
      currentArticle = {
        kind: "ARTICLE",
        number: num,
        title: buildTitle("ARTICLE", num, titleRest),
        content: undefined,
        children: [],
      };
      const container = currentSection ?? currentChapter;
      container.children.push(currentArticle);
      continue;
    }

    // 3b. Nghị quyết item
    const nqItemMatch = p.match(/^(\d+)\.\s+(.+)$/);
    if (nqItemMatch && !currentArticle) {
      if (currentChapter === root) {
        currentChapter = {
          kind: "CHAPTER",
          number: "0",
          title: buildTitle("CHAPTER", "0", "Phần mở đầu"),
          children: [],
        };
        root.children.push(currentChapter);
        currentSection = null;
      }
      const num = nqItemMatch[1];
      const titleRest = nqItemMatch[2].trim();
      currentArticle = {
        kind: "ARTICLE",
        number: num,
        title: buildTitle("ARTICLE", num, titleRest),
        content: undefined,
        children: [],
      };
      const container = currentSection ?? currentChapter;
      container.children.push(currentArticle);
      continue;
    }

    // 4. Khoản / Điểm (chỉ trong điều)
    if (currentArticle) {
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
      // Text thừa trong Điều: gán vào Khoản/Điểm cuối cùng nếu có,
      // để tránh nuốt mất nội dung tiếp theo của Khoản hiện tại.
      // Nếu Điều chưa có Khoản/Điểm nào thì gán vào content của Điều (giữ cũ).
      const lastChild = currentArticle.children.at(-1);
      if (lastChild) {
        lastChild.content =
          (lastChild.content ? lastChild.content + " " : "") + p;
      } else {
        currentArticle.content =
          (currentArticle.content ? currentArticle.content + " " : "") + p;
      }
    } else if (currentSection && !currentSection.title) {
      const rest = collectTrailingText(paragraphs, i, "SECTION");
      const text = rest ?? p;
      const combined = buildTitle("SECTION", currentSection.number, text);
      if (combined) currentSection.title = combined;
    } else if (
      currentChapter !== root &&
      !currentChapter.title &&
      !currentSection
    ) {
      const rest = collectTrailingText(paragraphs, i, "CHAPTER");
      const text = rest ?? p;
      const combined = buildTitle("CHAPTER", currentChapter.number, text);
      if (combined) currentChapter.title = combined;
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