import { Card, Title, Text, BarChart, DonutChart } from '@tremor/react';
import { RunwayProjection, RevenueStream, ExpenseCategory } from '../types/financial';
import { format } from 'date-fns';
import { isAfter } from 'date-fns';

interface CalculationBreakdownProps {
  projection: RunwayProjection;
  revenueStreams: RevenueStream[];
  expenses: ExpenseCategory[];
  date: Date;
}

export function CalculationBreakdown({
  projection,
  revenueStreams,
  expenses,
  date,
}: CalculationBreakdownProps) {
  // Calculate revenue breakdown
  const revenueBreakdown = revenueStreams.map(stream => {
    // Use the latest entry up to the current date
    const latestEntry = stream.entries
      .filter(entry => !isAfter(new Date(entry.date), date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    const monthlyAmount = latestEntry ? latestEntry.amount : 0;

    let finalAmount = monthlyAmount;
    if (stream.growthRate) {
      const monthsFromStart = Math.floor(
        (date.getTime() - new Date(stream.entries[0].date).getTime()) / (30 * 24 * 60 * 60 * 1000)
      );
      const growthFactor = Math.pow(1 + stream.growthRate / 12, monthsFromStart);
      finalAmount *= growthFactor;
    }
    if (stream.seasonality) {
      const monthIndex = date.getMonth();
      const seasonalityFactor = stream.seasonality[monthIndex] || 1;
      finalAmount *= seasonalityFactor;
    }

    return {
      name: stream.name,
      amount: finalAmount,
      baseAmount: monthlyAmount,
      adjustments: {
        growth: stream.growthRate ? (finalAmount - monthlyAmount) : 0,
        seasonality: stream.seasonality ? (finalAmount - monthlyAmount) : 0,
      },
    };
  });

  // Calculate expense breakdown
  const expenseBreakdown = expenses.map(expense => {
    // Use the latest entry up to the current date for all frequencies
    const latestEntry = expense.entries
      .filter(entry => !isAfter(new Date(entry.date), date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (latestEntry) {
      let amount = latestEntry.amount;
      // Apply growth rate for non-fixed expenses
      if (!expense.isFixed) {
        const monthsFromStart = Math.floor(
          (date.getTime() - new Date(latestEntry.date).getTime()) / (30 * 24 * 60 * 60 * 1000)
        );
        const growthFactor = Math.pow(1 + 0.05 / 12, monthsFromStart); // 5% annual growth
        amount *= growthFactor;
      }
      // Adjust for frequency
      switch (expense.frequency) {
        case 'quarterly':
          amount = amount / 3;
          break;
        case 'yearly':
          amount = amount / 12;
          break;
      }
      return {
        name: expense.name,
        amount,
        baseAmount: latestEntry.amount,
        isFixed: expense.isFixed,
        frequency: expense.frequency,
      };
    }
    return {
      name: expense.name,
      amount: 0,
      baseAmount: 0,
      isFixed: expense.isFixed,
      frequency: expense.frequency,
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <Title>Revenue Breakdown for {format(date, 'MMMM yyyy')}</Title>
        <div className="mt-4">
          <BarChart
            data={revenueBreakdown}
            index="name"
            categories={['amount']}
            colors={['blue']}
            valueFormatter={(number) => `$${number.toLocaleString()}`}
            className="h-72"
          />
        </div>
        <div className="mt-4 space-y-4">
          {revenueBreakdown.map(stream => (
            <div key={stream.name} className="border-t pt-4">
              <Text className="font-medium">{stream.name}</Text>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <Text>Base Amount:</Text>
                  <Text>${stream.baseAmount.toLocaleString()}</Text>
                </div>
                {stream.adjustments.growth > 0 && (
                  <div className="flex justify-between text-green-600">
                    <Text>Growth Adjustment:</Text>
                    <Text>+${stream.adjustments.growth.toLocaleString()}</Text>
                  </div>
                )}
                {stream.adjustments.seasonality > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <Text>Seasonality Adjustment:</Text>
                    <Text>+${stream.adjustments.seasonality.toLocaleString()}</Text>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <Text>Final Amount:</Text>
                  <Text>${stream.amount.toLocaleString()}</Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Title>Expense Breakdown for {format(date, 'MMMM yyyy')}</Title>
        <div className="mt-4">
          <DonutChart
            data={expenseBreakdown}
            category="amount"
            index="name"
            valueFormatter={(number) => `$${number.toLocaleString()}`}
            className="h-72"
          />
        </div>
        <div className="mt-4 space-y-4">
          {expenseBreakdown.map(expense => (
            <div key={expense.name} className="border-t pt-4">
              <Text className="font-medium">{expense.name}</Text>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <Text>Base Amount:</Text>
                  <Text>${expense.baseAmount.toLocaleString()}</Text>
                </div>
                {expense.frequency !== 'monthly' && (
                  <div className="flex justify-between text-orange-600">
                    <Text>Frequency Adjustment ({expense.frequency}):</Text>
                    <Text>
                      {expense.frequency === 'quarterly'
                        ? `÷ 3 = $${expense.amount.toLocaleString()}`
                        : `÷ 12 = $${expense.amount.toLocaleString()}`}
                    </Text>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <Text>Final Amount:</Text>
                  <Text>${expense.amount.toLocaleString()}</Text>
                </div>
                <div className="flex justify-between text-gray-500">
                  <Text>Type:</Text>
                  <Text>{expense.isFixed ? 'Fixed' : 'Variable'}</Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Title>Net Cash Flow Calculation</Title>
        <div className="mt-4 space-y-4">
          <div className="flex justify-between text-lg">
            <Text>Total Revenue:</Text>
            <Text className="text-green-600">
              ${revenueBreakdown.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
            </Text>
          </div>
          <div className="flex justify-between text-lg">
            <Text>Total Expenses:</Text>
            <Text className="text-red-600">
              ${expenseBreakdown.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
            </Text>
          </div>
          <div className="flex justify-between text-xl font-bold border-t pt-4">
            <Text>Net Cash Flow:</Text>
            <Text className={projection.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
              ${projection.netCashFlow.toLocaleString()}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
} 