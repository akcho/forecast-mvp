'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserCompanyRole {
  company_id: string;
  company_name: string;
  role: 'admin' | 'viewer';
  quickbooks_realm_id?: string;
}

interface CompanyContextType {
  selectedCompanyId: string | null;
  companies: UserCompanyRole[];
  setSelectedCompany: (companyId: string) => Promise<void>;
  disconnectCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

interface CompanyProviderProps {
  children: React.ReactNode;
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null);
  const [companies, setCompanies] = useState<UserCompanyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load selected company from localStorage on mount
  useEffect(() => {
    const savedCompanyId = localStorage.getItem('selected_company_id');
    if (savedCompanyId) {
      setSelectedCompanyIdState(savedCompanyId);
    }
  }, []);

  const refreshCompanies = useCallback(async () => {
    try {
      console.log('🔄 CompanyContext: Starting refreshCompanies...');
      setLoading(true);
      setError(null);

      console.log('📡 CompanyContext: Fetching /api/companies...');
      const response = await fetch('/api/companies');
      console.log('📡 CompanyContext: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ CompanyContext: API error:', response.status, errorText);
        throw new Error(`Failed to fetch companies: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ CompanyContext: Received data:', data);
      setCompanies(data.companies || []);

      // If no company is selected but companies exist, select the first one
      if (!selectedCompanyId && data.companies?.length > 0) {
        const firstCompanyId = data.companies[0].company_id;
        setSelectedCompanyIdState(firstCompanyId);
        localStorage.setItem('selected_company_id', firstCompanyId);
      }

      // If selected company no longer exists, clear selection
      if (selectedCompanyId && data.companies?.length > 0) {
        const stillExists = data.companies.some((c: UserCompanyRole) => c.company_id === selectedCompanyId);
        if (!stillExists) {
          const newSelectedId = data.companies[0]?.company_id || null;
          setSelectedCompanyIdState(newSelectedId);
          if (newSelectedId) {
            localStorage.setItem('selected_company_id', newSelectedId);
          } else {
            localStorage.removeItem('selected_company_id');
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load companies';
      console.error('❌ CompanyContext: Error in refreshCompanies:', err);
      setError(errorMessage);
    } finally {
      console.log('🏁 CompanyContext: refreshCompanies completed, setting loading to false');
      setLoading(false);
    }
  }, [selectedCompanyId]);

  const setSelectedCompany = useCallback(async (companyId: string) => {
    try {
      setError(null);

      // Validate that the company exists in the user's list
      const company = companies.find(c => c.company_id === companyId);
      if (!company) {
        throw new Error('Company not found in your accessible companies');
      }

      setSelectedCompanyIdState(companyId);
      localStorage.setItem('selected_company_id', companyId);

      // Optional: Call API to update server-side session if needed
      // await fetch('/api/companies/select', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ companyId })
      // });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select company');
      throw err;
    }
  }, [companies]);

  const disconnectCompany = useCallback(async (companyId: string) => {
    try {
      setError(null);

      const response = await fetch('/api/companies/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect company');
      }

      // Remove from companies list
      setCompanies(prev => prev.filter(c => c.company_id !== companyId));

      // If this was the selected company, select another or clear
      if (selectedCompanyId === companyId) {
        const remainingCompanies = companies.filter(c => c.company_id !== companyId);
        const newSelectedId = remainingCompanies[0]?.company_id || null;
        setSelectedCompanyIdState(newSelectedId);

        if (newSelectedId) {
          localStorage.setItem('selected_company_id', newSelectedId);
        } else {
          localStorage.removeItem('selected_company_id');
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect company');
      throw err;
    }
  }, [companies, selectedCompanyId]);

  // Load companies on mount
  useEffect(() => {
    refreshCompanies();
  }, [refreshCompanies]);

  const value: CompanyContextType = {
    selectedCompanyId,
    companies,
    setSelectedCompany,
    disconnectCompany,
    refreshCompanies,
    loading,
    error
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}