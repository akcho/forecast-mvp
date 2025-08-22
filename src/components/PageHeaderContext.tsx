'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface PageHeaderConfig {
  title: string;
  icon?: string;
  description?: string;
  controls?: ReactNode;
}

interface PageHeaderContextType {
  headerConfig: PageHeaderConfig | null;
  setHeaderConfig: (config: PageHeaderConfig | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [headerConfig, setHeaderConfig] = useState<PageHeaderConfig | null>(null);

  return (
    <PageHeaderContext.Provider value={{ headerConfig, setHeaderConfig }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (context === undefined) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider');
  }
  return context;
}