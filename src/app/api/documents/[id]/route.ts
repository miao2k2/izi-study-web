import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const UpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  documentNo: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

async function checkOwnership(id: string, userId: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { error: "Not found", status: 404 } as const;
  if (doc.ownerId !== userId) return { error: "Forbidden", status: 403 } as const;
  return { doc } as const;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { sections: true, flashcards: true, quizzes: true } },
    },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
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
  const updated = await prisma.document.update({
    where: { id },
    data: parsed.data,
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
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}