import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const keyGen = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);
const makeKey = () => `IZI-${keyGen()}-${keyGen()}-${keyGen()}-${keyGen()}`;

const CreateSchema = z.object({
  count: z.number().int().min(1).max(50).default(1),
  description: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
});

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const keys = await prisma.privateKey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { id: true, email: true, name: true } },
    },
  });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }
  const { count, description, expiresAt } = parsed.data;
  const data = Array.from({ length: count }, () => ({
    key: makeKey(),
    description: description?.trim() ?? null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }));
  await prisma.privateKey.createMany({ data });
  return NextResponse.json({ ok: true, count }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const k = await prisma.privateKey.findUnique({
    where: { id },
    include: { users: true },
  });
  if (!k) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (k.users.length > 0) {
    return NextResponse.json(
      { error: "Key đã được dùng, không thể xóa" },
      { status: 400 },
    );
  }
  await prisma.privateKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}