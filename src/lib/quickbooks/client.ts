import { quickBooksStore } from "./store";
import {
  getOAuthEnvironmentParam,
  getUserInfoEndpoint,
  getEnvironmentName,
  getQuickBooksConfig,
} from "@/lib/quickbooks/config";

interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
}

interface QuickBooksUserInfo {
  sub: string; // QuickBooks user GUID
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  address?: {
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}

interface QuickBooksCompanyInfo {
  QueryResponse: {
    CompanyInfo: Array<{
      CompanyName: string;
      LegalName: string;
      CompanyAddr: {
        Line1: string;
        City: string;
        CountrySubDivisionCode: string;
        PostalCode: string;
      };
      Email: {
        Address: string;
      };
      WebAddr: {
        URI: string;
      };
    }>;
  };
}

interface QuickBooksReport {
  QueryResponse: {
    Report: {
      Header: {
        Time: string;
        ReportName: string;
        DateMacro: string;
        ReportBasis: string;
        StartPeriod: string;
        EndPeriod: string;
        Currency: string;
      };
      Columns: {
        Column: Array<{
          ColTitle: string;
          ColType: string;
        }>;
      };
      Rows: {
        Row: Array<{
          Header: {
            ColData: Array<{
              value: string;
            }>;
          };
          Rows?: {
            Row: Array<any>;
          };
          Summary?: {
            ColData: Array<{
              value: string;
            }>;
          };
          type: string;
        }>;
      };
    };
  };
}

export class QuickBooksClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private environment: "sandbox" | "production";

  constructor(requestUrl?: string) {
    console.log("=== QUICKBOOKS CLIENT INITIALIZATION START ===");
    console.log("Constructor input:", {
      requestUrl: requestUrl || "not provided",
      hostname: requestUrl ? new URL(requestUrl).hostname : "N/A"
    });

    // Detect environment from URL parameter
    console.log("=== ENVIRONMENT DETECTION ===");
    this.environment = this.detectEnvironment(requestUrl);
    console.log("Environment detection result:", {
      detectedEnvironment: this.environment,
      requestUrl: requestUrl || "N/A",
      envParam: requestUrl ? new URL(requestUrl).searchParams.get('env') : "N/A"
    });

    // Detect deployment status - use request URL domain if available
    console.log("=== DEPLOYMENT DETECTION ===");
    const isDeployed = this.isProductionDeployment(requestUrl);
    console.log("Deployment detection result:", {
      isDeployed,
      hostname: requestUrl ? new URL(requestUrl).hostname : "N/A",
      vercelUrl: process.env.VERCEL_URL ? "set" : "not set",
      nodeEnv: process.env.NODE_ENV
    });

    // Select credentials based on environment and deployment
    console.log("=== CREDENTIAL SELECTION ===");
    console.log("Available environment variables:", {
      PRODUCTION_QB_CLIENT_ID: process.env.PRODUCTION_QB_CLIENT_ID ? `${process.env.PRODUCTION_QB_CLIENT_ID.substring(0, 10)}...` : "not set",
      PRODUCTION_QB_CLIENT_SECRET: process.env.PRODUCTION_QB_CLIENT_SECRET ? "set" : "not set",
      QB_CLIENT_ID: process.env.QB_CLIENT_ID ? `${process.env.QB_CLIENT_ID.substring(0, 10)}...` : "not set",
      QB_CLIENT_SECRET: process.env.QB_CLIENT_SECRET ? "set" : "not set"
    });

    const credentials = this.getCredentials(this.environment);
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;

    console.log("Credential selection result:", {
      environment: this.environment,
      selectedClientId: this.clientId ? `${this.clientId.substring(0, 10)}...` : "not selected",
      hasSelectedSecret: !!this.clientSecret,
      credentialSource: this.environment === 'production' ?
        (process.env.PRODUCTION_QB_CLIENT_ID ? 'PRODUCTION_QB_CLIENT_ID' : 'QB_CLIENT_ID fallback') :
        (process.env.QB_CLIENT_ID ? 'QB_CLIENT_ID' : 'PRODUCTION_QB_CLIENT_ID fallback')
    });

    // Select redirect URI based on deployment only
    console.log("=== REDIRECT URI SELECTION ===");
    console.log("Redirect URI environment variables:", {
      PRODUCTION_REDIRECT_URI: process.env.PRODUCTION_REDIRECT_URI || "not set",
      DEVELOPMENT_REDIRECT_URI: process.env.DEVELOPMENT_REDIRECT_URI || "not set",
      QB_REDIRECT_URI: process.env.QB_REDIRECT_URI || "not set"
    });

    this.redirectUri = this.getRedirectUri(isDeployed);
    console.log("Redirect URI selection result:", {
      isDeployed,
      selectedRedirectUri: this.redirectUri,
      source: isDeployed ?
        (process.env.PRODUCTION_REDIRECT_URI ? 'PRODUCTION_REDIRECT_URI' :
         process.env.QB_REDIRECT_URI ? 'QB_REDIRECT_URI' : 'hardcoded fallback') :
        (process.env.DEVELOPMENT_REDIRECT_URI ? 'DEVELOPMENT_REDIRECT_URI' :
         process.env.QB_REDIRECT_URI ? 'QB_REDIRECT_URI' : 'hardcoded fallback')
    });

    // Enhanced validation with detailed error reporting
    console.log("=== CREDENTIAL VALIDATION ===");
    if (!this.clientId || !this.clientSecret) {
      console.error("❌ QuickBooks credentials are missing");
      console.error("Missing credential details:", {
        environment: this.environment,
        hasClientId: !!this.clientId,
        hasClientSecret: !!this.clientSecret,
        clientIdLength: this.clientId?.length || 0,
        availableEnvVars: {
          PRODUCTION_QB_CLIENT_ID: !!process.env.PRODUCTION_QB_CLIENT_ID,
          PRODUCTION_QB_CLIENT_SECRET: !!process.env.PRODUCTION_QB_CLIENT_SECRET,
          QB_CLIENT_ID: !!process.env.QB_CLIENT_ID,
          QB_CLIENT_SECRET: !!process.env.QB_CLIENT_SECRET
        }
      });
      throw new Error("QuickBooks OAuth credentials are not configured");
    }

    if (!this.redirectUri) {
      console.error("❌ QuickBooks redirect URI is not configured");
      throw new Error("QuickBooks redirect URI is not configured");
    }

    console.log("✅ QuickBooks client validation successful");
    console.log("=== FINAL CLIENT CONFIGURATION ===");
    console.log("Client configuration summary:", {
      environment: this.environment,
      isDeployed,
      clientId: this.clientId ? `${this.clientId.substring(0, 10)}...` : "missing",
      hasClientSecret: !!this.clientSecret,
      redirectUri: this.redirectUri,
      requestHostname: requestUrl ? new URL(requestUrl).hostname : "no-url"
    });
    console.log("=== QUICKBOOKS CLIENT INITIALIZATION COMPLETE ===");
  }

  private detectEnvironment(requestUrl?: string): "sandbox" | "production" {
    // Server-side: use provided request URL
    if (requestUrl) {
      try {
        const url = new URL(requestUrl);
        const envParam = url.searchParams.get("env");
        return envParam === "sandbox" ? "sandbox" : "production";
      } catch (error) {
        return "production"; // Default if URL parsing fails
      }
    }

    // Client-side: use window.location
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const envParam = urlParams.get("env");
      return envParam === "sandbox" ? "sandbox" : "production";
    }

    // Default for SSR
    return "production";
  }

  private isProductionDeployment(requestUrl?: string): boolean {
    // First, check if we have a request URL and can determine from domain
    if (requestUrl) {
      try {
        const url = new URL(requestUrl);
        const hostname = url.hostname;
        // Consider it deployed if it's not localhost
        return hostname !== "localhost" && hostname !== "127.0.0.1";
      } catch (error) {
        // If URL parsing fails, fall back to environment variables
      }
    }

    // Fall back to environment variable detection
    return (
      process.env.VERCEL_URL !== undefined ||
      process.env.NODE_ENV === "production"
    );
  }

  private getCredentials(environment: "sandbox" | "production") {
    const productionClientId =
      process.env.PRODUCTION_QB_CLIENT_ID || process.env.QB_CLIENT_ID || "";
    const productionClientSecret =
      process.env.PRODUCTION_QB_CLIENT_SECRET ||
      process.env.QB_CLIENT_SECRET ||
      "";

    const sandboxClientId =
      process.env.QB_CLIENT_ID || process.env.PRODUCTION_QB_CLIENT_ID || "";
    const sandboxClientSecret =
      process.env.QB_CLIENT_SECRET ||
      process.env.PRODUCTION_QB_CLIENT_SECRET ||
      "";

    const useProductionCredentials = environment === "production";

    return {
      clientId: useProductionCredentials ? productionClientId : sandboxClientId,
      clientSecret: useProductionCredentials
        ? productionClientSecret
        : sandboxClientSecret,
    };
  }

  private getRedirectUri(isDeployed: boolean): string {
    const baseFallback = isDeployed
      ? "https://app.netflo.ai/api/quickbooks/callback"
      : "http://localhost:3000/api/quickbooks/callback";

    const envOverride = isDeployed
      ? process.env.PRODUCTION_REDIRECT_URI || process.env.QB_REDIRECT_URI
      :
          process.env.DEVELOPMENT_REDIRECT_URI ||
          process.env.QB_REDIRECT_URI;

    return envOverride || baseFallback;
  }

  // Check if user is admin (has direct tokens) or team member (should use shared connection)
  private isAdmin(): boolean {
    const accessToken = quickBooksStore.getAccessToken();
    const refreshToken = quickBooksStore.getRefreshToken();
    const realmId = quickBooksStore.getRealmId();
    return !!(accessToken && refreshToken && realmId);
  }

  getAuthorizationUrl(): string {
    console.log("=== GENERATING OAUTH AUTHORIZATION URL ===");

    if (!this.clientId) {
      console.error("❌ Cannot generate OAuth URL: Client ID is missing");
      throw new Error("QuickBooks Client ID is not configured");
    }

    // Use QuickBooks Online scope with OpenID Connect to get user profile info
    const scope = "com.intuit.quickbooks.accounting openid";

    // Encode environment in state parameter for callback detection
    const randomState = Math.random().toString(36).substring(2);
    const state = `${this.environment}_${randomState}`;

    // Use environment-specific parameter - this is critical for sandbox mode
    const environmentParam =
      this.environment === "sandbox" ? "&environment=sandbox" : "";

    console.log("OAuth URL components being generated:", {
      baseUrl: "https://appcenter.intuit.com/connect/oauth2",
      clientId: this.clientId ? `${this.clientId.substring(0, 10)}...` : "missing",
      responseType: "code",
      redirectUri: this.redirectUri,
      scope: scope,
      state: state,
      environmentParam: environmentParam || "none (production)",
      environment: this.environment
    });

    const authUrl = (
      `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}` +
      `&response_type=code&redirect_uri=${encodeURIComponent(
        this.redirectUri
      )}` +
      `&scope=${encodeURIComponent(scope)}&state=${state}${environmentParam}`
    );

    console.log("=== FINAL OAUTH URL ANALYSIS ===");
    console.log("Generated OAuth URL:", authUrl);

    // Parse and validate the generated URL
    try {
      const urlObj = new URL(authUrl);
      console.log("OAuth URL validation:", {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        hasClientId: urlObj.searchParams.has('client_id'),
        hasRedirectUri: urlObj.searchParams.has('redirect_uri'),
        hasScope: urlObj.searchParams.has('scope'),
        hasState: urlObj.searchParams.has('state'),
        hasEnvironment: urlObj.searchParams.has('environment'),
        clientIdValue: urlObj.searchParams.get('client_id'),
        redirectUriValue: urlObj.searchParams.get('redirect_uri'),
        environmentValue: urlObj.searchParams.get('environment') || 'not set'
      });

      // Validate redirect URI format
      const redirectUriParam = urlObj.searchParams.get('redirect_uri');
      if (redirectUriParam) {
        try {
          const redirectUrl = new URL(redirectUriParam);
          console.log("Redirect URI validation:", {
            redirectUri: redirectUriParam,
            protocol: redirectUrl.protocol,
            hostname: redirectUrl.hostname,
            pathname: redirectUrl.pathname,
            isValid: true
          });
        } catch (redirectError) {
          console.error("❌ Invalid redirect URI in OAuth URL:", {
            redirectUri: redirectUriParam,
            error: redirectError instanceof Error ? redirectError.message : 'Unknown error'
          });
        }
      }

      console.log("✅ OAuth URL generated and validated successfully");

    } catch (urlError) {
      console.error("❌ Generated OAuth URL is invalid:", {
        url: authUrl,
        error: urlError instanceof Error ? urlError.message : 'Unknown error'
      });
      throw new Error("Generated OAuth URL is invalid");
    }

    console.log("=== OAUTH URL GENERATION COMPLETE ===");
    return authUrl;
  }

  getAuthorizationUrlWithRedirectUri(redirectUri: string): string {
    if (!this.clientId) {
      throw new Error("QuickBooks Client ID is not configured");
    }

    // Use QuickBooks Online scope with OpenID Connect to get user profile info
    const scope = "com.intuit.quickbooks.accounting openid";

    const state = Math.random().toString(36).substring(2);

    // Use dynamic environment parameter
    const environmentParam = getOAuthEnvironmentParam();
    return (
      `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}` +
      `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}&state=${state}${environmentParam}`
    );
  }

  getAlternativeAuthorizationUrl(): string {
    if (!this.clientId) {
      throw new Error("QuickBooks Client ID is not configured");
    }

    // Use QuickBooks Online scope with OpenID Connect to get user profile info
    const scope = "com.intuit.quickbooks.accounting openid";

    const state = Math.random().toString(36).substring(2);

    // Alternative OAuth endpoint that might work better for standard users
    const environmentParam = getOAuthEnvironmentParam();
    return (
      `https://oauth.platform.intuit.com/oauth2/v1/authorize?client_id=${this.clientId}` +
      `&response_type=code&redirect_uri=${encodeURIComponent(
        this.redirectUri
      )}` +
      `&scope=${encodeURIComponent(scope)}&state=${state}${environmentParam}`
    );
  }

  async exchangeCodeForTokens(code: string): Promise<QuickBooksTokens> {
    const authHeader = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString("base64");

    // Use sandbox token endpoint
    const response = await fetch(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: this.redirectUri,
        }).toString(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error("Failed to exchange code for tokens");
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  }

  async getUserInfo(accessToken: string): Promise<QuickBooksUserInfo> {
    const response = await fetch(getUserInfoEndpoint(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("User info fetch error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error("Failed to fetch user profile information");
    }

    const userInfo = await response.json();
    return userInfo as QuickBooksUserInfo;
  }

  private async refreshAccessToken(): Promise<QuickBooksTokens> {
    const refreshToken = quickBooksStore.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch("/api/quickbooks/refresh", {
      method: "POST",
      headers: {
        "X-QB-Refresh-Token": refreshToken,
        "X-QB-Environment": getEnvironmentName(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token refresh error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    quickBooksStore.setTokens(data.access_token, data.refresh_token);

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    try {
      const accessToken = quickBooksStore.getAccessToken();
      const realmId = quickBooksStore.getRealmId();

      if (!accessToken || !realmId) {
        throw new Error("Not authenticated with QuickBooks");
      }

      // Test the tokens with a simple API call
      const testResponse = await fetch(`/api/quickbooks/company`, {
        method: "GET",
        headers: {
          "X-QB-Access-Token": accessToken,
          "X-QB-Realm-ID": realmId,
        },
      });

      if (!testResponse.ok) {
        // Clear tokens if invalid
        quickBooksStore.clear();
        throw new Error(
          "QuickBooks tokens are invalid or expired. Please reconnect your QuickBooks account."
        );
      }

      const headers: Record<string, string> = {
        "X-QB-Access-Token": accessToken,
        "X-QB-Realm-ID": realmId,
      };

      // Build URL with query parameters
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000";
      const url = new URL(`/api/quickbooks/${endpoint}`, baseUrl);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
        // @ts-ignore
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        // Check for specific token expiration error
        if (response.status === 401 && errorData.code === "TOKEN_EXPIRED") {
          quickBooksStore.clear();
          throw new Error(
            "QuickBooks tokens have expired. Please reconnect your QuickBooks account."
          );
        }
        throw new Error(`API request failed: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      // Clear tokens on any error
      quickBooksStore.clear();
      throw error;
    }
  }

  async getBalanceSheet(
    params: Record<string, string> = {}
  ): Promise<QuickBooksReport> {
    return this.makeRequest("balance-sheet", params);
  }

  async getProfitAndLoss(
    params: Record<string, string> = {}
  ): Promise<QuickBooksReport> {
    return this.makeRequest("profit-loss", params);
  }

  async getCashFlow(
    params: Record<string, string> = {}
  ): Promise<QuickBooksReport> {
    return this.makeRequest("cash-flow", params);
  }

  async getCompanyInfo(): Promise<QuickBooksCompanyInfo> {
    return this.makeRequest("company");
  }

  async getTransactions() {
    return this.makeRequest("transactions");
  }

  async getLists() {
    return this.makeRequest("lists");
  }

  setRealmId(realmId: string) {
    quickBooksStore.setRealmId(realmId);
  }
}
