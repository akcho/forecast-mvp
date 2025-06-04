import { Card, Title, Text, BarChart, DonutChart } from '@tremor/react';
import { RunwayProjection, RevenueStream, ExpenseCategory } from '../types/financial';
import { format } from 'date-fns';
import { FinancialCalculationService } from '../lib/services/financialCalculations';
import React, { useEffect, useState } from 'react';

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
  const financialService = FinancialCalculationService.getInstance();

  // State for async calculated values
  const [revenueBreakdown, setRevenueBreakdown] = useState<any[] | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Calculate revenue breakdown
    Promise.all(
      revenueStreams.map(async stream => {
        const amount = await financialService.calculateRevenueAmount(stream, date);
        const baseAmount = stream.entries[0]?.amount || 0;
        const growthAdjustment = amount - baseAmount;
        return {
          name: stream.name,
          amount,
          baseAmount,
          adjustments: {
            growth: growthAdjustment,
            seasonality: 0,
          },
        };
      })
    ).then(results => {
      if (isMounted) setRevenueBreakdown(results);
    });

    // Calculate expense breakdown
    Promise.all(
      expenses.map(async expense => {
        const amount = await financialService.calculateExpenseAmount(expense, date);
        const baseAmount = expense.entries[0]?.amount || 0;
        return {
          name: expense.name,
          amount,
          baseAmount,
          isFixed: expense.isFixed,
          frequency: expense.frequency,
        };
      })
    ).then(results => {
      if (isMounted) setExpenseBreakdown(results);
    });

    return () => {
      isMounted = false;
    };
  }, [revenueStreams, expenses, date, financialService]);

  if (!revenueBreakdown || !expenseBreakdown) {
    return <div>Loading breakdown...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <Title>Revenue Breakdown for {format(date, 'MMMM yyyy')}</Title>
        <div className="mt-4">
          <BarChart
            data={revenueBreakdown}
            index="name"
            categories={["amount"]}
            colors={["blue"]}
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
            <Text className={revenueBreakdown.reduce((sum, r) => sum + r.amount, 0) - expenseBreakdown.reduce((sum, e) => sum + e.amount, 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
              ${(
                revenueBreakdown.reduce((sum, r) => sum + r.amount, 0) -
                expenseBreakdown.reduce((sum, e) => sum + e.amount, 0)
              ).toLocaleString()}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
} 