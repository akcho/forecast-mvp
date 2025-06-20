'use client';

import { useState } from 'react';
import { Card, Title, Text, Select, SelectItem, Grid, Col, Badge, Button } from '@tremor/react';

export default function AnalysisPage() {
  const [activeStatement, setActiveStatement] = useState('profitLoss');
  const [timePeriod, setTimePeriod] = useState('3months');
  const [aiPanelMinimized, setAiPanelMinimized] = useState(false);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Financial Analysis</h1>
          <Text className="text-gray-600">Sample financial analysis (Tremor UI)</Text>
        </div>
        <div className="flex gap-4">
          <Select value={timePeriod} onValueChange={setTimePeriod} className="w-48">
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
          <Card>
            <Title>Financial Statements</Title>
            <Text>Statement tabs and tables will go here.</Text>
          </Card>
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
