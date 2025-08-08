'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Card, Title, Text, Button } from '@tremor/react';
import { BuildingLibraryIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface QuickBooksLoginProps {
  onConnectionChange?: (connection: any) => void;
}

export function QuickBooksLogin({}: QuickBooksLoginProps) {
  const [connecting, setConnecting] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    // Auto-redirect to QB OAuth once user is signed in via Google
    if (session?.user && !connecting) {
      console.log('User is signed in via Google, redirecting to QB OAuth');
      handleQuickBooksConnect();
    }
  }, [session, connecting]);

  const handleConnect = async () => {
    setConnecting(true);
    
    if (!session?.user) {
      // User needs to sign in with Google first
      try {
        const result = await signIn('google', {
          redirect: false,
        });
        
        if (result?.ok) {
          // After Google sign-in, QB OAuth will be triggered by useEffect
          console.log('Google sign-in successful');
        } else {
          console.error('Google sign-in failed:', result?.error);
          setConnecting(false);
        }
      } catch (error) {
        console.error('Sign-in error:', error);
        setConnecting(false);
      }
    } else {
      // User is already signed in, go directly to QB OAuth
      handleQuickBooksConnect();
    }
  };

  const handleQuickBooksConnect = () => {
    console.log('Redirecting to QuickBooks OAuth');
    localStorage.removeItem('qb_logged_out');
    window.location.href = '/api/quickbooks/auth';
  };

  if (status === 'loading') {
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <BuildingLibraryIcon className="w-10 h-10 text-blue-600" />
          </div>

          {/* Title */}
          <Title className="text-2xl mb-2">Welcome to Netflo</Title>
          <Text className="text-gray-600 mb-8">
            {!session?.user 
              ? "Sign in with Google and connect your QuickBooks account to analyze your financial data and forecast your runway."
              : "Connect your QuickBooks account to access your financial dashboard."
            }
          </Text>

          {/* Connect Button */}
          <Button
            size="xl"
            onClick={handleConnect}
            loading={connecting}
            className="w-full mb-4 group"
          >
            <span className="flex items-center justify-center">
              {!session?.user ? 'Continue with Google' : 'Connect QuickBooks'}
              <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>

          {/* Security Note */}
          <Text className="text-xs text-gray-500">
            Your financial data is encrypted and secure. We use enterprise-grade security to protect your information.
          </Text>
          
          {session?.user && (
            <Text className="text-xs text-gray-400 mt-2">
              Signed in as {session.user.email}
            </Text>
          )}
        </div>
      </Card>
    </div>
  );
}