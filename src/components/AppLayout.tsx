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
  const getCurrentPage = (): 'reports' | 'forecast' | 'drivers' => {
    if (pathname?.includes('/forecast')) return 'forecast';
    if (pathname?.includes('/drivers')) return 'drivers';
    if (pathname?.includes('/reports')) return 'reports';
    return 'forecast'; // Default to forecast instead of analysis
  };

  const [currentPage, setCurrentPage] = useState<'reports' | 'forecast' | 'drivers'>(getCurrentPage());

  // Update current page when pathname changes
  useEffect(() => {
    setCurrentPage(getCurrentPage());
  }, [pathname]);

  const handlePageChange = (page: 'reports' | 'forecast' | 'drivers') => {
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