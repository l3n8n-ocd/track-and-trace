import type { Metadata, Viewport } from "next";
import { Archivo, DM_Sans } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

// DM Sans for reading; Archivo (with its width axis) for headings and the
// project name.
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], axes: ["opsz"] });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: { default: "Track-and-Trace", template: "%s · Track-and-Trace" },
  description:
    "Lost and found management system for Bulacan State University – Main Campus: report, search, match, and claim lost items.",
  applicationName: "Track-and-Trace",
  appleWebApp: { capable: true, title: "Track-and-Trace", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#670001",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
