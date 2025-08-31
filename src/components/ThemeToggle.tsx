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

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function SettingsDropdown({ isOpen, onClose, className = '' }: SettingsDropdownProps) {
  const { data: session } = useSession();
  
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-10" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dropdown Panel */}
      <div className={`
        fixed bottom-20 left-2 
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        rounded-md shadow-lg 
        p-3 z-50 w-64
        ${className}
      `}>
        <div className="space-y-2">
          {/* User Info - Compact */}
          {session?.user && (
            <div className="pb-2 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-3 h-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Theme Toggle */}
          <div>
            <ThemeToggle />
          </div>
        </div>
        
        {/* Arrow pointing down */}
        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45" />
      </div>
    </>
  );
}