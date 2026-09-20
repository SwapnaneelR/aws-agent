import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Four Horsemen — AWS Architecture Agent",
  description: "Natural language → AWS architecture → CDK code → deployed infrastructure → tested → iterated.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-void text-purelight font-body antialiased selection:bg-btc/30 selection:text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
