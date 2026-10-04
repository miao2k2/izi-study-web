/**
 * Tạo file .docx mẫu cho Flashcard / Quiz bằng zip + XML thủ công.
 * Đơn giản, không phụ thuộc thư viện lớn.
 */
import JSZip from "jszip";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Tạo file mẫu flashcard.
 * Format: mỗi flashcard là 1 đoạn:
 *   Q: <câu hỏi>
 *   A: <câu trả lời>
 *   ---
 */
export async function buildFlashcardTemplateDocx(): Promise<Buffer> {
  const example = `MẪU FLASHCARD - Hãy sửa nội dung sau rồi upload lại
(Lưu ý: xóa hết các dòng mẫu này trước khi upload)

Q: Giao dịch điện tử là gì?
A: Là giao dịch được thực hiện bằng phương tiện điện tử.
---
Q: Chữ ký số là gì?
A: Là chữ ký điện tử sử dụng thuật toán khóa không đối xứng, gồm khóa bí mật và khóa công khai.
---
Q: Thông điệp dữ liệu là gì?
A: Là thông tin được tạo ra, được gửi, được nhận, được lưu trữ bằng phương tiện điện tử.
---
(Hết mẫu. Upload chỉ những flashcard của bạn ở dưới.)

Q: <Nhập câu hỏi 1>
A: <Nhập câu trả lời 1>
---
Q: <Nhập câu hỏi 2>
A: <Nhập câu trả lời 2>
`;

  return buildSimpleDocx("Mau_Flashcard_IziStudy", example);
}

/**
 * Tạo file mẫu quiz.
 * Format:
 *   Q: <câu hỏi>
 *   A: <đáp án đúng>
 *   X: <đáp án sai 1>
 *   X: <đáp án sai 2>
 *   X: <đáp án sai 3>
 *   ---
 */
export async function buildQuizTemplateDocx(): Promise<Buffer> {
  const example = `MẪU QUIZ - Hãy sửa nội dung sau rồi upload lại
(Đáp án đúng đánh dấu "A:", đáp án sai đánh dấu "X:")
(Mỗi câu có 1 đáp án đúng và ít nhất 2 đáp án sai)

Q: Đâu là đặc điểm của chữ ký số?
A: Sử dụng thuật toán khóa không đối xứng
X: Dùng mật khẩu cố định
X: Không có khóa công khai
X: Là chữ ký viết tay số hóa
---
Q: Thông điệp dữ liệu có giá trị như văn bản khi nào?
A: Khi thông tin trong đó có thể truy cập và sử dụng được để tham chiếu
X: Khi được fax
X: Khi in ra giấy
X: Khi có chữ ký tay
---
(Hết mẫu. Upload chỉ những câu hỏi của bạn ở dưới.)

Q: <Nhập câu hỏi>
A: <đáp án đúng>
X: <đáp án sai 1>
X: <đáp án sai 2>
`;

  return buildSimpleDocx("Mau_Quiz_IziStudy", example);
}

async function buildSimpleDocx(title: string, body: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  const paragraphs = body
    .split("\n")
    .map((line) => {
      const isQ = line.startsWith("Q:");
      const isA = line.startsWith("A:");
      const isX = line.startsWith("X:");
      const isSep = line.startsWith("---");
      const bold = isQ;
      const color = isQ
        ? "16A34A"
        : isA
          ? "15803D"
          : isX
            ? "DC2626"
            : isSep
              ? "999999"
              : "000000";
      const text = line.length === 0 ? " " : escapeXml(line);
      return `<w:p><w:r><w:rPr><w:b/><w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
    })
    .join("");

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
  </w:body>
</w:document>`,
  );

  return Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
}