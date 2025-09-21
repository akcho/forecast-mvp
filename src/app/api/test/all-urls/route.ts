import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksConfig, getQuickBooksApiUrl } from '@/lib/quickbooks/config';

export async function GET(request: NextRequest) {
  const config = getQuickBooksConfig();
  const testRealmId = '123456789';

  // Test all common endpoint patterns
  const endpoints = [
    'reports/ProfitAndLoss',
    'reports/BalanceSheet',
    'companyinfo/1',
    'query?query=SELECT * FROM Item',
    'items',
    'customers',
    'vendors',
    'reports/CustomerBalance',
    'reports/VendorBalance',
    'reports/CashFlow'
  ];

  const generatedUrls = endpoints.map(endpoint => ({
    endpoint,
    url: getQuickBooksApiUrl(testRealmId, endpoint)
  }));

  return NextResponse.json({
    success: true,
    environment: config.environment,
    baseUrl: config.baseUrl,
    testRealmId,
    generatedUrls,
    validation: {
      allUrlsUseCorrectBase: generatedUrls.every(item =>
        item.url.startsWith(config.baseUrl)
      ),
      noHardcodedSandbox: generatedUrls.every(item =>
        !item.url.includes('sandbox') || config.isSandbox
      )
    },
    timestamp: new Date().toISOString()
  });
}