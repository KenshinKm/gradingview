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
  },
  twitter: {
    card: "summary_large_image",
    title: "GradingView — Know Your Grade Before You Submit",
    description:
      "Get an AI-powered estimated grade and rubric breakdown before you submit.",
  },
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#2f56d6"/><text x="16" y="22" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#fff" text-anchor="middle">G</text></svg>`,
          ),
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans antialiased">{children}</body>
    </html>
  );
}
