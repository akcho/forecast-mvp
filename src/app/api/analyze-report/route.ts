import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Remove the module-level OpenAI client initialization
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY || '',
// });

export async function POST(request: Request) {
  try {
    // Initialize OpenAI client inside the function
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    const { type, question, reportData } = await request.json();

    if (type === 'analysis') {
      const prompt = `You are a fractional CFO analyzing a Profit & Loss statement. 
      Analyze this P&L data and provide insights. Use EXACTLY these numbers:

      Period: ${reportData.period || 'N/A'}
      Report Basis: ${reportData.reportBasis || 'N/A'}
      Currency: ${reportData.currency || 'USD'}

      Key Metrics (Use these exact numbers):
      - Total Income: ${reportData.totalIncome?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'}
      - Total Expenses: ${reportData.totalExpenses?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'}
      - COGS: ${reportData.cogs?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'}
      - Gross Profit: ${reportData.grossProfit?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'}
      - Net Income: ${reportData.netIncome?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'}
      - Gross Margin: ${reportData.grossMargin?.toFixed(1) || '0.0'}%
      - Expense Ratio: ${reportData.expenseRatio?.toFixed(1) || '0.0'}%
      - COGS Ratio: ${reportData.cogsRatio?.toFixed(1) || '0.0'}%

      Income Breakdown:
      ${JSON.stringify(reportData.incomeBreakdown || [], null, 2)}

      Expense Breakdown:
      ${JSON.stringify(reportData.expenseBreakdown || [], null, 2)}

      Rules:
      1. Use EXACTLY the numbers provided above - do not recalculate or modify them
      2. If you see different numbers in the breakdowns, use the pre-calculated totals
      3. Focus on analyzing the relationships between these exact numbers
      4. Highlight both strengths and areas for improvement
      5. Provide specific, actionable recommendations
      6. Keep responses brief and direct
      7. Include the exact numbers in your analysis
      8. Do not make up or estimate any numbers

      Return your analysis in this exact JSON format:
      {
        "executiveSummary": "One sentence overview of financial health, using the exact numbers provided",
        "keyInsights": [
          "First key insight using the exact numbers provided",
          "Second key insight using the exact numbers provided",
          "Third key insight using the exact numbers provided"
        ],
        "recommendations": [
          "First specific, actionable recommendation",
          "Second specific, actionable recommendation",
          "Third specific, actionable recommendation"
        ]
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "You are a direct, no-nonsense financial advisor. Use ONLY the exact numbers provided. Do not recalculate, verify, or modify any numbers. Focus on analysis and recommendations." 
          },
          { role: "user", content: prompt }
        ],
        model: "gpt-4-turbo-preview",
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
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