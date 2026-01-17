import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get cookie header for wagmi SSR hydration
  const headersList = await headers();
  const cookie = headersList.get('cookie') ?? '';

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-tago-black min-h-screen antialiased`}>
        <Providers cookie={cookie}>
          <Navigation />
          <main className="min-h-[calc(100vh-4rem)] pt-16">
            <div className="w-full">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
