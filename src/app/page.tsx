import { cookies } from "next/headers";
import { getAdminUser } from "@/lib/admin-auth";
import { AdminFrame } from "@/components/page-frame";
import PublicWelcome from "@/components/public-welcome";
import Dashboard from "./dashboard";

export const metadata = { title: "AlphaQuiz", description: "Teilnahme an einer Prüfung mit dem Link der Prüfungsleitung." };

export default async function HomePage() {
  // Anonymous visits do not initialise Supabase or load application data.
  const cookieStore = await cookies();
  if (cookieStore.getAll().some(({ name }) => name.startsWith("sb-"))) {
    const admin = await getAdminUser();
    if (admin) return <AdminFrame><Dashboard /></AdminFrame>;
  }
  return <PublicWelcome />;
}
