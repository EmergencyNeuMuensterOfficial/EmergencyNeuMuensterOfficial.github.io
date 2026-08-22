import type { Metadata } from "next";
import localFont from "next/font/local";
import { PageFrame } from "@/components/Header";
import "./globals.css";

const sfCompact = localFont({
  src: [
    {
      path: "../fonts/sf_compact_rounded_regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/sf_compact_rounded_medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/sf_compact_rounded_semibold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/sf_compact_rounded_bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sf-compact",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OnboardX",
    template: "%s · OnboardX",
  },
  description:
    "Discord welcome and CAPTCHA verification bot. Greet new members, block raids, and keep your server for real people.",
  icons: {
    icon: "/logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sfCompact.variable}>
      <body className={`${sfCompact.className} antialiased`}>
        <PageFrame>{children}</PageFrame>
      </body>
    </html>
  );
}
