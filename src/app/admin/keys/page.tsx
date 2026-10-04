import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import PrivateKeysClient from "./PrivateKeysClient";

export default async function AdminKeysPage() {
  const user = await requireAdmin();
  // requireAdmin đã redirect nếu không phải admin
  return <PrivateKeysClient currentUserEmail={user.email} />;
}