'use client';

import { useSearchParams } from 'next/navigation';
import { Card, Title, Text, Button } from '@tremor/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Suspense } from 'react';

const errorMessages: Record<string, { message: string; details?: string }> = {
  Signin: { 
    message: 'Sign in failed.',
    details: 'Please try signing in again. If this persists, there may be an issue with Google OAuth configuration.'
  },
  OAuthSignin: { 
    message: 'Google OAuth sign in failed.',
    details: 'Make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are properly configured in your environment variables.'
  },
  OAuthCallback: { 
    message: 'Google OAuth callback failed.',
    details: 'Check that http://localhost:3000/api/auth/callback/google is added to your Google OAuth redirect URIs.'
  },
  OAuthCreateAccount: { 
    message: 'Could not create account.',
    details: 'There was an issue creating your account. Please try again or contact support.'
  },
  OAuthAccountNotLinked: { 
    message: 'Account not linked.',
    details: 'To confirm your identity, sign in with the same Google account you used originally.'
  },
  Configuration: { 
    message: 'Google OAuth is not configured.',
    details: 'This application requires Google OAuth. Please set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables. Get these from https://console.cloud.google.com/'
  },
  default: { 
    message: 'Unable to sign in.',
    details: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  
  const errorInfo = error ? errorMessages[error] || errorMessages.default : errorMessages.default;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-lg w-full mx-4">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-6">
            <ExclamationTriangleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>

          {/* Title */}
          <Title className="text-2xl mb-2 text-red-900 dark:text-red-400">Sign In Error</Title>
          <Text className="text-gray-800 dark:text-gray-200 mb-4 font-medium">
            {errorInfo.message}
          </Text>
          
          {errorInfo.details && (
            <Text className="text-gray-600 dark:text-gray-300 mb-8 text-sm">
              {errorInfo.details}
            </Text>
          )}

          {/* Try Again Button */}
          <Link href="/">
            <Button size="xl" className="w-full mb-4">
              Try Again
            </Button>
          </Link>

          {/* Configuration Help */}
          {error === 'Configuration' && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
              <Text className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-2">Setup Instructions:</Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                1. Go to https://console.cloud.google.com/<br/>
                2. Create or select a Google Cloud project<br/>
                3. Enable the Google+ API<br/>
                4. Create OAuth 2.0 Client ID credentials<br/>
                5. Add these to your .env.local file
              </Text>
            </div>
          )}

          {/* Support */}
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            If this problem persists, please contact support.
          </Text>
        </div>
      </Card>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-lg w-full mx-4">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-6">
              <ExclamationTriangleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <Title className="text-2xl mb-2 text-red-900 dark:text-red-400">Loading...</Title>
          </div>
        </Card>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}