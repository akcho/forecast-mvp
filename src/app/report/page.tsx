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
        console.log('P&L Report:', profitLoss);
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
      const response = await fetch('/api/analyze-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'analysis',
          reportData: prepareReportData(reportData)
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
    return {
      period: `${reportData?.Header?.StartPeriod} to ${reportData?.Header?.EndPeriod}`,
      netIncome: getNetIncome(),
      grossProfit: getGrossProfit(),
      operatingIncome: getOperatingIncome(),
      totalIncome: getTotalIncome(),
      totalExpenses: getTotalExpenses(),
      incomeItems: reportData?.Rows?.Row?.find(
        (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Income'
      )?.Rows?.Row || [],
      expenseItems: reportData?.Rows?.Row?.find(
        (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === 'Expenses'
      )?.Rows?.Row || []
    };
  };

  const getSectionTotal = (sectionName: string) => {
    const section = report?.Rows?.Row?.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === sectionName
    );
    return section?.Summary?.ColData[1].value || '0.00';
  };

  const getNetIncome = () => {
    return getSectionTotal('Net Income');
  };

  const getGrossProfit = () => {
    return getSectionTotal('Gross Profit');
  };

  const getOperatingIncome = () => {
    return getSectionTotal('Operating Income');
  };

  const getTotalIncome = () => {
    return getSectionTotal('Income');
  };

  const getTotalExpenses = () => {
    return getSectionTotal('Expenses');
  };

  const renderSection = (sectionName: string) => {
    const section = report?.Rows?.Row?.find(
      (row: PnLRow) => row.type === 'Section' && row.Header?.ColData[0].value === sectionName
    );

    if (!section) return null;

    return (
      <div className="space-y-2">
        {section.Rows?.Row.map((row: PnLRow, index: number) => (
          <div key={index} className="flex justify-between items-center py-1">
            <Text className="text-sm">{row.ColData?.[0].value}</Text>
            <Text className={`text-sm ${sectionName === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
              ${row.ColData?.[1].value || '0.00'}
            </Text>
          </div>
        ))}
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

  const netIncome = parseFloat(getNetIncome());
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
          <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6 mb-8">
            <Card>
              <Text>Net Income</Text>
              <Metric className={isProfitable ? 'text-green-600' : 'text-red-600'}>
                ${getNetIncome()}
              </Metric>
              <Badge color={isProfitable ? 'green' : 'red'} className="mt-2">
                {isProfitable ? 'Profitable' : 'Loss'}
              </Badge>
            </Card>
            <Card>
              <Text>Gross Profit</Text>
              <Metric className="text-green-600">${getGrossProfit()}</Metric>
              <Text className="mt-2 text-sm text-gray-600">
                {((parseFloat(getGrossProfit()) / parseFloat(getTotalIncome())) * 100).toFixed(1)}% of Revenue
              </Text>
            </Card>
            <Card>
              <Text>Operating Income</Text>
              <Metric className="text-green-600">${getOperatingIncome()}</Metric>
              <Text className="mt-2 text-sm text-gray-600">
                {((parseFloat(getOperatingIncome()) / parseFloat(getTotalIncome())) * 100).toFixed(1)}% of Revenue
              </Text>
            </Card>
            <Card>
              <Text>Total Revenue</Text>
              <Metric className="text-green-600">${getTotalIncome()}</Metric>
              <Text className="mt-2 text-sm text-gray-600">
                Total Income
              </Text>
            </Card>
          </Grid>

          {/* Main P&L Sections */}
          <Grid numItems={1} numItemsSm={2} className="gap-6">
            <Card>
              <Title>Income</Title>
              <div className="mt-4">
                {renderSection('Income')}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <Text className="font-medium">Total Income</Text>
                    <Text className="font-medium text-green-600">${getTotalIncome()}</Text>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <Title>Expenses</Title>
              <div className="mt-4">
                {renderSection('Expenses')}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <Text className="font-medium">Total Expenses</Text>
                    <Text className="font-medium text-red-600">${getTotalExpenses()}</Text>
                  </div>
                </div>
              </div>
            </Card>
          </Grid>
        </Col>

        {/* AI Analysis Panel */}
        <Col>
          <Card className="h-full">
            <div className="flex justify-between items-center mb-4">
              <Title>AI Financial Analysis</Title>
              <Button
                size="xs"
                variant="secondary"
                onClick={() => setShowChat(!showChat)}
              >
                {showChat ? 'Advise' : 'Chat'}
              </Button>
            </div>

            {!showChat ? (
              <>
                {/* Executive Summary */}
                <div className="mb-6">
                  <Text className="font-medium mb-2">Executive Summary</Text>
                  <Text className="text-sm text-gray-600">
                    {aiAnalysis?.executiveSummary || 'Loading analysis...'}
                  </Text>
                </div>

                {/* Key Insights */}
                <div className="mb-6">
                  <Text className="font-medium mb-2">Key Insights</Text>
                  <List>
                    {aiAnalysis?.keyInsights.map((insight, index) => (
                      <ListItem key={index}>
                        <Text className="text-sm text-gray-600">{insight}</Text>
                      </ListItem>
                    ))}
                  </List>
                </div>

                {/* Recommendations */}
                <div>
                  <Text className="font-medium mb-2">Recommended Actions</Text>
                  <List>
                    {aiAnalysis?.recommendations.map((recommendation, index) => (
                      <ListItem key={index}>
                        <Text className="text-sm text-gray-600">{recommendation}</Text>
                      </ListItem>
                    ))}
                  </List>
                </div>
              </>
            ) : (
              <>
                {/* Chat Interface */}
                <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-50 ml-4'
                          : 'bg-gray-50 mr-4'
                      }`}
                    >
                      <Text className="text-sm">{message.content}</Text>
                      <Text className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </Text>
                    </div>
                  ))}
                  {isAnalyzing && (
                    <div className="p-3 rounded-lg bg-gray-50 mr-4">
                      <Text className="text-sm">Analyzing your question...</Text>
                    </div>
                  )}
                </div>

                {/* Question Input */}
                <div className="mt-4">
                  <TextInput
                    placeholder="Ask a question about your P&L..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                  />
                  <Button
                    className="mt-2 w-full"
                    onClick={handleAskQuestion}
                    disabled={isAnalyzing || !question.trim()}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Ask'}
                  </Button>
                </div>

                {/* Suggested Questions */}
                <div className="mt-4">
                  <Text className="text-sm font-medium mb-2">Try asking:</Text>
                  <div className="space-y-2">
                    <button
                      onClick={() => setQuestion("What's our biggest expense category?")}
                      className="text-sm text-blue-600 hover:text-blue-800 block w-full text-left"
                    >
                      What's our biggest expense category?
                    </button>
                    <button
                      onClick={() => setQuestion("How does our gross margin compare to last period?")}
                      className="text-sm text-blue-600 hover:text-blue-800 block w-full text-left"
                    >
                      How does our gross margin compare to last period?
                    </button>
                    <button
                      onClick={() => setQuestion("What's driving our profitability?")}
                      className="text-sm text-blue-600 hover:text-blue-800 block w-full text-left"
                    >
                      What's driving our profitability?
                    </button>
                  </div>
                </div>
              </>
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