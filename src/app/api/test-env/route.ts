import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envCheck = {
    supabase: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    },
    quickbooks: {
      hasClientId: !!process.env.QB_CLIENT_ID,
      hasClientSecret: !!process.env.QB_CLIENT_SECRET,
      hasRedirectUri: !!process.env.QB_REDIRECT_URI,
      clientIdLength: process.env.QB_CLIENT_ID?.length || 0,
      clientSecretLength: process.env.QB_CLIENT_SECRET?.length || 0,
      redirectUriLength: process.env.QB_REDIRECT_URI?.length || 0
    },
    openai: {
      hasApiKey: !!process.env.OPENAI_API_KEY,
      apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
    }
  };

  return NextResponse.json({
    success: true,
    environment: process.env.NODE_ENV,
    envCheck,
    missing: {
      supabase: !envCheck.supabase.hasUrl || !envCheck.supabase.hasKey,
      quickbooks: !envCheck.quickbooks.hasClientId || !envCheck.quickbooks.hasClientSecret || !envCheck.quickbooks.hasRedirectUri
    }
  });
} 