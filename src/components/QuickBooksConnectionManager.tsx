'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Title, Text, Badge } from '@tremor/react';
import { quickBooksStore } from '@/lib/quickbooks/store';

interface SharedConnectionInfo {
  hasSharedConnection: boolean;
  message: string;
  sharedBy?: string;
  sharedAt?: string;
}

export function QuickBooksConnectionManager() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sharedConnection, setSharedConnection] = useState<SharedConnectionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkConnectionStatus();
    checkSharedConnection();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const connected = await quickBooksStore.isAuthenticatedWithQuickBooks();
      setIsConnected(connected);
      
      // If connected, assume this is the admin (since only admin can connect)
      if (connected) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const checkSharedConnection = async () => {
    try {
      const response = await fetch('/api/quickbooks/share-connection');
      const data = await response.json();
      setSharedConnection(data);
    } catch (error) {
      console.error('Error checking shared connection:', error);
    }
  };

  const handleAdminConnect = () => {
    window.location.href = '/api/quickbooks/auth';
  };

  const handleShareConnection = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/quickbooks/share-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'share',
          userId: 'admin'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Connection shared successfully! Your cofounder can now access QuickBooks data.');
        await checkSharedConnection();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sharing connection:', error);
      setMessage('Failed to share connection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseSharedConnection = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/quickbooks/share-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Store the shared connection tokens
        await quickBooksStore.setTokens(data.accessToken, data.refreshToken);
        await quickBooksStore.setRealmId(data.realmId);
        
        setMessage('Successfully connected using shared QuickBooks connection!');
        setIsConnected(true);
        setIsAdmin(false);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error using shared connection:', error);
      setMessage('Failed to use shared connection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <Card className="max-w-md mx-auto">
        <Title>QuickBooks Connected ✅</Title>
        <Text className="mt-2">
          {isAdmin ? 'You are connected as admin.' : 'You are using a shared connection.'}
        </Text>
        
        {isAdmin && (
          <div className="mt-4">
            <Button 
              onClick={handleShareConnection} 
              loading={loading}
              className="w-full"
            >
              Share Connection with Team
            </Button>
            {message && (
              <Text className="mt-2 text-green-600">{message}</Text>
            )}
          </div>
        )}
      </Card>
    );
  }

  if (sharedConnection?.hasSharedConnection) {
    return (
      <Card className="max-w-md mx-auto">
        <Title>Shared QuickBooks Connection Available</Title>
        <Text className="mt-2">
          The admin has shared a QuickBooks connection with the team.
        </Text>
        <div className="mt-4 space-y-2">
          <Badge color="green">Shared by: {sharedConnection.sharedBy}</Badge>
          <Badge color="blue">Available for use</Badge>
        </div>
        <Button 
          onClick={handleUseSharedConnection} 
          loading={loading}
          className="w-full mt-4"
        >
          Use Shared Connection
        </Button>
        {message && (
          <Text className="mt-2 text-green-600">{message}</Text>
        )}
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <Title>Connect to QuickBooks</Title>
      <Text className="mt-2">
        {isAdmin 
          ? 'Connect your QuickBooks account to share with the team.'
          : 'Ask the admin to connect and share QuickBooks access.'
        }
      </Text>
      
      {isAdmin ? (
        <Button 
          onClick={handleAdminConnect} 
          className="w-full mt-4"
        >
          Connect as Admin
        </Button>
      ) : (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <Text className="text-sm text-gray-600">
            Only admins can connect to QuickBooks. Please ask your admin to:
          </Text>
          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
            <li>Connect their QuickBooks account</li>
            <li>Share the connection with the team</li>
          </ul>
        </div>
      )}
      
      {message && (
        <Text className="mt-2 text-red-600">{message}</Text>
      )}
    </Card>
  );
} 