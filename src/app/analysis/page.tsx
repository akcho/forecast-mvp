'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, Select, SelectItem, Grid, Col, Badge, Button, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { PnlTable } from './PnlTable';

// ... (interfaces for PnLRow, etc. if needed)

export default function AnalysisPage() {
  const [activeStatement, setActiveStatement] = useState('profitLoss');
  const [timePeriod, setTimePeriod] = useState('3months');
  const [aiPanelMinimized, setAiPanelMinimized] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = new QuickBooksClient();
        
        // TEMPORARY: Hardcode dates to match sandbox data from screenshot
        const startDateStr = '2025-01-01';
        const endDateStr = '2025-06-30';
        
        const params: Record<string, string> = {
          start_date: startDateStr,
          end_date: endDateStr,
          summarize_column_by: 'Month'
        };

        let fetchedReport;
        if (activeStatement === 'profitLoss') {
          fetchedReport = await client.getProfitAndLoss(params);
        }
        // Add else if for other statements later
        
        console.log('Fetched Report:', fetchedReport);
        setReport(fetchedReport?.QueryResponse?.Report);

      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [timePeriod, activeStatement]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Financial Analysis</h1>
          <Text className="text-gray-600">Review your financial statements</Text>
        </div>
        <div className="flex gap-4">
          <Select value={timePeriod} onValueChange={setTimePeriod} className="w-48" disabled>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">Last 12 Months</SelectItem>
          </Select>
          <Button onClick={() => setAiPanelMinimized(!aiPanelMinimized)}>
            {aiPanelMinimized ? 'Show AI' : 'Hide AI'}
          </Button>
        </div>
      </div>
      <Grid numItems={aiPanelMinimized ? 1 : 3} className="gap-6">
        <Col numColSpan={aiPanelMinimized ? 1 : 2}>
          <TabGroup>
            <TabList>
              <Tab onClick={() => setActiveStatement('profitLoss')}>P&L Statement</Tab>
              <Tab onClick={() => setActiveStatement('balanceSheet')} disabled>Balance Sheet</Tab>
              <Tab onClick={() => setActiveStatement('cashFlow')} disabled>Cash Flow</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                {loading ? (
                  <Text>Loading...</Text>
                ) : error ? (
                  <Text color="red">{error}</Text>
                ) : report ? (
                  <PnlTable report={report} />
                ) : (
                  <Text>No report data found.</Text>
                )}
              </TabPanel>
              <TabPanel>
                {/* Balance Sheet Table */}
              </TabPanel>
              <TabPanel>
                {/* Cash Flow Table */}
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </Col>
        {!aiPanelMinimized && (
          <Col>
            <Card>
              <Title>AI Financial Analysis</Title>
              <Text>AI summary, insights, and recommendations will go here.</Text>
            </Card>
          </Col>
        )}
      </Grid>
    </div>
  );
}
