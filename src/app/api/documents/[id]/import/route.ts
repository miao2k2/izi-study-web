import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { importDocxToDocument } from "@/lib/docx-import";

// Cấu hình bodyParser để nhận file lớn (tăng từ 1MB default lên 20MB)
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const doc = await prisma.document.findFirst({ where: { id, ownerId: user.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json(
      { error: "Chỉ hỗ trợ file .docx" },
      { status: 400 },
    );
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File tối đa 20MB" }, { status: 400 });
  }

  try {
    await importDocxToDocument({ documentId: id, fileBuffer: buf });
    const sectionCount = await prisma.section.count({ where: { documentId: id } });
    return NextResponse.json({ ok: true, sectionCount });
  } catch (e) {
    console.error("import error:", e);
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}