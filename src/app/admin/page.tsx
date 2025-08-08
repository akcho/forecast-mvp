'use client';

import { AppLayout } from '@/components/AppLayout';
import { MultiAdminConnectionManager } from '@/components/MultiAdminConnectionManager';
import { Title, Text } from '@tremor/react';

export default function AdminPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <Title className="text-2xl font-bold text-gray-900">Connection Management</Title>
          <Text className="text-gray-600 mt-1">
            Manage QuickBooks connections and sharing settings
          </Text>
        </div>
        
        <MultiAdminConnectionManager />
      </div>
    </AppLayout>
  );
}