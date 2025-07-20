'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine current page from pathname
  const getCurrentPage = (): 'analysis' | 'overview' | 'forecast' => {
    if (pathname?.includes('/overview')) return 'overview';
    if (pathname?.includes('/forecast')) return 'forecast';
    return 'analysis';
  };

  const [currentPage, setCurrentPage] = useState<'analysis' | 'overview' | 'forecast'>(getCurrentPage());

  // Update current page when pathname changes
  useEffect(() => {
    setCurrentPage(getCurrentPage());
  }, [pathname]);

  const handlePageChange = (page: 'analysis' | 'overview' | 'forecast') => {
    setCurrentPage(page);
    router.push(`/${page}`);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />
      
      {/* Main content */}
      <div className="flex-1 overflow-auto lg:pl-64">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}