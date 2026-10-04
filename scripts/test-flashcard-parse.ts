import { readFile } from "node:fs/promises";
import { parseFlashcardFile } from "../src/lib/content-import";

async function main() {
  const buf = await readFile("test_template.docx");
  const items = await parseFlashcardFile(buf);
  console.log(`Parsed ${items.length} flashcard items:`);
  items.forEach((it, i) =>
    console.log(`${i + 1}. Q: ${it.front}\n   A: ${it.back}`),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});