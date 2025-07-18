'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { LoadingState } from '@/components/LoadingSpinner';

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
          <LoadingState type="general" message="Loading QuickBooks data..." />
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
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <Title>Profit & Loss Statement</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Shows revenue, expenses, and net income over a period. Includes income accounts, expense categories, and their respective balances.
              </p>
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
report.Header.StartPeriod    // Report start date
report.Header.EndPeriod      // Report end date
report.Header.ReportBasis    // Cash or Accrual
report.Rows.Row[]            // Report rows array

// Row Types
row.type === 'Section'       // Section header (Income, Expenses)
row.type === 'Data'          // Individual account
row.type === 'Summary'       // Section total

// Common Methods
filter(row => row.type === 'Data')  // Get individual accounts
filter(row => row.ColData[1].value > 0)  // Find positive amounts
reduce((sum, row) => sum + parseFloat(row.ColData[1].value), 0)  // Sum amounts
find(row => row.Header?.ColData[0].value === 'Income')  // Find Income section`}
                </pre>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Raw Data
                </summary>
                <pre className="text-sm overflow-auto max-h-96 pb-2 mt-2">
                  {JSON.stringify(reports.profitLoss?.QueryResponse?.Report, null, 2)}
                </pre>
              </details>
            </div>
          </Card>

          <Card>
            <Title>Balance Sheet</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Displays assets, liabilities, and equity at a point in time. Shows current and fixed assets, current and long-term liabilities, and owner's equity.
              </p>
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
report.Header.StartPeriod    // Report start date
report.Header.EndPeriod      // Report end date
report.Header.ReportBasis    // Cash or Accrual
report.Rows.Row[]            // Report rows array

// Main Sections
ASSETS
  Current Assets
    Bank Accounts
    Accounts Receivable
    Inventory
  Fixed Assets
LIABILITIES
  Current Liabilities
    Accounts Payable
  Long Term Liabilities
EQUITY

// Common Methods
find(row => row.Header?.ColData[0].value === 'ASSETS')  // Find Assets section
find(row => row.Header?.ColData[0].value === 'Bank Accounts')  // Find cash balance
filter(row => row.type === 'Data')  // Get individual accounts
reduce((sum, row) => sum + parseFloat(row.ColData[1].value), 0)  // Sum amounts`}
                </pre>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Raw Data
                </summary>
                <pre className="text-sm overflow-auto max-h-96 pb-2 mt-2">
                  {JSON.stringify(reports.balanceSheet?.QueryResponse?.Report, null, 2)}
                </pre>
              </details>
            </div>
          </Card>

          <Card>
            <Title>Cash Flow Statement</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Tracks cash movement through operating, investing, and financing activities. Shows how cash is generated and used over a period.
              </p>
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
report.Header.StartPeriod    // Report start date
report.Header.EndPeriod      // Report end date
report.Header.ReportBasis    // Cash or Accrual
report.Rows.Row[]            // Report rows array

// Main Sections
OPERATING ACTIVITIES
  Net Income
  Adjustments
INVESTING ACTIVITIES
  Capital Expenditures
FINANCING ACTIVITIES
  Loans
  Owner's Draw

// Common Methods
find(row => row.Header?.ColData[0].value === 'OPERATING ACTIVITIES')  // Find operating section
filter(row => row.type === 'Data')  // Get individual items
reduce((sum, row) => sum + parseFloat(row.ColData[1].value), 0)  // Sum amounts
find(row => row.Header?.ColData[0].value === 'Net Income')  // Find net income`}
                </pre>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Raw Data
                </summary>
                <pre className="text-sm overflow-auto max-h-96 pb-2 mt-2">
                  {JSON.stringify(reports.cashFlow?.QueryResponse?.Report, null, 2)}
                </pre>
              </details>
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
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
account.Id              // Unique identifier
account.Name           // Account name
account.FullyQualifiedName  // Full account path
account.Type           // Account type
account.Classification // Asset, Liability, Equity, etc.
account.AccountType    // Bank, Credit Card, etc.
account.CurrencyRef    // Currency information
account.CurrentBalance // Current balance
account.Active        // Account status

// Common Methods
filter(acc => acc.Type === 'Bank')  // Find bank accounts
filter(acc => acc.CurrentBalance > 0)  // Find accounts with balance
groupBy(acc => acc.Classification)  // Group by classification
reduce((sum, acc) => sum + acc.CurrentBalance, 0)  // Sum balances`}
                </pre>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Raw Data
                </summary>
                <pre className="text-sm overflow-auto max-h-96 pb-2 mt-2">
                  {JSON.stringify(reports.lists?.QueryResponse?.Account, null, 2)}
                </pre>
              </details>
            </div>
          </Card>

          <Card>
            <Title>Customers</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                List of customers with contact information, payment terms, and balances. Includes both active and inactive customers.
              </p>
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
customer.Id              // Unique identifier
customer.DisplayName    // Customer name
customer.CompanyName    // Company name
customer.Email          // Email address
customer.Phone          // Phone number
customer.Balance        // Current balance
customer.Active        // Customer status
customer.PrimaryPhone   // Primary phone
customer.PrimaryEmailAddr  // Primary email
customer.BillAddr      // Billing address
customer.ShipAddr      // Shipping address

// Common Methods
filter(cust => cust.Balance > 0)  // Find customers with balance
filter(cust => cust.Active)  // Find active customers
groupBy(cust => cust.CompanyName)  // Group by company
reduce((sum, cust) => sum + cust.Balance, 0)  // Sum balances`}
                </pre>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Raw Data
                </summary>
                <pre className="text-sm overflow-auto max-h-96 pb-2 mt-2">
                  {JSON.stringify(reports.lists?.QueryResponse?.Customer, null, 2)}
                </pre>
              </details>
            </div>
          </Card>

          <Card>
            <Title>Vendors</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                List of vendors/suppliers with contact details, payment terms, and balances. Includes both active and inactive vendors.
              </p>
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
vendor.Id              // Unique identifier
vendor.DisplayName    // Vendor name
vendor.CompanyName    // Company name
vendor.Email          // Email address
vendor.Phone          // Phone number
vendor.Balance        // Current balance
vendor.Active        // Vendor status
vendor.PrimaryPhone   // Primary phone
vendor.PrimaryEmailAddr  // Primary email
vendor.BillAddr      // Billing address
vendor.TermsRef      // Payment terms

// Common Methods
filter(vendor => vendor.Balance > 0)  // Find vendors with balance
filter(vendor => vendor.Active)  // Find active vendors
groupBy(vendor => vendor.CompanyName)  // Group by company
reduce((sum, vendor) => sum + vendor.Balance, 0)  // Sum balances`}
                </pre>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Raw Data
                </summary>
                <pre className="text-sm overflow-auto max-h-96 pb-2 mt-2">
                  {JSON.stringify(reports.lists?.QueryResponse?.Vendor, null, 2)}
                </pre>
              </details>
            </div>
          </Card>

          <Card>
            <Title>Items</Title>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Products and services offered, including inventory items, non-inventory items, and services. Each item includes description, price, and type.
              </p>
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
item.Id              // Unique identifier
item.Name           // Item name
item.Description    // Item description
item.Type           // Item type
item.UnitPrice      // Unit price
item.PurchaseCost   // Purchase cost
item.TrackQtyOnHand // Inventory tracking
item.QtyOnHand      // Current quantity
item.IncomeAccountRef  // Income account
item.ExpenseAccountRef // Expense account
item.Active        // Item status

// Common Methods
filter(item => item.Type === 'Inventory')  // Find inventory items
filter(item => item.QtyOnHand > 0)  // Find items in stock
groupBy(item => item.Type)  // Group by type
reduce((sum, item) => sum + (item.QtyOnHand * item.UnitPrice), 0)  // Calculate inventory value`}
                </pre>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Raw Data
                </summary>
                <pre className="text-sm overflow-auto max-h-96 pb-2 mt-2">
                  {JSON.stringify(reports.lists?.QueryResponse?.Item, null, 2)}
                </pre>
              </details>
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
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
bill.Id                    // Unique identifier
bill.TxnDate              // Transaction date
bill.DueDate              // Payment due date
bill.TotalAmt             // Total amount
bill.Balance              // Remaining balance
bill.VendorRef.name       // Vendor name
bill.VendorRef.value      // Vendor ID
bill.PrivateNote          // Additional notes
bill.Line                 // Line items array
bill.Line[].Amount        // Line item amount
bill.Line[].Description   // Line item description

// Common Methods
filter(bill => bill.TotalAmt > 1000)  // Find large bills
filter(bill => new Date(bill.DueDate) < new Date())  // Find overdue bills
reduce((sum, bill) => sum + bill.TotalAmt, 0)  // Sum total bills
groupBy(bill => bill.VendorRef.name)  // Group by vendor`}
                </pre>
              </div>
              <div className="overflow-y-auto max-h-96 pr-4">
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
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
invoice.Id                 // Unique identifier
invoice.TxnDate           // Transaction date
invoice.DueDate           // Payment due date
invoice.TotalAmt          // Total amount
invoice.Balance           // Remaining balance
invoice.CustomerRef.name  // Customer name
invoice.CustomerRef.value // Customer ID
invoice.PrivateNote       // Additional notes
invoice.Line              // Line items array
invoice.Line[].Amount     // Line item amount
invoice.Line[].Description // Line item description

// Common Methods
filter(inv => inv.TotalAmt > 1000)  // Find large invoices
filter(inv => new Date(inv.DueDate) < new Date())  // Find overdue invoices
reduce((sum, inv) => sum + inv.TotalAmt, 0)  // Sum total invoices
groupBy(inv => inv.CustomerRef.name)  // Group by customer`}
                </pre>
              </div>
              <div className="overflow-y-auto max-h-96 pr-4">
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
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
payment.Id                    // Unique identifier
payment.TxnDate              // Transaction date
payment.TotalAmt             // Total amount
payment.CustomerRef.name     // Customer name
payment.CustomerRef.value    // Customer ID
payment.PaymentMethodRef.name // Payment method
payment.PaymentMethodRef.value // Payment method ID
payment.PrivateNote          // Additional notes
payment.Line                 // Payment line items
payment.Line[].Amount        // Line item amount
payment.Line[].Description   // Line item description

// Common Methods
filter(payment => payment.TotalAmt > 1000)  // Find large payments
filter(payment => payment.PaymentMethodRef.name === 'Credit Card')  // Find credit card payments
reduce((sum, payment) => sum + payment.TotalAmt, 0)  // Sum total payments
groupBy(payment => payment.PaymentMethodRef.name)  // Group by payment method`}
                </pre>
              </div>
              <div className="overflow-y-auto max-h-96 pr-4">
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
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm font-medium mb-2">Available Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto pb-2">
{`// Key Variables
purchase.Id                    // Unique identifier
purchase.TxnDate              // Transaction date
purchase.TotalAmt             // Total amount
purchase.EntityRef.name       // Vendor/Entity name
purchase.EntityRef.value      // Vendor/Entity ID
purchase.PaymentType          // Payment type
purchase.PaymentMethodRef.name // Payment method
purchase.PrivateNote          // Additional notes
purchase.Line                 // Purchase line items
purchase.Line[].Amount        // Line item amount
purchase.Line[].Description   // Line item description
purchase.Line[].DetailType    // Line item type
purchase.Line[].AccountBasedExpenseLineDetail.AccountRef.name // Account name

// Common Methods
filter(purchase => purchase.TotalAmt > 1000)  // Find large purchases
filter(purchase => purchase.PaymentType === 'Cash')  // Find cash purchases
reduce((sum, purchase) => sum + purchase.TotalAmt, 0)  // Sum total purchases
groupBy(purchase => purchase.EntityRef.name)  // Group by vendor
groupBy(purchase => purchase.Line[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name)  // Group by account`}
                </pre>
              </div>
              <div className="overflow-y-auto max-h-96 pr-4">
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