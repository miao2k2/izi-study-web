import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const StartSchema = z.object({
  quizIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = StartSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );

  // Đảm bảo tất cả quizIds thuộc user
  const count = await prisma.quiz.count({
    where: { id: { in: parsed.data.quizIds }, ownerId: user.id },
  });
  if (count !== parsed.data.quizIds.length) {
    return NextResponse.json({ error: "Quiz không hợp lệ" }, { status: 400 });
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      quizId: parsed.data.quizIds[0],
      total: parsed.data.quizIds.length,
    },
  });
  return NextResponse.json({ attemptId: attempt.id });
}

const FinishSchema = z.object({
  attemptId: z.string(),
  results: z.array(
    z.object({
      quizId: z.string(),
      answerId: z.string().nullable(),
      isCorrect: z.boolean(),
    }),
  ),
});

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = FinishSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: parsed.data.attemptId, userId: user.id },
  });
  if (!attempt)
    return NextResponse.json({ error: "Attempt không tồn tại" }, { status: 404 });

  // Tính điểm
  const correct = parsed.data.results.filter((r) => r.isCorrect).length;
  const total = parsed.data.results.length;

  // Lưu QuizResult
  await prisma.$transaction(async (tx) => {
    await tx.quizResult.deleteMany({ where: { attemptId: attempt.id } });
    for (const r of parsed.data.results) {
      if (r.answerId) {
        await tx.quizResult.create({
          data: {
            attemptId: attempt.id,
            answerId: r.answerId,
            isSelected: true,
            isCorrect: r.isCorrect,
          },
        });
      }
    }
    await tx.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        finishedAt: new Date(),
        score: correct,
        total,
      },
    });
  });

  return NextResponse.json({ ok: true, score: correct, total });
}