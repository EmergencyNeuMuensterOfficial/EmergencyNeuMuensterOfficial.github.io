import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OnboardX Status',
  description: 'Live status page for the OnboardX Discord bot.',
  keywords: ['Discord', 'bot', 'status', 'statuspage', 'onboardx'],
  authors: [{ name: 'OnboardX Team' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}