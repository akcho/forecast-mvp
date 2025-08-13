'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/AppLayout';
import { MultiAdminConnectionManager } from '@/components/MultiAdminConnectionManager';
import { TeamManagement } from '@/components/TeamManagement';
import { Title, Text } from '@tremor/react';

export default function AdminPage() {
  const [activeCompany, setActiveCompany] = useState<{id: string, name: string} | null>(null);
  const { data: session } = useSession();

  // Get active company info
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      if (!session?.user?.dbId) return;
      
      try {
        const response = await fetch('/api/quickbooks/status');
        const status = await response.json();
        
        if (status.activeCompanyId && status.companyConnection) {
          setActiveCompany({
            id: status.activeCompanyId,
            name: status.companyConnection.company_name
          });
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
      }
    };

    fetchCompanyInfo();
  }, [session]);

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        <div className="mb-6">
          <Title className="text-2xl font-bold text-gray-900">Admin Panel</Title>
          <Text className="text-gray-600 mt-1">
            Manage QuickBooks connections and team access
          </Text>
        </div>
        
        {/* QuickBooks Connection Management */}
        <div>
          <Title className="text-lg font-semibold text-gray-900 mb-4">QuickBooks Connections</Title>
          <MultiAdminConnectionManager />
        </div>

        {/* Team Management */}
        {activeCompany && (
          <div>
            <Title className="text-lg font-semibold text-gray-900 mb-4">Team Management</Title>
            <TeamManagement 
              companyId={activeCompany.id} 
              companyName={activeCompany.name} 
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}