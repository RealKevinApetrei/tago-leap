import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TAGO Leap',
  description: 'Trade narratives, onboard to Hyperliquid, and run robo-managers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-tago-black min-h-screen antialiased`}>
        <Providers>
          <Navigation />
          <main className="pt-20 pb-8 px-4">
            <div className="max-w-lg mx-auto">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
