import type { Metadata } from "next";
import "./globals.css";
import "./persistence.css";

export const metadata: Metadata = {
  title: "BuildFlow — Ship with clarity",
  description: "Script-first project delivery for product teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="buildflow-root"
    >
      <body>{children}</body>
    </html>
  );
}
