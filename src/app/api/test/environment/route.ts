import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksConfig, validateEnvironmentConfig } from '@/lib/quickbooks/config';

export async function GET(request: NextRequest) {
  const config = getQuickBooksConfig();
  const validation = validateEnvironmentConfig();

  return NextResponse.json({
    success: true,
    environment: config.environment,
    baseUrl: config.baseUrl,
    isProduction: config.isProduction,
    isSandbox: config.isSandbox,
    validation,
    message: `QuickBooks environment detected as: ${config.environment}`
  });
}