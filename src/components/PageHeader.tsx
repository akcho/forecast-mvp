'use client';

import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface PageHeaderProps {
  title: string;
  icon?: string;
  description?: string;
  controls?: React.ReactNode;
  showAI: boolean;
  onAIToggle: () => void;
  loadingData?: boolean;
}

export function PageHeader({ 
  title, 
  icon, 
  description, 
  controls, 
  showAI, 
  onAIToggle, 
  loadingData = false 
}: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Title and Description */}
        <div className="flex items-center space-x-3">
          {icon && <span className="text-2xl">{icon}</span>}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Middle: Page-specific controls */}
        {controls && (
          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-4">
              {controls}
            </div>
          </div>
        )}

        {/* Right: AI Assistant Toggle */}
        <div className="flex items-center">
          <button
            onClick={onAIToggle}
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              showAI
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title="Toggle AI Assistant (Ctrl+`)"
          >
            <ChatBubbleLeftIcon 
              className={`h-5 w-5 mr-2 ${
                showAI ? 'text-blue-700' : 'text-gray-500'
              }`} 
            />
            <span className="hidden sm:inline">AI Assistant</span>
            {loadingData && (
              <div className="ml-2">
                <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}