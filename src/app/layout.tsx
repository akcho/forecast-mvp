import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Runway Analysis Dashboard',
  description: 'Make informed decisions about your company\'s financial future',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
