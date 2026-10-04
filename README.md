# IZI Study Web

Ứng dụng web hỗ trợ **học thuộc văn bản pháp luật** với Flashcard và Quiz, đồng thời có thể import trực tiếp các văn bản `.docx` để tạo cấu trúc Chương / Mục / Điều / Khoản / Điểm.

## 🎯 Tính năng chính

- 🔐 **Xác thực**: NextAuth + Credentials provider.
- 👑 **Vai trò Admin / User**: Admin quản lý Private Key để cấp cho người dùng đăng ký.
- 📁 **Thư mục phân cấp (Categories)**: Thư mục lồng nhau, không giới hạn cấp.
- 📜 **Tài liệu**: CRUD tài liệu, import từ file `.docx`.
- 🌳 **Cấu trúc văn bản pháp luật**: Hỗ trợ phân tích Chapter / Section / Article / Clause / Point.
- 🪄 **Import docx thông minh**: Tự động nhận biết:
  - `Chương I`, `Chương II` ... (Luật, Nghị định)
  - `Mục 1`, `Mục 2` ...
  - `Điều 1. Tên điều`
  - `1.` `2.` ... (Khoản)
  - `a)` `b)` ... (Điểm)
  - `I-`, `II-`, `III-` (Nghị quyết)
- 📇 **Flashcard**: CRUD thủ công + import từ file `.docx` (mẫu có sẵn), chế độ học với lật thẻ.
- ❓ **Quiz**: CRUD thủ công + import từ file `.docx`, **xáo trộn câu hỏi và đáp án** mỗi lượt làm.
- 📱 **Responsive**: Tương thích desktop & mobile (Ant Design responsive grid + Drawer cho menu mobile).
- 🎨 **UI**: Ant Design 6 với theme xanh lá chủ đạo.

## 🧰 Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Ant Design 6** (`antd`, `@ant-design/icons`, `@ant-design/nextjs-registry`)
- **NextAuth 4** (Credentials + JWT session)
- **Prisma 5** + **PostgreSQL**
- **bcryptjs** (mã hoá mật khẩu)
- **mammoth / jszip** (trích xuất docx)
- **nanoid / zod** (utilities)

## 🚀 Cài đặt nhanh

### 1. Yêu cầu
- Node.js >= 20
- PostgreSQL local (>= 13) — có thể dùng Docker hoặc cài trực tiếp.

### 2. Cài dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường
Sao chép `.env.example` thành `.env` và chỉnh sửa nếu cần:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/izi_study?schema=public"
NEXTAUTH_SECRET="some-random-string"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="seoao.contact@gmail.com"
ADMIN_PASSWORD="Admin@123456"
ADMIN_NAME="Administrator"
```

### 4. Khởi tạo database & seed
```bash
npm run db:push       # Tạo schema trong database
npm run db:seed       # Tạo admin mặc định + 5 private key mẫu
```

### 5. Chạy dev server
```bash
npm run dev
```
Mở [http://localhost:3000](http://localhost:3000).

## 📜 Scripts có sẵn

| Lệnh                | Mô tả                                             |
|---------------------|---------------------------------------------------|
| `npm run dev`       | Chạy dev server                                   |
| `npm run build`     | Build production                                  |
| `npm run start`     | Chạy server production                            |
| `npm run lint`      | Chạy ESLint                                       |
| `npm run db:push`   | Đồng bộ schema lên DB (dùng cho development)      |
| `npm run db:seed`   | Chạy seed script (admin + private keys)           |
| `npm run db:studio` | Mở Prisma Studio (GUI xem DB)                     |

## 🗂 Cấu trúc thư mục

```
izi-study-web/
├─ prisma/
│  ├─ schema.prisma        # Schema database
│  └─ seed.ts              # Seed admin + private keys
├─ scripts/
│  ├─ test-parser.ts       # Test docx parser
│  └─ test-flashcard-parse.ts
├─ src/
│  ├─ app/
│  │  ├─ (main)/           # Layout có sider (đăng nhập mới vào được)
│  │  │  ├─ page.tsx       # Dashboard
│  │  │  ├─ categories/    # Quản lý thư mục
│  │  │  └─ documents/     # Tài liệu + chi tiết + flashcards + quizzes
│  │  ├─ admin/keys/       # Admin: quản lý private keys
│  │  ├─ api/              # REST API endpoints
│  │  ├─ login/            # Trang đăng nhập
│  │  └─ register/         # Trang đăng ký (cần private key)
│  ├─ lib/
│  │  ├─ prisma.ts         # Prisma client singleton
│  │  ├─ auth.ts           # NextAuth options
│  │  ├─ session.ts        # Helper getCurrentUser/requireUser/requireAdmin
│  │  ├─ theme.ts          # Ant Design theme (xanh lá)
│  │  ├─ docx-extract.ts   # Trích xuất text từ file .docx
│  │  ├─ docx-parser.ts    # Parser Luật/Nghị định/Nghị quyết
│  │  ├─ docx-import.ts    # Import docx vào DB
│  │  ├─ docx-template.ts  # Tạo file mẫu .docx cho flashcard/quiz
│  │  └─ content-import.ts # Parse file flashcard/quiz import
│  ├─ providers.tsx        # Antd + Session providers
│  └─ globals.css
├─ .env                    # Biến môi trường (KHÔNG commit)
├─ .env.example
├─ next.config.ts
├─ package.json
└─ README.md
```

## 🧪 Hướng dẫn sử dụng

### Bước 1 — Đăng nhập với tài khoản admin
- Email: `seoao.contact@gmail.com`
- Mật khẩu: `Admin@123456` (mặc định từ `.env.example`)

### Bước 2 — Tạo Private Key cho user mới
1. Vào menu **Private Keys** (chỉ admin)
2. Bấm **Tạo key mới** → chọn số lượng → **Tạo**
3. Copy key và gửi cho user

### Bước 3 — User đăng ký
1. Mở trang `/register`
2. Nhập email, mật khẩu và **Private Key** được cấp
3. Sau khi đăng ký thành công → tự động đăng nhập

### Bước 4 — Tạo thư mục & tài liệu
- **Thư mục**: Menu **Thư mục** → tạo cây thư mục tuỳ ý
- **Tài liệu**: Menu **Tài liệu** → **Tạo tài liệu** → nhập tiêu đề/số hiệu/thư mục
- **Import docx**: Ở danh sách tài liệu, bấm **Import .docx** → chọn file Luật/Nghị định/Nghị quyết (.docx)
- Hệ thống tự parse Chương/Mục/Điều/Khoản/Điểm và lưu vào DB

### Bước 5 — Tạo Flashcard / Quiz
- Vào chi tiết tài liệu → bấm **Flashcards** hoặc **Quizzes**
- **Tạo thủ công**: bấm **Tạo flashcard** / **Tạo câu hỏi**
- **Import từ .docx**:
  - Bấm **Tải mẫu** để tải file docx mẫu (đã có hướng dẫn bên trong)
  - Sửa nội dung mẫu → upload lại bằng **Import .docx**

### Bước 6 — Học Flashcard
- Mở flashcards của tài liệu → bấm **Học**
- Lật thẻ xem đáp án, điều hướng Trước / Sau

### Bước 7 — Làm Quiz
- Mở quiz của tài liệu → bấm **Làm quiz**
- Mỗi lần vào làm: **câu hỏi và đáp án được xáo trộn ngẫu nhiên**
- Sau khi nộp → xem kết quả chi tiết từng câu

## 🔐 Bảo mật

- Mật khẩu hash bằng `bcryptjs` (cost = 10)
- Private key chỉ dùng 1 lần, có thể đặt hạn sử dụng
- Session JWT, secret lưu trong `.env` (hãy đổi khi deploy production)
- Mỗi user chỉ thấy tài liệu/flashcard/quiz của chính mình

## 📌 Ghi chú

- File `.docx` tối đa 20MB (tài liệu) / 10MB (flashcard/quiz import).
- Parser hỗ trợ 3 định dạng: Luật (`Chương I/Điều 1`), Nghị định (`Chương I/Điều 1`), Nghị quyết (`I-/II-/1.`). Nếu gặp định dạng khác, có thể bổ sung regex trong `src/lib/docx-parser.ts`.
- Đây là MVP. Một số tính năng nâng cao (Spaced Repetition cho flashcard, chế độ dark, multi-statistic nếu cần) có thể bổ sung sau.

## 📄 License
MIT — sử dụng tự do cho mục đích cá nhân & thương mại.