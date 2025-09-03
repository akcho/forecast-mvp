'use client';

import { useState, useEffect } from 'react';
import { QuickBooksLogin } from '@/components/QuickBooksLogin';
import { ForecastDashboard } from '@/components/ForecastDashboard';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { useSession } from 'next-auth/react';
import { LoadingState } from '@/components/LoadingSpinner';
import { usePageHeader } from '@/components/PageHeaderContext';
import { Select, SelectItem } from '@tremor/react';

export default function ForecastPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [forecastPeriod, setForecastPeriod] = useState('13weeks');
  const { data: session } = useSession();
  const { setHeaderConfig } = usePageHeader();

  // Set page header configuration
  useEffect(() => {
    setHeaderConfig({
      title: 'Financial Forecast',
      icon: '📈',
      description: 'Project your business performance based on key drivers',
      controls: (
        <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
          <SelectItem value="4weeks">4 Weeks</SelectItem>
          <SelectItem value="13weeks">13 Weeks</SelectItem>
          <SelectItem value="26weeks">26 Weeks</SelectItem>
          <SelectItem value="52weeks">52 Weeks</SelectItem>
        </Select>
      )
    });

    // Cleanup function to clear header on unmount
    return () => setHeaderConfig(null);
  }, [setHeaderConfig, forecastPeriod]);

  useEffect(() => {
    // Check for QuickBooks OAuth success
    const urlParams = new URLSearchParams(window.location.search);
    const quickbooksParam = urlParams.get('quickbooks');
    
    if (quickbooksParam === 'connected') {
      console.log('✅ QuickBooks OAuth completed successfully, rechecking connection...');
      // Clear the URL params
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    // Check connection status on client side
    const checkConnection = async () => {
      if (!session?.user?.dbId) {
        setConnectionChecked(true);
        return;
      }

      try {
        const response = await fetch('/api/quickbooks/status');
        const connectionStatus = await response.json();
        console.log('📊 Connection status response:', connectionStatus);
        if (connectionStatus.hasConnection && connectionStatus.companyConnection) {
          console.log('✅ Found company connection');
          setIsConnected(true);
        } else {
          console.log('❌ No company connection found - hasConnection:', connectionStatus.hasConnection, 'companyConnection:', !!connectionStatus.companyConnection);
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <LoadingState type="general" />
      </div>
    );
  }

  // Show login screen if not authenticated or not connected
  if (!session?.user || !isConnected) {
    console.log('Not connected, showing login screen. Session:', !!session?.user, 'IsConnected:', isConnected);
    return <QuickBooksLogin onConnectionChange={(connection) => {
      console.log('🔄 Connection changed:', !!connection);
      setIsConnected(!!connection);
    }} />;
  }

  // Show forecast page content when connected
  console.log('✅ Showing forecast dashboard. Session:', !!session?.user, 'IsConnected:', isConnected);
  return (
      <div className="h-screen p-8 overflow-auto">
        <ForecastDashboard forecastPeriod={forecastPeriod} />
      </div>
  );
}