'use client';

import { ChartBarIcon, DocumentChartBarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { ChartBarIcon as ChartBarIconSolid, DocumentChartBarIcon as DocumentChartBarIconSolid } from '@heroicons/react/24/solid';

interface SidebarProps {
  currentPage: 'analysis' | 'overview';
  onPageChange: (page: 'analysis' | 'overview') => void;
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const navigationItems = [
    {
      id: 'overview' as const,
      name: 'Overview',
      icon: DocumentChartBarIcon,
      iconSolid: DocumentChartBarIconSolid,
      description: 'Dashboard overview'
    },
    {
      id: 'analysis' as const,
      name: 'Analysis',
      icon: ChartBarIcon,
      iconSolid: ChartBarIconSolid,
      description: 'Financial analysis and AI insights'
    }
  ];

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900">Netflo</h1>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {navigationItems.map((item) => {
              const isActive = currentPage === item.id;
              const Icon = isActive ? item.iconSolid : item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`group w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  <div className="text-left">
                    <div className={isActive ? 'text-blue-700' : 'text-gray-900'}>
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Settings */}
          <div className="flex-shrink-0 px-2 pb-4">
            <button className="group w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
              <Cog6ToothIcon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}