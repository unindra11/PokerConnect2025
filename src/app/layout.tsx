import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a common sans-serif, Geist is also good
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export const metadata: Metadata = {
  title: 'PokerConnect',
  description: 'Connect with poker players worldwide.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
