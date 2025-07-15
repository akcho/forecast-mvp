import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { realmId, accessToken } = await request.json();
    
    if (!realmId || !accessToken) {
      return NextResponse.json({ 
        error: 'Missing realmId or accessToken' 
      }, { status: 400 });
    }

    // Test the connection by calling QuickBooks API
    const testResponse = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!testResponse.ok) {
      return NextResponse.json({ 
        error: `QuickBooks API error: ${testResponse.status}` 
      }, { status: testResponse.status });
    }

    const data = await testResponse.json();
    
    return NextResponse.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error testing QuickBooks connection:', error);
    return NextResponse.json({ 
      error: 'Failed to test connection' 
    }, { status: 500 });
  }
} 