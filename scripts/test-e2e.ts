/**
 * E2E test: login admin → create doc → import docx → check sections
 * Cũng test tạo flashcard + quiz.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import FormDataNode from "form-data";

const BASE = "http://localhost:3000";

class Client {
  private cookies: Map<string, string> = new Map();

  private mergeCookies(setCookieHeaders: string[]) {
    for (const h of setCookieHeaders) {
      const [pair] = h.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) {
        const k = pair.slice(0, eq).trim();
        const v = pair.slice(eq + 1).trim();
        this.cookies.set(k, v);
      }
    }
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async request(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (this.cookies.size > 0) headers.set("Cookie", this.cookieHeader());
    const res = await fetch(BASE + path, { ...init, headers, redirect: "manual" });
    const setCookies = res.headers.getSetCookie?.() ?? [];
    if (setCookies.length) this.mergeCookies(setCookies);
    return res;
  }

  async login(email: string, password: string) {
    // Get CSRF
    const csrfRes = await this.request("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    // Submit credentials
    const body = new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: "/",
      json: "true",
    }).toString();
    const res = await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return res;
  }

  async json<T = any>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await this.request(path, { ...init, headers });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`${path} → ${res.status}: ${t}`);
    }
    return await res.json();
  }
}

async function main() {
  const c = new Client();

  console.log("1. Login admin");
  const lr = await c.login("seoao.contact@gmail.com", "Admin@123456");
  console.log(`   Status: ${lr.status}`);

  const sess = await c.json("/api/auth/session");
  console.log(`   Session: ${sess.user.email} (${sess.user.role})`);

  console.log("\n2. Create document");
  const doc = await c.json("/api/documents", {
    method: "POST",
    body: JSON.stringify({
      title: "Luật Giao dịch điện tử 2023 (Test)",
      documentNo: "20/2023/QH15",
      description: "Tài liệu test",
    }),
  });
  console.log(`   Created doc: ${doc.id}`);

  console.log("\n3. Import file test2.zip");
  const fd = new FormDataNode();
  const fileBuf = await readFile("C:/Users/Dev/AppData/Local/Temp/test2.zip");
  fd.append("file", fileBuf, {
    filename: "test2.docx",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  // form-data has getHeaders() and getBuffer() / getLengthSync()
  const headers = fd.getHeaders();
  const res = await fetch(`${BASE}/api/documents/${doc.id}/import`, {
    method: "POST",
    body: fd.getBuffer(),
    headers: {
      ...headers,
      Cookie: [...(c as any).cookies.entries()]
        .map(([k, v]: any) => `${k}=${v}`)
        .join("; "),
    },
  });
  const result = await res.json();
  console.log(`   Status: ${res.status}`);
  console.log(`   Result:`, result);

  console.log("\n5. Get sections");
  const sections = await c.json(`/api/documents/${doc.id}/sections`);
  console.log(`   Total sections: ${sections.length}`);
  const chapters = sections.filter((s: any) => s.kind === "CHAPTER");
  const clauses = sections.filter((s: any) => s.kind === "CLAUSE");
  const points = sections.filter((s: any) => s.kind === "POINT");
  console.log(
    `   Chapters: ${chapters.length}, Clauses: ${clauses.length}, Points: ${points.length}`,
  );

  console.log("\n6. Create flashcard");
  const flash = await c.json("/api/flashcards", {
    method: "POST",
    body: JSON.stringify({
      documentId: doc.id,
      sectionId: chapters[0]?.id ?? null,
      front: "Giao dịch điện tử là gì?",
      back: "Là giao dịch được thực hiện bằng phương tiện điện tử.",
    }),
  });
  console.log(`   Flashcard id: ${flash.id}`);

  console.log("\n7. Create quiz");
  const quiz = await c.json("/api/quizzes", {
    method: "POST",
    body: JSON.stringify({
      documentId: doc.id,
      sectionId: null,
      question: "Đâu là đặc điểm của chữ ký số?",
      explanation: "Chữ ký số dùng thuật toán khóa không đối xứng",
      answers: [
        { text: "Khóa không đối xứng", isCorrect: true },
        { text: "Khóa đối xứng", isCorrect: false },
        { text: "Không có khóa", isCorrect: false },
      ],
    }),
  });
  console.log(`   Quiz id: ${quiz.id} with ${quiz.answers.length} answers`);

  console.log("\n8. Test template download");
  const tplRes = await fetch(`${BASE}/api/templates?type=flashcard`, {
    headers: {
      Cookie: [...(c as any).cookies.entries()]
        .map(([k, v]: any) => `${k}=${v}`)
        .join("; "),
    },
  });
  const buf = Buffer.from(await tplRes.arrayBuffer());
  await writeFile("test_template_dl.docx", buf);
  console.log(`   Downloaded: ${buf.length} bytes → test_template_dl.docx`);

  console.log("\n✅ ALL TESTS PASSED");
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});