import React from 'react';
import { Text } from '@tremor/react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  type?: 'spinner' | 'dots' | 'pulse';
  showProgress?: boolean;
  progress?: number;
  className?: string;
}

export function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'md', 
  type = 'spinner',
  showProgress = false,
  progress = 0,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const renderSpinner = () => {
    switch (type) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`}></div>
        );
      default:
        return (
          <div className={`${sizeClasses[size]} border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin`}></div>
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderSpinner()}
      <Text className={`text-gray-600 ${textSizes[size]}`}>{message}</Text>
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <Text className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</Text>
        </div>
      )}
    </div>
  );
}

interface LoadingStateProps {
  type: 'profitLoss' | 'balanceSheet' | 'cashFlow' | 'ai' | 'general';
  message?: string;
  className?: string;
}

export function LoadingState({ type, message, className = '' }: LoadingStateProps) {
  const getLoadingConfig = () => {
    switch (type) {
      case 'profitLoss':
        return {
          message: message || 'Loading Profit & Loss Statement...',
          type: 'dots' as const,
          size: 'md' as const
        };
      case 'balanceSheet':
        return {
          message: message || 'Loading Balance Sheet...',
          type: 'dots' as const,
          size: 'md' as const
        };
      case 'cashFlow':
        return {
          message: message || 'Loading Cash Flow Statement...',
          type: 'dots' as const,
          size: 'md' as const
        };
      case 'ai':
        return {
          message: message || 'Initializing AI Assistant...',
          type: 'pulse' as const,
          size: 'sm' as const
        };
      default:
        return {
          message: message || 'Loading...',
          type: 'spinner' as const,
          size: 'md' as const
        };
    }
  };

  const config = getLoadingConfig();

  return (
    <div className={`flex items-center justify-center h-full min-h-[200px] ${className}`}>
      <LoadingSpinner {...config} />
    </div>
  );
}

interface FinancialDataLoadingProps {
  loadingStates: { [key: string]: boolean };
  className?: string;
}

export function FinancialDataLoading({ loadingStates, className = '' }: FinancialDataLoadingProps) {
  const loadingCount = Object.values(loadingStates).filter(Boolean).length;
  const totalCount = Object.keys(loadingStates).length;
  const progress = totalCount > 0 ? ((totalCount - loadingCount) / totalCount) * 100 : 0;

  const getLoadingMessage = () => {
    if (loadingCount === 0) return 'All data loaded!';
    if (loadingCount === totalCount) return 'Loading financial data...';
    return `Loading ${loadingCount} of ${totalCount} reports...`;
  };

  return (
    <div className={`flex flex-col items-center justify-center h-full min-h-[200px] space-y-4 ${className}`}>
      <LoadingSpinner 
        message={getLoadingMessage()}
        type="dots"
        size="lg"
        showProgress={true}
        progress={progress}
      />
      <div className="text-xs text-gray-500 space-y-1">
        {loadingStates.profitLoss && <div>• Profit & Loss Statement</div>}
        {loadingStates.balanceSheet && <div>• Balance Sheet</div>}
        {loadingStates.cashFlow && <div>• Cash Flow Statement</div>}
      </div>
    </div>
  );
} 