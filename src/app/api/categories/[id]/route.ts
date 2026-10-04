import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  parentId: z.string().nullable().optional(),
});

async function checkOwnership(id: string, userId: string) {
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return { error: "Not found", status: 404 } as const;
  if (cat.ownerId !== userId) return { error: "Forbidden", status: 403 } as const;
  return { cat } as const;
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
  const updated = await prisma.category.update({
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

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}