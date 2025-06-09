declare module 'node-quickbooks' {
  export class QuickBooks {
    constructor(
      clientId: string,
      clientSecret: string,
      accessToken: string,
      oauthVerifier: boolean,
      realmId: string,
      useSandbox: boolean,
      debug: boolean,
      minorVersion: string | null,
      oauthVersion: string,
      refreshToken: string
    );

    getCompanyInfo(realmId: string, callback: (err: any, companyInfo: any) => void): void;
    reportBalanceSheet(params: any, callback: (err: any, balanceSheet: any) => void): void;
    reportProfitAndLoss(params: any, callback: (err: any, profitAndLoss: any) => void): void;
    reportCashFlow(params: any, callback: (err: any, cashFlow: any) => void): void;
  }
} 