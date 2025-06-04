'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export default function DataView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<{
    profitLoss?: any;
    balanceSheet?: any;
    cashFlow?: any;
    transactions?: any;
    lists?: any;
  }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const client = new QuickBooksClient();
        
        console.log('Starting to fetch QuickBooks data...');
        
        const [profitLoss, balanceSheet, cashFlow, transactions, lists] = await Promise.all([
          client.getProfitAndLoss(),
          client.getBalanceSheet(),
          client.getCashFlow(),
          client.getTransactions(),
          client.getLists()
        ]);

        setReports({
          profitLoss,
          balanceSheet,
          cashFlow,
          transactions,
          lists
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching reports:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch reports');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <Text>Loading QuickBooks data...</Text>
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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">QuickBooks Data</h1>
      
      {/* Financial Reports */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Financial Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <Title>Profit & Loss Statement</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Shows revenue, expenses, and net income over a period. Includes income accounts, expense categories, and their respective balances.
              </p>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(reports.profitLoss?.QueryResponse?.Report, null, 2)}
              </pre>
            </div>
          </Card>

          <Card>
            <Title>Balance Sheet</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Displays assets, liabilities, and equity at a point in time. Shows current and fixed assets, current and long-term liabilities, and owner's equity.
              </p>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(reports.balanceSheet?.QueryResponse?.Report, null, 2)}
              </pre>
            </div>
          </Card>

          <Card>
            <Title>Cash Flow Statement</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Tracks cash movement through operating, investing, and financing activities. Shows how cash is generated and used over a period.
              </p>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(reports.cashFlow?.QueryResponse?.Report, null, 2)}
              </pre>
            </div>
          </Card>
        </div>
      </div>

      {/* Lists */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Accounts & Entities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <Title>Accounts</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Chart of accounts including assets, liabilities, equity, income, and expense accounts. Each account includes type, balance, and status.
              </p>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(reports.lists?.QueryResponse?.Account, null, 2)}
              </pre>
            </div>
          </Card>

          <Card>
            <Title>Customers</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                List of customers with contact information, payment terms, and balances. Includes both active and inactive customers.
              </p>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(reports.lists?.QueryResponse?.Customer, null, 2)}
              </pre>
            </div>
          </Card>

          <Card>
            <Title>Vendors</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                List of vendors/suppliers with contact details, payment terms, and balances. Includes both active and inactive vendors.
              </p>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(reports.lists?.QueryResponse?.Vendor, null, 2)}
              </pre>
            </div>
          </Card>

          <Card>
            <Title>Items</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Products and services offered, including inventory items, non-inventory items, and services. Each item includes description, price, and type.
              </p>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(reports.lists?.QueryResponse?.Item, null, 2)}
              </pre>
            </div>
          </Card>
        </div>
      </div>

      {/* Transactions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Transactions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <Title>Bills</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Vendor bills and expenses. Each bill includes vendor details, due date, amount, and status.
              </p>
              <div className="overflow-auto max-h-96">
                {reports.transactions?.QueryResponse?.Transaction
                  ?.filter((txn: any) => txn.TxnType === 'Bill')
                  .map((bill: any) => (
                    <div key={bill.Id} className="border-b border-gray-200 py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{bill.VendorRef?.name || 'Unknown Vendor'}</p>
                          <p className="text-sm text-gray-600">{new Date(bill.TxnDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${bill.TotalAmt?.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Due: {new Date(bill.DueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{bill.PrivateNote || 'No description'}</p>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          <Card>
            <Title>Invoices</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Customer invoices and sales. Each invoice includes customer details, due date, and payment status.
              </p>
              <div className="overflow-auto max-h-96">
                {reports.transactions?.QueryResponse?.Transaction
                  ?.filter((txn: any) => txn.TxnType === 'Invoice')
                  .map((invoice: any) => (
                    <div key={invoice.Id} className="border-b border-gray-200 py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{invoice.CustomerRef?.name || 'Unknown Customer'}</p>
                          <p className="text-sm text-gray-600">{new Date(invoice.TxnDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${invoice.TotalAmt?.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Due: {new Date(invoice.DueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{invoice.PrivateNote || 'No description'}</p>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          <Card>
            <Title>Payments</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Customer payments and bill payments. Shows payment method, reference, and amount.
              </p>
              <div className="overflow-auto max-h-96">
                {reports.transactions?.QueryResponse?.Transaction
                  ?.filter((txn: any) => txn.TxnType === 'Payment')
                  .map((payment: any) => (
                    <div key={payment.Id} className="border-b border-gray-200 py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{payment.CustomerRef?.name || 'Unknown Customer'}</p>
                          <p className="text-sm text-gray-600">{new Date(payment.TxnDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${payment.TotalAmt?.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{payment.PaymentMethodRef?.name || 'No method'}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{payment.PrivateNote || 'No description'}</p>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          <Card>
            <Title>Purchases</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Purchase transactions and expenses. Includes vendor details, payment method, and amount.
              </p>
              <div className="overflow-auto max-h-96">
                {reports.transactions?.QueryResponse?.Transaction
                  ?.filter((txn: any) => txn.TxnType === 'Purchase')
                  .map((purchase: any) => (
                    <div key={purchase.Id} className="border-b border-gray-200 py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {purchase.EntityRef?.name || 
                             purchase.VendorRef?.name || 
                             purchase.AccountRef?.name || 
                             'Unknown Source'}
                          </p>
                          <p className="text-sm text-gray-600">{new Date(purchase.TxnDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${purchase.TotalAmt?.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">
                            {purchase.PaymentType || 
                             purchase.PaymentMethodRef?.name || 
                             purchase.AccountRef?.name || 
                             'No method'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        {purchase.Line && purchase.Line.map((line: any, index: number) => (
                          <div key={index} className="text-sm text-gray-600">
                            {line.Description || 
                             (line.DetailType === 'AccountBasedExpenseLineDetail' ? 
                              line.AccountBasedExpenseLineDetail?.AccountRef?.name : 
                              line.DetailType) || 
                             'Purchase item'}
                          </div>
                        ))}
                      </div>
                      {purchase.PrivateNote && (
                        <p className="text-sm text-gray-600 mt-1">{purchase.PrivateNote}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 