"use client";

import {
  BellRing,
  CircleHelp,
  ClipboardCheck,
  Eye,
  FileInput,
  FileOutput,
  Folder,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import styles from "./app-shell.module.css";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, groupStart: false },
  { href: "/quizzes", label: "Quizzes", icon: ListChecks, groupStart: false },
  {
    href: "/exams",
    label: "Prüfungen",
    icon: ClipboardCheck,
    groupStart: false,
  },
  {
    href: "/exam-activity",
    label: "Prüfungsaktivität",
    icon: BellRing,
    groupStart: false,
  },
  {
    href: "/questions",
    label: "Fragenpool",
    icon: CircleHelp,
    groupStart: true,
  },
  {
    href: "/categories",
    label: "Kategorien",
    icon: Folder,
    groupStart: false,
  },
  { href: "/import", label: "Import", icon: FileInput, groupStart: true },
  { href: "/export", label: "Export", icon: FileOutput, groupStart: false },
  { href: "/preview", label: "Vorschau", icon: Eye, groupStart: false },
  {
    href: "/settings",
    label: "Einstellungen",
    icon: Settings,
    groupStart: true,
  },
] as const;

function Brand() {
  return (
    <div className={styles.brand}>
      <span aria-hidden="true" className={styles.brandMark}>
        <svg viewBox="0 0 48 48">
          <path className={styles.brandMarkLight} d="M10 39 23 9" />
          <path className={styles.brandMarkAmber} d="m23 9 15 30" />
          <path className={styles.brandMarkAmber} d="M16 28h16" />
        </svg>
      </span>
      <span className={styles.brandCopy}>
        <strong className={styles.brandName}>
          ALPHASOLUTION<span>.</span>
        </strong>
        <small>ALPHAQUIZ</small>
      </span>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { state, toast } = useQuizApp();
  const violationCount = state.examEvents.filter(
    (event) =>
      event.type === "tab-hidden" || event.type === "fullscreen-exit",
  ).length;

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  if (pathname === "/login" || pathname.startsWith("/exam/")) {
    return <>{children}</>;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.mobileBar}>
        <Brand />
        <button
          aria-label={open ? "Navigation schließen" : "Navigation öffnen"}
          className={styles.menuButton}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>

      <aside className={styles.sidebar} data-open={open}>
        <Brand />
        <nav aria-label="Hauptnavigation" className={styles.nav}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <div key={item.href}>
                {item.groupStart ? <hr /> : null}
                <Link
                  aria-current={active ? "page" : undefined}
                  className={styles.navLink}
                  data-active={active}
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.href === "/exam-activity" && violationCount ? (
                    <span className={styles.navBadge}>{violationCount}</span>
                  ) : null}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className={styles.profile}>
          <span className={styles.avatar}>L</span>
          <span className={styles.profileCopy}>
            <strong>Luca</strong>
            <small>Administrator</small>
          </span>
          <button
            aria-label="Abmelden"
            className={styles.logoutButton}
            disabled={loggingOut}
            onClick={() => void logout()}
            title="Abmelden"
            type="button"
          >
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      {open ? (
        <button
          aria-label="Navigation schließen"
          className={styles.shade}
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}

      <main className={styles.main}>{children}</main>

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
