import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const UpdateSchema = z.object({
  question: z.string().min(1).optional(),
  explanation: z.string().nullable().optional(),
  sectionId: z.string().nullable().optional(),
  answers: z
    .array(
      z.object({
        text: z.string().min(1),
        isCorrect: z.boolean(),
      }),
    )
    .min(2)
    .optional(),
});

async function checkOwnership(id: string, userId: string) {
  const q = await prisma.quiz.findUnique({ where: { id } });
  if (!q) return { error: "Not found", status: 404 } as const;
  if (q.ownerId !== userId) return { error: "Forbidden", status: 403 } as const;
  return { q } as const;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const check = await checkOwnership(id, user.id);
  if ("error" in check)
    return NextResponse.json({ error: check.error }, { status: check.status });
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.quizAnswer.deleteMany({ where: { quizId: id } });
    const { answers, ...rest } = data;
    return tx.quiz.update({
      where: { id },
      data: {
        ...rest,
        ...(answers
          ? {
              answers: {
                create: answers.map((a, i) => ({
                  text: a.text.trim(),
                  isCorrect: a.isCorrect,
                  order: i,
                })),
              },
            }
          : {}),
      },
      include: { answers: { orderBy: { order: "asc" } } },
    });
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const check = await checkOwnership(id, user.id);
  if ("error" in check)
    return NextResponse.json({ error: check.error }, { status: check.status });
  await prisma.quiz.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}