import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  buildFlashcardTemplateDocx,
  buildQuizTemplateDocx,
} from "@/lib/docx-template";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (type === "flashcard") {
    const buf = await buildFlashcardTemplateDocx();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Mau_Flashcard_IziStudy.docx"`,
      },
    });
  }
  if (type === "quiz") {
    const buf = await buildQuizTemplateDocx();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Mau_Quiz_IziStudy.docx"`,
      },
    });
  }
  return NextResponse.json({ error: "type phải là flashcard hoặc quiz" }, { status: 400 });
}