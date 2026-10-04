/**
 * Parser cho file flashcard / quiz import từ docx.
 *
 * Flashcard format:
 *   Q: <front>
 *   A: <back>
 *   ---
 *
 * Quiz format:
 *   Q: <question>
 *   A: <correct answer>
 *   X: <wrong answer 1>
 *   X: <wrong answer 2>
 *   ---
 */
import { extractDocxText } from "@/lib/docx-extract";

export type FlashcardItem = { front: string; back: string };
export type QuizItem = {
  question: string;
  correct: string;
  wrongs: string[];
};

export async function parseFlashcardFile(
  buffer: Buffer,
): Promise<FlashcardItem[]> {
  const { paragraphs } = await extractDocxText(buffer);
  return parseFlashcardFromParagraphs(paragraphs.map((p) => p.text));
}

export async function parseQuizFile(buffer: Buffer): Promise<QuizItem[]> {
  const { paragraphs } = await extractDocxText(buffer);
  return parseQuizFromParagraphs(paragraphs.map((p) => p.text));
}

function parseFlashcardFromParagraphs(lines: string[]): FlashcardItem[] {
  const items: FlashcardItem[] = [];
  let cur: Partial<FlashcardItem> | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("---") || line.startsWith("(Hết mẫu")) {
      if (cur?.front && cur?.back) items.push(cur as FlashcardItem);
      cur = null;
      continue;
    }
    if (line.startsWith("Q:")) {
      if (cur?.front && cur?.back) items.push(cur as FlashcardItem);
      cur = { front: line.slice(2).trim(), back: "" };
    } else if (line.startsWith("A:")) {
      if (!cur) cur = { front: "", back: "" };
      cur.back = line.slice(2).trim();
    } else {
      // gộp vào dòng trước
      if (cur?.front && !cur?.back) cur.front += " " + line;
      else if (cur?.back) cur.back += " " + line;
    }
  }
  if (cur?.front && cur?.back) items.push(cur as FlashcardItem);
  return items.filter((i) => i.front && i.back);
}

function parseQuizFromParagraphs(lines: string[]): QuizItem[] {
  const items: QuizItem[] = [];
  let cur: Partial<QuizItem> | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("---") || line.startsWith("(Hết mẫu")) {
      if (cur?.question && cur?.correct) {
        items.push({
          question: cur.question,
          correct: cur.correct,
          wrongs: cur.wrongs ?? [],
        });
      }
      cur = null;
      continue;
    }
    if (line.startsWith("Q:")) {
      if (cur?.question && cur?.correct) {
        items.push({
          question: cur.question,
          correct: cur.correct,
          wrongs: cur.wrongs ?? [],
        });
      }
      cur = { question: line.slice(2).trim(), correct: "", wrongs: [] };
    } else if (line.startsWith("A:")) {
      if (!cur) cur = { question: "", correct: "", wrongs: [] };
      cur.correct = line.slice(2).trim();
    } else if (line.startsWith("X:")) {
      if (!cur) cur = { question: "", correct: "", wrongs: [] };
      cur.wrongs!.push(line.slice(2).trim());
    } else {
      // gộp
      if (cur?.question && !cur?.correct) cur.question += " " + line;
      else if (cur?.correct) cur.correct += " " + line;
    }
  }
  if (cur?.question && cur?.correct) {
    items.push({
      question: cur.question,
      correct: cur.correct,
      wrongs: cur.wrongs ?? [],
    });
  }
  return items.filter((i) => i.question && i.correct);
}