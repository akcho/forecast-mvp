import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing enhanced P&L API route with parsed data option...');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Get valid connection
    const connection = await getValidConnection(session.user.dbId);
    const qbAPI = new QuickBooksServerAPI(
      connection.access_token,
      connection.refresh_token,
      connection.realm_id
    );

    // Test 1: Default behavior (no parsed parameter) should work as before
    console.log('📊 Test 1: Default API behavior (backwards compatibility)...');
    const defaultResponse = await fetch(`http://localhost:3000/api/quickbooks/profit-loss?start_date=2024-08-01&end_date=2025-07-31&summarize_column_by=Month`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });
    const defaultData = await defaultResponse.json();
    const hasQueryResponse = !!defaultData.QueryResponse;
    const hasParsedData = !!defaultData.parsedData;

    // Test 2: With parsed=true parameter should include parsed data
    console.log('📊 Test 2: Enhanced API with parsed=true...');
    const parsedResponse = await fetch(`http://localhost:3000/api/quickbooks/profit-loss?start_date=2024-08-01&end_date=2025-07-31&summarize_column_by=Month&parsed=true`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });
    const parsedData = await parsedResponse.json();
    const parsedHasQueryResponse = !!parsedData.QueryResponse;
    const parsedHasParsedData = !!parsedData.parsedData;

    return NextResponse.json({
      success: true,
      test: 'Enhanced P&L API validation',
      results: {
        defaultBehavior: {
          status: defaultResponse.ok ? 'success' : 'error',
          hasQueryResponse,
          hasParsedData,
          backwardsCompatible: hasQueryResponse && !hasParsedData
        },
        enhancedBehavior: {
          status: parsedResponse.ok ? 'success' : 'error',
          hasQueryResponse: parsedHasQueryResponse,
          hasParsedData: parsedHasParsedData,
          fullyEnhanced: parsedHasQueryResponse && parsedHasParsedData
        },
        validation: {
          backwardsCompatibilityMaintained: hasQueryResponse && !hasParsedData,
          enhancementWorking: parsedHasParsedData,
          bothResponsesHaveRawData: hasQueryResponse && parsedHasQueryResponse
        }
      },
      sampleParsedDataStructure: parsedHasParsedData ? {
        period: parsedData.parsedData?.period,
        revenueLines: parsedData.parsedData?.revenue?.lines?.length || 0,
        expenseLines: parsedData.parsedData?.expenses?.lines?.length || 0,
        netIncome: parsedData.parsedData?.netIncome?.total
      } : null
    });

  } catch (error) {
    console.error('❌ Enhanced P&L API test failed:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}