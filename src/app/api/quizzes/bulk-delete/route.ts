import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const Schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const ids = parsed.data.ids;

  // Đảm bảo tất cả quiz thuộc về user hiện tại (chống xóa trộm)
  const owned = await prisma.quiz.findMany({
    where: { id: { in: ids }, ownerId: user.id },
    select: { id: true },
  });
  const ownedIds = owned.map((q) => q.id);
  if (ownedIds.length === 0) {
    return NextResponse.json({ error: "Không có quiz hợp lệ" }, { status: 404 });
  }

  const result = await prisma.quiz.deleteMany({
    where: { id: { in: ownedIds } },
  });

  return NextResponse.json({
    ok: true,
    requested: ids.length,
    deleted: result.count,
    skipped: ids.length - ownedIds.length,
  });
}