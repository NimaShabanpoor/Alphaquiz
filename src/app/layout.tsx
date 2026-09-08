import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import PageFrame from "@/components/page-frame";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();

  return (
    <html data-scroll-behavior="smooth" lang="de-CH">
      <body>
        <PageFrame>{children}</PageFrame>
      </body>
    </html>
  );
}
