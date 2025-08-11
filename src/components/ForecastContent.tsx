'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, LineChart, Badge } from '@tremor/react';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { useSession } from 'next-auth/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { quickBooksStore } from '@/lib/quickbooks/store';

interface ScenarioData {
  week: string;
  Baseline: number;
  Growth: number;
  Downturn: number;
}

interface Scenario {
  name: 'baseline' | 'growth' | 'downturn';
  displayName: string;
  color: string;
  probability: number;
  endCashPosition: number;
  factors: string[];
}

interface FinancialMetrics {
  currentCash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netCashFlow: number;
  revenueGrowthRate: number;
  burnRate: number;
}

export function ForecastContent() {
  const { data: session } = useSession();
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(
    new Set(['Baseline', 'Growth', 'Downturn'])
  );
  const [activeScenario, setActiveScenario] = useState<'baseline' | 'growth' | 'downturn'>('baseline');
  const [chartData, setChartData] = useState<ScenarioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [growthPercentage, setGrowthPercentage] = useState(50); // 50% improvement
  const [downturnPercentage, setDownturnPercentage] = useState(-30); // 30% decline

  // Dynamic scenario definitions based on financial data
  const getScenarios = (metrics: FinancialMetrics | null): Record<string, Scenario> => {
    if (!metrics) {
      // Default scenarios when no data is available
      return {
        baseline: {
          name: 'baseline',
          displayName: 'Baseline',
          color: 'blue',
          probability: 70,
          endCashPosition: 205000,
          factors: ['Current trajectory based on historical data']
        },
        growth: {
          name: 'growth',
          displayName: 'Growth',
          color: 'emerald',
          probability: 20,
          endCashPosition: 295000,
          factors: ['Optimistic growth projections']
        },
        downturn: {
          name: 'downturn',
          displayName: 'Downturn',
          color: 'red',
          probability: 10,
          endCashPosition: 95000,
          factors: ['Conservative decline estimates']
        }
      };
    }

    const { currentCash, monthlyRevenue, monthlyExpenses, netCashFlow } = metrics;
    const weeklyNetCashFlow = netCashFlow / 4.33;
    const weeklyRevenue = monthlyRevenue / 4.33;
    const weeklyExpenses = monthlyExpenses / 4.33;
    
    // Calculate 13-week projections
    const baselineEnd = currentCash + (weeklyNetCashFlow * 13);
    const growthMultiplier = 1 + (growthPercentage / 100);
    const growthEnd = currentCash + (weeklyNetCashFlow * growthMultiplier * 13);
    const downturnMultiplier = 1 + (downturnPercentage / 100);
    const downturnEnd = currentCash + (weeklyNetCashFlow * downturnMultiplier * 13);

    return {
      baseline: {
        name: 'baseline',
        displayName: 'Baseline',
        color: 'blue',
        probability: 70,
        endCashPosition: Math.round(Math.max(0, baselineEnd)),
        factors: [
          `Current net cash flow: $${netCashFlow.toLocaleString()}/month`,
          'Historical revenue patterns maintained',
          'Operating expenses remain stable',
          'No major market disruptions'
        ]
      },
      growth: {
        name: 'growth',
        displayName: 'Growth',
        color: 'emerald',
        probability: 20,
        endCashPosition: Math.round(Math.max(0, growthEnd)),
        factors: [
          `${growthPercentage}% improvement in net cash flow`,
          'Successful customer acquisition',
          'Revenue optimization initiatives',
          'Operational efficiency gains'
        ]
      },
      downturn: {
        name: 'downturn',
        displayName: 'Downturn',
        color: 'red',
        probability: 10,
        endCashPosition: Math.round(Math.max(0, downturnEnd)),
        factors: [
          `${Math.abs(downturnPercentage)}% reduction in net cash flow`,
          'Customer churn increase',
          'Market contraction effects',
          'Maintained expense levels'
        ]
      }
    };
  };

  const scenarios = getScenarios(financialMetrics);

  useEffect(() => {
    if (session?.user?.dbId) {
      fetchFinancialData();
    }
  }, [session]);

  // Regenerate forecast data when percentages change
  useEffect(() => {
    if (financialMetrics) {
      generateForecastData(financialMetrics);
    }
  }, [growthPercentage, downturnPercentage]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.user?.dbId) {
        throw new Error('User not authenticated');
      }

      // Get connection status from API
      const statusResponse = await fetch('/api/quickbooks/status');
      const connectionStatus = await statusResponse.json();
      if (!connectionStatus.hasConnection || !connectionStatus.companyConnection) {
        throw new Error('No QuickBooks connection available');
      }
      
      const connection = connectionStatus.companyConnection;

      // Use API routes that handle authentication internally
      const [balanceSheetResponse, profitLossResponse] = await Promise.all([
        fetch('/api/quickbooks/balance-sheet'),
        fetch('/api/quickbooks/profit-loss')
      ]);

      if (!balanceSheetResponse.ok || !profitLossResponse.ok) {
        throw new Error('Failed to fetch financial reports');
      }

      const [balanceSheet, profitLoss] = await Promise.all([
        balanceSheetResponse.json(),
        profitLossResponse.json()
      ]);

      // Extract current cash position
      const currentCash = extractCashBalance(balanceSheet);
      
      // Extract revenue and expenses from P&L
      const { monthlyRevenue, monthlyExpenses } = extractProfitLossData(profitLoss);
      
      const netCashFlow = monthlyRevenue - monthlyExpenses;
      const burnRate = monthlyExpenses;
      
      // Calculate historical growth rate (simplified for now)
      const revenueGrowthRate = monthlyRevenue > 0 ? 0.02 : 0; // 2% default, we'll improve this

      const metrics: FinancialMetrics = {
        currentCash,
        monthlyRevenue,
        monthlyExpenses,
        netCashFlow,
        revenueGrowthRate,
        burnRate
      };

      setFinancialMetrics(metrics);
      generateForecastData(metrics);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch financial data');
      // Fallback to sample data
      const fallbackMetrics: FinancialMetrics = {
        currentCash: 140000,
        monthlyRevenue: 45000,
        monthlyExpenses: 35000,
        netCashFlow: 10000,
        revenueGrowthRate: 0.02,
        burnRate: 35000
      };
      setFinancialMetrics(fallbackMetrics);
      generateForecastData(fallbackMetrics);
    }
  };

  const extractCashBalance = (balanceSheet: any): number => {
    try {
      const report = balanceSheet.QueryResponse?.Report;
      if (!report?.Rows?.Row) return 0;

      // Find bank accounts in the balance sheet
      const findBankAccounts = (rows: any[]): number => {
        for (const row of rows) {
          if (row.type === 'Section' && 
              row.Header?.ColData?.[0]?.value === 'Bank Accounts' &&
              row.Summary?.ColData) {
            return parseFloat(row.Summary.ColData[1].value.replace(/[^0-9.-]+/g, '') || '0');
          }
          if (row.Rows?.Row) {
            const result = findBankAccounts(row.Rows.Row);
            if (result > 0) return result;
          }
        }
        return 0;
      };

      return findBankAccounts(report.Rows.Row);
    } catch (error) {
      console.error('Error extracting cash balance:', error);
      return 0;
    }
  };

  const extractProfitLossData = (profitLoss: any) => {
    try {
      const report = profitLoss.QueryResponse?.Report;
      if (!report?.Rows?.Row) {
        return { monthlyRevenue: 0, monthlyExpenses: 0 };
      }

      // Calculate period months
      const startDate = new Date(report.Header.StartPeriod);
      const endDate = new Date(report.Header.EndPeriod);
      const monthsInPeriod = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
        (endDate.getMonth() - startDate.getMonth()) + 1;

      // Extract revenue
      const revenueSection = report.Rows.Row.find(
        (row: any) => row.Header?.ColData?.[0]?.value === 'Income'
      );
      const totalRevenue = extractSectionTotal(revenueSection);

      // Extract expenses
      const expenseSection = report.Rows.Row.find(
        (row: any) => row.Header?.ColData?.[0]?.value === 'Expenses'
      );
      const totalExpenses = extractSectionTotal(expenseSection);

      return {
        monthlyRevenue: Math.round((totalRevenue / monthsInPeriod) * 100) / 100,
        monthlyExpenses: Math.round((totalExpenses / monthsInPeriod) * 100) / 100
      };
    } catch (error) {
      console.error('Error extracting P&L data:', error);
      return { monthlyRevenue: 0, monthlyExpenses: 0 };
    }
  };

  const extractSectionTotal = (section: any): number => {
    if (!section?.Rows?.Row) return 0;
    
    return section.Rows.Row.reduce((total: number, row: any) => {
      if (row.type === 'Data' && row.ColData) {
        const amount = parseFloat(row.ColData[1]?.value || '0');
        return total + amount;
      }
      return total;
    }, 0);
  };

  const generateForecastData = async (metrics: FinancialMetrics) => {
    const { currentCash, monthlyRevenue, monthlyExpenses, netCashFlow, revenueGrowthRate } = metrics;
    
    // Convert monthly values to weekly for more granular forecasting
    const weeklyRevenue = monthlyRevenue / 4.33; // Average weeks per month
    const weeklyExpenses = monthlyExpenses / 4.33;
    const weeklyNetCashFlow = netCashFlow / 4.33;
    
    // Generate 13 weeks of forecast data
    const weeks = 13;
    const data: ScenarioData[] = [];
    
    for (let i = 0; i <= weeks; i++) {
      // Baseline: Use actual net cash flow pattern
      const baselineCash = currentCash + (weeklyNetCashFlow * i);
      
      // Growth: Apply growth percentage to net cash flow
      const growthMultiplier = 1 + (growthPercentage / 100);
      const improvedNetCashFlow = weeklyNetCashFlow * growthMultiplier;
      const growthCash = currentCash + (improvedNetCashFlow * i);
      
      // Downturn: Apply downturn percentage to net cash flow
      const downturnMultiplier = 1 + (downturnPercentage / 100);
      const downturnNetCashFlow = weeklyNetCashFlow * downturnMultiplier;
      const downturnCash = currentCash + (downturnNetCashFlow * i);
      
      data.push({
        week: i === 0 ? 'Week 1' : `Week ${i}`,
        Baseline: Math.round(Math.max(0, baselineCash)),
        Growth: Math.round(Math.max(0, growthCash)),
        Downturn: Math.round(Math.max(0, downturnCash))
      });
    }
    
    setChartData(data);
    setLoading(false);
  };

  const toggleScenario = (scenario: string) => {
    const newSelected = new Set(selectedScenarios);
    if (newSelected.has(scenario)) {
      newSelected.delete(scenario);
    } else {
      newSelected.add(scenario);
    }
    setSelectedScenarios(newSelected);
  };

  const currentScenario = scenarios[activeScenario];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading financial forecast data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <Title className="text-red-800">Error Loading Financial Data</Title>
          <Text className="text-red-600 mt-2">{error}</Text>
          <Text className="text-gray-600 mt-2">
            Using sample data for demonstration. Please check your QuickBooks connection.
          </Text>
        </Card>
        {/* Still show the forecast with fallback data */}
        <div className="mt-6" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title className="text-2xl font-bold text-gray-900">Financial Forecast</Title>
        <Text className="text-gray-600 mt-1">
          Scenario-based projections for the next 13 weeks
        </Text>
      </div>

      {/* Scenario Tabs */}
      <div className="flex space-x-4 mb-6">
        {Object.values(scenarios).map((scenario) => (
          <button
            key={scenario.name}
            onClick={() => setActiveScenario(scenario.name)}
            className={`px-6 py-3 rounded-lg border-2 transition-all ${
              activeScenario === scenario.name
                ? 'bg-white border-gray-300 shadow-sm'
                : 'bg-gray-50 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-1 h-8 rounded ${
                scenario.name === 'baseline' ? 'bg-blue-500' :
                scenario.name === 'growth' ? 'bg-emerald-500' :
                'bg-red-500'
              }`} />
              <div className="text-left">
                <div className="font-medium">{scenario.displayName}</div>
                <div className="text-sm text-gray-500">Scenario</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Active Scenario Details */}
      <Card className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Title>{currentScenario.displayName} Scenario</Title>
            <Text className="mt-1">
              Current trajectory based on {currentScenario.name === 'baseline' ? 'historical data' :
                currentScenario.name === 'growth' ? 'optimistic projections' : 'conservative estimates'}
            </Text>
          </div>
          <div className="text-right">
            <Badge color={currentScenario.color} size="lg">
              {currentScenario.probability}% probability
            </Badge>
            <div className="mt-2">
              <div className="text-2xl font-bold">${currentScenario.endCashPosition.toLocaleString()}</div>
              <div className="text-sm text-gray-500">End cash position</div>
            </div>
          </div>
        </div>
        
        {/* Factors */}
        <div className="mt-4">
          <Text className="font-medium mb-2">Key factors:</Text>
          <ul className="list-disc list-inside space-y-1">
            {currentScenario.factors.map((factor, index) => (
              <li key={index} className="text-sm text-gray-600">{factor}</li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Scenario Controls */}
      <Card className="mb-6">
        <Title className="mb-4">Scenario Settings</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Growth Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Growth Scenario Adjustment
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="200"
                value={growthPercentage}
                onChange={(e) => setGrowthPercentage(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={growthPercentage}
                  onChange={(e) => setGrowthPercentage(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <Text className="text-xs text-gray-500 mt-1">
              Percentage improvement in net cash flow
            </Text>
          </div>

          {/* Downturn Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Downturn Scenario Adjustment
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="-80"
                max="0"
                value={downturnPercentage}
                onChange={(e) => setDownturnPercentage(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={downturnPercentage}
                  onChange={(e) => setDownturnPercentage(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <Text className="text-xs text-gray-500 mt-1">
              Percentage reduction in net cash flow
            </Text>
          </div>
        </div>
      </Card>

      {/* Scenario Comparison Chart */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Scenario Comparison</Title>
          <div className="flex space-x-2">
            {Object.values(scenarios).map((scenario) => (
              <button
                key={scenario.name}
                onClick={() => toggleScenario(scenario.displayName)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  selectedScenarios.has(scenario.displayName)
                    ? scenario.name === 'baseline' ? 'bg-blue-500 text-white' :
                      scenario.name === 'growth' ? 'bg-emerald-500 text-white' :
                      'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {scenario.displayName}
              </button>
            ))}
          </div>
        </div>
        
        <LineChart
          className="h-72"
          data={chartData}
          index="week"
          categories={Array.from(selectedScenarios)}
          colors={['blue', 'emerald', 'red']}
          valueFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          showLegend={true}
          showGridLines={true}
          curveType="monotone"
        />
      </Card>
    </div>
  );
}