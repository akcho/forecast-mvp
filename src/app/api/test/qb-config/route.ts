import { NextRequest, NextResponse } from 'next/server';
import {
  getQuickBooksConfig,
  getQuickBooksApiUrl,
  getOAuthEnvironmentParam,
  validateEnvironmentConfig
} from '@/lib/quickbooks/config';

export async function GET(request: NextRequest) {
  try {
    const config = getQuickBooksConfig();
    const validation = validateEnvironmentConfig();

    // Test URL generation
    const testRealmId = '123456789';
    const testApiUrl = getQuickBooksApiUrl(testRealmId, 'reports/ProfitAndLoss');
    const oauthParam = getOAuthEnvironmentParam();

    return NextResponse.json({
      success: true,
      config,
      validation,
      examples: {
        apiUrl: testApiUrl,
        oauthEnvironmentParam: oauthParam,
        fullOAuthUrl: `https://appcenter.intuit.com/connect/oauth2?client_id=TEST${oauthParam}`
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