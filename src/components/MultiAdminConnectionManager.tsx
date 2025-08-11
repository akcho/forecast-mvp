'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Badge } from '@tremor/react';
import { QuickBooksConnection } from '@/lib/quickbooks/connectionManager';
import { useSession } from 'next-auth/react';

interface ConnectionManagerProps {
  onConnectionChange?: (connection: QuickBooksConnection | null) => void;
}

interface ConnectionStatus {
  userCompanies: any[];
  companyConnection?: QuickBooksConnection;
  activeCompanyId?: string;
  error?: string;
}

export function MultiAdminConnectionManager({ onConnectionChange }: ConnectionManagerProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.dbId) {
      loadConnections();
    }
  }, [session]);

  const loadConnections = async () => {
    if (!session?.user?.dbId) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/quickbooks/status');
      const status = await response.json();
      setConnectionStatus(status);
      
      // Set the active connection as selected
      if (status.hasConnection && status.companyConnection) {
        onConnectionChange?.(status.companyConnection);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      setMessage('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // If we already have a company connection, redirect to analysis page
    if (connectionStatus?.companyConnection) {
      console.log('Already connected, redirecting to analysis page');
      window.location.href = '/analysis';
      return;
    }
    
    // Otherwise, go through OAuth flow
    console.log('No existing connections, starting OAuth flow');
    window.location.href = '/api/quickbooks/auth';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !connectionStatus) {
    return (
      <Card className="max-w-4xl mx-auto">
        <Title>QuickBooks Connections</Title>
        <Text className="mt-2">Loading connections...</Text>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Title>QuickBooks Connections</Title>
        <Text className="mt-1">
          Connect your QuickBooks account to access financial data and share with your team
        </Text>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          <Text className="text-sm">{message}</Text>
        </div>
      )}

      {connectionStatus?.error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg">
          <Text className="text-sm text-red-700">{connectionStatus.error}</Text>
        </div>
      )}

      {!connectionStatus?.companyConnection ? (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <Text className="text-lg font-medium text-gray-900 mb-2">
              No QuickBooks connections yet
            </Text>
            <Text className="text-gray-500 mb-6">
              Connect your QuickBooks account to start analyzing your financial data
            </Text>
          </div>
          <Button 
            onClick={handleConnect}
            size="lg"
            className="px-8"
          >
            Connect QuickBooks
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Text className="font-semibold">
                    {connectionStatus.companyConnection.company_name || 'Connected Company'}
                  </Text>
                  <Badge color="green">Connected</Badge>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div><span className="font-medium">Company:</span> {connectionStatus.companyConnection.company_name || 'QuickBooks Company'}</div>
                  <div><span className="font-medium">Connected:</span> {formatDate(connectionStatus.companyConnection.created_at)}</div>
                  <div><span className="font-medium">Last used:</span> {formatDate(connectionStatus.companyConnection.last_used_at)}</div>
                  <div className="text-xs text-gray-500">Realm ID: {connectionStatus.companyConnection.realm_id}</div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => window.location.href = '/analysis'}
                >
                  Go to Analysis
                </Button>
              </div>
            </div>
          </div>
          
          {connectionStatus.userCompanies?.length > 1 && (
            <div className="mt-4">
              <Text className="font-medium mb-2">Your Companies:</Text>
              <div className="space-y-2">
                {connectionStatus.userCompanies.map((company) => (
                  <div key={company.id} className="p-3 bg-gray-50 rounded border">
                    <Text className="font-medium">{company.company?.name || 'Unnamed Company'}</Text>
                    <Text className="text-sm text-gray-600">Role: {company.role}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
} 