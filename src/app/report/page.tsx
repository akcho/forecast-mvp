'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, Select, SelectItem, Grid, Col, Metric, Badge, TextInput, Button, List, ListItem } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';

interface PnLRow {
  type: string;
  Header?: {
    ColData: Array<{ value: string }>;
  };
  Rows?: {
    Row: Array<PnLRow>;
  };
  Summary?: {
    ColData: Array<{ value: string }>;
  };
  ColData?: Array<{ value: string }>;
  Group?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAnalysis {
  executiveSummary: string;
  keyInsights: string[];
  recommendations: string[];
}

export default function ReportView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [dateRange, setDateRange] = useState('thisMonth');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const client = new QuickBooksClient();
        const profitLoss = await client.getProfitAndLoss();
        console.log('Full P&L Structure:', JSON.stringify(profitLoss?.QueryResponse?.Report, null, 2));
        setReport(profitLoss?.QueryResponse?.Report);
        
        // Get AI analysis when report loads
        await getAIAnalysis(profitLoss?.QueryResponse?.Report);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching report:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch report');
        setLoading(false);
      }
    };

    fetchReport();
  }, [dateRange]);

  const getAIAnalysis = async (reportData: any) => {
    try {
      // Prepare the report data first
      const preparedData = prepareReportData(reportData);
      
      // Log the data being sent
      console.log('Sending to AI Analysis:', {
        totalIncome: preparedData.totalIncome,
        totalExpenses: preparedData.totalExpenses,
        cogs: preparedData.cogs,
        grossProfit: preparedData.grossProfit,
        netIncome: preparedData.netIncome,
        grossMargin: preparedData.grossMargin,
        expenseRatio: preparedData.expenseRatio,
        cogsRatio: preparedData.cogsRatio
      });
      
      const response = await fetch('/api/analyze-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'analysis',
          reportData: preparedData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const analysis = await response.json();
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Error getting AI analysis:', error);
    }
  };

  const prepareReportData = (reportData: any) => {
    // Get all the calculated values using the passed reportData
    const totalIncome = reportData?.Rows?.Row?.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Income'
    )?.Summary?.ColData[1]?.value ? 
    parseFloat(reportData.Rows.Row.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Income'
    ).Summary.ColData[1].value.replace(/[^0-9.-]+/g, '')) : 0;

    const totalExpenses = reportData?.Rows?.Row?.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Expenses'
    )?.Summary?.ColData[1]?.value ?
    parseFloat(reportData.Rows.Row.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Expenses'
    ).Summary.ColData[1].value.replace(/[^0-9.-]+/g, '')) : 0;

    const cogs = reportData?.Rows?.Row?.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Expenses'
    )?.Rows?.Row?.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Job Expenses'
    )?.Rows?.Row?.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Job Materials'
    )?.Rows?.Row?.reduce((sum: number, row: PnLRow) => {
      if (row.type === 'Data') {
        return sum + parseFloat(row.ColData?.[1]?.value.replace(/[^0-9.-]+/g, '') || '0');
      }
      return sum;
    }, 0) || 0;

    const grossProfit = totalIncome - cogs;
    const netIncome = totalIncome - totalExpenses;

    // Calculate ratios
    const grossMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    const cogsRatio = totalIncome > 0 ? (cogs / totalIncome) * 100 : 0;

    // Log the values for debugging
    console.log('Preparing report data with values:', {
      totalIncome,
      totalExpenses,
      cogs,
      grossProfit,
      netIncome,
      grossMargin,
      expenseRatio,
      cogsRatio
    });

    return {
      period: `${reportData?.Header?.StartPeriod} to ${reportData?.Header?.EndPeriod}`,
      reportBasis: reportData?.Header?.ReportBasis,
      currency: reportData?.Header?.Currency,
      generated: reportData?.Header?.Time,
      
      // Key metrics
      totalIncome,
      totalExpenses,
      cogs,
      grossProfit,
      netIncome,
      grossMargin,
      expenseRatio,
      cogsRatio,

      // Detailed breakdowns
      incomeBreakdown: reportData?.Rows?.Row?.find(
        (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Income'
      )?.Rows?.Row || [],

      expenseBreakdown: reportData?.Rows?.Row?.find(
        (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Expenses'
      )?.Rows?.Row || []
    };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const getTotalIncome = () => {
    if (!report?.Rows?.Row) return 0;
    
    const incomeSection = report.Rows.Row.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Income'
    );

    if (incomeSection?.Summary?.ColData[1]?.value) {
      return parseFloat(incomeSection.Summary.ColData[1].value.replace(/[^0-9.-]+/g, ''));
    }

    // Fallback: sum all income items including nested ones
    const sumNestedRows = (rows: PnLRow[]): number => {
      return rows.reduce((sum: number, row: PnLRow) => {
        if (row.type === 'Data') {
          return sum + parseFloat(row.ColData?.[1]?.value.replace(/[^0-9.-]+/g, '') || '0');
        } else if (row.Rows?.Row) {
          return sum + sumNestedRows(row.Rows.Row);
        }
        return sum;
      }, 0);
    };

    return sumNestedRows(incomeSection?.Rows?.Row || []);
  };

  const getTotalExpenses = () => {
    if (!report?.Rows?.Row) return 0;
    
    const expenseSection = report.Rows.Row.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Expenses'
    );

    if (expenseSection?.Summary?.ColData[1]?.value) {
      return parseFloat(expenseSection.Summary.ColData[1].value.replace(/[^0-9.-]+/g, ''));
    }

    // Fallback: sum all expense items including nested ones
    const sumNestedRows = (rows: PnLRow[]): number => {
      return rows.reduce((sum: number, row: PnLRow) => {
        if (row.type === 'Data') {
          return sum + parseFloat(row.ColData?.[1]?.value.replace(/[^0-9.-]+/g, '') || '0');
        } else if (row.Rows?.Row) {
          return sum + sumNestedRows(row.Rows.Row);
        }
        return sum;
      }, 0);
    };

    return sumNestedRows(expenseSection?.Rows?.Row || []);
  };

  const getCOGS = () => {
    if (!report?.Rows?.Row) return 0;
    
    // Find the Expenses section
    const expenseSection = report.Rows.Row.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Expenses'
    );

    if (!expenseSection?.Rows?.Row) return 0;

    // Find the Job Expenses section
    const jobExpensesSection = expenseSection.Rows.Row.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Job Expenses'
    );

    if (!jobExpensesSection?.Rows?.Row) return 0;

    // Find the Job Materials section
    const jobMaterialsSection = jobExpensesSection.Rows.Row.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Job Materials'
    );

    if (!jobMaterialsSection?.Rows?.Row) return 0;

    // Sum all items in Job Materials
    return jobMaterialsSection.Rows.Row.reduce((sum: number, row: PnLRow) => {
      if (row.type === 'Data') {
        return sum + parseFloat(row.ColData?.[1]?.value.replace(/[^0-9.-]+/g, '') || '0');
      }
      return sum;
    }, 0);
  };

  const getOperatingExpenses = () => {
    if (!report?.Rows?.Row) return 0;
    
    // Common operating expense account names
    const operatingExpenseNames = [
      'operating expenses',
      'overhead',
      'general and administrative',
      'g&a',
      'selling expenses',
      'marketing',
      'advertising',
      'utilities',
      'rent',
      'insurance',
      'maintenance',
      'repairs',
      'office expenses',
      'professional fees',
      'legal',
      'accounting'
    ];

    // Find all sections that might contain operating expenses
    const findOperatingExpensesInSection = (section: PnLRow): number => {
      let total = 0;

      // Check if this section name indicates operating expenses
      const sectionName = section.Header?.ColData[0].value.toLowerCase() || '';
      if (operatingExpenseNames.some(name => sectionName.includes(name))) {
        // If it's an operating expense section, sum all its rows
        if (section.Rows?.Row) {
          total += section.Rows.Row.reduce((sum: number, row: PnLRow) => {
            if (row.type === 'Data') {
              return sum + parseFloat(row.ColData?.[1]?.value.replace(/[^0-9.-]+/g, '') || '0');
            }
            return sum;
          }, 0);
        }
      }

      // Recursively check nested sections
      if (section.Rows?.Row) {
        section.Rows.Row.forEach((row: PnLRow) => {
          if (row.type === 'Section') {
            total += findOperatingExpensesInSection(row);
          }
        });
      }

      return total;
    };

    // Search through all sections
    return report.Rows.Row.reduce((total: number, row: PnLRow) => {
      if (row.type === 'Section') {
        return total + findOperatingExpensesInSection(row);
      }
      return total;
    }, 0);
  };

  const getGrossProfit = () => {
    const totalIncome = getTotalIncome();
    const cogs = getCOGS();
    return totalIncome - cogs;
  };

  const getOperatingIncome = () => {
    const grossProfit = getGrossProfit();
    const operatingExpenses = getOperatingExpenses();
    return grossProfit - operatingExpenses;
  };

  const getNetIncome = () => {
    if (!report?.Rows?.Row) return 0;
    return getTotalIncome() - getTotalExpenses();
  };

  const renderSection = (sectionName: string) => {
    if (!report?.Rows?.Row) return null;
    
    const section = report.Rows.Row.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === sectionName
    );

    if (!section?.Rows?.Row) return null;

    const renderRow = (row: PnLRow, level: number = 0) => {
      if (row.type === 'Section') {
        return (
          <div key={row.Header?.ColData[0].value} className="mt-4">
            <div className="font-semibold text-gray-700">{row.Header?.ColData[0].value}</div>
            {row.Rows?.Row.map((subRow: PnLRow) => renderRow(subRow, level + 1))}
          </div>
        );
      }

      if (row.type === 'Data') {
        const amount = parseFloat(row.ColData?.[1]?.value.replace(/[^0-9.-]+/g, '') || '0');
        return (
          <div 
            key={row.ColData?.[0].value} 
            className="flex justify-between py-1"
            style={{ paddingLeft: `${level * 16}px` }}
          >
            <span className="text-gray-600">{row.ColData?.[0].value}</span>
            <span className={sectionName === 'Income' ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(amount)}
            </span>
          </div>
        );
      }

      return null;
    };

    return (
      <div className="space-y-2">
        {section.Rows.Row.map((row: PnLRow) => renderRow(row))}
        {section.Summary && (
          <div className="flex justify-between font-semibold border-t pt-2 mt-2">
            <span>Total {sectionName}</span>
            <span className={sectionName === 'Income' ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(parseFloat(section.Summary.ColData[1].value.replace(/[^0-9.-]+/g, '') || '0'))}
            </span>
          </div>
        )}
      </div>
    );
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);
    setQuestion('');
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'question',
          question,
          reportData: prepareReportData(report)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze report');
      }

      const analysis = await response.json();

      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: analysis.answer,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error analyzing report:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while analyzing the report. Please try again.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <Text>Loading financial report...</Text>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-center h-64">
          <Text className="text-red-600 mb-4">{error}</Text>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const netIncome = getNetIncome();
  const isProfitable = netIncome >= 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
          <Text className="text-gray-600">
            {report?.Header?.StartPeriod} to {report?.Header?.EndPeriod}
          </Text>
        </div>
        <Select
          value={dateRange}
          onValueChange={setDateRange}
          className="w-48"
        >
          <SelectItem value="thisMonth">This Month</SelectItem>
          <SelectItem value="lastMonth">Last Month</SelectItem>
          <SelectItem value="thisQuarter">This Quarter</SelectItem>
          <SelectItem value="lastQuarter">Last Quarter</SelectItem>
          <SelectItem value="thisYear">This Year</SelectItem>
          <SelectItem value="lastYear">Last Year</SelectItem>
        </Select>
      </div>

      <Grid numItems={1} numItemsLg={3} className="gap-6">
        {/* Main Content */}
        <Col numColSpan={2}>
          {/* Key Metrics */}
          <Grid numItems={1} numItemsSm={2} className="gap-6">
            <Card>
              {/* Top row: Net Income | Gross Profit */}
              <div className="flex flex-col sm:flex-row justify-between items-end">
                <div>
                  <Text>Net Income</Text>
                  <Metric className={isProfitable ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(netIncome)}
                  </Metric>
                  <Badge color={isProfitable ? 'green' : 'red'} className="mt-2">
                    {isProfitable ? 'Profitable' : 'Not Profitable'}
                  </Badge>
                </div>
                <div>
                  <Text>Gross Profit</Text>
                  <Metric className="text-green-600">{formatCurrency(getGrossProfit())}</Metric>
                  <Text className="mt-2 text-sm text-gray-600">
                    {formatPercent(getGrossProfit(), getTotalIncome())} Gross Margin
                  </Text>
                </div>
              </div>
              {/* Income Breakdown */}
              <div className="mt-6">
                <Title>Income</Title>
                <div className="mt-4">{renderSection('Income')}</div>
              </div>
            </Card>

            <Card>
              {/* Top row: Total Expenses | COGS */}
              <div className="flex flex-col sm:flex-row justify-between items-end">
                <div>
                  <Text>Total Expenses</Text>
                  <Metric className="text-red-600">{formatCurrency(getTotalExpenses())}</Metric>
                  <Text className="mt-2 text-sm text-gray-600">
                    {formatPercent(getTotalExpenses(), getTotalIncome())} of Revenue
                  </Text>
                </div>
                <div>
                  <Text>Cost of Goods Sold</Text>
                  <Metric className="text-red-600">{formatCurrency(getCOGS())}</Metric>
                  <Text className="mt-2 text-sm text-gray-600">
                    {formatPercent(getCOGS(), getTotalIncome())} of Revenue
                  </Text>
                </div>
              </div>
              {/* Expenses Breakdown */}
              <div className="mt-6">
                <Title>Expenses</Title>
                <div className="mt-4">{renderSection('Expenses')}</div>
              </div>
            </Card>
          </Grid>
        </Col>

        {/* AI Analysis Panel */}
        <Col>
          <Card>
            <div className="flex justify-between items-center mb-4">
              <Title>AI Financial Analysis</Title>
              <Button
                size="xs"
                variant="secondary"
                onClick={() => setShowChat(!showChat)}
              >
                {showChat ? 'View Insights' : 'Ask Questions'}
              </Button>
            </div>

            {showChat ? (
              <div className="space-y-4">
                <div className="h-96 overflow-y-auto space-y-4">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-50 ml-4'
                          : 'bg-gray-50 mr-4'
                      }`}
                    >
                      <Text>{message.content}</Text>
                      <Text className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </Text>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <TextInput
                    placeholder="Ask about your financial data..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                  />
                  <Button
                    onClick={handleAskQuestion}
                    disabled={isAnalyzing || !question.trim()}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Ask'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {aiAnalysis ? (
                  <>
                    <div>
                      <Text className="font-semibold">Executive Summary</Text>
                      <Text className="mt-1">{aiAnalysis.executiveSummary}</Text>
                    </div>
                    <div>
                      <Text className="font-semibold">Key Insights</Text>
                      <List className="mt-1">
                        {aiAnalysis.keyInsights.map((insight, index) => (
                          <ListItem key={index}>{insight}</ListItem>
                        ))}
                      </List>
                    </div>
                    <div>
                      <Text className="font-semibold">Recommended Actions</Text>
                      <List className="mt-1">
                        {aiAnalysis.recommendations.map((action, index) => (
                          <ListItem key={index}>{action}</ListItem>
                        ))}
                      </List>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center items-center h-32">
                    <Text>Loading analysis...</Text>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Grid>

      {/* Footer */}
      <div className="mt-6 text-sm text-gray-600">
        <p>Report Basis: {report?.Header?.ReportBasis}</p>
        <p>Currency: {report?.Header?.Currency}</p>
        <p>Generated: {new Date(report?.Header?.Time).toLocaleString()}</p>
      </div>
    </div>
  );
} 