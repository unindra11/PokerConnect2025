import type { Metadata } from 'next';
// Using Inter as a common sans-serif, Geist is also good
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GeistSans } from 'geist/font/sans';

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
    <html lang="en" className={`${GeistSans.variable} dark`}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
