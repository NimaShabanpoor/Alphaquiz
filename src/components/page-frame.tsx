"use client";

import { usePathname } from "next/navigation";
import { AppProvider } from "./app-provider";
import AppShell from "./app-shell";
import { isAdminPagePath } from "@/lib/admin-page-path";

export function AdminFrame({ children }: { children: React.ReactNode }) {
  return <AppProvider><AppShell>{children}</AppShell></AppProvider>;
}

export default function PageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isAdminPagePath(pathname) ? <AdminFrame>{children}</AdminFrame> : <>{children}</>;
}
