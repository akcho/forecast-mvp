'use client';

import { Card, Title, Text, Metric, AreaChart, BarChart, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { useState, useEffect } from 'react';
import { BanknotesIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
import { RunwayCalculator } from '../lib/runwayCalculator';
import { mockFinancials } from '../lib/mockData';
import { RunwayAnalysis, RunwayOption } from '../types/financial';
import { format } from 'date-fns';
import { CalculationBreakdown } from '../components/CalculationBreakdown';

interface ChartDataPoint {
  date: string;
  'Cash Balance': number;
  'Revenue': number;
  'Expenses': number;
}

export default function Home() {
  const [analysis, setAnalysis] = useState<RunwayAnalysis | null>(null);
  const [selectedOption, setSelectedOption] = useState<RunwayOption | null>(null);
  const [simulatedAnalysis, setSimulatedAnalysis] = useState<RunwayAnalysis | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);

  useEffect(() => {
    const calculator = new RunwayCalculator(mockFinancials);
    const initialAnalysis = calculator.analyzeRunway();
    setAnalysis(initialAnalysis);
  }, []);

  const handleOptionSelect = (option: RunwayOption) => {
    setSelectedOption(option);
    const calculator = new RunwayCalculator(mockFinancials);
    const simulated = calculator.simulateOption(option);
    setSimulatedAnalysis(simulated);
  };

  if (!analysis) {
    return <div>Loading...</div>;
  }

  const chartData = analysis.projections.map(proj => ({
    date: format(proj.date, 'MMM yyyy'),
    'Cash Balance': proj.cashBalance,
    'Revenue': proj.revenue,
    'Expenses': proj.expenses,
  }));

  const simulatedChartData = simulatedAnalysis?.projections.map(proj => ({
    date: format(proj.date, 'MMM yyyy'),
    'Cash Balance': proj.cashBalance,
    'Revenue': proj.revenue,
    'Expenses': proj.expenses,
  })) || [];

  const currentProjection = selectedOption
    ? simulatedAnalysis?.projections[selectedMonth]
    : analysis.projections[selectedMonth];

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Title>Runway Analysis Dashboard</Title>
      <Text>Make informed decisions about your company's financial future</Text>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <Text>Current Runway</Text>
          <Metric>{analysis.currentRunway.toFixed(1)} months</Metric>
          <Text className="mt-2">${mockFinancials.cashBalance.toLocaleString()} cash on hand</Text>
        </Card>
        <Card>
          <Text>Monthly Burn Rate</Text>
          <Metric>${analysis.monthlyBurnRate.toLocaleString()}</Metric>
          <Text className="mt-2">Monthly operating expenses</Text>
        </Card>
        <Card>
          <Text>Break Even Date</Text>
          <Metric>
            {analysis.breakEvenDate
              ? format(analysis.breakEvenDate, 'MMM yyyy')
              : 'Not projected'}
          </Metric>
          <Text className="mt-2">Based on current projections</Text>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <Title>Cash Projection</Title>
          <AreaChart
            className="mt-4 h-72"
            data={selectedOption ? simulatedChartData : chartData}
            index="date"
            categories={['Cash Balance', 'Revenue', 'Expenses']}
            colors={['blue', 'green', 'red']}
            valueFormatter={(number) => `$${number.toLocaleString()}`}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {chartData.map((point, index) => (
              <button
                key={point.date}
                onClick={() => setSelectedMonth(index)}
                className={`px-2 py-1 text-sm rounded ${
                  selectedMonth === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {point.date}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {currentProjection && (
        <div className="mt-6">
          <CalculationBreakdown
            projection={currentProjection}
            revenueStreams={mockFinancials.revenueStreams}
            expenses={mockFinancials.expenses}
            date={currentProjection.date}
          />
        </div>
      )}

      <div className="mt-6">
        <Title>Actionable Options</Title>
        <Text>Select an option to see its impact on your runway</Text>
        
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {analysis.options.map((option) => (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all ${
                selectedOption?.id === option.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleOptionSelect(option)}
            >
              <div className="flex items-center space-x-4">
                {option.id === 'cut-expenses' && <BanknotesIcon className="h-6 w-6 text-blue-500" />}
                {option.id === 'delay-hires' && <UserGroupIcon className="h-6 w-6 text-blue-500" />}
                {option.id === 'accelerate-ar' && <ClockIcon className="h-6 w-6 text-blue-500" />}
                <div>
                  <Text className="font-medium">{option.name}</Text>
                  <Text className="text-sm text-gray-500">{option.description}</Text>
                </div>
              </div>
              <Metric className="mt-4">
                {option.impact.type === 'expense'
                  ? `-${option.impact.value.toLocaleString()}`
                  : `+${option.impact.value.toLocaleString()}`}
              </Metric>
              <div className="mt-2 space-y-1">
                <Text className="text-sm">Risk: {option.risk}</Text>
                <Text className="text-sm">Confidence: {option.confidence * 100}%</Text>
                {option.implementationTime && (
                  <Text className="text-sm">
                    Implementation: {option.implementationTime} days
                  </Text>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
