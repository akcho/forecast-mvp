'use client';

import { DocumentTextIcon, Cog6ToothIcon, HomeIcon, ArrowTrendingUpIcon, ArrowLeftOnRectangleIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { DocumentTextIcon as DocumentTextIconSolid, HomeIcon as HomeIconSolid, ArrowTrendingUpIcon as ArrowTrendingUpIconSolid, AdjustmentsHorizontalIcon as AdjustmentsHorizontalIconSolid } from '@heroicons/react/24/solid';
import { signOut } from 'next-auth/react';
import { CompanySwitcher } from './CompanySwitcher';

interface SidebarProps {
  currentPage: 'reports' | 'forecast' | 'drivers';
  onPageChange: (page: 'reports' | 'forecast' | 'drivers') => void;
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const handleLogout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('qb_user_id');
      localStorage.removeItem('qb_access_token');
      localStorage.removeItem('qb_refresh_token');
      localStorage.removeItem('qb_realm_id');
      localStorage.removeItem('selected_company_id');
      localStorage.setItem('qb_logged_out', 'true');
      
      // Sign out from NextAuth
      await signOut({ callbackUrl: '/auth/signin' });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback to simple redirect
      window.location.href = '/auth/signin';
    }
  };

  const navigationItems = [
    {
      id: 'forecast' as const,
      name: 'Forecast',
      icon: ArrowTrendingUpIcon,
      iconSolid: ArrowTrendingUpIconSolid
    },
    {
      id: 'drivers' as const,
      name: 'Drivers',
      icon: AdjustmentsHorizontalIcon,
      iconSolid: AdjustmentsHorizontalIconSolid
    },
    {
      id: 'reports' as const,
      name: 'Reports',
      icon: DocumentTextIcon,
      iconSolid: DocumentTextIconSolid
    }
  ];

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900">Netflo</h1>
        </div>

        {/* Company Switcher */}
        <div className="mt-4 px-4 pb-4 border-b border-gray-200">
          <CompanySwitcher />
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
                  <div className={isActive ? 'text-blue-700' : 'text-gray-900'}>
                    {item.name}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Settings & Logout */}
          <div className="flex-shrink-0 px-2 pb-4 space-y-1">
            <button className="group w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
              <Cog6ToothIcon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Settings
            </button>
            <button 
              onClick={handleLogout}
              className="group w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
            >
              <ArrowLeftOnRectangleIcon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}