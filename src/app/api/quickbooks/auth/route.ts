import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const client = new QuickBooksClient();
    const authUrl = client.getAuthorizationUrl();
    
    console.log('Redirecting to QuickBooks OAuth:', authUrl);
    
    // Redirect the user to Intuit's OAuth authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating QuickBooks OAuth:', error);
    
    // Redirect back to the app with an error
    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(
      new URL(`/?quickbooks=error&error=${encodeURIComponent('Failed to initiate QuickBooks connection')}`, baseUrl)
    );
  }
} 