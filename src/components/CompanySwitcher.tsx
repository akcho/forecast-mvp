'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Select, SelectItem, Button, Text } from '@tremor/react';
import { BuildingOffice2Icon, PlusIcon } from '@heroicons/react/24/outline';
import { getUserCompanies, UserCompanyRole } from '@/lib/auth/companies';

interface CompanySwitcherProps {
  currentCompanyId?: string;
  onCompanyChange?: (companyId: string) => void;
  className?: string;
}

export function CompanySwitcher({ 
  currentCompanyId, 
  onCompanyChange, 
  className = '' 
}: CompanySwitcherProps) {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<UserCompanyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCompanyId || '');

  useEffect(() => {
    if (session?.user?.dbId) {
      fetchUserCompanies();
    }
  }, [session]);

  const fetchUserCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/companies');
      const data = await response.json();
      
      if (data.success) {
        setCompanies(data.companies);
        
        // If no current company selected, select the first one
        if (!selectedCompanyId && data.companies.length > 0) {
          const firstCompanyId = data.companies[0].company_id;
          setSelectedCompanyId(firstCompanyId);
          onCompanyChange?.(firstCompanyId);
        }
      }
    } catch (error) {
      console.error('Error fetching user companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    onCompanyChange?.(companyId);
    
    // Store selected company in localStorage for persistence
    localStorage.setItem('selected_company_id', companyId);
  };

  const handleAddCompany = () => {
    // Redirect to QuickBooks OAuth to add a new company
    window.location.href = '/api/quickbooks/auth';
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <Text className="text-sm text-gray-500">Loading companies...</Text>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <BuildingOffice2Icon className="h-4 w-4 text-gray-400" />
        <Text className="text-sm text-gray-500">No companies connected</Text>
        <Button
          size="xs"
          variant="secondary"
          onClick={handleAddCompany}
          className="ml-2"
        >
          <PlusIcon className="h-3 w-3 mr-1" />
          Connect Company
        </Button>
      </div>
    );
  }

  const currentCompany = companies.find(c => c.company_id === selectedCompanyId);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <BuildingOffice2Icon className="h-4 w-4 text-gray-600 flex-shrink-0" />
      
      <Select
        value={selectedCompanyId}
        onValueChange={handleCompanyChange}
        className="min-w-[200px]"
      >
        {companies.map((companyRole) => (
          <SelectItem
            key={companyRole.company_id}
            value={companyRole.company_id}
          >
            <div className="flex items-center justify-between w-full">
              <span className="truncate">{companyRole.company.name}</span>
              <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                {companyRole.role}
              </span>
            </div>
          </SelectItem>
        ))}
      </Select>

      {companies.length > 0 && (
        <Button
          size="xs"
          variant="secondary"
          onClick={handleAddCompany}
          className="flex-shrink-0"
        >
          <PlusIcon className="h-3 w-3 mr-1" />
          Add Company
        </Button>
      )}
    </div>
  );
}