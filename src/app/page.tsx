'use client';

import { Card, Title, Text, Metric, AreaChart, BarChart, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { useState, useEffect, Suspense } from 'react';
import { BanknotesIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
import { RunwayCalculator } from '../lib/runwayCalculator';
import {
  CompanyFinancials,
  RevenueStream,
  ExpenseCategory,
  FinancialEntry,
  TimePeriod,
  RunwayProjection,
  RunwayAnalysis,
  RunwayOption
} from '@/types/financial';
import { format, addMonths, startOfMonth } from 'date-fns';
import { CalculationBreakdown } from '../components/CalculationBreakdown';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { useSearchParams } from 'next/navigation';
import { CalculationJob } from '@/lib/services/calculationJob';
import { FinancialCalculationService } from '@/lib/services/financialCalculations';
import { MultiAdminConnectionManager } from '@/components/MultiAdminConnectionManager';
import { getAvailableConnections, getValidConnection } from '@/lib/quickbooks/connectionManager';

interface QuickBooksRow {
  Header?: {
    ColData: Array<{
      value: string;
    }>;
  };
  Rows?: {
    Row: QuickBooksRow[];
  };
  Summary?: {
    ColData: Array<{
      value: string;
    }>;
  };
  type?: string;
  group?: string;
  ColData?: Array<{
    value: string;
  }>;
}

interface QuickBooksReport {
  QueryResponse: {
    Report: {
      Header: {
        Time: string;
        ReportName: string;
        DateMacro: string;
        ReportBasis: string;
        StartPeriod: string;
        EndPeriod: string;
        Currency: string;
      };
      Columns: {
        Column: Array<{
          ColTitle: string;
          ColType: string;
        }>;
      };
      Rows: {
        Row: QuickBooksRow[];
      };
    };
  };
}

interface ChartDataPoint {
  date: string;
  'Cash Balance': number;
  'Revenue': number;
  'Expenses': number;
  cumulativeCash?: number;
}

interface ProcessedData {
  revenueStreams: RevenueStream[];
  expenses: ExpenseCategory[];
  initialCashBalance: number;
}

const generateUniqueName = (baseName: string, existingNames: Set<string>): string => {
  let uniqueName = baseName;
  let counter = 1;
  while (existingNames.has(uniqueName)) {
    uniqueName = `${baseName} (${counter})`;
    counter++;
  }
  existingNames.add(uniqueName);
  return uniqueName;
};

const DebugView = ({ data }: { data: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mt-8 p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Debug View</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {isExpanded && (
        <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

function HomeContent() {
  const [analysis, setAnalysis] = useState<RunwayAnalysis | null>(null);
  const [selectedOption, setSelectedOption] = useState<RunwayOption | null>(null);
  const [simulatedAnalysis, setSimulatedAnalysis] = useState<RunwayAnalysis | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [statusDetails, setStatusDetails] = useState<any>(null);
  const [financialData, setFinancialData] = useState<CompanyFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugData, setDebugData] = useState<any>(null);
  const searchParams = useSearchParams();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [projections, setProjections] = useState<any[]>([]);

  // Redirect to analysis page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/analysis';
    }
  }, []);

  // Reset selectedMonth if it's out of bounds after filtering
  useEffect(() => {
    if (analysis && selectedMonth >= analysis.projections.filter(proj => proj.cashBalance > 0).length) {
      setSelectedMonth(0);
    }
  }, [analysis, selectedMonth]);

  useEffect(() => {
    console.log('Home component mounted');
    const status = searchParams.get('quickbooks');
    const connectionId = searchParams.get('connection_id');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const realmId = searchParams.get('realm_id');

    console.log('URL parameters:', { status, connectionId, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken, hasRealmId: !!realmId });

    // Check for new connection from OAuth callback
    if (status === 'connected' && connectionId) {
      console.log('New connection established, fetching data...');
      setConnectionStatus('connected');
      fetchFinancialDataWithConnection(parseInt(connectionId));
      return;
    }

    // Fallback to old token-based system for backward compatibility
    if (status === 'connected' && accessToken && refreshToken) {
      console.log('Setting up QuickBooks connection from URL parameters (legacy)...');
      const client = new QuickBooksClient();
      quickBooksStore.setTokens(accessToken, refreshToken);
      if (realmId) {
        client.setRealmId(realmId);
      }
      setConnectionStatus('connected');
      fetchFinancialData();
      return;
    }

    // Check for existing connections in the database
    checkForExistingConnections();

    if (status === 'error') {
      console.log('QuickBooks connection error');
      setConnectionStatus('error');
    }
  }, [searchParams]);

  const checkForExistingConnections = async () => {
    try {
      const connections = await getAvailableConnections();
      if (connections.availableConnections.length > 0) {
        console.log('Found existing connections, using the most recent one');
        setConnectionStatus('connected');
        fetchFinancialDataWithConnection(connections.availableConnections[0].id);
      } else {
        console.log('No existing connections found');
        setConnectionStatus('idle');
      }
    } catch (error) {
      console.error('Error checking for existing connections:', error);
      setConnectionStatus('idle');
    }
  };

  const fetchFinancialDataWithConnection = async (connectionId: number) => {
    try {
      // First, try to update the connection with the correct user ID if it's a temp user
      await updateConnectionUserId(connectionId);
      
      const connection = await getValidConnection(connectionId);
      console.log('Using connection:', connection.id);
      
      // Create a client with the connection data
      const client = new QuickBooksClient();
      quickBooksStore.setTokens(connection.access_token, connection.refresh_token);
      client.setRealmId(connection.realm_id);
      
      fetchFinancialData();
    } catch (error) {
      console.error('Error using connection:', error);
      setConnectionStatus('error');
    }
  };

  const updateConnectionUserId = async (connectionId: number) => {
    try {
      // Get the current user ID from localStorage
      let userId = localStorage.getItem('qb_user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        localStorage.setItem('qb_user_id', userId);
      }
      
      const response = await fetch('/api/quickbooks/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_user_id',
          connectionId,
          userId
        }),
      });

      if (!response.ok) {
        console.warn('Failed to update connection user ID, but continuing...');
      }
    } catch (error) {
      console.warn('Error updating connection user ID:', error);
    }
  };

  const extractCashBalance = (balanceSheet: QuickBooksReport): number => {
    try {
      // Get the actual report data from the wrapped response
      const report = balanceSheet.QueryResponse?.Report;
      if (!report?.Rows?.Row) {
        console.warn('Could not find rows in balance sheet');
        return 0;
      }

      // Find the ASSETS section
      const assetsSection = report.Rows.Row.find(
        (row: QuickBooksRow) => 
          row.type === 'Section' && 
          row.Header?.ColData?.[0]?.value === 'ASSETS'
      );

      if (!assetsSection?.Rows?.Row) {
        console.warn('Could not find assets section, trying alternative structure');
        // Try to find bank accounts directly
        const bankAccounts = report.Rows.Row.find(
          (row: QuickBooksRow) =>
            row.type === 'Section' &&
            row.Header?.ColData?.[0]?.value === 'Bank Accounts'
        );
        if (bankAccounts?.Summary?.ColData) {
          return parseFloat(bankAccounts.Summary.ColData[1].value.replace(/[^0-9.-]+/g, '') || '0');
        }
        return 0;
      }

      // Find the Current Assets section within ASSETS
      const currentAssetsSection = assetsSection.Rows.Row.find(
        (row: QuickBooksRow) => 
          row.type === 'Section' &&
          row.Header?.ColData?.[0]?.value === 'Current Assets'
      );

      if (!currentAssetsSection?.Rows?.Row) {
        console.warn('Could not find current assets section, trying to find bank accounts directly in assets');
        // Try to find bank accounts directly in assets
        const bankAccounts = assetsSection.Rows.Row.find(
          (row: QuickBooksRow) =>
            row.type === 'Section' &&
            row.Header?.ColData?.[0]?.value === 'Bank Accounts'
        );
        if (bankAccounts?.Summary?.ColData) {
          return parseFloat(bankAccounts.Summary.ColData[1].value.replace(/[^0-9.-]+/g, '') || '0');
        }
        return 0;
      }

      // Find the Bank Accounts section within Current Assets
      const bankAccountsSection = currentAssetsSection.Rows.Row.find(
        (row: QuickBooksRow) =>
          row.type === 'Section' &&
          row.Header?.ColData?.[0]?.value === 'Bank Accounts'
      );

      if (!bankAccountsSection?.Summary?.ColData) {
        console.warn('Could not find bank accounts section with summary, trying to sum individual accounts');
        // Try to sum individual bank account balances
        const bankAccounts = currentAssetsSection.Rows.Row.filter(
          (row: QuickBooksRow) =>
            row.type === 'Data' &&
            row.ColData?.[0]?.value?.toLowerCase().includes('bank')
        );
        if (bankAccounts.length > 0) {
          return bankAccounts.reduce((sum, account) => {
            return sum + parseFloat(account.ColData?.[1]?.value.replace(/[^0-9.-]+/g, '') || '0');
          }, 0);
        }
        return 0;
      }

      // Get the total from the summary
      return parseFloat(bankAccountsSection.Summary.ColData[1].value.replace(/[^0-9.-]+/g, '') || '0');
    } catch (error) {
      console.error('Error extracting cash balance:', error);
      return 0;
    }
  };

  const extractAmountsFromRows = (rows: any[]): { name: string; amount: number }[] => {
    const amounts: { name: string; amount: number }[] = [];
    
    rows.forEach(row => {
      // Handle direct data rows
      if (row.type === 'Data' && row.ColData) {
        const name = row.ColData[0]?.value;
        const amount = parseFloat(row.ColData[1]?.value || '0');
        if (name && !isNaN(amount)) {
          amounts.push({ name, amount });
        }
      }
      
      // Handle section headers with amounts
      if (row.Header?.ColData && row.ColData?.[1]?.value) {
        const name = row.Header.ColData[0]?.value;
        const amount = parseFloat(row.ColData[1]?.value || '0');
        if (name && !isNaN(amount)) {
          amounts.push({ name, amount });
        }
      }
      
      // Recursively process nested sections
      if (row.Rows?.Row) {
        amounts.push(...extractAmountsFromRows(row.Rows.Row));
      }
    });
    
    return amounts;
  };

  const extractFinancialData = async (client: QuickBooksClient): Promise<{ financialData: CompanyFinancials; debugData: any }> => {
    // Get balance sheet for current cash balance
    const balanceSheet = await client.getBalanceSheet();
    const cashBalance = extractCashBalance(balanceSheet);
    console.log('Current cash balance:', cashBalance);

    // Get profit and loss for revenue and expenses
    const profitLoss = await client.getProfitAndLoss();
    console.log('Profit & Loss report dates:', {
      startPeriod: profitLoss.QueryResponse.Report.Header.StartPeriod,
      endPeriod: profitLoss.QueryResponse.Report.Header.EndPeriod,
      reportBasis: profitLoss.QueryResponse.Report.Header.ReportBasis,
      startDate: new Date(profitLoss.QueryResponse.Report.Header.StartPeriod).toISOString(),
      endDate: new Date(profitLoss.QueryResponse.Report.Header.EndPeriod).toISOString()
    });

    // Parse the date range from the report
    const startDate = new Date(profitLoss.QueryResponse.Report.Header.StartPeriod + 'T12:00:00.000Z');
    const endDate = new Date(profitLoss.QueryResponse.Report.Header.EndPeriod + 'T12:00:00.000Z');
    
    // Calculate the number of months in the report period
    const monthsInPeriod = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
      (endDate.getMonth() - startDate.getMonth()) + 1;
    console.log('Months in period:', monthsInPeriod);

    // Extract revenue data from the Income section
    const revenueSection = profitLoss.QueryResponse.Report.Rows.Row.find(
      (row: QuickBooksRow) => row.Header?.ColData?.[0]?.value === 'Income'
    );
    
    const revenueItems = revenueSection?.Rows?.Row || [];
    const revenueAmounts = extractAmountsFromRows(revenueItems);
    console.log('Revenue items:', revenueAmounts);

    // Extract expense data from the Expenses section
    const expenseSection = profitLoss.QueryResponse.Report.Rows.Row.find(
      (row: QuickBooksRow) => row.Header?.ColData?.[0]?.value === 'Expenses'
    );
    
    const expenseItems = expenseSection?.Rows?.Row || [];
    const expenseAmounts = extractAmountsFromRows(expenseItems);
    console.log('Expense items:', expenseAmounts);

    // Calculate monthly averages using only the direct items
    const monthlyRevenue = Math.round((revenueAmounts.reduce((sum, item) => sum + item.amount, 0) / monthsInPeriod) * 100) / 100;
    const monthlyExpenses = Math.round((expenseAmounts.reduce((sum, item) => sum + item.amount, 0) / monthsInPeriod) * 100) / 100;
    console.log('Monthly averages:', {
      revenue: monthlyRevenue,
      expenses: monthlyExpenses,
      netCashFlow: monthlyRevenue - monthlyExpenses,
      periodMonths: monthsInPeriod
    });

    // Create financial entries
    const createInitialEntry = (amount: number): FinancialEntry => ({
      id: crypto.randomUUID(),
      date: startDate.toISOString(),
      amount: Math.round(amount * 100) / 100,
      description: 'Initial entry'
    });

    // Create historical data
    const historicalMonths = 6;
    const historicalStartDate = new Date(startDate);
    historicalStartDate.setMonth(historicalStartDate.getMonth() - historicalMonths);
    
    // Generate historical amounts with growth
    const historicalAmounts = Array.from({ length: historicalMonths }, (_, i) => {
      const amount = revenueAmounts[i]?.amount || 0;
      return Math.round((amount / monthsInPeriod) * 100) / 100;
    });

    // Create historical entries
    const historicalEntries = historicalAmounts.map((amount, i) => {
      const entryDate = new Date(historicalStartDate);
      entryDate.setMonth(entryDate.getMonth() + i);
      return {
        id: crypto.randomUUID(),
        date: entryDate.toISOString(),
        amount: Math.round(amount * 100) / 100,
        description: 'Historical entry'
      };
    });

    // Create actual entries
    const actualEntries = Array.from({ length: monthsInPeriod }, (_, i) => {
      const entryDate = new Date(startDate);
      entryDate.setMonth(entryDate.getMonth() + i);
      return {
        id: crypto.randomUUID(),
        date: entryDate.toISOString(),
        amount: Math.round((revenueAmounts[i].amount / monthsInPeriod) * 100) / 100,
        description: 'Actual entry'
      };
    });

    // Create revenue streams
    const usedRevenueNames = new Set<string>();
    const revenueStreams = revenueAmounts
      .filter(item => item.amount !== 0)
      .map(item => {
        const uniqueName = generateUniqueName(item.name, usedRevenueNames);
        const monthlyAmount = Math.round((item.amount / monthsInPeriod) * 100) / 100;
        
        // Create entries using only actual QuickBooks data
        const entries = Array.from({ length: monthsInPeriod }, (_, i) => {
          const entryDate = new Date(startDate);
          entryDate.setMonth(entryDate.getMonth() + i);
          return {
            id: crypto.randomUUID(),
            date: entryDate.toISOString(),
            amount: monthlyAmount,
            description: 'QuickBooks data'
          };
        });
        
        return {
          id: uniqueName,
          name: uniqueName,
          entries,
          isRecurring: true
        };
      });

    // Create expenses
    const usedExpenseNames = new Set<string>();
    const expenses = expenseAmounts
      .filter(item => item.amount !== 0)
      .map(item => {
        const uniqueName = generateUniqueName(item.name, usedExpenseNames);
        const monthlyAmount = Math.round((item.amount / monthsInPeriod) * 100) / 100;
        
        return {
          id: uniqueName,
          name: uniqueName,
          entries: [createInitialEntry(monthlyAmount)],
          isFixed: [
            'Rent or Lease',
            'Insurance',
            'Accounting',
            'Bookkeeper',
            'Lawyer',
            'Telephone',
            'Gas and Electric'
          ].includes(item.name),
          isRecurring: true,
          frequency: 'monthly' as TimePeriod
        };
      });

    // Create initial projection
    const initialProjection: RunwayProjection = {
      date: startDate,
      revenue: monthlyRevenue,
      expenses: monthlyExpenses,
      netIncome: monthlyRevenue - monthlyExpenses,
      cumulativeCash: cashBalance,
      cashBalance: cashBalance,
      netCashFlow: monthlyRevenue - monthlyExpenses
    };

    const financialData: CompanyFinancials = {
      cashBalance,
      revenueStreams,
      expenses,
      startDate,
      endDate,
      initialProjection
    };

    // Create debug data object
    const debugData = {
      balanceSheet,
      profitLoss,
      extractedData: {
        cashBalance,
        revenueItems: revenueAmounts,
        expenseItems: expenseAmounts,
        monthlyAverages: {
          revenue: monthlyRevenue,
          expenses: monthlyExpenses,
          netCashFlow: monthlyRevenue - monthlyExpenses,
          periodMonths: monthsInPeriod
        }
      }
    };

    return { financialData, debugData };
  };

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      console.log('Starting to fetch financial data...');
      
      const client = new QuickBooksClient();
      
      try {
        const { financialData, debugData } = await extractFinancialData(client);
        console.log('Created financial data');

        setFinancialData(financialData);
        setDebugData(debugData);

        const calculator = new RunwayCalculator(financialData);
        const initialAnalysis = await calculator.analyzeRunway();
        console.log('Generated initial analysis');
        
        setAnalysis(initialAnalysis);
      } catch (apiError) {
        console.error('API Error:', apiError);
        throw apiError;
      }
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
      console.log('Finished loading financial data');
    }
  };

  const handleQuickBooksConnect = () => {
    console.log('Connecting to QuickBooks...');
    const client = new QuickBooksClient();
    const authUrl = client.getAuthorizationUrl();
    window.location.href = authUrl;
  };

  const handleOptionSelect = async (option: RunwayOption) => {
    if (!financialData) return;
    setSelectedOption(option);
    const calculator = new RunwayCalculator(financialData);
    const simulated = await calculator.simulateOption(option);
    setSimulatedAnalysis(simulated);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Initialize calculation services
        const calculationJob = CalculationJob.getInstance();
        const financialService = FinancialCalculationService.getInstance();

        // Create initial financial data
        const initialData: CompanyFinancials = {
          startDate: new Date(2024, 6, 1), // July 2024
          endDate: new Date(2025, 11, 31), // December 2025
          revenueStreams: [],
          expenses: [],
          cashBalance: 0,
          initialProjection: {
            date: new Date(2024, 6, 1),
            revenue: 0,
            expenses: 0,
            netIncome: 0,
            cumulativeCash: 0,
            cashBalance: 0,
            netCashFlow: 0
          }
        };

        // Pre-calculate values for the entire date range
        await calculationJob.precalculateValues(initialData);

        // Update state with processed data
        setFinancialData(initialData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setConnectionStatus('error');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Async function to build projections and chart data
  const buildProjectionsAndChartData = async (analysis: RunwayAnalysis) => {
    // Await all revenue/expense calculations for each projection
    const newProjections = await Promise.all(
      analysis.projections.map(async (proj) => {
        // If revenue/expenses are Promises, resolve them
        const revenue = typeof proj.revenue === 'number' ? proj.revenue : await proj.revenue;
        const expenses = typeof proj.expenses === 'number' ? proj.expenses : await proj.expenses;
        return {
          ...proj,
          revenue,
          expenses,
        };
      })
    );
    setProjections(newProjections);
    const chartData = newProjections.map((proj) => ({
      date: format(proj.date, 'MMM yyyy'),
      'Cash Balance': proj.cashBalance,
      'Revenue': proj.revenue,
      'Expenses': proj.expenses,
      cumulativeCash: proj.cumulativeCash
    }));
    setChartData(chartData);
  };

  // Use projections/chartData from state
  const filteredProjections = projections.filter(proj => {
    const date = new Date(proj.date);
    return !(date.getMonth() === 11 && date.getFullYear() === 2024);
  });
  const currentProjection = filteredProjections[selectedMonth];

  // Use cumulativeCash for chart data
  useEffect(() => {
    if (analysis) {
      buildProjectionsAndChartData(analysis);
    }
  }, [analysis]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Text>Loading financial data...</Text>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <MultiAdminConnectionManager />
      </div>
    );
  }

  if (connectionStatus === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <MultiAdminConnectionManager />
      </div>
    );
  }

  if (!analysis || !financialData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <MultiAdminConnectionManager />
      </div>
    );
  }

  const simulatedChartData = simulatedAnalysis?.projections
    .filter(proj => {
      const date = new Date(proj.date);
      return !(date.getMonth() === 11 && date.getFullYear() === 2024);
    })
    .map(proj => ({
      date: format(proj.date, 'MMM yyyy'),
      'Cash Balance': proj.cashBalance,
      'Revenue': proj.revenue,
      'Expenses': proj.expenses,
    })) || [];

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title>Runway Analysis Dashboard</Title>
          <Text>Make informed decisions about your company's financial future</Text>
        </div>
        <button
          onClick={handleQuickBooksConnect}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Reconnect to QuickBooks
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <Text>Current Runway</Text>
          <Metric>{analysis.currentRunway.toFixed(1)} months</Metric>
          <Text className="mt-2">${(financialData.initialProjection?.cumulativeCash || 0).toLocaleString()} cash on hand</Text>
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
            data={chartData}
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
            revenueStreams={financialData.revenueStreams}
            expenses={financialData.expenses}
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
                  ? `-$${Math.round(option.impact.value).toLocaleString()}`
                  : `+$${Math.round(option.impact.value).toLocaleString()}`}
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

      {debugData && <DebugView data={debugData} />}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <Text>Loading...</Text>
        </div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
