/**
 * Environment Switcher Component
 *
 * Allows users to manually switch between sandbox and production environments
 * Particularly useful for testing and development scenarios
 */

import { Switch } from '@tremor/react';
import { detectEnvironment, getEnvironmentSwitchUrl, getEnvironmentMessage } from '@/lib/utils/environmentDetection';
import { useEffect, useState } from 'react';

interface EnvironmentSwitcherProps {
  className?: string;
  showMessage?: boolean;
}

export function EnvironmentSwitcher({ className = '', showMessage = true }: EnvironmentSwitcherProps) {
  const [envInfo, setEnvInfo] = useState({
    environment: 'production' as 'sandbox' | 'production',
    isLocalhost: false,
    shouldRedirectToSandbox: false,
    currentUrl: ''
  });

  useEffect(() => {
    // Only run on client side
    setEnvInfo(detectEnvironment());
  }, []);

  const handleEnvironmentSwitch = (isSandbox: boolean) => {
    const targetEnv = isSandbox ? 'sandbox' : 'production';
    const switchUrl = getEnvironmentSwitchUrl(targetEnv);
    window.location.href = switchUrl;
  };

  const environmentMessage = getEnvironmentMessage(envInfo);

  // Don't render on server side to avoid hydration issues
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">
            Environment:
          </span>
          <div className="flex items-center space-x-2">
            <span className={`text-xs ${envInfo.environment === 'production' ? 'font-semibold' : 'text-gray-500'}`}>
              Production
            </span>
            <Switch
              checked={envInfo.environment === 'sandbox'}
              onChange={handleEnvironmentSwitch}
              className="data-[state=checked]:bg-orange-500"
            />
            <span className={`text-xs ${envInfo.environment === 'sandbox' ? 'font-semibold text-orange-600' : 'text-gray-500'}`}>
              Sandbox
            </span>
          </div>
        </div>

        {envInfo.environment === 'sandbox' && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            🧪 Test Mode
          </span>
        )}
      </div>

      {showMessage && environmentMessage && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            {environmentMessage}
          </p>
        </div>
      )}

      {envInfo.isLocalhost && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>Localhost Testing:</strong>
          </p>
          <ul className="ml-4 space-y-1">
            <li>• Sandbox: Test with demo companies</li>
            <li>• Production: Limited to registered redirect URIs</li>
          </ul>
        </div>
      )}
    </div>
  );
}