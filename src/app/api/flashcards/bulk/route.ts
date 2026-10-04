import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const BulkCreateSchema = z.object({
  documentId: z.string(),
  items: z
    .array(
      z.object({
        front: z.string().min(1),
        back: z.string().min(1),
        sectionId: z.string().nullable().optional(),
        tags: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = BulkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }
  const doc = await prisma.document.findFirst({
    where: { id: parsed.data.documentId, ownerId: user.id },
  });
  if (!doc) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = parsed.data.items.map((it) => ({
    ownerId: user.id,
    documentId: parsed.data.documentId,
    front: it.front.trim(),
    back: it.back.trim(),
    sectionId: it.sectionId ?? null,
    tags: it.tags ?? null,
  }));
  const r = await prisma.flashcard.createMany({ data });
  return NextResponse.json({ ok: true, count: r.count }, { status: 201 });
}