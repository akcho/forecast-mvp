'use client';

import { Card, Title, Text } from '@tremor/react';
import { AppLayout } from '@/components/AppLayout';

export default function OverviewPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <Title className="text-2xl font-bold text-gray-900">Overview</Title>
          <Text className="text-gray-600 mt-1">
            Dashboard overview and key metrics
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-gray-400 text-lg mb-2">🚧</div>
                <Title className="text-gray-600">Coming Soon</Title>
                <Text className="text-gray-500">
                  The overview page is under construction
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}