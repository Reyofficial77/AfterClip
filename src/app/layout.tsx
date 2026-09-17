import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AfterClip — Know if your clip is actually good",
  description:
    "You made the clip. Now find out if it's actually good. Honest AI review for creators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body antialiased min-h-screen bg-ink">{children}</body>
    </html>
  );
}
