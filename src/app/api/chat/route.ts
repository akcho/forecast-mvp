import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for GPT-5 responses

export async function POST(request: NextRequest) {
  console.log('🚀 CHAT API: POST request received');
  try {
    const body = await request.json();
    const message = body.message;
    const messages = body.messages || []; // Get conversation history
    const currentReports = body.currentReports;
    const timePeriod = body.timePeriod || '3months';
    const stream = body.stream || false;

    console.log('📨 Request details:', {
      messageLength: message?.length,
      historyLength: messages?.length,
      hasReports: !!currentReports,
      timePeriod,
      streaming: stream
    });

    if (!message) {
      return NextResponse.json({
        type: 'error',
        message: 'No message provided'
      });
    }

    // Check authentication using session instead of headers
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (error) {
      console.error('Session error:', error);
      // If session is corrupted, treat as unauthenticated
      session = null;
    }
    
    if (!session?.user?.dbId) {
      return NextResponse.json({
        type: 'auth_required',
        message: "I notice you haven't signed in yet. To get personalized financial insights, please:\n\n" +
          '1. Sign in with Google\n' +
          '2. Connect your QuickBooks account\n' +
          '3. Come back here and ask me questions about your finances\n\n' +
          'For now, I can only provide general financial advice. Would you like me to do that instead?'
      });
    }

    // Check if user has QuickBooks connection
    try {
      const statusResponse = await fetch(`${request.nextUrl.origin}/api/quickbooks/status`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || ''
        }
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Failed to check connection status: ${statusResponse.status} ${statusResponse.statusText}`);
      }
      
      const connectionStatus = await statusResponse.json();
      
      // Check if user is authenticated and has a company connection
      const hasConnection = connectionStatus.hasConnection && connectionStatus.companyConnection;
      
      if (!hasConnection) {
        return NextResponse.json({
          type: 'auth_required',
          message: "I notice you haven't connected your QuickBooks account yet. To get personalized financial insights, please:\n\n" +
            '1. Connect your QuickBooks account in the app\n' +
            '2. Come back here and ask me questions about your finances\n\n' +
            'For now, I can only provide general financial advice. Would you like me to do that instead?'
        });
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      return NextResponse.json({
        type: 'auth_required',
        message: "I'm having trouble accessing your QuickBooks connection. Please try refreshing the page or reconnecting your account."
      });
    }

    // Authentication successful - user is logged in and has QuickBooks connection

    // Get or create session ID
    let sessionId = request.headers.get('X-Session-ID');
    if (!sessionId) {
      sessionId = uuidv4();
    }

    // Fetch fresh financial data server-side instead of relying on currentReports
    let financialContext = 'Limited financial data available.';
    try {
      // Fetch P&L data
      const plResponse = await fetch(`${request.nextUrl.origin}/api/quickbooks/profit-loss?parsed=true`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || ''
        }
      });
      
      if (plResponse.ok) {
        financialContext = `Recent P&L data shows revenue and expense trends. User has access to QuickBooks financial data for analysis.`;
      }
    } catch (error) {
      // Use default context if data fetch fails
    }

    // Simple conversation messages for now - no history to debug timeout
    const conversationMessages = [
      {
        role: "system" as const,
        content: `You are a helpful financial analyst for a specific business. Answer the user's questions directly and clearly.

FINANCIAL CONTEXT: ${financialContext}`
      },
      {
        role: "user" as const,
        content: message
      }
    ];

    console.log(`💬 Chat context: Simple 2-message conversation (system + user)`);

    // If streaming is requested, return a streaming response
    if (stream) {
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log('🤖 Starting GPT-4o streaming completion...');
            const startTime = Date.now();
            
            const completion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: conversationMessages,
              max_tokens: 1000,
              stream: true,
            });
            
            console.log(`⚡ GPT-5 completion created in ${Date.now() - startTime}ms`);

            // Send session ID first
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId, type: 'session' })}\n\n`));

            let chunkCount = 0;
            const streamStartTime = Date.now();
            
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                chunkCount++;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`));
              }
            }

            const totalTime = Date.now() - startTime;
            const streamTime = Date.now() - streamStartTime;
            console.log(`✅ GPT-4o streaming complete: ${chunkCount} chunks, ${totalTime}ms total (${streamTime}ms streaming)`);

            // Send end signal
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end' })}\n\n`));
            controller.close();
          } catch (error) {
            console.error('❌ Error in streaming:', error);
            
            let errorMessage = 'Streaming error occurred';
            if (error instanceof Error) {
              if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
                errorMessage = 'GPT-5 response timed out - please try again with a shorter question';
              } else if (error.message.includes('rate limit') || error.message.includes('429')) {
                errorMessage = 'Rate limit exceeded - please wait a moment and try again';
              } else {
                errorMessage = `Error: ${error.message}`;
              }
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage, type: 'error' })}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response (fallback)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversationMessages,
      max_tokens: 1000,
    });

    // Return response with session ID
    return NextResponse.json({ 
      response: completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.",
      sessionId
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 