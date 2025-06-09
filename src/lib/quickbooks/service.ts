import { createClient } from '@supabase/supabase-js';
import { QuickBooks } from 'node-quickbooks';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  expiresAt: number;
}

export class QuickBooksService {
  private static instance: QuickBooksService;
  private qbo: QuickBooks | null = null;

  private constructor() {}

  public static getInstance(): QuickBooksService {
    if (!QuickBooksService.instance) {
      QuickBooksService.instance = new QuickBooksService();
    }
    return QuickBooksService.instance;
  }

  private async getTokens(sessionId: string): Promise<QuickBooksTokens | null> {
    const { data, error } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if token needs refresh
    if (Date.now() >= data.expires_at) {
      return this.refreshTokens(sessionId, data.refresh_token);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      realmId: data.realm_id,
      expiresAt: data.expires_at,
    };
  }

  private async refreshTokens(sessionId: string, refreshToken: string): Promise<QuickBooksTokens | null> {
    try {
      const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.NEXT_PUBLIC_QB_CLIENT_ID}:${process.env.NEXT_PUBLIC_QB_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const expiresAt = Date.now() + data.expires_in * 1000;

      // Update tokens in database
      const { error } = await supabase
        .from('quickbooks_tokens')
        .upsert({
          session_id: sessionId,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: expiresAt,
        });

      if (error) {
        throw error;
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        realmId: data.realm_id,
        expiresAt,
      };
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      return null;
    }
  }

  private async getClient(sessionId: string): Promise<QuickBooks | null> {
    const accessToken = process.env.NEXT_PUBLIC_QB_ACCESS_TOKEN;
    const realmId = process.env.NEXT_PUBLIC_QB_REALM_ID;
    const refreshToken = process.env.NEXT_PUBLIC_QB_REFRESH_TOKEN;

    if (!accessToken || !realmId || !refreshToken) {
      return null;
    }

    if (!this.qbo) {
      this.qbo = new QuickBooks(
        process.env.NEXT_PUBLIC_QB_CLIENT_ID!,
        process.env.NEXT_PUBLIC_QB_CLIENT_SECRET!,
        accessToken,
        false, // no OAuth verifier
        realmId,
        process.env.NODE_ENV === 'development', // use sandbox in development
        true, // debug
        null, // minor version
        '2.0', // OAuth version
        refreshToken
      );
    }

    return this.qbo;
  }

  async getCompanyInfo(sessionId: string): Promise<any> {
    try {
      const accessToken = process.env.NEXT_PUBLIC_QB_ACCESS_TOKEN;
      const realmId = process.env.NEXT_PUBLIC_QB_REALM_ID;

      if (!accessToken || !realmId) {
        throw new Error('Missing QuickBooks credentials');
      }

      console.log('Fetching company info with:', { accessToken: accessToken.substring(0, 10) + '...', realmId });
      const response = await fetch(
        `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('QuickBooks API error:', { status: response.status, statusText: response.statusText, body: errorText });
        throw new Error(`QuickBooks API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Company info response:', data);
      return data;
    } catch (error) {
      console.error('Error getting company info:', error);
      throw error;
    }
  }

  async getBalanceSheet(sessionId: string): Promise<any> {
    try {
      const accessToken = process.env.NEXT_PUBLIC_QB_ACCESS_TOKEN;
      const realmId = process.env.NEXT_PUBLIC_QB_REALM_ID;

      if (!accessToken || !realmId) {
        throw new Error('Missing QuickBooks credentials');
      }

      const response = await fetch(
        `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/BalanceSheet`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`QuickBooks API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting balance sheet:', error);
      throw error;
    }
  }

  async getProfitAndLoss(sessionId: string): Promise<any> {
    try {
      const accessToken = process.env.NEXT_PUBLIC_QB_ACCESS_TOKEN;
      const realmId = process.env.NEXT_PUBLIC_QB_REALM_ID;

      if (!accessToken || !realmId) {
        throw new Error('Missing QuickBooks credentials');
      }

      const response = await fetch(
        `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`QuickBooks API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting profit and loss:', error);
      throw error;
    }
  }

  async getCashFlow(sessionId: string): Promise<any> {
    try {
      const accessToken = process.env.NEXT_PUBLIC_QB_ACCESS_TOKEN;
      const realmId = process.env.NEXT_PUBLIC_QB_REALM_ID;

      if (!accessToken || !realmId) {
        throw new Error('Missing QuickBooks credentials');
      }

      const response = await fetch(
        `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/CashFlow`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`QuickBooks API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting cash flow:', error);
      throw error;
    }
  }
} 