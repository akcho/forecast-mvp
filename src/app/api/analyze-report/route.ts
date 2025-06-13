import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { type, question, reportData } = await request.json();

    if (type === 'analysis') {
      const prompt = `Analyze this P&L report. Be direct and concise.

P&L Data:
Period: ${reportData.period}
Net Income: ${reportData.netIncome}
Gross Profit: ${reportData.grossProfit}
Operating Income: ${reportData.operatingIncome}
Total Income: ${reportData.totalIncome}
Total Expenses: ${reportData.totalExpenses}

Income Items: ${JSON.stringify(reportData.incomeItems)}
Expense Items: ${JSON.stringify(reportData.expenseItems)}

Provide:
1. One-line summary
2. Three bullet-point insights
3. Three bullet-point actions

Format as JSON:
{
  "executiveSummary": "string",
  "keyInsights": ["string", "string", "string"],
  "recommendations": ["string", "string", "string"]
}`;

      const completion = await openai.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "You are a direct, no-nonsense financial advisor. Use short, clear sentences. Focus on numbers and actions. Avoid jargon and unnecessary words." 
          },
          { role: "user", content: prompt }
        ],
        model: "gpt-4-turbo-preview",
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      return NextResponse.json(analysis);
    } else {
      const prompt = `Answer this question about the P&L report. Be direct and concise.

Question: ${question}

P&L Data:
Period: ${reportData.period}
Net Income: ${reportData.netIncome}
Gross Profit: ${reportData.grossProfit}
Operating Income: ${reportData.operatingIncome}
Total Income: ${reportData.totalIncome}
Total Expenses: ${reportData.totalExpenses}

Income Items: ${JSON.stringify(reportData.incomeItems)}
Expense Items: ${JSON.stringify(reportData.expenseItems)}

Rules:
- Use bullet points
- Lead with numbers
- Keep it under 3 sentences
- No fluff`;

      const completion = await openai.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "You are a direct, no-nonsense financial advisor. Use short, clear sentences. Focus on numbers and actions. Avoid jargon and unnecessary words." 
          },
          { role: "user", content: prompt }
        ],
        model: "gpt-4-turbo-preview",
        temperature: 0.7,
        max_tokens: 500
      });

      return NextResponse.json({ answer: completion.choices[0].message.content });
    }
  } catch (error) {
    console.error('Error analyzing report:', error);
    return NextResponse.json(
      { error: 'Failed to analyze report' },
      { status: 500 }
    );
  }
} 