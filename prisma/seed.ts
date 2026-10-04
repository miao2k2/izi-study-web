import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();

// Sinh private key dạng dễ đọc: IZI-XXXX-XXXX-XXXX-XXXX
const keyGen = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

function makeKey() {
  return `IZI-${keyGen()}-${keyGen()}-${keyGen()}-${keyGen()}`;
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "seoao.contact@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123456";
  const adminName = process.env.ADMIN_NAME ?? "Administrator";

  // Upsert admin
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      name: adminName,
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log(`✔ Admin: ${admin.email} (id: ${admin.id})`);

  // Tạo 5 private key mẫu nếu DB chưa có key nào
  const existingKeys = await prisma.privateKey.count();
  if (existingKeys === 0) {
    const keys = Array.from({ length: 5 }, () => ({
      key: makeKey(),
      description: "Private key mẫu (seed)",
    }));
    await prisma.privateKey.createMany({ data: keys });
    console.log(`✔ Đã tạo ${keys.length} private key mẫu:`);
    keys.forEach((k) => console.log(`   ${k.key}`));
  } else {
    console.log(`ℹ Đã có ${existingKeys} private key, bỏ qua.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });