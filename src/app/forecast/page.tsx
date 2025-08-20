'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { QuickBooksLogin } from '@/components/QuickBooksLogin';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { useSession } from 'next-auth/react';
import { LoadingState } from '@/components/LoadingSpinner';

export default function ForecastPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    // Check connection status on client side
    const checkConnection = async () => {
      if (!session?.user?.dbId) {
        setConnectionChecked(true);
        return;
      }

      try {
        const response = await fetch('/api/quickbooks/status');
        const connectionStatus = await response.json();
        if (connectionStatus.hasConnection && connectionStatus.companyConnection) {
          console.log('Found company connection');
          setIsConnected(true);
        } else {
          console.log('No company connection found');
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error checking connections:', error);
        setIsConnected(false);
      }
      
      setConnectionChecked(true);
    };

    if (session?.user?.dbId) {
      checkConnection();
    } else if (session === null) {
      // Session loaded but user not authenticated
      setConnectionChecked(true);
    }
  }, [session]);

  // Show loading state while checking connection
  if (!connectionChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <LoadingState type="general" />
      </div>
    );
  }

  // Show login screen if not authenticated or not connected
  if (!session?.user || !isConnected) {
    console.log('Not connected, showing login screen');
    return <QuickBooksLogin onConnectionChange={() => setIsConnected(true)} />;
  }

  // Show forecast page content when connected
  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📈 Financial Forecasting
          </h1>
          <p className="text-gray-600">
            Create detailed financial forecasts using your business drivers and historical data
          </p>
        </div>

        {/* Coming Soon Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-blue-900 mb-4">
              Advanced Forecasting Coming Soon
            </h2>
            <p className="text-blue-800 mb-6 max-w-2xl mx-auto">
              We're building powerful forecasting tools that will use your discovered business drivers 
              to create accurate financial projections. This will include scenario modeling, 
              driver-based forecasting, and cash flow projections.
            </p>
            
            <div className="bg-white border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">What's Coming:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">✓</span>
                  <span>Driver-based revenue forecasting</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">✓</span>
                  <span>Expense projection models</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">✓</span>
                  <span>3-scenario planning (Base/Growth/Downturn)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">✓</span>
                  <span>Cash flow forecasting</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">✓</span>
                  <span>Seasonal adjustments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">✓</span>
                  <span>Monte Carlo simulations</span>
                </div>
              </div>
            </div>

            <div className="text-blue-700 bg-white border border-blue-200 rounded p-4">
              <p className="font-medium mb-2">🔍 Get Started Now:</p>
              <p className="text-sm">
                Visit the <strong>Drivers</strong> page to discover your key business drivers first. 
                This foundational analysis will power your forecasting once it's available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}