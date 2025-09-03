'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Card, Title, Text, Button, Badge } from '@tremor/react';
import { BuildingLibraryIcon, ArrowRightIcon, CheckCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface ConnectionStatus {
  isAuthenticated: boolean;
  hasConnection?: boolean;
  hasCompanyConnection?: boolean;
  userCompaniesCount?: number;
  userCompanies?: Array<{
    id: string;
    quickbooks_realm_id: string;
    name: string;
  }>;
  activeCompanyId?: string;
  companyConnection?: any;
  error?: string;
}

interface QuickBooksLoginProps {
  onConnectionChange?: (connection: any) => void;
}

export function QuickBooksLogin({ onConnectionChange }: QuickBooksLoginProps) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();

  // Check connection status when user is authenticated
  useEffect(() => {
    console.log('=== QUICKBOOKS LOGIN COMPONENT ===');
    console.log('Session effect triggered:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userDbId: session?.user?.dbId,
      status
    });
    
    if (session?.user) {
      console.log('User authenticated, checking connection status...');
      checkConnectionStatus();
    } else {
      console.log('No authenticated user, skipping connection check');
    }
  }, [session]);

  const checkConnectionStatus = async () => {
    console.log('=== CHECK CONNECTION STATUS START ===');
    if (!session?.user) {
      console.log('❌ No session user, cannot check connection status');
      return;
    }
    
    console.log('Setting loading to true...');
    setLoading(true);
    
    try {
      console.log('Fetching /api/quickbooks/status...');
      const response = await fetch('/api/quickbooks/status');
      
      console.log('Status API response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const data = await response.json();
      console.log('Status API data:', {
        isAuthenticated: data.isAuthenticated,
        hasConnection: data.hasConnection,
        userCompaniesCount: data.userCompanies?.length || 0,
        activeCompanyId: data.activeCompanyId,
        hasCompanyConnection: !!data.companyConnection,
        error: data.error
      });
      
      setConnectionStatus(data);
      
      if (onConnectionChange) {
        console.log('Calling onConnectionChange with:', data.companyConnection?.id || 'no connection');
        onConnectionChange(data.companyConnection);
      }
    } catch (error) {
      console.error('❌ ERROR CHECKING CONNECTION STATUS:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      
      const errorStatus = {
        isAuthenticated: false,
        hasConnection: false,
        userCompanies: [],
        error: 'Failed to check connection status'
      };
      console.log('Setting error connection status:', errorStatus);
      setConnectionStatus(errorStatus);
    } finally {
      console.log('Setting loading to false...');
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    console.log('=== HANDLE CONNECT START ===');
    console.log('Current session:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email
    });
    
    setConnecting(true);
    
    if (!session?.user) {
      // User needs to sign in with Google first
      console.log('User not signed in, initiating Google OAuth...');
      try {
        const result = await signIn('google', {
          redirect: false,
        });
        
        console.log('Google sign-in result:', {
          ok: result?.ok,
          error: result?.error,
          status: result?.status,
          url: result?.url
        });
        
        if (result?.ok) {
          console.log('✅ Google sign-in successful');
        } else {
          console.error('❌ Google sign-in failed:', result?.error);
          setConnecting(false);
        }
      } catch (error) {
        console.error('❌ Sign-in error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
        setConnecting(false);
      }
    } else {
      // User is already signed in, go directly to QB OAuth
      console.log('User already signed in, proceeding to QuickBooks OAuth...');
      handleQuickBooksConnect();
    }
  };

  const handleQuickBooksConnect = () => {
    console.log('=== QUICKBOOKS CONNECT ===');
    console.log('Redirecting to QuickBooks OAuth URL: /api/quickbooks/auth');
    window.location.href = '/api/quickbooks/auth';
  };

  const handleDisconnect = async () => {
    if (!connectionStatus?.activeCompanyId) return;
    
    setDisconnecting(true);
    try {
      const response = await fetch('/api/quickbooks/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: connectionStatus.activeCompanyId
        })
      });

      if (response.ok) {
        // Refresh connection status to show disconnected state
        await checkConnectionStatus();
      } else {
        console.error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    } finally {
      setDisconnecting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <Text>Loading...</Text>
          </div>
        </Card>
      </div>
    );
  }

  // Show different UI based on connection status
  if (session?.user && connectionStatus) {
    // User is authenticated with Google
    if (connectionStatus.hasCompanyConnection && connectionStatus.companyConnection) {
      // User has access to a company with QuickBooks connection
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Card className="max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>

              <Title className="text-2xl mb-2">Connected to QuickBooks</Title>
              <Text className="text-gray-600 mb-4">
                {connectionStatus.companyConnection.company_name}
              </Text>
              
              <Badge color="green" className="mb-6">
                Active Connection
              </Badge>

              <div className="space-y-3 mb-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDisconnect}
                  loading={disconnecting}
                  className="w-full"
                >
                  Disconnect QuickBooks
                </Button>
              </div>

              <Text className="text-xs text-gray-500">
                You have access to {connectionStatus.userCompaniesCount} company.
                Your financial data is ready to view.
              </Text>
            </div>
          </Card>
        </div>
      );
    } 
    
    if (connectionStatus.userCompaniesCount === 0) {
      // User has no company access - show empty state
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Card className="max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <UserGroupIcon className="w-10 h-10 text-gray-400" />
              </div>

              <Title className="text-2xl mb-2">No Company Access</Title>
              <Text className="text-gray-600 mb-6">
                You need to be added to a company to access financial data.
              </Text>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <Text className="text-sm text-blue-800 font-medium mb-2">
                  Share this email with your admin:
                </Text>
                <Text className="text-sm text-blue-700 font-mono bg-blue-100 px-2 py-1 rounded">
                  {session.user.email}
                </Text>
              </div>

              <Text className="text-xs text-gray-500">
                If you're a QuickBooks admin, you can connect a new company via the{' '}
                <a href="/admin" className="text-blue-600 hover:text-blue-800 underline">
                  Admin Panel
                </a>.
              </Text>
            </div>
          </Card>
        </div>
      );
    }
    
    // User has companies but no active connection
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
              <BuildingLibraryIcon className="w-10 h-10 text-yellow-600" />
            </div>

            <Title className="text-2xl mb-2">QuickBooks Not Connected</Title>
            <Text className="text-gray-600 mb-6">
              You're part of {connectionStatus.userCompaniesCount} company, but QuickBooks isn't connected yet.
            </Text>

            <Button
              size="lg"
              onClick={handleQuickBooksConnect}
              loading={connecting}
              className="w-full mb-6 group"
            >
              <span className="flex items-center justify-center">
                Connect QuickBooks
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <Text className="text-sm text-blue-800 font-medium mb-2">
                Admin Access Required
              </Text>
              <Text className="text-xs text-blue-700">
                Only QuickBooks company admins can authorize the connection. If you're not an admin, ask your admin to connect.
              </Text>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Default login screen for unauthenticated users
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <BuildingLibraryIcon className="w-10 h-10 text-blue-600" />
          </div>

          <Title className="text-2xl mb-2">Welcome to Netflo</Title>
          <Text className="text-gray-600 mb-8">
            Sign in with Google to access your financial dashboard and forecast your runway.
          </Text>

          <Button
            size="xl"
            onClick={handleConnect}
            loading={connecting}
            className="w-full mb-4 group"
          >
            <span className="flex items-center justify-center">
              Continue with Google
              <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>

          <Text className="text-xs text-gray-500">
            Your financial data is encrypted and secure. We use enterprise-grade security to protect your information.
          </Text>
        </div>
      </Card>
    </div>
  );
}