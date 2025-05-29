'use client';

import { Card, Title, Text, Tab, TabList, TabGroup, TabPanel, TabPanels, Metric, AreaChart, BarChart } from '@tremor/react';
import { useState } from 'react';
import { BanknotesIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';

// Mock data - in a real app, this would come from your backend
const currentRunway = {
  months: 4.5,
  cash: 450000,
  burnRate: 100000,
};

const options = [
  {
    id: 1,
    title: 'Cut Expenses',
    description: 'Reduce monthly burn rate by 20%',
    impact: '+2.5 months',
    details: 'Implement cost-cutting measures across departments',
    icon: BanknotesIcon,
  },
  {
    id: 2,
    title: 'Delay Hires',
    description: 'Postpone planned hiring for 3 months',
    impact: '+1.5 months',
    details: 'Defer 3 engineering and 2 sales positions',
    icon: UserGroupIcon,
  },
  {
    id: 3,
    title: 'Accelerate AR',
    description: 'Implement aggressive collection strategy',
    impact: '+1 month',
    details: 'Focus on collecting outstanding invoices within 30 days',
    icon: ClockIcon,
  },
];

const monthlyData = [
  { month: 'Jan', cash: 450000 },
  { month: 'Feb', cash: 350000 },
  { month: 'Mar', cash: 250000 },
  { month: 'Apr', cash: 150000 },
  { month: 'May', cash: 50000 },
  { month: 'Jun', cash: 0 },
];

export default function Home() {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Title>Runway Analysis Dashboard</Title>
      <Text>Make informed decisions about your company's financial future</Text>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <Text>Current Runway</Text>
          <Metric>{currentRunway.months} months</Metric>
          <Text className="mt-2">${currentRunway.cash.toLocaleString()} cash on hand</Text>
        </Card>
        <Card>
          <Text>Monthly Burn Rate</Text>
          <Metric>${currentRunway.burnRate.toLocaleString()}</Metric>
          <Text className="mt-2">Monthly operating expenses</Text>
        </Card>
        <Card>
          <Text>Cash Zero Date</Text>
          <Metric>June 2024</Metric>
          <Text className="mt-2">Based on current burn rate</Text>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <Title>Cash Projection</Title>
          <AreaChart
            className="mt-4 h-72"
            data={monthlyData}
            index="month"
            categories={['cash']}
            colors={['blue']}
            valueFormatter={(number) => `$${number.toLocaleString()}`}
          />
        </Card>
      </div>

      <div className="mt-6">
        <Title>Actionable Options</Title>
        <Text>Select an option to see its impact on your runway</Text>
        
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {options.map((option) => (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all ${
                selectedOption === option.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedOption(option.id)}
            >
              <div className="flex items-center space-x-4">
                <option.icon className="h-6 w-6 text-blue-500" />
                <div>
                  <Text className="font-medium">{option.title}</Text>
                  <Text className="text-sm text-gray-500">{option.description}</Text>
                </div>
              </div>
              <Metric className="mt-4">{option.impact}</Metric>
              <Text className="mt-2 text-sm">{option.details}</Text>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
