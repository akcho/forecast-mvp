'use client';

import { useEffect, useRef } from 'react';
import { useState } from 'react';
import { Text } from '@tremor/react';
import { BuildingOffice2Icon, PlusIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useCompany } from '@/lib/context/CompanyContext';

interface CompanySwitcherProps {
  className?: string;
}

export function CompanySwitcher({ className = '' }: CompanySwitcherProps) {
  const {
    selectedCompanyId,
    companies,
    setSelectedCompany,
    loading,
    error
  } = useCompany();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCompanyChange = async (companyId: string) => {
    try {
      await setSelectedCompany(companyId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching company:', error);
    }
  };

  const handleAddCompany = () => {
    // Redirect to QuickBooks OAuth to add a new company
    window.location.href = '/api/quickbooks/auth';
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <Text className="text-sm text-gray-500 dark:text-gray-400">Loading companies...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <div className="flex items-center space-x-2">
          <BuildingOffice2Icon className="h-4 w-4 text-red-400" />
          <Text className="text-sm text-red-500">Error loading companies</Text>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <div className="flex items-center space-x-2">
          <BuildingOffice2Icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <Text className="text-sm text-gray-500 dark:text-gray-400">No companies connected</Text>
        </div>
        <button
          onClick={handleAddCompany}
          className="flex items-center justify-center px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <PlusIcon className="h-3 w-3 mr-1" />
          Connect Company
        </button>
      </div>
    );
  }

  const currentCompany = companies.find(c => c.company_id === selectedCompanyId);

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/* Custom Company Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <BuildingOffice2Icon className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {currentCompany ? (
                <div className="flex items-center space-x-2">
                  <span
                    className="text-gray-900 dark:text-gray-100 font-medium truncate"
                    title={currentCompany.company_name}
                  >
                    {currentCompany.company_name}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 flex-shrink-0">
                    {currentCompany.role}
                  </span>
                </div>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">Select company</span>
              )}
            </div>
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {companies.map((company) => (
              <button
                key={company.company_id}
                onClick={() => handleCompanyChange(company.company_id)}
                className="w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between group transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-gray-900 dark:text-gray-100 font-medium leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    title={company.company_name}
                  >
                    {company.company_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Role: {company.role}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  {company.company_id === selectedCompanyId && (
                    <CheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              </button>
            ))}

            {/* Add Company Option */}
            <div className="border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleAddCompany();
                }}
                className="w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Company</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}