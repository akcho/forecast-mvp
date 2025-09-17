// Database-backed QuickBooks client that replaces cookie-based store
// This provides a unified API for frontend components to interact with QuickBooks
// authentication data stored in the database rather than browser cookies.

export interface ConnectionStatus {
  isAuthenticated: boolean;
  hasConnection: boolean;
  userCompanies: Company[];
  activeCompanyId?: string;
  companyConnection?: QuickBooksConnection;
  error?: string;
}

export interface Company {
  id: string;
  quickbooks_realm_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface QuickBooksConnection {
  id: string;
  company_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  company_name?: string;
  connected_by_user_id?: string;
  connected_at: string;
  token_expires_at?: string;
  last_refreshed_at: string;
  last_used_at: string;
  refresh_token_expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionTokens {
  access_token: string;
  realm_id: string;
  company_name?: string;
}

export class DatabaseQuickBooksClient {
  private cache: ConnectionStatus | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  /**
   * Get the current connection status from the database
   * @param forceRefresh Force a fresh API call, bypassing cache
   * @param companyId Optional company ID to switch to
   */
  async getConnectionStatus(forceRefresh = false, companyId?: string): Promise<ConnectionStatus> {
    // Cache for 30 seconds to avoid excessive API calls
    if (!forceRefresh && this.cache && Date.now() < this.cacheExpiry && !companyId) {
      return this.cache;
    }

    try {
      const url = `/api/quickbooks/status${companyId ? `?company_id=${companyId}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Status API failed: ${response.status} ${response.statusText}`);
      }

      const status = await response.json();

      // Only cache successful responses without specific company ID
      if (!companyId) {
        this.cache = status;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      }

      return status;
    } catch (error) {
      console.error('DatabaseQuickBooksClient: Error fetching connection status:', error);
      // Return error state that maintains type safety
      return {
        isAuthenticated: false,
        hasConnection: false,
        userCompanies: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the current access token for API requests
   * Note: Uses separate API call since tokens are not included in status response for security
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const tokens = await this.getConnectionTokens();
      return tokens?.access_token || null;
    } catch (error) {
      console.error('DatabaseQuickBooksClient: Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get the current realm ID (QuickBooks company ID)
   */
  async getRealmId(): Promise<string | null> {
    try {
      const tokens = await this.getConnectionTokens();
      return tokens?.realm_id || null;
    } catch (error) {
      console.error('DatabaseQuickBooksClient: Error getting realm ID:', error);
      return null;
    }
  }

  /**
   * Get the current refresh token
   * Note: Uses separate API call since tokens are not included in status response for security
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/quickbooks/connection-tokens');
      if (!response.ok) {
        return null;
      }
      const tokens = await response.json();
      return tokens.refresh_token || null;
    } catch (error) {
      console.error('DatabaseQuickBooksClient: Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated with QuickBooks
   */
  async isAuthenticated(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.isAuthenticated;
  }

  /**
   * Check if user has any QuickBooks connections
   */
  async hasConnection(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.hasConnection;
  }

  /**
   * Get connection tokens for API requests (access token + realm ID)
   */
  async getConnectionTokens(): Promise<ConnectionTokens | null> {
    try {
      const response = await fetch('/api/quickbooks/connection-tokens');

      if (!response.ok) {
        if (response.status === 401) {
          console.log('DatabaseQuickBooksClient: User not authenticated');
        } else if (response.status === 404) {
          console.log('DatabaseQuickBooksClient: No QuickBooks connection found');
        }
        return null;
      }

      const tokens = await response.json();
      return {
        access_token: tokens.access_token,
        realm_id: tokens.realm_id,
        company_name: tokens.company_name
      };
    } catch (error) {
      console.error('DatabaseQuickBooksClient: Error fetching connection tokens:', error);
      return null;
    }
  }

  /**
   * Switch to a different company (if user has access)
   * @param companyId The company ID to switch to
   */
  async switchCompany(companyId: string): Promise<ConnectionStatus> {
    // Clear cache and get fresh status with new company
    this.clearCache();
    return await this.getConnectionStatus(true, companyId);
  }

  /**
   * Get list of companies user has access to
   */
  async getUserCompanies(): Promise<Company[]> {
    const status = await this.getConnectionStatus();
    return status.userCompanies;
  }

  /**
   * Get current active company ID
   */
  async getActiveCompanyId(): Promise<string | null> {
    const status = await this.getConnectionStatus();
    return status.activeCompanyId || null;
  }

  /**
   * Clear the internal cache, forcing next request to fetch fresh data
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Legacy compatibility method - equivalent to isAuthenticated()
   * Maintains compatibility with existing quickBooksStore interface
   */
  async isAuthenticatedWithQuickBooks(): Promise<boolean> {
    return await this.isAuthenticated();
  }

  /**
   * Get current company name
   */
  async getCompanyName(): Promise<string | null> {
    const status = await this.getConnectionStatus();
    return status.companyConnection?.company_name || null;
  }
}

// Singleton instance for global use
export const databaseClient = new DatabaseQuickBooksClient();

// Export default for compatibility
export default databaseClient;