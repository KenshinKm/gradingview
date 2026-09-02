import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GradingView — Know Your Grade Before You Submit",
    template: "%s · GradingView",
  },
  description:
    "Upload your rubric and essay to get an AI-powered estimated grade, rubric breakdown, and actionable feedback before you submit.",
  applicationName: "GradingView",
  openGraph: {
    title: "GradingView — Know Your Grade Before You Submit",
    description:
      "Upload your rubric and essay to get an AI-powered estimated grade, rubric breakdown, and actionable feedback before you submit.",
    url: SITE_URL,
    siteName: "GradingView",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GradingView — Know Your Grade Before You Submit",
    description:
      "Get an AI-powered estimated grade and rubric breakdown before you submit.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
