import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const CreateSchema = z.object({
  documentId: z.string(),
  sectionId: z.string().nullable().optional(),
  question: z.string().min(1),
  explanation: z.string().optional().nullable(),
  answers: z
    .array(
      z.object({
        text: z.string().min(1),
        isCorrect: z.boolean(),
      }),
    )
    .min(2)
    .refine(
      (a) => a.filter((x) => x.isCorrect).length >= 1,
      "Phải có ít nhất 1 đáp án đúng",
    ),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (!documentId)
    return NextResponse.json({ error: "Thiếu documentId" }, { status: 400 });

  const items = await prisma.quiz.findMany({
    where: { ownerId: user.id, documentId },
    orderBy: { createdAt: "asc" },
    include: {
      answers: { orderBy: { order: "asc" } },
      section: { select: { id: true, number: true, title: true, kind: true } },
    },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }
  const doc = await prisma.document.findFirst({
    where: { id: parsed.data.documentId, ownerId: user.id },
    select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { answers, ...restData } = parsed.data;
  const created = await prisma.quiz.create({
    data: {
      ownerId: user.id,
      documentId: restData.documentId,
      sectionId: restData.sectionId ?? null,
      question: restData.question.trim(),
      explanation: restData.explanation?.trim() ?? null,
      answers: {
        create: answers.map((a, i) => ({
          text: a.text.trim(),
          isCorrect: a.isCorrect,
          order: i,
        })),
      },
    },
    include: { answers: true },
  });
  return NextResponse.json(created, { status: 201 });
}