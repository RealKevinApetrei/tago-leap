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
          <main className="min-h-[calc(100vh-5rem)] pt-20 pb-8 px-4 flex items-center justify-center">
            <div className="w-full max-w-lg">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
