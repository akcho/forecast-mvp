/**
 * Driver Discovery API endpoint
 * Analyzes QuickBooks data to discover key business drivers using systematic scoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { DriverDiscoveryService } from '@/lib/services/DriverDiscoveryService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting driver discovery analysis...');
    
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    // Get valid QuickBooks connection
    const connection = await getValidConnection(session.user.dbId);
    const accessToken = connection.access_token;
    const realmId = connection.realm_id;
    
    // Extract query parameters
    const url = new URL(request.url);
    const debugMode = url.searchParams.get('debug') === 'true';
    
    // Fetch QuickBooks P&L data (24 months)
    console.log('📊 Fetching QuickBooks P&L data...');
    const startDate = getPastDate(24);
    const endDate = new Date().toISOString().split('T')[0];
    
    const qbUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss?minorversion=65&accounting_method=Accrual&start_date=${startDate}&end_date=${endDate}&summarize_column_by=Month`;
    
    const response = await fetch(qbUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store' as RequestCache,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: 'Failed to fetch QuickBooks data',
        details: errorText 
      }, { status: response.status });
    }

    const profitLossData = await response.json();
    
    if (!profitLossData) {
      return NextResponse.json(
        { 
          error: 'No P&L data available',
          details: 'QuickBooks did not return profit and loss data for analysis'
        }, 
        { status: 400 }
      );
    }
    
    // Run driver discovery analysis
    console.log('🧮 Running driver discovery analysis...');
    const driverService = new DriverDiscoveryService();
    const driverResults = await driverService.discoverDrivers(profitLossData);
    
    const processingTime = Date.now() - startTime;
    
    // Prepare response
    const responseData = {
      success: true,
      analysis: driverResults,
      metadata: {
        apiProcessingTimeMs: processingTime,
        dataRange: {
          start: startDate,
          end: endDate,
          monthsRequested: 24
        },
        quickbooksDataAvailable: true
      }
    };
    
    // Add debug information if requested
    if (debugMode) {
      responseData.debug = {
        rawQuickBooksData: profitLossData,
        processingSteps: [
          'Authenticated user',
          'Fetched QuickBooks P&L data',
          'Analyzed line items for driver potential',
          'Applied systematic scoring algorithm',
          'Assigned forecast methods',
          'Generated comprehensive analysis'
        ]
      };
    }
    
    console.log(`✅ Driver discovery complete: ${driverResults.drivers.length} drivers found in ${processingTime}ms`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('❌ Driver discovery failed:', error);
    
    const errorResponse = {
      success: false,
      error: error.message || 'Driver discovery failed',
      details: error.stack,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
    
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      delete errorResponse.details;
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Get date N months ago in YYYY-MM-DD format
 */
function getPastDate(monthsAgo: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  return date.toISOString().split('T')[0];
}