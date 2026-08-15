import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ProfileChip } from '../components/ProfileChip';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OnboardX',
  description: 'OnboardX — a Discord bot that helps server owners onboard new members with a smooth, automated welcome experience.',
  keywords: ['Discord', 'bot', 'status', 'statuspage', 'onboardx'],
  authors: [{ name: 'OnboardX Team' }],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: '/icon', type: 'image/x-icon' }],
    shortcut: '/icon',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <ProfileChip />
      </body>
    </html>
  );
}