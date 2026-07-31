import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/app-provider";
import AppShell from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AlphaQuiz – Quiz-Manager",
    template: "%s · AlphaQuiz",
  },
  description:
    "Quizzes erstellen, Access-Daten übernehmen und für Microsoft Forms exportieren.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfaf8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="de-CH">
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
