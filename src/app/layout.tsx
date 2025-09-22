import './globals.css';
import type { Metadata } from 'next';
import { SessionProvider } from '@/components/SessionProvider';
import { AppLayout } from '@/components/AppLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { EnvironmentIndicator } from '@/components/EnvironmentIndicator';

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
        <ThemeProvider>
          <SessionProvider>
            <AppLayout>
              {children}
            </AppLayout>
            <EnvironmentIndicator />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
