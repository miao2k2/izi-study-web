import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const UpdateSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
  sectionId: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
});

async function checkOwnership(id: string, userId: string) {
  const fc = await prisma.flashcard.findUnique({ where: { id } });
  if (!fc) return { error: "Not found", status: 404 } as const;
  if (fc.ownerId !== userId) return { error: "Forbidden", status: 403 } as const;
  return { fc } as const;
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
  const updated = await prisma.flashcard.update({ where: { id }, data: parsed.data });
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
  await prisma.flashcard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}