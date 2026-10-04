/* eslint-disable */
// Test parser với file mẫu
import { readFile } from "node:fs/promises";
import { extractDocxText } from "../src/lib/docx-extract";
import { parseLawText, countByKind } from "../src/lib/docx-parser";

async function main() {
  const samples = [
    {
      label: "Luật Giao dịch điện tử 20/2023/QH15",
      path: "C:/Users/Dev/AppData/Local/Temp/test2.zip",
    },
    {
      label: "Nghị định 68/2024/NĐ-CP",
      path: "C:/Users/Dev/AppData/Local/Temp/test5.zip",
    },
    {
      label: "Nghị quyết 57-NQ/TW",
      path: "C:/Users/Dev/AppData/Local/Temp/test6.zip",
    },
  ];

  for (const s of samples) {
    console.log("\n==============================");
    console.log(s.label);
    console.log("==============================");
    const buf = await readFile(s.path);
    const { paragraphs } = await extractDocxText(buf);
    console.log(`Tổng số đoạn: ${paragraphs.length}`);
    console.log(`10 đoạn đầu:`);
    paragraphs.slice(0, 10).forEach((p, i) => console.log(`  ${i}: ${p.text}`));

    const parsed = parseLawText(paragraphs);
    const counts = countByKind(parsed);
    console.log(`Số chương: ${counts.CHAPTER}`);
    console.log(`Số mục: ${counts.SECTION}`);
    console.log(`Số điều: ${counts.ARTICLE}`);
    console.log(`Số khoản: ${counts.CLAUSE}`);
    console.log(`Số điểm: ${counts.POINT}`);

    console.log("Cấu trúc:");
    parsed.slice(0, 3).forEach((ch) => {
      console.log(`  Chương ${ch.number} - ${ch.title ?? ""}`);
      ch.children.slice(0, 3).forEach((c) => {
        if (c.kind === "SECTION") {
          console.log(`    Mục ${c.number} - ${c.title}`);
          c.children.slice(0, 3).forEach((a) =>
            console.log(`      ${a.number} - ${a.title ?? a.content?.slice(0, 60)}`),
          );
        } else if (c.kind === "ARTICLE") {
          console.log(`    ${c.number} - ${c.title?.slice(0, 60)}`);
        }
      });
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});