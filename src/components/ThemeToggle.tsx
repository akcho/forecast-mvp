'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon, UserIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import { useSession } from 'next-auth/react';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = true, className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: 'light' as const,
      name: 'Light',
      icon: SunIcon,
    },
    {
      id: 'dark' as const,
      name: 'Dark', 
      icon: MoonIcon,
    },
    {
      id: 'system' as const,
      name: 'System',
      icon: ComputerDesktopIcon,
    },
  ];

  return (
    <div className={`flex items-center ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-3">
          Theme
        </span>
      )}
      
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-1">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isActive = theme === themeOption.id;
          
          return (
            <button
              key={themeOption.id}
              onClick={() => setTheme(themeOption.id)}
              className={`
                flex items-center px-2 py-1 rounded text-xs font-medium transition-colors
                ${isActive 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
              title={`Switch to ${themeOption.name.toLowerCase()} theme`}
            >
              <Icon className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">{themeOption.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function SettingsModal({ isOpen, onClose, className = '' }: SettingsModalProps) {
  const { data: session } = useSession();
  
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center" 
        onClick={onClose}
        aria-hidden="true"
      >
        {/* Modal */}
        <div 
          className={`
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700 
            rounded-lg shadow-xl 
            p-6 z-50 w-96 max-w-md mx-4
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Settings
              </h2>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* User Info */}
            {session?.user && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Theme Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Appearance
              </h3>
              <ThemeToggle showLabel={false} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}