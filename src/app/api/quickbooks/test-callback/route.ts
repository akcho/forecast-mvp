import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);

  const allParams = Object.fromEntries(searchParams.entries());

  console.log(`[${timestamp}] TEST CALLBACK HIT`, {
    url: request.url,
    method: request.method,
    params: allParams,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  });

  return NextResponse.json({
    message: 'Test callback endpoint reached',
    timestamp,
    url: request.url,
    params: allParams,
    headers: {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    }
  });
}