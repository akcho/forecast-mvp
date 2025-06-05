import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCompanyData } from '@/lib/data';

interface Expense {
  category: string;
  amount: number;
}

interface CompanyData {
  companyName: string;
  currentCash: number;
  monthlyBurnRate: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  topExpenses: Expense[];
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a prompt template that includes financial context
const createPrompt = async (userQuestion: string) => {
  try {
    const companyData = await getCompanyData();
    
    return `You are a financial assistant for ${companyData.companyName}. 
You have access to the following financial data:

Current Cash: $${companyData.currentCash.toLocaleString()}
Monthly Burn Rate: $${companyData.monthlyBurnRate.toLocaleString()}
Monthly Revenue: $${companyData.monthlyRevenue.toLocaleString()}
Revenue Growth Rate: ${(companyData.revenueGrowth * 100).toFixed(1)}%

Top Expenses:
${companyData.topExpenses.map(exp => `- ${exp.category}: $${exp.amount.toLocaleString()}`).join('\n')}

User Question: ${userQuestion}

Please provide a clear, concise response that:
1. Directly answers the user's question
2. Includes relevant numbers from the financial data
3. Provides context when helpful
4. Suggests next steps or follow-up questions when appropriate

Response:`;
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated with QuickBooks') {
      return `I notice you haven't connected your QuickBooks account yet. To get personalized financial insights, please:

1. Click the "Connect QuickBooks" button in the sidebar
2. Follow the authentication steps
3. Once connected, you can ask me questions about your finances

For now, I can only provide general financial advice. Would you like me to do that instead?`;
    }
    throw error;
  }
};

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    console.log('Received message:', message);

    const prompt = await createPrompt(message);
    console.log('Generated prompt:', prompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful financial assistant that provides clear, accurate, and actionable insights about company finances."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    console.log('OpenAI response:', completion.choices[0]?.message?.content);

    return NextResponse.json({ 
      response: completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response."
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get AI response' },
      { status: 500 }
    );
  }
} 