'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';

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
        absolute bottom-full mb-2 left-0 right-0 
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        rounded-md shadow-lg 
        p-4 z-20
        ${className}
      `}>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Settings
            </h3>
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
        
        {/* Arrow pointing down */}
        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45" />
      </div>
    </>
  );
}