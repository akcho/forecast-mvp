import './globals.css';
import type { Metadata } from 'next';
import { SessionProvider } from '@/components/SessionProvider';
import { AppLayout } from '@/components/AppLayout';

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
    <html lang="en" className="h-full">
      <body className="h-full">
        <SessionProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
