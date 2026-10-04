import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function HomePage() {
  const user = await requireUser();

  const [docCount, categoryCount] = await Promise.all([
    prisma.document.count({ where: { ownerId: user.id } }),
    prisma.category.count({ where: { ownerId: user.id } }),
  ]);

  return (
    <DashboardClient
      userName={user.name ?? user.email ?? "bạn"}
      docCount={docCount}
      categoryCount={categoryCount}
    />
  );
}