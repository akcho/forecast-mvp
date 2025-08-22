'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ChatBubbleLeftIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import ChatPanel from './ChatPanel';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // AI Assistant state
  const [showAI, setShowAI] = useState(false);
  const [aiWidth, setAiWidth] = useState(400); // Default width for right sidebar
  const [isResizing, setIsResizing] = useState(false);
  const [financialData, setFinancialData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
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
      const [profitLossResponse, balanceSheetResponse, cashFlowResponse] = await Promise.all([
        fetch('/api/quickbooks/profit-loss'),
        fetch('/api/quickbooks/balance-sheet'),
        fetch('/api/quickbooks/cash-flow')
      ]);

      if (profitLossResponse.ok && balanceSheetResponse.ok && cashFlowResponse.ok) {
        const [profitLoss, balanceSheet, cashFlow] = await Promise.all([
          profitLossResponse.json(),
          balanceSheetResponse.json(),
          cashFlowResponse.json()
        ]);

        setFinancialData({
          profitLoss,
          balanceSheet,
          cashFlow
        });
      }
    } catch (error) {
      console.error('Error fetching financial data for AI:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Handle AI assistant toggle
  const toggleAI = () => {
    if (!showAI && !financialData && !loadingData) {
      fetchAllFinancialData();
    }
    setShowAI(!showAI);
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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAI]);

  // Handle panel resizing (for right sidebar)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      setAiWidth(Math.max(300, Math.min(newWidth, window.innerWidth * 0.6)));
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

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Left Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={handlePageChange}
        showAI={showAI}
        onAIToggle={toggleAI}
        loadingData={loadingData}
      />
      
      {/* Main content area */}
      <div 
        className="flex-1 flex flex-col lg:pl-64"
        style={{
          marginRight: showAI ? (isMobile ? 0 : aiWidth) : 0
        }}
      >
        <main className="flex-1 overflow-auto">
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
          
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftIcon className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">AI Financial Assistant</span>
            </div>
            <div className="flex items-center space-x-1">
              {!isMobile && (
                <button
                  onClick={() => setAiWidth(aiWidth === 300 ? 500 : 300)}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500"
                  title={aiWidth === 300 ? 'Expand sidebar' : 'Minimize sidebar'}
                >
                  {aiWidth === 300 ? (
                    <ChevronUpIcon className="h-4 w-4 rotate-90" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 rotate-90" />
                  )}
                </button>
              )}
              <button
                onClick={() => setShowAI(false)}
                className="p-1 hover:bg-gray-200 rounded text-gray-500"
                title="Close AI assistant (Ctrl+`)"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

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