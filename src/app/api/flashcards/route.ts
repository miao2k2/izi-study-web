import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const CreateSchema = z.object({
  documentId: z.string(),
  sectionId: z.string().nullable().optional(),
  front: z.string().min(1),
  back: z.string().min(1),
  tags: z.string().optional().nullable(),
});

async function ensureOwnsDoc(docId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId },
    select: { id: true },
  });
  return !!doc;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  const sectionId = searchParams.get("sectionId");
  if (!documentId)
    return NextResponse.json({ error: "Thiếu documentId" }, { status: 400 });

  const items = await prisma.flashcard.findMany({
    where: {
      ownerId: user.id,
      documentId,
      ...(sectionId ? { sectionId } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { section: { select: { id: true, number: true, title: true, kind: true } } },
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
  const data = parsed.data;
  if (!(await ensureOwnsDoc(data.documentId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const created = await prisma.flashcard.create({
    data: {
      ownerId: user.id,
      documentId: data.documentId,
      sectionId: data.sectionId || null,
      front: data.front.trim(),
      back: data.back.trim(),
      tags: data.tags?.trim() ?? null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}