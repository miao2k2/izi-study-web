import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const DocCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  documentNo: z.string().optional().nullable(),
  categoryId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const docs = await prisma.document.findMany({
    where: {
      ownerId: user.id,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { sections: true, flashcards: true, quizzes: true } },
    },
  });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = DocCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const { title, description, documentNo, categoryId } = parsed.data;
  const created = await prisma.document.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      documentNo: documentNo?.trim() ?? null,
      categoryId: categoryId || null,
      ownerId: user.id,
    },
  });
  return NextResponse.json(created, { status: 201 });
}