import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const environment = process.env.QB_ENVIRONMENT || 'sandbox';

  return NextResponse.json({
    success: true,
    environment,
    baseUrl: environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com',
    message: `QuickBooks environment is set to: ${environment}`,
    timestamp: new Date().toISOString(),
    note: 'This endpoint validates that environment variables are being read correctly'
  });
}