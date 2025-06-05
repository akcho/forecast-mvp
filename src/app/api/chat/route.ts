import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Mock financial data for testing
const mockFinancialData = {
  companyName: "Test Company",
  currentCash: 500000,
  monthlyBurnRate: 75000,
  monthlyRevenue: 45000,
  topExpenses: [
    { category: "Marketing", amount: 25000 },
    { category: "Engineering", amount: 20000 },
    { category: "Operations", amount: 15000 },
  ],
  revenueGrowth: 0.15, // 15% month over month
};

// Create a prompt template that includes financial context
const createPrompt = (userQuestion: string) => {
  return `You are a financial assistant for ${mockFinancialData.companyName}. 
You have access to the following financial data:

Current Cash: $${mockFinancialData.currentCash.toLocaleString()}
Monthly Burn Rate: $${mockFinancialData.monthlyBurnRate.toLocaleString()}
Monthly Revenue: $${mockFinancialData.monthlyRevenue.toLocaleString()}
Revenue Growth Rate: ${(mockFinancialData.revenueGrowth * 100).toFixed(1)}%

Top Expenses:
${mockFinancialData.topExpenses.map(exp => `- ${exp.category}: $${exp.amount.toLocaleString()}`).join('\n')}

User Question: ${userQuestion}

Please provide a clear, concise response that:
1. Directly answers the user's question
2. Includes relevant numbers from the financial data
3. Provides context when helpful
4. Suggests next steps or follow-up questions when appropriate

Response:`;
};

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful financial assistant that provides clear, accurate, and actionable insights about company finances."
        },
        {
          role: "user",
          content: createPrompt(message)
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return NextResponse.json({ 
      response: completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response."
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
} 