import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCompanyData, getFinancialData } from '@/lib/data';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PromptResult {
  type: 'runway' | 'general' | 'auth_required';
  prompt?: string;
  message?: string;
}

// Create a prompt template that includes financial context
const createFinancialPrompt = async (userQuestion: string, companyData: any, financialData: any): Promise<PromptResult> => {
  try {
    // Special handling for runway questions
    if (userQuestion.toLowerCase().includes('runway')) {
      const runwayMonths = (companyData.currentCash / companyData.monthlyBurnRate).toFixed(2);
      return {
        type: 'runway',
        prompt: `As a financial advisor for ${companyData.companyName}, I can tell you that your current runway is ${runwayMonths} months. This is calculated by dividing your current cash balance of $${companyData.currentCash.toLocaleString()} by your monthly burn rate of $${companyData.monthlyBurnRate.toLocaleString()}.`
      };
    }

    // For other questions, create a general financial context
    return {
      type: 'general',
      prompt: `As a financial advisor for ${companyData.companyName}, here's the current financial context:\n` +
        `- Current Cash: $${companyData.currentCash.toLocaleString()}\n` +
        `- Monthly Burn Rate: $${companyData.monthlyBurnRate.toLocaleString()}\n` +
        `- Monthly Revenue: $${companyData.monthlyRevenue.toLocaleString()}\n` +
        `- Total Assets: $${companyData.totalAssets.toLocaleString()}\n` +
        `- Total Liabilities: $${companyData.totalLiabilities.toLocaleString()}\n` +
        `- Total Equity: $${companyData.totalEquity.toLocaleString()}\n\n` +
        `User Question: ${userQuestion}`
    };
  } catch (error) {
    console.error('Error creating prompt:', error);
    return {
      type: 'auth_required',
      message: 'Sorry, I encountered an error while processing your request. Please try again.'
    };
  }
};

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const message = body.message;
    console.log('Message:', message);

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

    // Get company data
    let companyData;
    try {
      console.log('Fetching company data...');
      companyData = await getCompanyData(sessionId);
      console.log('Company data:', companyData);
    } catch (error) {
      console.error('Error getting company data:', error);
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

    // Get financial data
    let financialData;
    try {
      console.log('Fetching financial data...');
      financialData = await getFinancialData(sessionId);
      console.log('Financial data:', financialData);
    } catch (error) {
      console.error('Error getting financial data:', error);
      return NextResponse.json({
        type: 'error',
        message: 'Sorry, I encountered an error while fetching your financial data. Please try again later.'
      });
    }

    // Create prompt with the data
    const promptResult = await createFinancialPrompt(message, companyData, financialData);
    console.log('Generated prompt:', promptResult);

    // If we're not authenticated, return the message directly
    if (promptResult.type === 'auth_required') {
      return NextResponse.json({ response: promptResult.message });
    }

    if (!promptResult.prompt) {
      throw new Error('No prompt generated');
    }

    // Call OpenAI API with the prompt
    console.log('Calling OpenAI...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful financial assistant that provides clear, accurate, and actionable insights about company finances."
        },
        {
          role: "user",
          content: promptResult.prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
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