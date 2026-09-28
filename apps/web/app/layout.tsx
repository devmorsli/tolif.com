import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tolif — AI Pet & Owner Portraits",
    template: "%s | Tolif",
  },
  description:
    "Turn your photos into a stunning AI portrait with your pet. Digital downloads, posters, framed prints and canvas — shipped worldwide.",
  keywords: ["pet portrait", "AI portrait", "custom pet art", "pet gift", "dog portrait", "cat portrait"],
  openGraph: {
    type: "website",
    siteName: "Tolif",
    title: "Tolif — AI Pet & Owner Portraits",
    description: "Turn your photos into a stunning AI portrait with your pet.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
