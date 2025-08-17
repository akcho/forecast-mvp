'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, Badge, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@tremor/react';
import { useSession } from 'next-auth/react';
import { CashFlowStatement, type CashFlowScenarioData } from './CashFlowStatement';
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface CashFlowForecastResponse {
  success: boolean;
  data: {
    currentCash: number;
    scenarios: CashFlowScenarioData[];
    metadata: {
      monthsProjected: number;
      generatedAt: string;
      dataFreshness: string;
    };
  };
}

export function ForecastContentEnhanced() {
  const { data: session } = useSession();
  const [forecastData, setForecastData] = useState<CashFlowForecastResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('cash-flow');

  useEffect(() => {
    if (session?.user?.dbId) {
      fetchCashFlowForecast();
    }
  }, [session]);

  const fetchCashFlowForecast = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.user?.dbId) {
        throw new Error('User not authenticated');
      }

      // Check connection status first
      const statusResponse = await fetch('/api/quickbooks/status');
      const connectionStatus = await statusResponse.json();
      if (!connectionStatus.hasConnection || !connectionStatus.companyConnection) {
        throw new Error('No QuickBooks connection available');
      }

      // Fetch comprehensive cash flow forecast
      const forecastResponse = await fetch('/api/quickbooks/cash-flow-forecast?months=12');
      
      if (!forecastResponse.ok) {
        const errorData = await forecastResponse.json();
        throw new Error(errorData.details || 'Failed to fetch cash flow forecast');
      }

      const forecastResult: CashFlowForecastResponse = await forecastResponse.json();
      
      if (!forecastResult.success || !forecastResult.data) {
        throw new Error('Invalid forecast data received');
      }

      setForecastData(forecastResult.data);
    } catch (error) {
      console.error('Error fetching cash flow forecast:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch cash flow forecast');
      
      // Fallback to demo data for development
      setForecastData(createDemoData());
    } finally {
      setLoading(false);
    }
  };

  const createDemoData = (): CashFlowForecastResponse['data'] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const createScenario = (
      scenario: 'baseline' | 'growth' | 'downturn',
      multiplier: number
    ): CashFlowScenarioData => {
      const monthsOfCashCushion = 12 * multiplier;
      const negativeCashFlowMonths = scenario === 'downturn' ? 4 : scenario === 'baseline' ? 1 : 0;
      const riskLevel = (negativeCashFlowMonths >= 3 || monthsOfCashCushion < 3) ? 'high' : 
                       (negativeCashFlowMonths >= 1 || monthsOfCashCushion < 6) ? 'medium' : 'low';
      
      return {
        scenario,
        summary: {
          endingCash: 150000 * multiplier,
          totalCashGenerated: 50000 * multiplier,
          averageMonthlyCashFlow: 4200 * multiplier,
          operatingCashFlowMargin: 15 * multiplier,
          cashFlowVolatility: 8000 / multiplier,
          monthsOfCashCushion,
          riskLevel
        },
        monthlyData: months.map((month, index) => ({
          month,
          date: new Date(2025, index, 1).toISOString(),
          operatingCashFlow: 8000 * multiplier + (Math.random() - 0.5) * 2000,
          investingCashFlow: -3000 * multiplier + (Math.random() - 0.5) * 1000,
          financingCashFlow: -1000 * multiplier + (Math.random() - 0.5) * 500,
          netCashChange: 4000 * multiplier + (Math.random() - 0.5) * 1500,
          endingCash: 140000 + (index + 1) * 4000 * multiplier,
          revenue: 45000 * multiplier + (Math.random() - 0.5) * 5000,
          netIncome: 5000 * multiplier + (Math.random() - 0.5) * 1000,
          depreciation: 1500,
          workingCapitalChange: -500 + (Math.random() - 0.5) * 200,
          capitalExpenditures: 3000 * multiplier,
          operatingMargin: 12 * multiplier,
          cashConversionCycle: 35 - multiplier * 5
        }))
      };
    };

    return {
      currentCash: 140000,
      scenarios: [
        createScenario('baseline', 1.0),
        createScenario('growth', 1.4),
        createScenario('downturn', 0.6)
      ],
      metadata: {
        monthsProjected: 12,
        generatedAt: new Date().toISOString(),
        dataFreshness: 'demo-data'
      }
    };
  };

  const getDataFreshnessStatus = () => {
    if (!forecastData) return null;
    
    const isDemo = forecastData.metadata.dataFreshness === 'demo-data';
    const isRecent = forecastData.metadata.dataFreshness === 'real-time';
    
    if (isDemo) {
      return {
        icon: ExclamationTriangleIcon,
        color: 'yellow' as const,
        text: 'Demo Data',
        description: 'Using sample data for demonstration'
      };
    } else if (isRecent) {
      return {
        icon: CheckCircleIcon,
        color: 'emerald' as const,
        text: 'Live Data',
        description: 'Real-time QuickBooks data'
      };
    } else {
      return {
        icon: ClockIcon,
        color: 'blue' as const,
        text: 'Cached Data',
        description: 'Recent QuickBooks data'
      };
    }
  };

  const getScenarioSummary = () => {
    if (!forecastData?.scenarios) return null;

    const baseline = forecastData.scenarios.find(s => s.scenario === 'baseline');
    const growth = forecastData.scenarios.find(s => s.scenario === 'growth');
    const downturn = forecastData.scenarios.find(s => s.scenario === 'downturn');

    if (!baseline || !growth || !downturn) return null;

    return {
      bestCase: Math.max(baseline.summary.endingCash, growth.summary.endingCash, downturn.summary.endingCash),
      worstCase: Math.min(baseline.summary.endingCash, growth.summary.endingCash, downturn.summary.endingCash),
      range: Math.max(baseline.summary.endingCash, growth.summary.endingCash, downturn.summary.endingCash) - 
             Math.min(baseline.summary.endingCash, growth.summary.endingCash, downturn.summary.endingCash),
      baselineRisk: baseline.summary.riskLevel,
      totalRiskScenarios: [baseline, growth, downturn].filter(s => s.summary.riskLevel === 'high').length
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading comprehensive cash flow forecast...</div>
        </div>
      </div>
    );
  }

  if (error && !forecastData) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <Title className="text-red-800">Error Loading Cash Flow Forecast</Title>
          <Text className="text-red-600 mt-2">{error}</Text>
          <Text className="text-gray-600 mt-2">
            Please check your QuickBooks connection and try again.
          </Text>
        </Card>
      </div>
    );
  }

  if (!forecastData) {
    return (
      <div className="p-6">
        <Card>
          <Title>No Forecast Data Available</Title>
          <Text>Unable to generate cash flow projections. Please check your QuickBooks connection.</Text>
        </Card>
      </div>
    );
  }

  const dataStatus = getDataFreshnessStatus();
  const scenarioSummary = getScenarioSummary();

  return (
    <div className="p-6">
      {/* Header with Data Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Title className="text-2xl font-bold text-gray-900">Financial Forecast</Title>
            <Text className="text-gray-600 mt-1">
              Comprehensive cash flow projections for the next {forecastData.metadata.monthsProjected} months
            </Text>
          </div>
          {dataStatus && (
            <Badge 
              icon={dataStatus.icon}
              color={dataStatus.color}
              size="lg"
            >
              {dataStatus.text}
            </Badge>
          )}
        </div>
        
        {error && (
          <Card className="mt-4 border-yellow-200 bg-yellow-50">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <Text className="text-yellow-800 font-medium">Using Demo Data</Text>
                <Text className="text-yellow-700 text-sm mt-1">
                  {error} - Displaying sample projections for demonstration.
                </Text>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Scenario Overview Cards */}
      {scenarioSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <Text>Best Case Scenario</Text>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(scenarioSummary.bestCase)}
            </div>
            <Text className="text-sm text-gray-600">12-month ending cash</Text>
          </Card>
          
          <Card>
            <Text>Scenario Range</Text>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(scenarioSummary.range)}
            </div>
            <Text className="text-sm text-gray-600">Best to worst case spread</Text>
          </Card>
          
          <Card>
            <Text>Risk Assessment</Text>
            <div className="flex items-center space-x-2">
              <Badge 
                color={scenarioSummary.baselineRisk === 'low' ? 'emerald' : 
                       scenarioSummary.baselineRisk === 'medium' ? 'yellow' : 'red'}
              >
                {scenarioSummary.baselineRisk} risk
              </Badge>
              <span className="text-sm text-gray-600">baseline scenario</span>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <TabGroup>
        <TabList className="mt-6">
          <Tab>Cash Flow Analysis</Tab>
          <Tab>Scenario Planning</Tab>
          <Tab>Risk Assessment</Tab>
        </TabList>
        
        <TabPanels className="mt-6">
          <TabPanel>
            <CashFlowStatement 
              scenarios={forecastData.scenarios}
              currentCash={forecastData.currentCash}
              loading={false}
            />
          </TabPanel>
          
          <TabPanel>
            <Card>
              <Title>Scenario Planning</Title>
              <Text className="mb-6">Interactive scenario adjustment and sensitivity analysis</Text>
              <div className="text-center py-8 text-gray-500">
                <Text>Scenario planning interface will be implemented in the next phase</Text>
                <Text className="text-sm mt-2">This will include assumption adjustments and sensitivity analysis</Text>
              </div>
            </Card>
          </TabPanel>
          
          <TabPanel>
            <Card>
              <Title>Risk Assessment</Title>
              <Text className="mb-6">Risk metrics and stress testing analysis</Text>
              <div className="text-center py-8 text-gray-500">
                <Text>Risk assessment dashboard will be implemented in the next phase</Text>
                <Text className="text-sm mt-2">This will include stress testing and risk metric analysis</Text>
              </div>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}