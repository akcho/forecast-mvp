'use client';

import { Card, Title, Text, Button } from '@tremor/react';
import { QuickBooksConnectionManager } from '@/components/QuickBooksConnectionManager';

export default function InstructionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <Title>QuickBooks Connection Instructions</Title>
          <Text className="mt-4">
            Due to QuickBooks security requirements, only company admins can directly connect to QuickBooks. 
            Here's how to get access to your company's financial data:
          </Text>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <Title>For Admins</Title>
            <div className="mt-4 space-y-4">
              <div>
                <Text className="font-semibold">Step 1: Connect as Admin</Text>
                <Text className="text-sm text-gray-600">
                  Click the "Connect as Admin" button below to connect your QuickBooks account.
                </Text>
              </div>
              <div>
                <Text className="font-semibold">Step 2: Share Connection</Text>
                <Text className="text-sm text-gray-600">
                  After connecting, click "Share Connection with Team" to make it available to others.
                </Text>
              </div>
              <div>
                <Text className="font-semibold">Step 3: Team Access</Text>
                <Text className="text-sm text-gray-600">
                  Your team members can now use the shared connection to access financial data.
                </Text>
              </div>
            </div>
          </Card>

          <Card>
            <Title>For Team Members</Title>
            <div className="mt-4 space-y-4">
              <div>
                <Text className="font-semibold">Step 1: Wait for Admin</Text>
                <Text className="text-sm text-gray-600">
                  Ask your admin to connect their QuickBooks account first.
                </Text>
              </div>
              <div>
                <Text className="font-semibold">Step 2: Use Shared Connection</Text>
                <Text className="text-sm text-gray-600">
                  Once the admin shares the connection, you'll see a "Use Shared Connection" button.
                </Text>
              </div>
              <div>
                <Text className="font-semibold">Step 3: Access Data</Text>
                <Text className="text-sm text-gray-600">
                  You can now view all financial reports and analysis using the shared connection.
                </Text>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-8">
          <Title>Connection Manager</Title>
          <Text className="mt-2 mb-6">
            Use the connection manager below to connect or use a shared connection:
          </Text>
          <QuickBooksConnectionManager />
        </Card>

        <Card className="mt-8">
          <Title>Security Note</Title>
          <Text className="mt-2">
            This approach is secure because:
          </Text>
          <ul className="mt-2 list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Only the admin's QuickBooks credentials are used</li>
            <li>Team members access data through the admin's authorized connection</li>
            <li>No additional QuickBooks permissions are required</li>
            <li>The connection can be revoked by the admin at any time</li>
          </ul>
        </Card>
      </div>
    </div>
  );
} 