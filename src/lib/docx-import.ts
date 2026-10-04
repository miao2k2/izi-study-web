/**
 * Import 1 file docx vào DB.
 * - Trích xuất text
 * - Parse ra cây Chapter/Section/Article/Clause/Point
 * - Lưu cây vào bảng Section (self-relation)
 */
import { prisma } from "@/lib/prisma";
import { extractDocxText } from "@/lib/docx-extract";
import {
  parseLawText,
  type ParsedNode,
  type SectionKind,
} from "@/lib/docx-parser";

export type ImportOptions = {
  documentId: string;
  fileBuffer: Buffer;
};

export async function importDocxToDocument({
  documentId,
  fileBuffer,
}: ImportOptions) {
  const { paragraphs } = await extractDocxText(fileBuffer);
  const tree = parseLawText(paragraphs);

  // Xoá sections cũ của document (nếu có) rồi import lại
  await prisma.section.deleteMany({ where: { documentId } });

  // Insert theo từng cấp - root CHAPTER
  let order = 0;
  for (const ch of tree) {
    order = await insertNode({
      documentId,
      parentId: null,
      node: ch,
      order: order++,
    });
  }

  // Update sourceFile nếu cần
  await prisma.document.update({
    where: { id: documentId },
    data: { sourceFile: "uploaded" },
  });
}

async function insertNode({
  documentId,
  parentId,
  node,
  order,
}: {
  documentId: string;
  parentId: string | null;
  node: ParsedNode;
  order: number;
}): Promise<number> {
  const created = await prisma.section.create({
    data: {
      documentId,
      parentId,
      kind: node.kind,
      number: node.number,
      title: node.title ?? null,
      content: node.content ?? null,
      order,
    },
  });
  let nextOrder = order + 1;
  for (const child of node.children) {
    nextOrder = await insertNode({
      documentId,
      parentId: created.id,
      node: child,
      order: nextOrder,
    });
  }
  return nextOrder;
}

export function kindLabel(kind: SectionKind): string {
  return {
    CHAPTER: "Chương",
    SECTION: "Mục",
    ARTICLE: "Điều",
    CLAUSE: "Khoản",
    POINT: "Điểm",
  }[kind];
}