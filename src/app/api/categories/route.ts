import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.string().nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { ownerId: user.id },
    orderBy: [{ name: "asc" }],
    include: {
      _count: { select: { children: true, documents: true } },
    },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CategoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const { name, parentId } = parsed.data;
  const created = await prisma.category.create({
    data: {
      name: name.trim(),
      ownerId: user.id,
      parentId: parentId || null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}