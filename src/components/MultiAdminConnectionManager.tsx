'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Badge } from '@tremor/react';
import { getAvailableConnections, QuickBooksConnection, ConnectionStatus } from '@/lib/quickbooks/connectionManager';

interface ConnectionManagerProps {
  onConnectionChange?: (connection: QuickBooksConnection | null) => void;
}

export function MultiAdminConnectionManager({ onConnectionChange }: ConnectionManagerProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const status = await getAvailableConnections();
      setConnectionStatus(status);
      
      // Set the active connection as selected
      if (status.activeConnection) {
        setSelectedConnectionId(status.activeConnection.id);
        onConnectionChange?.(status.activeConnection);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      setMessage('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // If we already have connections, redirect to analysis page
    if (connectionStatus && connectionStatus.availableConnections.length > 0) {
      console.log('Already connected, redirecting to analysis page');
      window.location.href = '/analysis';
      return;
    }
    
    // Otherwise, go through OAuth flow
    console.log('No existing connections, starting OAuth flow');
    window.location.href = '/api/quickbooks/auth';
  };

  const handleShareConnection = async (connectionId: number) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/quickbooks/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'share',
          connectionId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Connection shared successfully!');
        await loadConnections();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sharing connection:', error);
      setMessage('Failed to share connection');
    } finally {
      setLoading(false);
    }
  };

  const handleUnshareConnection = async (connectionId: number) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/quickbooks/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unshare',
          connectionId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Connection unshared successfully!');
        await loadConnections();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error unsharing connection:', error);
      setMessage('Failed to unshare connection');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnection = async (connectionId: number) => {
    if (!confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/quickbooks/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          connectionId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Connection deleted successfully!');
        await loadConnections();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      setMessage('Failed to delete connection');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConnection = (connection: QuickBooksConnection) => {
    setSelectedConnectionId(connection.id);
    onConnectionChange?.(connection);
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

      {connectionStatus?.availableConnections.length === 0 ? (
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
          {connectionStatus?.availableConnections.map((connection) => (
            <div
              key={connection.id}
              className={`p-4 border rounded-lg ${
                selectedConnectionId === connection.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Text className="font-semibold">
                      {connection.company_name || `Company ${connection.realm_id}`}
                    </Text>
                    <Badge color={connection.is_active ? 'green' : 'red'}>
                      {connection.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {connection.is_shared && (
                      <Badge color="blue">Shared</Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Realm ID: {connection.realm_id}</div>
                    <div>Connected: {formatDate(connection.created_at)}</div>
                    <div>Last used: {formatDate(connection.last_used_at)}</div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="xs"
                    variant={selectedConnectionId === connection.id ? "primary" : "secondary"}
                    onClick={() => handleSelectConnection(connection)}
                  >
                    {selectedConnectionId === connection.id ? 'Active' : 'Use'}
                  </Button>
                  
                  {!connection.is_shared ? (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleShareConnection(connection.id)}
                      loading={loading}
                    >
                      Share
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleUnshareConnection(connection.id)}
                      loading={loading}
                    >
                      Unshare
                    </Button>
                  )}
                  
                  <Button
                    size="xs"
                    variant="secondary"
                    color="red"
                    onClick={() => handleDeleteConnection(connection.id)}
                    loading={loading}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}




    </Card>
  );
} 