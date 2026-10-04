import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const RegisterSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  name: z.string().min(1, "Vui lòng nhập tên").max(120),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  privateKey: z.string().min(1, "Vui lòng nhập private key"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const { email, name, password, privateKey } = parsed.data;

    // Kiểm tra email trùng
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email đã được sử dụng" },
        { status: 400 },
      );
    }

    // Tìm private key
    const keyRecord = await prisma.privateKey.findUnique({
      where: { key: privateKey.trim().toUpperCase() },
    });
    if (!keyRecord) {
      return NextResponse.json(
        { error: "Private key không tồn tại" },
        { status: 400 },
      );
    }
    if (keyRecord.isUsed) {
      return NextResponse.json(
        { error: "Private key đã được sử dụng" },
        { status: 400 },
      );
    }
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Private key đã hết hạn" },
        { status: 400 },
      );
    }

    // Tạo user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          passwordHash,
          privateKeyId: keyRecord.id,
        },
      });
      await tx.privateKey.update({
        where: { id: keyRecord.id },
        data: { isUsed: true, usedAt: new Date() },
      });
      return u;
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    console.error("register error:", err);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}