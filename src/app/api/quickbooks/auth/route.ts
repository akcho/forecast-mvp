import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('=== QUICKBOOKS AUTH ROUTE START ===');
  console.log('Request URL:', request.url);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  console.log('Request method:', request.method);

  try {
    console.log('Creating QuickBooks client...');
    // Pass request URL to client for environment detection
    const client = new QuickBooksClient(request.url);

    console.log('Generating authorization URL...');
    const authUrl = client.getAuthorizationUrl();

    console.log('Generated authorization URL:', authUrl);
    console.log('OAuth URL components:', {
      baseUrl: authUrl.split('?')[0],
      params: new URLSearchParams(authUrl.split('?')[1] || '').toString()
    });

    // Redirect the user to Intuit's OAuth authorization page
    console.log('Redirecting user to QuickBooks OAuth...');
    return NextResponse.redirect(authUrl);
    
  } catch (error) {
    console.error('=== QUICKBOOKS AUTH ERROR ===');
    console.error('Error initiating QuickBooks OAuth:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    // Redirect back to the app with an error
    const baseUrl = request.nextUrl.origin;
    const errorUrl = new URL(`/?quickbooks=error&error=${encodeURIComponent('Failed to initiate QuickBooks connection')}`, baseUrl);
    
    console.log('Redirecting to error page:', errorUrl.toString());
    return NextResponse.redirect(errorUrl);
  }
} 