import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const message = body.message;
    const currentReports = body.currentReports;
    const timePeriod = body.timePeriod || '3months';
    const stream = body.stream || false; // New parameter to enable streaming
    
    console.log('Message:', message);
    console.log('Time period:', timePeriod);
    console.log('Streaming enabled:', stream);
    console.log('Current reports available:', Object.keys(currentReports || {}));

    if (!message) {
      return NextResponse.json({
        type: 'error',
        message: 'No message provided'
      });
    }

    // Get QuickBooks tokens from headers
    const accessToken = request.headers.get('X-QB-Access-Token');
    const realmId = request.headers.get('X-QB-Realm-ID');
    const refreshToken = request.headers.get('X-QB-Refresh-Token');

    if (!accessToken || !realmId || !refreshToken) {
      return NextResponse.json({
        type: 'auth_required',
        message: "I notice you haven't connected your QuickBooks account yet. To get personalized financial insights, please:\n\n" +
          '1. Go to the home page (click the logo in the top left)\n' +
          '2. Click the "Connect QuickBooks" button\n' +
          '3. Follow the authentication steps\n' +
          '4. Once connected, come back here and ask me questions about your finances\n\n' +
          'For now, I can only provide general financial advice. Would you like me to do that instead?'
      });
    }

    // Set QuickBooks tokens in environment
    process.env.NEXT_PUBLIC_QB_ACCESS_TOKEN = accessToken;
    process.env.NEXT_PUBLIC_QB_REALM_ID = realmId;
    process.env.NEXT_PUBLIC_QB_REFRESH_TOKEN = refreshToken;

    // Get or create session ID
    let sessionId = request.headers.get('X-Session-ID');
    console.log('Session ID from header:', sessionId);
    if (!sessionId) {
      sessionId = uuidv4();
      console.log('Generated new session ID:', sessionId);
    }

    // Check if we have current reports data
    if (!currentReports || (!currentReports.profitLoss && !currentReports.balanceSheet && !currentReports.cashFlow)) {
      return NextResponse.json({
        type: 'auth_required',
        message: "I don't have access to your current financial data. Please make sure you're viewing a financial report in the analysis section, then try asking your question again."
      });
    }

    // Create a simple prompt with just the user's question and the raw report data
    const prompt = `You are a financial advisor analyzing QuickBooks financial reports. 

The user is asking: "${message}"

Here are the financial reports for the ${timePeriod} period:

Profit & Loss Statement:
${JSON.stringify(currentReports.profitLoss, null, 2)}

Balance Sheet:
${JSON.stringify(currentReports.balanceSheet, null, 2)}

Cash Flow Statement:
${JSON.stringify(currentReports.cashFlow, null, 2)}

Please analyze these reports and answer the user's question. Provide clear, actionable insights based on the actual financial data.`;

    console.log('Generated prompt with raw data');

    // If streaming is requested, return a streaming response
    if (stream) {
      console.log('Starting streaming response...');
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are a helpful financial assistant that provides clear, accurate, and actionable insights about company finances. Analyze the provided QuickBooks reports and answer questions based on the actual financial data."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              temperature: 0.7,
              max_tokens: 1000,
              stream: true,
            });

            // Send session ID first
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId, type: 'session' })}\n\n`));

            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`));
              }
            }

            // Send end signal
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end' })}\n\n`));
            controller.close();
          } catch (error) {
            console.error('Error in streaming:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming error occurred', type: 'error' })}\n\n`));
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
    console.log('Calling OpenAI (non-streaming)...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful financial assistant that provides clear, accurate, and actionable insights about company finances. Analyze the provided QuickBooks reports and answer questions based on the actual financial data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    console.log('OpenAI response:', completion.choices[0]?.message?.content);

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