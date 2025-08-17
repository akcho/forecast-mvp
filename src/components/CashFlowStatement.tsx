'use client';

import { useState } from 'react';
import { Card, Title, Text, LineChart, BarChart, Badge, Flex, Grid, Metric, ProgressBar } from '@tremor/react';
import { ArrowUpIcon, ArrowDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface CashFlowScenarioData {
  scenario: 'baseline' | 'growth' | 'downturn';
  summary: {
    endingCash: number;
    totalCashGenerated: number;
    averageMonthlyCashFlow: number;
    operatingCashFlowMargin: number;
    cashFlowVolatility: number;
    monthsOfCashCushion: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  monthlyData: Array<{
    month: string;
    date: string;
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashChange: number;
    endingCash: number;
    revenue: number;
    netIncome: number;
    depreciation: number;
    workingCapitalChange: number;
    capitalExpenditures: number;
    operatingMargin: number;
    cashConversionCycle: number;
  }>;
}

interface CashFlowStatementProps {
  scenarios: CashFlowScenarioData[];
  currentCash: number;
  loading?: boolean;
}

export function CashFlowStatement({ scenarios, currentCash, loading = false }: CashFlowStatementProps) {
  const [activeScenario, setActiveScenario] = useState<'baseline' | 'growth' | 'downturn'>('baseline');
  const [activeView, setActiveView] = useState<'cash-flow' | 'components' | 'metrics'>('cash-flow');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const currentScenarioData = scenarios.find(s => s.scenario === activeScenario);
  if (!currentScenarioData) return null;

  const scenarioColors = {
    baseline: 'blue',
    growth: 'emerald', 
    downturn: 'red'
  } as const;

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '$0';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'emerald';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  const getRiskDescription = (level: string) => {
    switch (level) {
      case 'low': return 'Positive cash flow throughout period, 6+ months cash cushion';
      case 'medium': return '1-2 negative cash flow months, 3-6 months cash cushion';
      case 'high': return '3+ negative cash flow months, less than 3 months cash cushion';
      default: return 'Risk level not determined';
    }
  };

  const getScenarioDisplayName = (scenario: string) => {
    return scenario.charAt(0).toUpperCase() + scenario.slice(1);
  };

  // Prepare chart data for cash flow components
  const cashFlowChartData = currentScenarioData.monthlyData.map(month => ({
    month: month.month,
    'Operating': month.operatingCashFlow,
    'Investing': month.investingCashFlow,
    'Financing': month.financingCashFlow,
    'Net Change': month.netCashChange,
    'Cash Position': month.endingCash
  }));

  // Prepare data for cash position trend
  const cashPositionData = currentScenarioData.monthlyData.map(month => ({
    month: month.month,
    [getScenarioDisplayName(activeScenario)]: month.endingCash
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Title className="text-2xl font-bold text-gray-900">Cash Flow Statement</Title>
        <Text className="text-gray-600 mt-1">
          Comprehensive 3-scenario cash flow projections with operating, investing, and financing activities
        </Text>
      </div>

      {/* Scenario Selection */}
      <div className="flex space-x-4">
        {scenarios.map((scenario) => (
          <button
            key={scenario.scenario}
            onClick={() => setActiveScenario(scenario.scenario)}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              activeScenario === scenario.scenario
                ? 'bg-white border-gray-300 shadow-sm'
                : 'bg-gray-50 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-left">{getScenarioDisplayName(scenario.scenario)}</div>
                <div className="text-sm text-gray-500">
                  {formatCurrency(scenario.summary.endingCash)} ending cash
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative group">
                  <Badge 
                    color={getRiskColor(scenario.summary.riskLevel)}
                    size="sm"
                  >
                    {scenario.summary.riskLevel} risk
                  </Badge>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {getRiskDescription(scenario.summary.riskLevel)}
                  </div>
                </div>
                <div className={`w-1 h-8 rounded ${
                  scenario.scenario === 'baseline' ? 'bg-blue-500' :
                  scenario.scenario === 'growth' ? 'bg-emerald-500' :
                  'bg-red-500'
                }`} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Key Metrics Cards */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-4">
        <Card>
          <Flex alignItems="start">
            <div>
              <Text>Ending Cash Position</Text>
              <Metric>{formatCurrency(currentScenarioData.summary.endingCash)}</Metric>
            </div>
            <Badge 
              color={currentScenarioData.summary.endingCash > currentCash ? 'emerald' : 'red'}
              icon={currentScenarioData.summary.endingCash > currentCash ? ArrowUpIcon : ArrowDownIcon}
            >
              {currentScenarioData.summary.endingCash > currentCash ? 'Positive' : 'Negative'}
            </Badge>
          </Flex>
        </Card>

        <Card>
          <Text>Operating Cash Flow Margin</Text>
          <Metric>{formatPercent(currentScenarioData.summary.operatingCashFlowMargin)}</Metric>
          <ProgressBar 
            value={Math.max(0, Math.min(100, currentScenarioData.summary.operatingCashFlowMargin))} 
            color={currentScenarioData.summary.operatingCashFlowMargin > 15 ? 'emerald' : 
                   currentScenarioData.summary.operatingCashFlowMargin > 5 ? 'yellow' : 'red'}
            className="mt-2"
          />
        </Card>

        <Card>
          <Text>Average Monthly Cash Flow</Text>
          <Metric>{formatCurrency(currentScenarioData.summary.averageMonthlyCashFlow)}</Metric>
          <Text className="mt-1 text-sm text-gray-600">
            {currentScenarioData.summary.averageMonthlyCashFlow > 0 ? 'Positive generation' : 'Cash usage'}
          </Text>
        </Card>

        <Card>
          <Flex alignItems="start">
            <div>
              <Text>Cash Cushion</Text>
              <Metric>{(currentScenarioData.summary.monthsOfCashCushion || 0).toFixed(1)} months</Metric>
              <Text className="mt-1 text-sm text-gray-600">
                Time to cover expenses if revenue stops
              </Text>
            </div>
            {currentScenarioData.summary.monthsOfCashCushion < 3 && (
              <Badge color="red" icon={ExclamationTriangleIcon}>
                Critical
              </Badge>
            )}
            {currentScenarioData.summary.monthsOfCashCushion >= 3 && currentScenarioData.summary.monthsOfCashCushion < 6 && (
              <Badge color="yellow">
                Moderate
              </Badge>
            )}
            {currentScenarioData.summary.monthsOfCashCushion >= 6 && (
              <Badge color="emerald">
                Strong
              </Badge>
            )}
          </Flex>
        </Card>
      </Grid>

      {/* View Toggle */}
      <div className="flex space-x-2 border-b border-gray-200">
        {[
          { key: 'cash-flow', label: 'Cash Flow' },
          { key: 'components', label: 'Components' },
          { key: 'metrics', label: 'Metrics' }
        ].map(view => (
          <button
            key={view.key}
            onClick={() => setActiveView(view.key as 'cash-flow' | 'components' | 'metrics')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeView === view.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Content based on active view */}
      {activeView === 'cash-flow' && (
        <div className="space-y-6">
          {/* Cash Position Trend */}
          <Card>
            <Title>Cash Position Trend - {getScenarioDisplayName(activeScenario)} Scenario</Title>
            <Text className="mt-1 mb-4">
              Monthly cash position showing cumulative impact of all cash flows
            </Text>
            <LineChart
              className="h-80"
              data={cashPositionData}
              index="month"
              categories={[getScenarioDisplayName(activeScenario)]}
              colors={[scenarioColors[activeScenario]]}
              valueFormatter={(value) => formatCurrency(value)}
              showLegend={false}
              showGridLines={true}
              curveType="monotone"
            />
          </Card>

          {/* Monthly Cash Flow Components */}
          <Card>
            <Title>Monthly Cash Flow Components</Title>
            <Text className="mt-1 mb-4">
              Operating, investing, and financing cash flows by month
            </Text>
            <BarChart
              className="h-80"
              data={cashFlowChartData}
              index="month"
              categories={['Operating', 'Investing', 'Financing']}
              colors={['emerald', 'red', 'blue']}
              valueFormatter={(value) => formatCurrency(value)}
              showLegend={true}
              stack={true}
            />
          </Card>
        </div>
      )}

      {activeView === 'components' && (
        <div className="space-y-6">
          {/* Operating Activities Detail */}
          <Card>
            <Title>Operating Activities</Title>
            <Text className="mb-4">Core business cash generation</Text>
            <div className="space-y-3">
              {currentScenarioData.monthlyData.slice(0, 3).map((month, index) => (
                <div key={index} className="border-l-4 border-emerald-500 pl-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{month.month}</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(month.operatingCashFlow)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Net Income: {formatCurrency(month.netIncome)}</div>
                    <div>Depreciation: {formatCurrency(month.depreciation)}</div>
                    <div>Working Capital Change: {formatCurrency(-month.workingCapitalChange)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Investing Activities Detail */}
          <Card>
            <Title>Investing Activities</Title>
            <Text className="mb-4">Capital expenditures and asset investments</Text>
            <div className="space-y-3">
              {currentScenarioData.monthlyData.slice(0, 3).map((month, index) => (
                <div key={index} className="border-l-4 border-red-500 pl-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{month.month}</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(month.investingCashFlow)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Capital Expenditures: {formatCurrency(-month.capitalExpenditures)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Financing Activities Detail */}
          <Card>
            <Title>Financing Activities</Title>
            <Text className="mb-4">Debt service and owner distributions</Text>
            <div className="space-y-3">
              {currentScenarioData.monthlyData.slice(0, 3).map((month, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{month.month}</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(month.financingCashFlow)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Estimated debt service and distributions</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeView === 'metrics' && (
        <div className="space-y-6">
          {/* Risk Level Definitions */}
          <Card>
            <Title>Risk Level Definitions</Title>
            <Text className="mb-4">Understanding cash flow risk classifications</Text>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-l-4 border-emerald-500 pl-4">
                <Badge color="emerald" className="mb-2">Low Risk</Badge>
                <Text className="text-sm">Positive cash flow throughout period, 6+ months cash cushion</Text>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4">
                <Badge color="yellow" className="mb-2">Medium Risk</Badge>
                <Text className="text-sm">1-2 negative cash flow months, 3-6 months cash cushion</Text>
              </div>
              <div className="border-l-4 border-red-500 pl-4">
                <Badge color="red" className="mb-2">High Risk</Badge>
                <Text className="text-sm">3+ negative cash flow months, less than 3 months cash cushion</Text>
              </div>
            </div>
          </Card>

          {/* Key Performance Indicators */}
          <Card>
            <Title>Key Performance Indicators</Title>
            <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-4 mt-4">
              <div className="text-center">
                <Metric>{formatPercent(currentScenarioData.summary.operatingCashFlowMargin)}</Metric>
                <Text>Operating Cash Flow Margin</Text>
              </div>
              <div className="text-center">
                <Metric>{formatCurrency(currentScenarioData.summary.cashFlowVolatility)}</Metric>
                <Text>Cash Flow Volatility</Text>
              </div>
              <div className="text-center">
                <Metric>{(currentScenarioData.summary.monthsOfCashCushion || 0).toFixed(1)}</Metric>
                <Text>Months of Cash Cushion</Text>
              </div>
            </Grid>
          </Card>

          {/* Monthly Operating Metrics */}
          <Card>
            <Title>Monthly Operating Metrics</Title>
            <div className="mt-4 space-y-4">
              {currentScenarioData.monthlyData.slice(0, 6).map((month, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{month.month}</span>
                    <Badge color={month.operatingMargin > 10 ? 'emerald' : month.operatingMargin > 0 ? 'yellow' : 'red'}>
                      {formatPercent(month.operatingMargin)} margin
                    </Badge>
                  </div>
                  <Grid numItems={3} className="gap-4 text-sm">
                    <div>
                      <Text>Revenue</Text>
                      <span className="font-semibold">{formatCurrency(month.revenue)}</span>
                    </div>
                    <div>
                      <Text>Operating Cash Flow</Text>
                      <span className="font-semibold">{formatCurrency(month.operatingCashFlow)}</span>
                    </div>
                    <div>
                      <Text>Cash Conversion Cycle</Text>
                      <span className="font-semibold">{(month.cashConversionCycle || 0).toFixed(0)} days</span>
                    </div>
                  </Grid>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}