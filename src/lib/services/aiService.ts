import OpenAI from 'openai';

export class AIService {
  private static instance: AIService;
  private openai: OpenAI;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private generatePrompt(type: string, data: any): string {
    switch (type) {
      case 'runway':
        const { currentCash, monthlyBurnRate, monthlyRevenue, netMonthlyCashFlow } = data;
        
        // If company is profitable (positive cash flow), calculate time to reach a target cash balance
        if (netMonthlyCashFlow > 0) {
          const targetCashBalance = 100000; // Example target: $100k
          const monthsToTarget = (targetCashBalance - currentCash) / netMonthlyCashFlow;
          return `As a financial advisor for ${data.companyName}, I can tell you that your company is currently profitable with a positive monthly cash flow of $${netMonthlyCashFlow.toFixed(2)}. With your current cash balance of $${currentCash.toFixed(2)}, you will reach a target cash balance of $${targetCashBalance.toFixed(2)} in approximately ${monthsToTarget.toFixed(2)} months.`;
        }
        
        // If company is losing money, calculate runway
        const runway = currentCash / monthlyBurnRate;
        return `As a financial advisor for ${data.companyName}, I can tell you that your current runway is ${runway.toFixed(2)} months. This is calculated by dividing your current cash balance of $${currentCash.toFixed(2)} by your monthly burn rate of $${monthlyBurnRate.toFixed(2)}.`;
      
      case 'revenue':
        return `As a financial advisor for ${data.companyName}, I can tell you that your current monthly revenue is $${data.monthlyRevenue.toFixed(2)}.`;
      
      case 'expenses':
        return `As a financial advisor for ${data.companyName}, I can tell you that your current monthly expenses are $${data.monthlyExpenses.toFixed(2)}.`;
      
      default:
        return 'I am not sure how to help with that request.';
    }
  }

  public async getResponse(type: string, data: any): Promise<string> {
    try {
      const prompt = this.generatePrompt(type, data);
      console.log('Generated prompt:', { type, prompt });

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a financial advisor helping a small business owner understand their financial situation. Be direct and clear in your responses."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      return completion.choices[0].message.content || 'I am not sure how to help with that request.';
    } catch (error) {
      console.error('Error getting AI response:', error);
      throw error;
    }
  }
} 