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

    // Create a focused prompt for concise, actionable responses
    const prompt = `Analyze this financial question: "${message}"

IMPORTANT: Extract the business type/industry from the financial data and reference it specifically in your response.

Financial data for ${timePeriod}:
- P&L: ${JSON.stringify(currentReports.profitLoss, null, 2)}
- Balance Sheet: ${JSON.stringify(currentReports.balanceSheet, null, 2)}
- Cash Flow: ${JSON.stringify(currentReports.cashFlow, null, 2)}

CRITICAL ANALYSIS REQUIREMENTS:
1. **Anomaly Detection**: Immediately flag any unusual patterns:
   - Zero income/expenses in any period
   - Missing data or gaps in reporting
   - Unusual spikes or drops in key metrics
   - Inconsistencies between reports

2. **Data Quality Issues**: Identify potential accounting errors:
   - Missing transactions
   - Incorrect classifications
   - Timing issues (accruals vs cash)
   - Reconciliation problems

3. **Business Context**: Always reference the specific business type and consider industry-specific factors

Guidelines:
- Lead with key numbers/answer
- Reference the specific business type (e.g., "your landscaping business", "your construction company")
- Use bullet points for clarity
- Keep responses under 150 words unless detailed analysis is requested
- Focus on actionable insights specific to this business
- Use bold formatting for important numbers and metrics
- **ALWAYS check for data anomalies first** - if you see zeros, missing data, or unusual patterns, address them immediately
- Avoid generic advice - make it specific to this business's data
- If you detect potential accounting issues, suggest specific investigation steps`;

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
          content: "You are a proactive financial analyst for a specific business. Your primary responsibilities:\n\n1. **ANOMALY DETECTION FIRST**: Always scan for unusual patterns, zeros, missing data, or inconsistencies before answering any question\n2. **DATA QUALITY**: Flag potential accounting errors, missing transactions, or timing issues\n3. **BUSINESS CONTEXT**: Reference the specific business type from the financial data\n4. **ACTIONABLE INSIGHTS**: Provide specific, actionable advice tailored to the business\n\nLead with key numbers, use bullet points, and be direct. If you detect anomalies, address them immediately before proceeding with the user's question."
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
          content: "You are a proactive financial analyst for a specific business. Your primary responsibilities:\n\n1. **ANOMALY DETECTION FIRST**: Always scan for unusual patterns, zeros, missing data, or inconsistencies before answering any question\n2. **DATA QUALITY**: Flag potential accounting errors, missing transactions, or timing issues\n3. **BUSINESS CONTEXT**: Reference the specific business type from the financial data\n4. **ACTIONABLE INSIGHTS**: Provide specific, actionable advice tailored to the business\n\nLead with key numbers, use bullet points, and be direct. If you detect anomalies, address them immediately before proceeding with the user's question."
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