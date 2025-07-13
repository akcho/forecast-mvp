import { NextResponse } from 'next/server';
import { testDataExtraction } from '@/lib/test/runTests';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Testing data extraction...');
    const insights = await testDataExtraction();
    
    return NextResponse.json({
      success: true,
      insights,
      message: 'Data extraction test completed successfully'
    });
  } catch (error) {
    console.error('Data extraction test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Data extraction test failed'
    }, { status: 500 });
  }
} 