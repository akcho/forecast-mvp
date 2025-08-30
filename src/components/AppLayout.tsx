'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ChatBubbleLeftIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import ChatPanel from './ChatPanel';
import { PageHeader } from './PageHeader';
import { PageHeaderProvider, usePageHeader } from './PageHeaderContext';
import { useSession } from 'next-auth/react';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { headerConfig } = usePageHeader();
  
  // AI Assistant state with localStorage persistence
  const [showAI, setShowAI] = useState(true);
  const [aiWidth, setAiWidth] = useState(400);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [financialData, setFinancialData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Handle hydration and load localStorage values
  useEffect(() => {
    setIsHydrated(true);
    
    // Load AI assistant state from localStorage after hydration
    const savedVisibleStr = localStorage.getItem('ai-assistant-visible');
    const savedWidth = localStorage.getItem('ai-assistant-width');
    
    // Default to true if no localStorage value exists, otherwise use saved value
    const savedVisible = savedVisibleStr === null ? true : savedVisibleStr === 'true';
    
    setShowAI(savedVisible);
    if (savedWidth) {
      setAiWidth(parseInt(savedWidth));
    }
    
    // If AI assistant is open (either default or restored), set basic financial data
    if (savedVisible) {
      console.log('🤖 AI Assistant: Setting up for default/restored state, setting basic financial data...');
      setFinancialData({
        profitLoss: { connected: true, hasData: true },
        balanceSheet: { connected: true, hasData: true },
        cashFlow: { connected: true, hasData: true },
        status: 'QuickBooks connected'
      });
      console.log('✅ AI Assistant: Ready for chat (default/restored state)');
    }
  }, []);
  
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

  // Handle mobile detection
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Fetch comprehensive financial data for AI assistant
  const fetchAllFinancialData = async () => {
    if (loadingData) return;
    
    setLoadingData(true);
    try {
      console.log('🤖 AI Assistant: Fetching financial data...');
      
      // Try to fetch the main reports, but handle failures gracefully
      const [profitLossResponse, balanceSheetResponse] = await Promise.all([
        fetch('/api/quickbooks/profit-loss').catch(err => {
          console.error('P&L fetch failed:', err);
          return null;
        }),
        fetch('/api/quickbooks/balance-sheet').catch(err => {
          console.error('Balance Sheet fetch failed:', err);
          return null;
        })
      ]);

      const data: any = {};

      if (profitLossResponse?.ok) {
        data.profitLoss = await profitLossResponse.json();
        console.log('✅ AI Assistant: P&L data loaded');
      }

      if (balanceSheetResponse?.ok) {
        data.balanceSheet = await balanceSheetResponse.json();
        console.log('✅ AI Assistant: Balance Sheet data loaded');
      }

      // Set data even if some requests failed
      setFinancialData(data);
      console.log('🤖 AI Assistant: Financial data ready for chat');
    } catch (error) {
      console.error('Error fetching financial data for AI:', error);
      // Set empty object so AI assistant doesn't hang
      setFinancialData({});
    } finally {
      setLoadingData(false);
    }
  };

  // Handle AI assistant toggle
  const toggleAI = () => {
    console.log('🔄 AI Toggle clicked! Current showAI:', showAI);
    const newShowAI = !showAI;
    setShowAI(newShowAI);
    console.log('🔄 Setting showAI to:', newShowAI);
    
    if (isHydrated) {
      localStorage.setItem('ai-assistant-visible', newShowAI.toString());
      console.log('💾 Saved to localStorage:', newShowAI.toString());
    }
    
    // Always set basic financial data when opening AI assistant
    if (newShowAI) {
      console.log('🤖 AI Assistant: Setting basic financial data...');
      setFinancialData({
        profitLoss: { connected: true, hasData: true },
        balanceSheet: { connected: true, hasData: true },
        cashFlow: { connected: true, hasData: true },
        status: 'QuickBooks connected'
      });
      console.log('✅ AI Assistant: Ready for chat');
    }
  };

  // Keyboard shortcut handler (Ctrl+` like VS Code)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleAI();
      }
      if (e.key === 'Escape' && showAI) {
        setShowAI(false);
        if (isHydrated) {
          localStorage.setItem('ai-assistant-visible', 'false');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAI, isHydrated]);

  // Handle panel resizing (for right sidebar)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const finalWidth = Math.max(300, Math.min(newWidth, window.innerWidth * 0.6));
      setAiWidth(finalWidth);
      if (isHydrated) {
        localStorage.setItem('ai-assistant-width', finalWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handlePageChange = (page: 'reports' | 'forecast' | 'drivers') => {
    setCurrentPage(page);
    router.push(`/${page}`);
  };

  // Authentication guard - only show authenticated UI for signed-in users
  // Allow auth-related pages (/auth/*) to render without authentication
  if (status === 'loading') {
    // Show loading or nothing while checking authentication
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  if (status === 'unauthenticated' && !pathname?.startsWith('/auth/')) {
    // Redirect to sign-in if not authenticated and not on an auth page
    router.push('/auth/signin');
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  if (pathname?.startsWith('/auth/')) {
    // Don't show app layout UI on auth pages - just render the children
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Left Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={handlePageChange}
      />
      
      {/* Main content area */}
      <div 
        className="flex-1 flex flex-col lg:pl-64"
        style={{
          marginRight: showAI ? (isMobile ? 0 : aiWidth) : 0
        }}
      >
        {/* Page Header */}
        {headerConfig && (
          <PageHeader
            title={headerConfig.title}
            icon={headerConfig.icon}
            description={headerConfig.description}
            controls={headerConfig.controls}
            showAI={showAI}
            onAIToggle={toggleAI}
            loadingData={loadingData}
          />
        )}
        
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* AI Assistant Right Sidebar */}
      {showAI && (
        <div 
          className={`fixed top-0 right-0 h-full bg-white border-l border-gray-300 flex flex-col z-40 ${
            isMobile ? 'w-full' : ''
          }`}
          style={{ 
            width: isMobile ? '100%' : aiWidth
          }}
        >
          {/* Resizer */}
          {!isMobile && (
            <div
              className={`absolute left-0 top-0 w-1 h-full bg-gray-200 hover:bg-gray-300 cursor-col-resize ${
                isResizing ? 'bg-blue-400' : ''
              }`}
              onMouseDown={handleMouseDown}
            />
          )}
          
          {/* Panel Content */}
          <div className="flex-1 min-h-0">
            <ChatPanel 
              currentReports={financialData}
              timePeriod="12months"
            />
          </div>
        </div>
      )}

    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <PageHeaderProvider>
      <AppLayoutInner>
        {children}
      </AppLayoutInner>
    </PageHeaderProvider>
  );
}