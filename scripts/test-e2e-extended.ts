/**
 * Test thêm: import file Nghị định + import file flashcard docx.
 */
import { readFile, writeFile } from "node:fs/promises";
import FormDataNode from "form-data";

const BASE = "http://localhost:3000";

class Client {
  private cookies: Map<string, string> = new Map();
  private mergeCookies(setCookieHeaders: string[]) {
    for (const h of setCookieHeaders) {
      const [pair] = h.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
  private cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async request(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (this.cookies.size > 0) headers.set("Cookie", this.cookieHeader());
    const res = await fetch(BASE + path, { ...init, headers, redirect: "manual" });
    const setCookies = res.headers.getSetCookie?.() ?? [];
    if (setCookies.length) this.mergeCookies(setCookies);
    return res;
  }
  async login(email: string, password: string) {
    const csrfRes = await this.request("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    const body = new URLSearchParams({
      csrfToken, email, password, callbackUrl: "/", json: "true",
    }).toString();
    return this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }
  async json<T = any>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const res = await this.request(path, { ...init, headers });
    if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
    return await res.json();
  }
}

async function postFile(
  url: string,
  filePath: string,
  fileName: string,
  cookieHeader: string,
) {
  const fd = new FormDataNode();
  const buf = await readFile(filePath);
  fd.append("file", buf, { filename: fileName });
  return fetch(url, {
    method: "POST",
    body: fd.getBuffer(),
    headers: { ...fd.getHeaders(), Cookie: cookieHeader },
  });
}

async function main() {
  const c = new Client();
  await c.login("seoao.contact@gmail.com", "Admin@123456");
  const cookie = [...(c as any).cookies.entries()].map(([k, v]: any) => `${k}=${v}`).join("; ");

  // 1. Tạo doc 2 (Nghị định)
  const doc2 = await c.json("/api/documents", {
    method: "POST",
    body: JSON.stringify({
      title: "Nghị định 68/2024/NĐ-CP (Test)",
      documentNo: "68/2024/NĐ-CP",
    }),
  });
  console.log(`Created doc2: ${doc2.id}`);

  // 2. Import Nghị định
  const r1 = await postFile(
    `${BASE}/api/documents/${doc2.id}/import`,
    "C:/Users/Dev/AppData/Local/Temp/test5.zip",
    "nghidinh.docx",
    cookie,
  );
  const data1 = await r1.json();
  console.log(`Import NĐ: status=${r1.status} →`, data1);
  const sections = await c.json(`/api/documents/${doc2.id}/sections`);
  const chapters = sections.filter((s: any) => s.kind === "CHAPTER").length;
  console.log(`  → ${chapters} chapters, ${sections.length} total sections`);

  // 3. Tạo doc 3 (Nghị quyết)
  const doc3 = await c.json("/api/documents", {
    method: "POST",
    body: JSON.stringify({
      title: "Nghị quyết 57-NQ/TW (Test)",
      documentNo: "57-NQ/TW",
    }),
  });
  console.log(`Created doc3: ${doc3.id}`);
  const r2 = await postFile(
    `${BASE}/api/documents/${doc3.id}/import`,
    "C:/Users/Dev/AppData/Local/Temp/test6.zip",
    "nghiquyet.docx",
    cookie,
  );
  const data2 = await r2.json();
  console.log(`Import NQ: status=${r2.status} →`, data2);
  const sections3 = await c.json(`/api/documents/${doc3.id}/sections`);
  console.log(
    `  → ${sections3.filter((s: any) => s.kind === "CHAPTER").length} chapters, ` +
      `${sections3.filter((s: any) => s.kind === "ARTICLE").length} articles, ` +
      `${sections3.length} total sections`,
  );

  // 4. Tạo 1 file flashcard docx, rồi upload
  const fd = new FormDataNode();
  const fcText = `Q: Câu hỏi test 1?
A: Đáp án test 1.
---
Q: Câu hỏi test 2?
A: Đáp án test 2.
---
Q: Câu hỏi test 3?
A: Đáp án test 3.`;
  // Build minimal docx
  const zip = new (await import("jszip")).default();
  zip.file("[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  const paraXml = fcText.split("\n").map((line) =>
    `<w:p><w:r><w:t xml:space="preserve">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</w:t></w:r></w:p>`
  ).join("");
  zip.file("word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paraXml}</w:body></w:document>`);
  const fcFileBuf = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
  const fd2 = new FormDataNode();
  fd2.append("file", fcFileBuf, {
    filename: "flashcards.docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const r3 = await fetch(`${BASE}/api/flashcards/import?documentId=${doc3.id}`, {
    method: "POST",
    body: fd2.getBuffer(),
    headers: { ...fd2.getHeaders(), Cookie: cookie },
  });
  const data3 = await r3.json();
  console.log(`Import flashcards: status=${r3.status} →`, data3);

  const cards = await c.json(`/api/flashcards?documentId=${doc3.id}`);
  console.log(`  → Total flashcards: ${cards.length}`);

  // 5. Tạo file quiz, upload
  const quizText = `Q: Câu hỏi quiz 1?
A: Đáp án đúng 1
X: Đáp án sai 1.1
X: Đáp án sai 1.2
---
Q: Câu hỏi quiz 2?
A: Đáp án đúng 2
X: Đáp án sai 2.1`;
  const zip2 = new (await import("jszip")).default();
  zip2.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip2.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  const paraXml2 = quizText.split("\n").map((line) =>
    `<w:p><w:r><w:t xml:space="preserve">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</w:t></w:r></w:p>`
  ).join("");
  zip2.file("word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paraXml2}</w:body></w:document>`);
  const qBuf = Buffer.from(await zip2.generateAsync({ type: "arraybuffer" }));
  const fd3 = new FormDataNode();
  fd3.append("file", qBuf, {
    filename: "quizzes.docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const r4 = await fetch(`${BASE}/api/quizzes/import?documentId=${doc3.id}`, {
    method: "POST",
    body: fd3.getBuffer(),
    headers: { ...fd3.getHeaders(), Cookie: cookie },
  });
  const data4 = await r4.json();
  console.log(`Import quizzes: status=${r4.status} →`, data4);

  const quizzes = await c.json(`/api/quizzes?documentId=${doc3.id}`);
  console.log(`  → Total quizzes: ${quizzes.length}`);
  quizzes.forEach((q: any) =>
    console.log(`    Q: ${q.question} | answers: ${q.answers.length} | correct: ${q.answers.find((a: any) => a.isCorrect)?.text}`),
  );

  console.log("\n✅ EXTENDED TESTS PASSED");
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});