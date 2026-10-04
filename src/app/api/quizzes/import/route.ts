import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parseQuizFile } from "@/lib/content-import";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (!documentId)
    return NextResponse.json({ error: "Thiếu documentId" }, { status: 400 });

  const doc = await prisma.document.findFirst({
    where: { id: documentId, ownerId: user.id },
  });
  if (!doc) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".docx"))
    return NextResponse.json({ error: "Chỉ hỗ trợ .docx" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File tối đa 10MB" }, { status: 400 });
  }

  try {
    const items = await parseQuizFile(buf);
    if (items.length === 0)
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi hợp lệ trong file" },
        { status: 400 },
      );

    // Tạo transaction
    let count = 0;
    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        const wrongs = it.wrongs.length > 0 ? it.wrongs : ["(đáp án sai)"];
        // Trộn thứ tự đáp án
        const allAnswers = [
          { text: it.correct, isCorrect: true },
          ...wrongs.map((w) => ({ text: w, isCorrect: false })),
        ];
        await tx.quiz.create({
          data: {
            ownerId: user.id,
            documentId,
            question: it.question,
            answers: {
              create: allAnswers.map((a, i) => ({
                text: a.text,
                isCorrect: a.isCorrect,
                order: i,
              })),
            },
          },
        });
        count++;
      }
    });
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi không xác định" },
      { status: 500 },
    );
  }
}