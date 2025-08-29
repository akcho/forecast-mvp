'use client';

import { signIn, getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Card, Title, Text, Button } from '@tremor/react';
import { BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/forecast');
      }
    });
  }, [router]);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signIn('google', {
        callbackUrl: '/forecast',
        redirect: false,
      });

      if (result?.ok) {
        router.push('/forecast');
      } else if (result?.error) {
        console.error('Sign in error:', result.error);
        // Handle sign in error
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      setLoading(false);
    }
  };

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
            Sign in with Google to access your financial forecasting dashboard.
          </Text>

          {/* Sign In Button */}
          <Button
            size="xl"
            onClick={handleSignIn}
            loading={loading}
            className="w-full mb-4"
          >
            Continue with Google
          </Button>

          {/* Security Note */}
          <Text className="text-xs text-gray-500">
            Your data is encrypted and secure. We use enterprise-grade security to protect your information.
          </Text>
        </div>
      </Card>
    </div>
  );
}