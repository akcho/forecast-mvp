'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@tremor/react';

export function EnvironmentIndicator() {
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('production');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const envParam = urlParams.get('env');
      setEnvironment(envParam === 'sandbox' ? 'sandbox' : 'production');
    }
  }, []);

  if (environment === 'production') {
    return null; // Don't show indicator for production (default)
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge color="orange" size="sm">
        🧪 Sandbox Mode
      </Badge>
    </div>
  );
}