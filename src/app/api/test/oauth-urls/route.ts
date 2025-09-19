import { NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export async function GET() {
  try {
    const client = new QuickBooksClient();

    const standardUrl = client.getAuthorizationUrl();
    const alternativeUrl = client.getAlternativeAuthorizationUrl();

    return NextResponse.json({
      success: true,
      environment: process.env.QB_ENVIRONMENT || 'sandbox',
      urls: {
        standard: standardUrl,
        alternative: alternativeUrl
      },
      analysis: {
        standardHasSandbox: standardUrl.includes('environment=sandbox'),
        alternativeHasSandbox: alternativeUrl.includes('environment=sandbox'),
        standardHasProduction: !standardUrl.includes('environment='),
        alternativeHasProduction: !alternativeUrl.includes('environment=')
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}