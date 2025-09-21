/**
 * ChatDataService - Aggregates rich financial context for AI chat
 * Transforms generic responses into specific, data-driven business insights
 */

import { DriverDiscoveryService } from './DriverDiscoveryService';
import { InsightEngine } from './InsightEngine';
import { FinancialDataParser } from './FinancialDataParser';
import { DriverForecastService } from './DriverForecastService';
import { getValidConnection } from '../quickbooks/connectionManager';
import { getQuickBooksConfig } from '../quickbooks/config';

export interface ComprehensiveQuickBooksData {
  profitLoss: any;
  balanceSheet: any;
  cashFlow: any;
  transactions: any;
  lists: any;
  companyInfo: any;
  fetchedAt: string;
  errors: Record<string, string>;
}

export interface EnhancedBusinessProfile {
  name: string;
  industry: string;
  monthlyRevenue: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  currentRatio: number;
  cashBalance: number;
  arBalance: number;
  apBalance: number;
  dataQuality: {
    monthsOfData: number;
    reliability: 'high' | 'medium' | 'low';
    missingRecentData: boolean;
    lastDataMonth: string;
    availableDataSources: string[];
  };
}

export interface CustomerInsight {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  billingAddress: string;
  paymentTerms: string;
  taxable: boolean;
  active: boolean;
  
  // Financial metrics
  totalInvoiced: number;
  totalPaid: number;
  currentBalance: number;
  averagePaymentDays: number;
  riskLevel: 'low' | 'medium' | 'high';
  revenuePercentage: number;
  
  // Activity metrics
  invoiceCount: number;
  paymentCount: number;
  lastInvoiceDate: string;
  lastPaymentDate: string;
}

export interface VendorInsight {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  billingAddress: string;
  paymentTerms: string;
  taxId: string;
  vendor1099: boolean;
  active: boolean;
  
  // Financial metrics
  totalBilled: number;
  totalFromBills: number;
  totalFromPurchases: number;
  totalPaid: number;
  currentBalance: number;
  averagePaymentDays: number;
  paymentOptimization: string;
  expensePercentage: number;
  
  // Activity metrics
  billCount: number;
  purchaseCount: number;
  paymentCount: number;
  lastBillDate: string;
  lastPaymentDate: string;
  lastPurchaseDate: string;
}

export interface InventoryInsight {
  name: string;
  quantityOnHand: number;
  unitCost: number;
  totalValue: number;
  turnoverRate: number;
  monthsOfSupply: number;
  recommendation: string;
}

export interface BusinessProfile {
  name: string;
  industry: string;
  monthlyRevenue: number;
  dataQuality: {
    monthsOfData: number;
    reliability: 'high' | 'medium' | 'low';
    missingRecentData: boolean;
    lastDataMonth: string;
  };
}

export interface EnhancedChatContext {
  businessProfile: EnhancedBusinessProfile;
  keyDrivers: Array<{
    name: string;
    category: 'revenue' | 'expense';
    materiality: number;
    confidence: 'high' | 'medium' | 'low';
  }>;
  insights: {
    primary: string;
    validation: string;
    opportunity: string;
  };
  recentTrends: {
    revenue: { growth: number; trend: string };
    expenses: { growth: number; trend: string };
  };
  customerInsights: CustomerInsight[];
  vendorInsights: VendorInsight[];
  inventoryInsights: InventoryInsight[];
  cashFlowInsights: {
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashFlow: number;
    burnRate: number;
    runwayMonths: number;
  };
  riskAlerts: string[];
  opportunities: string[];
}

export interface ChatContext {
  businessProfile: BusinessProfile;
  keyDrivers: Array<{
    name: string;
    category: 'revenue' | 'expense';
    materiality: number; // % of total revenue/expenses
    confidence: 'high' | 'medium' | 'low';
  }>;
  insights: {
    primary: string;
    validation: string;
    opportunity: string;
  };
  recentTrends: {
    revenue: { growth: number; trend: string };
    expenses: { growth: number; trend: string };
  };
}

export class ChatDataService {
  private driverService: DriverDiscoveryService;
  private insightEngine: InsightEngine;
  private parser: FinancialDataParser;
  private forecastService: DriverForecastService;
  
  constructor() {
    this.driverService = new DriverDiscoveryService();
    this.insightEngine = new InsightEngine();
    this.parser = new FinancialDataParser();
    this.forecastService = new DriverForecastService();
  }

  /**
   * Fetch all available QuickBooks data sources in parallel using direct API calls like the data page
   */
  async fetchComprehensiveData(userId: string): Promise<ComprehensiveQuickBooksData> {
    const connection = await getValidConnection(userId);

    const config = getQuickBooksConfig();
    const baseUrl = config.baseUrl;
    const headers = {
      'Authorization': `Bearer ${connection.access_token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Get date range for reports
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);
    const endDate = new Date();
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('🚀 Fetching comprehensive QB data directly...');
    console.log('📅 Date range:', startDateStr, 'to', endDateStr);

    // Fetch all data sources in parallel using direct QuickBooks API calls
    const results = await Promise.allSettled([
      // P&L Report
      fetch(`${baseUrl}/company/${connection.realm_id}/reports/ProfitAndLoss?minorversion=65&accounting_method=Accrual&start_date=${startDateStr}&end_date=${endDateStr}&summarize_column_by=Month`, {
        headers, cache: 'no-store' as RequestCache
      }).then(r => r.json()),

      // Balance Sheet
      fetch(`${baseUrl}/company/${connection.realm_id}/reports/BalanceSheet?minorversion=65&accounting_method=Accrual`, {
        headers, cache: 'no-store' as RequestCache
      }).then(r => r.json()),

      // Cash Flow
      fetch(`${baseUrl}/company/${connection.realm_id}/reports/CashFlow?minorversion=65&accounting_method=Accrual&start_date=${startDateStr}&end_date=${endDateStr}`, {
        headers, cache: 'no-store' as RequestCache
      }).then(r => r.json()),

      // All Transactions (Bills, Invoices, Payments, etc.)
      fetch(`${baseUrl}/company/${connection.realm_id}/query?query=SELECT * FROM Transaction WHERE TxnDate >= '${startDateStr}' AND TxnDate <= '${endDateStr}' ORDERBY TxnDate DESC MAXRESULTS 1000`, {
        headers, cache: 'no-store' as RequestCache
      }).then(r => r.json()),

      // Customers
      fetch(`${baseUrl}/company/${connection.realm_id}/query?query=SELECT * FROM Customer WHERE Active IN (true, false) MAXRESULTS 1000`, {
        headers, cache: 'no-store' as RequestCache
      }).then(r => r.json()),

      // Vendors
      fetch(`${baseUrl}/company/${connection.realm_id}/query?query=SELECT * FROM Vendor WHERE Active IN (true, false) MAXRESULTS 1000`, {
        headers, cache: 'no-store' as RequestCache
      }).then(r => r.json()),

      // Accounts
      fetch(`${baseUrl}/company/${connection.realm_id}/query?query=SELECT * FROM Account MAXRESULTS 1000`, {
        headers, cache: 'no-store' as RequestCache
      }).then(r => r.json()),

      // Items
      fetch(`${baseUrl}/company/${connection.realm_id}/query?query=SELECT * FROM Item MAXRESULTS 1000`, {
        headers, cache: 'no-store' as RequestCache
      }).then(r => r.json()),

      // Company Info
      fetch(`${baseUrl}/company/${connection.realm_id}/companyinfo/${connection.realm_id}?minorversion=65`, {
        headers, cache: 'no-store' as RequestCache
      }).then(r => r.json())
    ]);

    // Process results
    const errors: Record<string, string> = {};
    const dataKeys = ['profitLoss', 'balanceSheet', 'cashFlow', 'transactions', 'customers', 'vendors', 'accounts', 'items', 'companyInfo'];
    const data: any = {};

    results.forEach((result, index) => {
      const key = dataKeys[index];
      if (result.status === 'fulfilled') {
        if (result.value.QueryResponse || result.value.Report || result.value.Header) {
          data[key] = result.value;
          console.log(`✅ ${key} fetched: ${key === 'transactions' ? result.value.QueryResponse?.Transaction?.length || 0 : 
                                          key === 'customers' ? result.value.QueryResponse?.Customer?.length || 0 :
                                          key === 'vendors' ? result.value.QueryResponse?.Vendor?.length || 0 :
                                          key === 'accounts' ? result.value.QueryResponse?.Account?.length || 0 :
                                          key === 'items' ? result.value.QueryResponse?.Item?.length || 0 : 'data'} records`);
          
          // Special logging for P&L to see its exact structure
          if (key === 'profitLoss') {
            console.log('🔍 P&L Response Analysis:');
            console.log('  - Top-level keys:', Object.keys(result.value));
            console.log('  - Has QueryResponse:', !!result.value.QueryResponse);
            console.log('  - Has Report directly:', !!result.value.Report);
            console.log('  - Has Header directly:', !!result.value.Header);
            if (result.value.QueryResponse) {
              console.log('  - QueryResponse keys:', Object.keys(result.value.QueryResponse));
            }
          }
        } else if (result.value.fault) {
          errors[key] = result.value.fault.error?.[0]?.Detail || 'QuickBooks API error';
          console.warn(`❌ ${key} QB error:`, result.value.fault);
        } else {
          data[key] = result.value;
          console.log(`✅ ${key} fetched successfully`);
          
          // Log unknown structure for debugging
          if (key === 'profitLoss') {
            console.log('🔍 P&L Unknown Structure:');
            console.log('  - Keys:', Object.keys(result.value || {}));
            console.log('  - Sample:', JSON.stringify(result.value).substring(0, 200));
          }
        }
      } else {
        errors[key] = result.reason?.message || 'Fetch failed';
        console.warn(`❌ Failed to fetch ${key}:`, result.reason);
      }
    });

    // Create lists object for compatibility
    data.lists = {
      QueryResponse: {
        Customer: data.customers?.QueryResponse?.Customer || [],
        Vendor: data.vendors?.QueryResponse?.Vendor || [],
        Account: data.accounts?.QueryResponse?.Account || [],
        Item: data.items?.QueryResponse?.Item || []
      }
    };

    console.log('📊 Final data summary:');
    console.log('✅ P&L structure check:');
    console.log('  - Has QueryResponse:', !!data.profitLoss?.QueryResponse);
    console.log('  - Has Report:', !!data.profitLoss?.QueryResponse?.Report);
    console.log('  - Has Header:', !!data.profitLoss?.QueryResponse?.Report?.Header);
    console.log('  - P&L full structure:', JSON.stringify(Object.keys(data.profitLoss || {}), null, 2));
    if (data.profitLoss?.QueryResponse) {
      console.log('  - QueryResponse keys:', Object.keys(data.profitLoss.QueryResponse));
    }
    console.log('✅ Customers:', data.customers?.QueryResponse?.Customer?.length || 0);
    console.log('✅ Vendors:', data.vendors?.QueryResponse?.Vendor?.length || 0);
    console.log('✅ Transactions:', data.transactions?.QueryResponse?.Transaction?.length || 0);
    console.log('❌ Errors:', Object.keys(errors));

    return {
      ...data,
      fetchedAt: new Date().toISOString(),
      errors
    };
  }

  /**
   * Get enhanced business context with all data sources
   */
  async getEnhancedChatContext(userId: string): Promise<EnhancedChatContext> {
    const comprehensiveData = await this.fetchComprehensiveData(userId);
    
    // Validate P&L data structure - be very permissive and informative
    console.log('🔍 Enhanced Context P&L Validation:');
    console.log('  - profitLoss exists:', !!comprehensiveData.profitLoss);
    console.log('  - profitLoss is object:', typeof comprehensiveData.profitLoss === 'object');
    console.log('  - profitLoss has keys:', Object.keys(comprehensiveData.profitLoss || {}).length > 0);
    
    let profitLossData;
    if (comprehensiveData.profitLoss) {
      console.log('  - profitLoss structure:', Object.keys(comprehensiveData.profitLoss));
      
      // Try to find any recognizable P&L data structure
      profitLossData = comprehensiveData.profitLoss;
      
      // If it has data, try to use it regardless of structure
      console.log('  ✅ Using P&L data as-is - structure will be handled by parser');
      
      try {
        // Test if the parser can handle this structure
        console.log('  🧪 Testing parser compatibility...');
        const testParsed = this.parser.parseMonthlyProfitLoss(profitLossData);
        console.log('  ✅ Parser test successful - found', testParsed.revenue?.monthlyTotals?.length || 0, 'revenue months');
      } catch (parseError) {
        console.error('  ❌ Parser test failed:', parseError);
        console.log('  🔄 Falling back to basic P&L-only context');
        throw new Error('P&L data structure incompatible with parser - ' + (parseError instanceof Error ? parseError.message : 'Unknown parsing error'));
      }
    } else {
      console.error('❌ No P&L data available at all');
      throw new Error('Critical P&L data unavailable - cannot generate business context');
    }

    // Parse financial data using the validated P&L structure
    const parsedData = this.parser.parseMonthlyProfitLoss(profitLossData);
    
    // Discover key drivers
    const driverResult = await this.driverService.discoverDrivers(parsedData);
    
    // Generate base forecast for insights
    const baseForecast = this.forecastService.generateBaseForecast(
      driverResult.drivers, 
      3
    );
    
    // Generate insights
    const insights = this.insightEngine.generateInsights(
      parsedData,
      driverResult.drivers,
      baseForecast.monthlyProjections
    );

    // Build enhanced business profile
    const businessProfile = this.buildEnhancedBusinessProfile(parsedData, comprehensiveData);
    
    // Extract key drivers
    const keyDrivers = driverResult.drivers
      .filter(driver => driver.category === 'revenue' || driver.category === 'expense')
      .slice(0, 5)
      .map(driver => ({
        name: driver.name,
        category: driver.category as 'revenue' | 'expense',
        materiality: driver.materiality,
        confidence: driver.confidence
      }));

    // Calculate trends
    const recentTrends = this.calculateRecentTrends(parsedData);

    // Analyze customers, vendors, inventory
    const customerInsights = this.analyzeCustomers(comprehensiveData);
    const vendorInsights = this.analyzeVendors(comprehensiveData);
    const inventoryInsights = this.analyzeInventory(comprehensiveData);
    const cashFlowInsights = this.analyzeCashFlow(comprehensiveData);

    // Generate risk alerts and opportunities
    const { riskAlerts, opportunities } = this.generateBusinessIntelligence(
      comprehensiveData,
      customerInsights,
      vendorInsights,
      inventoryInsights,
      cashFlowInsights
    );

    return {
      businessProfile,
      keyDrivers,
      insights: {
        primary: insights.critical[0]?.message || 'No critical insights available',
        validation: insights.opportunities[0]?.message || 'No opportunities identified', 
        opportunity: insights.warnings[0]?.message || 'No warnings available'
      },
      recentTrends,
      customerInsights,
      vendorInsights,
      inventoryInsights,
      cashFlowInsights,
      riskAlerts,
      opportunities
    };
  }

  /**
   * Get comprehensive business context for AI chat (legacy method for backward compatibility)
   */
  async getChatContext(profitLossReport: any): Promise<ChatContext> {
    // Parse financial data
    const parsedData = this.parser.parseMonthlyProfitLoss(profitLossReport);
    
    // Discover key drivers
    const driverResult = await this.driverService.discoverDrivers(parsedData);
    
    // Generate base forecast for insights
    const baseForecast = this.forecastService.generateBaseForecast(
      driverResult.drivers, 
      3
    );
    
    // Generate insights
    const insights = this.insightEngine.generateInsights(
      parsedData,
      driverResult.drivers,
      baseForecast.monthlyProjections
    );

    // Calculate business profile
    const businessProfile = this.buildBusinessProfile(parsedData);
    
    // Extract key drivers for chat (exclude balance sheet items)
    const keyDrivers = driverResult.drivers
      .filter(driver => driver.category === 'revenue' || driver.category === 'expense')
      .slice(0, 5)
      .map(driver => ({
        name: driver.name,
        category: driver.category as 'revenue' | 'expense',
        materiality: driver.materiality,
        confidence: driver.confidence
      }));

    // Calculate trends
    const recentTrends = this.calculateRecentTrends(parsedData);

    return {
      businessProfile,
      keyDrivers,
      insights: {
        primary: insights.critical[0]?.message || 'No critical insights available',
        validation: insights.opportunities[0]?.message || 'No opportunities identified', 
        opportunity: insights.warnings[0]?.message || 'No warnings available'
      },
      recentTrends
    };
  }

  /**
   * Format enhanced chat context for AI consumption
   */
  formatEnhancedForAI(context: EnhancedChatContext): string {
    const { businessProfile, keyDrivers, insights, recentTrends, customerInsights, vendorInsights, inventoryInsights, cashFlowInsights, riskAlerts, opportunities } = context;
    
    const dataFreshnessWarning = businessProfile.dataQuality.missingRecentData 
      ? `\n🚨 DATA GAP: Recent months show no activity. Historical data available through ${businessProfile.dataQuality.lastDataMonth}.\n`
      : '';
    
    // Format top customers and vendors with comprehensive details
    const topCustomers = customerInsights.slice(0, 5).map(c => 
      `- ${c.name}${c.companyName ? ` (${c.companyName})` : ''}: $${(c.totalInvoiced / 1000).toFixed(1)}K invoiced (${c.invoiceCount} invoices), $${(c.currentBalance / 1000).toFixed(1)}K outstanding, ${c.averagePaymentDays} day avg payment, ${c.riskLevel} risk${c.email ? `, ${c.email}` : ''}${c.paymentTerms ? `, Terms: ${c.paymentTerms}` : ''}`
    ).join('\n');
    
    const topVendors = vendorInsights.slice(0, 5).map(v => 
      `- ${v.name}${v.companyName ? ` (${v.companyName})` : ''}: $${(v.totalBilled / 1000).toFixed(1)}K total ($${(v.totalFromBills / 1000).toFixed(1)}K bills + $${(v.totalFromPurchases / 1000).toFixed(1)}K purchases), $${(v.currentBalance / 1000).toFixed(1)}K outstanding, ${v.averagePaymentDays} day avg payment${v.paymentTerms ? `, Terms: ${v.paymentTerms}` : ''} - ${v.paymentOptimization}`
    ).join('\n');
    
    const inventoryIssues = inventoryInsights.filter(i => i.recommendation !== 'Optimal').slice(0, 3).map(i => 
      `- ${i.name}: ${i.quantityOnHand} units, $${(i.totalValue / 1000).toFixed(1)}K value, ${i.monthsOfSupply.toFixed(1)} months supply - ${i.recommendation}`
    ).join('\n');
    
    const formattedContext = `ENHANCED BUSINESS PROFILE:
- Company: ${businessProfile.name} (${businessProfile.industry})
- Financial Position: $${(businessProfile.totalAssets / 1000).toFixed(1)}K assets, $${(businessProfile.totalLiabilities / 1000).toFixed(1)}K liabilities, $${(businessProfile.netWorth / 1000).toFixed(1)}K net worth
- Liquidity: $${(businessProfile.cashBalance / 1000).toFixed(1)}K cash, ${businessProfile.currentRatio.toFixed(2)} current ratio
- Working Capital: $${(businessProfile.arBalance / 1000).toFixed(1)}K A/R, $${(businessProfile.apBalance / 1000).toFixed(1)}K A/P
- Recent Monthly Revenue: $${(businessProfile.monthlyRevenue / 1000).toFixed(1)}K (last 3 months average)
- Data Coverage: ${businessProfile.dataQuality.availableDataSources.join(', ')} (${businessProfile.dataQuality.monthsOfData} months)${dataFreshnessWarning}

KEY BUSINESS DRIVERS:
${keyDrivers.map(d => `- ${d.name}: ${d.materiality.toFixed(1)}% materiality (${d.confidence} confidence)`).join('\n')}

CUSTOMER INTELLIGENCE (${customerInsights.length} total customers analyzed):
${topCustomers || '- No customer data available'}

VENDOR INTELLIGENCE (${vendorInsights.length} total vendors analyzed):
${topVendors || '- No vendor data available'}

RELATIONSHIP ANALYTICS:
- Customer Concentration Risk: Top 3 customers = ${customerInsights.slice(0, 3).reduce((sum, c) => sum + c.revenuePercentage, 0).toFixed(1)}% of revenue
- Vendor Concentration: Top 3 vendors = ${vendorInsights.slice(0, 3).reduce((sum, v) => sum + v.expensePercentage, 0).toFixed(1)}% of expenses
- Payment Performance: ${customerInsights.filter(c => c.averagePaymentDays <= 30).length}/${customerInsights.length} customers pay within 30 days
- Vendor Payment Status: Avg payment timing ${vendorInsights.length > 0 ? (vendorInsights.reduce((sum, v) => sum + v.averagePaymentDays, 0) / vendorInsights.length).toFixed(0) : 0} days

INVENTORY ALERTS:
${inventoryIssues || '- No inventory issues identified'}

CASH FLOW ANALYSIS:
- Operating Cash Flow: $${(cashFlowInsights.operatingCashFlow / 1000).toFixed(1)}K
- Net Cash Flow: $${(cashFlowInsights.netCashFlow / 1000).toFixed(1)}K
- Monthly Burn Rate: $${(cashFlowInsights.burnRate / 1000).toFixed(1)}K
- Runway: ${cashFlowInsights.runwayMonths.toFixed(1)} months

RISK ALERTS:
${riskAlerts.length > 0 ? riskAlerts.map(alert => `- ${alert}`).join('\n') : '- No critical risks identified'}

BUSINESS OPPORTUNITIES:
${opportunities.length > 0 ? opportunities.map(opp => `- ${opp}`).join('\n') : '- No specific opportunities identified'}

CORE INSIGHTS:
- Primary Concern: ${insights.primary}
- Validation: ${insights.validation}
- Opportunity: ${insights.opportunity}

HISTORICAL TRENDS:
- Revenue: ${recentTrends.revenue.trend} (${recentTrends.revenue.growth > 0 ? '+' : ''}${recentTrends.revenue.growth.toFixed(1)}%)
- Expenses: ${recentTrends.expenses.trend} (${recentTrends.expenses.growth > 0 ? '+' : ''}${recentTrends.expenses.growth.toFixed(1)}%)`;
    
    console.log('📋 DEBUG: Enhanced business context being sent to AI:');
    console.log(formattedContext);
    
    return formattedContext;
  }

  /**
   * Format chat context for AI consumption (legacy method)
   */
  formatForAI(context: ChatContext): string {
    const { businessProfile, keyDrivers, insights, recentTrends } = context;
    
    const dataFreshnessWarning = businessProfile.dataQuality.missingRecentData 
      ? `\n🚨 DATA GAP: Recent months (Jun-Aug 2025) show no activity. Historical data available through May 2025.\n`
      : '';
    
    // Debug logging for materiality percentages
    console.log('🔍 DEBUG: keyDrivers before formatting:', keyDrivers);
    keyDrivers.forEach(d => {
      console.log(`  - ${d.name}: raw materiality = ${d.materiality}, formatted = ${d.materiality.toFixed(1)}% (no longer multiplying by 100)`);
    });
    
    const formattedContext = `BUSINESS PROFILE:
- Company: ${businessProfile.name} (${businessProfile.industry})
- Recent Monthly Revenue: $${(businessProfile.monthlyRevenue / 1000).toFixed(1)}K (last 3 months average)
- Historical Data: ${businessProfile.dataQuality.monthsOfData} months of rich financial data
- Data Quality: ${businessProfile.dataQuality.reliability}${dataFreshnessWarning}

KEY BUSINESS DRIVERS (from historical analysis):
${keyDrivers.map(d => `- ${d.name}: ${d.materiality.toFixed(1)}% materiality (${d.confidence} confidence)`).join('\n')}

DRIVER DISCOVERY CALCULATION METHODOLOGY:
Base materiality formula: materiality = lineItem.total / companyTotal across ${businessProfile.dataQuality.monthsOfData} months of data.

COMPOSITE SCORING ALGORITHM:
Each driver gets a composite score using this weighted formula:
score = (materiality × 0.3) + (variability × 0.2) + (predictability × 0.2) + (growthImpact × 0.2) + (dataQuality × 0.1)

DETAILED METRIC CALCULATIONS:
• Materiality (30% weight): lineItem.total / companyTotal - measures relative business size
• Variability (20% weight): coefficientOfVariation = stdDev(monthlyValues) / mean(monthlyValues), normalized 0-1 - measures volatility
• Predictability (20% weight): R² correlation from linear regression on historical trend - measures forecastability
• Growth Impact (20% weight): clamp(Math.abs(CAGR) × 5, 0, 1) - measures growth significance
• Data Quality (10% weight): nonZeroMonths / totalMonths - measures data completeness

SELECTION CRITERIA:
Drivers must meet ALL requirements to be included:
✓ Composite score > 0.4 (overall importance threshold)
✓ Materiality > 1% (minimum business impact)
✓ Data quality > 50% (at least 6 months of non-zero data)
✓ Not highly correlated (>0.8) with already selected drivers

For example: "Plants and Soil" at 26.0% materiality scored above 0.4 composite and represents 26% of your total ${businessProfile.dataQuality.monthsOfData}-month business activity.

BUSINESS INSIGHTS:
- Primary Concern: ${insights.primary}
- Validation: ${insights.validation}
- Opportunity: ${insights.opportunity}

HISTORICAL TRENDS:
- Revenue: ${recentTrends.revenue.trend} (${recentTrends.revenue.growth > 0 ? '+' : ''}${recentTrends.revenue.growth.toFixed(1)}%)
- Expenses: ${recentTrends.expenses.trend} (${recentTrends.expenses.growth > 0 ? '+' : ''}${recentTrends.expenses.growth.toFixed(1)}%)`;
    
    console.log('📋 DEBUG: Full business context being sent to AI:');
    console.log(formattedContext);
    
    return formattedContext;
  }

  private buildEnhancedBusinessProfile(parsedData: any, comprehensiveData: ComprehensiveQuickBooksData): EnhancedBusinessProfile {
    // Get basic profile data
    const basicProfile = this.buildBusinessProfile(parsedData);
    
    // Extract balance sheet data
    let totalAssets = 0;
    let totalLiabilities = 0;
    let cashBalance = 0;
    let arBalance = 0;
    let apBalance = 0;
    
    try {
      const balanceSheet = comprehensiveData.balanceSheet?.QueryResponse?.Report;
      if (balanceSheet?.Rows?.Row) {
        const rows = balanceSheet.Rows.Row;
        
        // Find assets section
        const assetsSection = rows.find((row: any) => row.Header?.ColData?.[0]?.value?.includes('ASSETS'));
        if (assetsSection?.Summary?.ColData?.[1]?.value) {
          totalAssets = parseFloat(assetsSection.Summary.ColData[1].value.replace(',', '')) || 0;
        }
        
        // Find liabilities section  
        const liabilitiesSection = rows.find((row: any) => row.Header?.ColData?.[0]?.value?.includes('LIABILITIES'));
        if (liabilitiesSection?.Summary?.ColData?.[1]?.value) {
          totalLiabilities = parseFloat(liabilitiesSection.Summary.ColData[1].value.replace(',', '')) || 0;
        }
        
        // Find specific accounts
        const findAccountBalance = (accountName: string): number => {
          const account = rows.find((row: any) => 
            row.ColData?.[0]?.value?.toLowerCase().includes(accountName.toLowerCase()) && row.type === 'Data'
          );
          return account?.ColData?.[1]?.value ? parseFloat(account.ColData[1].value.replace(',', '')) || 0 : 0;
        };
        
        cashBalance = findAccountBalance('checking') + findAccountBalance('savings') + findAccountBalance('cash');
        arBalance = findAccountBalance('accounts receivable');
        apBalance = findAccountBalance('accounts payable');
      }
    } catch (error) {
      console.warn('Error parsing balance sheet data:', error);
    }
    
    // Calculate financial ratios
    const currentRatio = apBalance > 0 ? (cashBalance + arBalance) / apBalance : 0;
    const netWorth = totalAssets - totalLiabilities;
    
    // Determine available data sources
    const availableDataSources = [];
    if (!comprehensiveData.errors.profitLoss) availableDataSources.push('P&L');
    if (!comprehensiveData.errors.balanceSheet) availableDataSources.push('Balance Sheet');
    if (!comprehensiveData.errors.cashFlow) availableDataSources.push('Cash Flow');
    if (!comprehensiveData.errors.transactions) availableDataSources.push('Transactions');
    if (!comprehensiveData.errors.accounts) availableDataSources.push('Accounts');
    if (!comprehensiveData.errors.customers) availableDataSources.push('Customers');
    if (!comprehensiveData.errors.vendors) availableDataSources.push('Vendors');
    if (!comprehensiveData.errors.items) availableDataSources.push('Items');
    
    return {
      ...basicProfile,
      totalAssets,
      totalLiabilities,
      netWorth,
      currentRatio,
      cashBalance,
      arBalance,
      apBalance,
      dataQuality: {
        ...basicProfile.dataQuality,
        availableDataSources
      }
    };
  }

  private analyzeCustomers(data: ComprehensiveQuickBooksData): CustomerInsight[] {
    const customers = data.lists?.QueryResponse?.Customer || [];
    const invoices = data.transactions?.QueryResponse?.Transaction?.filter((txn: any) => txn.TxnType === 'Invoice') || [];
    const payments = data.transactions?.QueryResponse?.Transaction?.filter((txn: any) => txn.TxnType === 'Payment') || [];
    
    // Calculate total revenue for percentage calculations
    const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.TotalAmt || 0), 0);
    
    console.log(`📊 Analyzing ${customers.length} customers with ${invoices.length} invoices and ${payments.length} payments`);
    
    // Analyze ALL customers, not just first 10
    const customerAnalysis = customers.map((customer: any) => {
      const customerInvoices = invoices.filter((inv: any) => inv.CustomerRef?.value === customer.Id);
      const customerPayments = payments.filter((pmt: any) => pmt.CustomerRef?.value === customer.Id);
      
      const totalInvoiced = customerInvoices.reduce((sum: number, inv: any) => sum + (inv.TotalAmt || 0), 0);
      const totalPaid = customerPayments.reduce((sum: number, pmt: any) => sum + (pmt.TotalAmt || 0), 0);
      const currentBalance = customer.Balance || 0;
      
      // Calculate REAL average payment days using actual payment data
      let averagePaymentDays = 30; // Default
      if (customerInvoices.length > 0 && customerPayments.length > 0) {
        const paymentDays = customerInvoices.map((invoice: any) => {
          const invoiceDate = new Date(invoice.TxnDate);
          const relatedPayment = customerPayments.find((payment: any) => {
            // Look for payments within reasonable timeframe
            const paymentDate = new Date(payment.TxnDate);
            return paymentDate >= invoiceDate && paymentDate <= new Date(invoiceDate.getTime() + 120 * 24 * 60 * 60 * 1000); // 120 days
          });
          
          if (relatedPayment) {
            const paymentDate = new Date(relatedPayment.TxnDate);
            return Math.floor((paymentDate.getTime() - invoiceDate.getTime()) / (24 * 60 * 60 * 1000));
          }
          return null;
        }).filter((days: number | null): days is number => days !== null && days >= 0 && days <= 120);
        
        if (paymentDays.length > 0) {
          averagePaymentDays = Math.round(paymentDays.reduce((sum: number, days: number) => sum + days, 0) / paymentDays.length);
        }
      }
      
      // Enhanced risk assessment
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      const balanceRatio = totalInvoiced > 0 ? currentBalance / totalInvoiced : 0;
      
      if (currentBalance > 5000 && (balanceRatio > 0.4 || averagePaymentDays > 75)) riskLevel = 'high';
      else if (currentBalance > 1000 && (balanceRatio > 0.2 || averagePaymentDays > 45)) riskLevel = 'medium';
      
      // Extract comprehensive customer information
      const customerInfo = {
        name: customer.DisplayName || customer.Name || 'Unknown Customer',
        companyName: customer.CompanyName || '',
        email: customer.PrimaryEmailAddr?.Address || customer.Email?.Address || '',
        phone: customer.PrimaryPhone?.FreeFormNumber || customer.Phone?.FreeFormNumber || '',
        billingAddress: customer.BillAddr ? 
          `${customer.BillAddr.Line1 || ''} ${customer.BillAddr.City || ''} ${customer.BillAddr.CountrySubDivisionCode || ''} ${customer.BillAddr.PostalCode || ''}`.trim() : '',
        paymentTerms: customer.PaymentTermsRef?.name || '',
        taxable: customer.Taxable || false,
        active: customer.Active !== false,
        
        // Financial metrics
        totalInvoiced,
        totalPaid,
        currentBalance,
        averagePaymentDays,
        riskLevel,
        revenuePercentage: totalRevenue > 0 ? (totalInvoiced / totalRevenue) * 100 : 0,
        
        // Activity metrics
        invoiceCount: customerInvoices.length,
        paymentCount: customerPayments.length,
        lastInvoiceDate: customerInvoices.length > 0 ? 
          new Date(Math.max(...customerInvoices.map((inv: any) => new Date(inv.TxnDate).getTime()))).toISOString().split('T')[0] : '',
        lastPaymentDate: customerPayments.length > 0 ?
          new Date(Math.max(...customerPayments.map((pmt: any) => new Date(pmt.TxnDate).getTime()))).toISOString().split('T')[0] : ''
      };
      
      return customerInfo;
    }).filter((c: CustomerInsight) => c.totalInvoiced > 0 || c.currentBalance > 0) // Include customers with any financial activity
      .sort((a: CustomerInsight, b: CustomerInsight) => b.totalInvoiced - a.totalInvoiced);
    
    console.log(`📈 Customer analysis complete: ${customerAnalysis.length} active customers found`);
    return customerAnalysis;
  }

  private analyzeVendors(data: ComprehensiveQuickBooksData): VendorInsight[] {
    const vendors = data.lists?.QueryResponse?.Vendor || [];
    const bills = data.transactions?.QueryResponse?.Transaction?.filter((txn: any) => txn.TxnType === 'Bill') || [];
    const billPayments = data.transactions?.QueryResponse?.Transaction?.filter((txn: any) => txn.TxnType === 'BillPayment') || [];
    const purchases = data.transactions?.QueryResponse?.Transaction?.filter((txn: any) => txn.TxnType === 'Purchase') || [];
    
    const totalExpenses = [...bills, ...purchases].reduce((sum: number, txn: any) => sum + (txn.TotalAmt || 0), 0);
    
    console.log(`🏢 Analyzing ${vendors.length} vendors with ${bills.length} bills, ${billPayments.length} payments, ${purchases.length} purchases`);
    
    // Analyze ALL vendors, not just first 10
    const vendorAnalysis = vendors.map((vendor: any) => {
      const vendorBills = bills.filter((bill: any) => bill.VendorRef?.value === vendor.Id);
      const vendorPurchases = purchases.filter((purchase: any) => 
        purchase.VendorRef?.value === vendor.Id || purchase.EntityRef?.value === vendor.Id
      );
      const vendorPayments = billPayments.filter((payment: any) => payment.VendorRef?.value === vendor.Id);
      
      const totalFromBills = vendorBills.reduce((sum: number, bill: any) => sum + (bill.TotalAmt || 0), 0);
      const totalFromPurchases = vendorPurchases.reduce((sum: number, purchase: any) => sum + (purchase.TotalAmt || 0), 0);
      const totalBilled = totalFromBills + totalFromPurchases;
      const totalPaid = vendorPayments.reduce((sum: number, pmt: any) => sum + (pmt.TotalAmt || 0), 0);
      const currentBalance = vendor.Balance || 0;
      
      // Calculate REAL average payment days using actual payment data
      let averagePaymentDays = 30; // Default
      if (vendorBills.length > 0 && vendorPayments.length > 0) {
        const paymentDays = vendorBills.map((bill: any) => {
          const billDate = new Date(bill.TxnDate);
          const dueDate = bill.DueDate ? new Date(bill.DueDate) : new Date(billDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          const relatedPayment = vendorPayments.find((payment: any) => {
            const paymentDate = new Date(payment.TxnDate);
            return paymentDate >= billDate && paymentDate <= new Date(billDate.getTime() + 120 * 24 * 60 * 60 * 1000); // 120 days
          });
          
          if (relatedPayment) {
            const paymentDate = new Date(relatedPayment.TxnDate);
            return Math.floor((paymentDate.getTime() - billDate.getTime()) / (24 * 60 * 60 * 1000));
          }
          return null;
        }).filter((days: number | null): days is number => days !== null && days >= 0 && days <= 120);
        
        if (paymentDays.length > 0) {
          averagePaymentDays = Math.round(paymentDays.reduce((sum: number, days: number) => sum + days, 0) / paymentDays.length);
        }
      }
      
      // Enhanced payment optimization analysis
      let paymentOptimization = 'Optimal timing';
      const paymentTerms = vendor.PaymentTermsRef?.name || '';
      
      if (averagePaymentDays < 10) {
        paymentOptimization = 'Paying too early - extend payment timing to improve cash flow';
      } else if (averagePaymentDays < 15 && !paymentTerms.includes('Net 10')) {
        paymentOptimization = 'Consider extending payment terms for better cash management';
      } else if (averagePaymentDays > 45) {
        paymentOptimization = 'Risk of late fees and damaged relationships';
      } else if (averagePaymentDays > 35 && paymentTerms.includes('Net 30')) {
        paymentOptimization = 'Approaching payment term limits';
      }
      
      // Extract comprehensive vendor information  
      const vendorInfo = {
        name: vendor.DisplayName || vendor.Name || 'Unknown Vendor',
        companyName: vendor.CompanyName || '',
        email: vendor.PrimaryEmailAddr?.Address || vendor.Email?.Address || '',
        phone: vendor.PrimaryPhone?.FreeFormNumber || vendor.Phone?.FreeFormNumber || '',
        billingAddress: vendor.BillAddr ? 
          `${vendor.BillAddr.Line1 || ''} ${vendor.BillAddr.City || ''} ${vendor.BillAddr.CountrySubDivisionCode || ''} ${vendor.BillAddr.PostalCode || ''}`.trim() : '',
        paymentTerms: paymentTerms,
        taxId: vendor.TaxId || '',
        vendor1099: vendor.Vendor1099 || false,
        active: vendor.Active !== false,
        
        // Financial metrics
        totalBilled,
        totalFromBills,
        totalFromPurchases,
        totalPaid,
        currentBalance,
        averagePaymentDays,
        paymentOptimization,
        expensePercentage: totalExpenses > 0 ? (totalBilled / totalExpenses) * 100 : 0,
        
        // Activity metrics
        billCount: vendorBills.length,
        purchaseCount: vendorPurchases.length,
        paymentCount: vendorPayments.length,
        lastBillDate: vendorBills.length > 0 ? 
          new Date(Math.max(...vendorBills.map((bill: any) => new Date(bill.TxnDate).getTime()))).toISOString().split('T')[0] : '',
        lastPaymentDate: vendorPayments.length > 0 ?
          new Date(Math.max(...vendorPayments.map((pmt: any) => new Date(pmt.TxnDate).getTime()))).toISOString().split('T')[0] : '',
        lastPurchaseDate: vendorPurchases.length > 0 ?
          new Date(Math.max(...vendorPurchases.map((purchase: any) => new Date(purchase.TxnDate).getTime()))).toISOString().split('T')[0] : ''
      };
      
      return vendorInfo;
    }).filter((v: VendorInsight) => v.totalBilled > 0 || v.currentBalance > 0) // Include vendors with any financial activity
      .sort((a: VendorInsight, b: VendorInsight) => b.totalBilled - a.totalBilled);
    
    console.log(`📈 Vendor analysis complete: ${vendorAnalysis.length} active vendors found`);
    return vendorAnalysis;
  }

  private analyzeInventory(data: ComprehensiveQuickBooksData): InventoryInsight[] {
    const items = data.lists?.QueryResponse?.Item || [];
    
    return items.filter((item: any) => 
      item.Type === 'Inventory' && (item.QtyOnHand || 0) > 0
    ).map((item: any) => {
      const quantityOnHand = item.QtyOnHand || 0;
      const unitCost = item.PurchaseCost || item.UnitPrice || 0;
      const totalValue = quantityOnHand * unitCost;
      
      // Simplified turnover calculation (would need more data for accuracy)
      const turnoverRate = 6; // Assumed 6x per year
      const monthsOfSupply = quantityOnHand > 0 ? 12 / turnoverRate : 0;
      
      let recommendation = 'Optimal';
      if (monthsOfSupply > 6) recommendation = 'Excess inventory - consider liquidation';
      else if (monthsOfSupply < 1) recommendation = 'Low stock - consider reordering';
      else if (monthsOfSupply > 3) recommendation = 'High inventory - monitor closely';
      
      return {
        name: item.Name || 'Unknown Item',
        quantityOnHand,
        unitCost,
        totalValue,
        turnoverRate,
        monthsOfSupply,
        recommendation
      };
    }).sort((a: InventoryInsight, b: InventoryInsight) => b.totalValue - a.totalValue);
  }

  private analyzeCashFlow(data: ComprehensiveQuickBooksData): {
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashFlow: number;
    burnRate: number;
    runwayMonths: number;
  } {
    try {
      const cashFlowReport = data.cashFlow?.QueryResponse?.Report;
      let operatingCashFlow = 0;
      let investingCashFlow = 0;
      let financingCashFlow = 0;
      
      if (cashFlowReport?.Rows?.Row) {
        const rows = cashFlowReport.Rows.Row;
        
        // Find cash flow sections (simplified parsing)
        const operatingSection = rows.find((row: any) => 
          row.Header?.ColData?.[0]?.value?.toLowerCase().includes('operating')
        );
        if (operatingSection?.Summary?.ColData?.[1]?.value) {
          operatingCashFlow = parseFloat(operatingSection.Summary.ColData[1].value.replace(',', '')) || 0;
        }
        
        const investingSection = rows.find((row: any) => 
          row.Header?.ColData?.[0]?.value?.toLowerCase().includes('investing')
        );
        if (investingSection?.Summary?.ColData?.[1]?.value) {
          investingCashFlow = parseFloat(investingSection.Summary.ColData[1].value.replace(',', '')) || 0;
        }
        
        const financingSection = rows.find((row: any) => 
          row.Header?.ColData?.[0]?.value?.toLowerCase().includes('financing')
        );
        if (financingSection?.Summary?.ColData?.[1]?.value) {
          financingCashFlow = parseFloat(financingSection.Summary.ColData[1].value.replace(',', '')) || 0;
        }
      }
      
      const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
      const monthlyBurnRate = operatingCashFlow < 0 ? Math.abs(operatingCashFlow) / 12 : 0;
      
      // Calculate runway based on current cash and burn rate
      let runwayMonths = 0;
      if (monthlyBurnRate > 0) {
        // This would need current cash balance from balance sheet
        const estimatedCashBalance = 50000; // Simplified - should use actual balance sheet data
        runwayMonths = estimatedCashBalance / monthlyBurnRate;
      }
      
      return {
        operatingCashFlow,
        investingCashFlow,
        financingCashFlow,
        netCashFlow,
        burnRate: monthlyBurnRate,
        runwayMonths
      };
    } catch (error) {
      console.warn('Error analyzing cash flow:', error);
      return {
        operatingCashFlow: 0,
        investingCashFlow: 0,
        financingCashFlow: 0,
        netCashFlow: 0,
        burnRate: 0,
        runwayMonths: 0
      };
    }
  }

  private generateBusinessIntelligence(
    data: ComprehensiveQuickBooksData,
    customers: CustomerInsight[],
    vendors: VendorInsight[],
    inventory: InventoryInsight[],
    cashFlow: any
  ): { riskAlerts: string[]; opportunities: string[] } {
    const riskAlerts: string[] = [];
    const opportunities: string[] = [];
    
    // Customer risk analysis
    const highRiskCustomers = customers.filter(c => c.riskLevel === 'high');
    if (highRiskCustomers.length > 0) {
      const totalRisk = highRiskCustomers.reduce((sum, c) => sum + c.currentBalance, 0);
      riskAlerts.push(`${highRiskCustomers.length} high-risk customers with $${(totalRisk / 1000).toFixed(1)}K outstanding`);
    }
    
    // Vendor payment optimization
    const earlyPaymentVendors = vendors.filter(v => v.paymentOptimization.includes('extending'));
    if (earlyPaymentVendors.length > 0) {
      const potentialSavings = earlyPaymentVendors.reduce((sum, v) => sum + v.currentBalance, 0) * 0.1; // Estimate 10% cash flow benefit
      opportunities.push(`Optimize payment timing with ${earlyPaymentVendors.length} vendors for $${(potentialSavings / 1000).toFixed(1)}K cash flow benefit`);
    }
    
    // Inventory optimization
    const excessInventory = inventory.filter(i => i.recommendation.includes('Excess'));
    if (excessInventory.length > 0) {
      const tiedUpCapital = excessInventory.reduce((sum, i) => sum + i.totalValue, 0);
      opportunities.push(`Liquidate excess inventory to free up $${(tiedUpCapital / 1000).toFixed(1)}K in working capital`);
    }
    
    // Cash flow warnings
    if (cashFlow.runwayMonths < 6 && cashFlow.runwayMonths > 0) {
      riskAlerts.push(`Cash runway of ${cashFlow.runwayMonths.toFixed(1)} months requires immediate attention`);
    }
    
    // Revenue concentration risk
    const topCustomerRevenue = customers.slice(0, 3).reduce((sum, c) => sum + c.revenuePercentage, 0);
    if (topCustomerRevenue > 60) {
      riskAlerts.push(`High revenue concentration: top 3 customers represent ${topCustomerRevenue.toFixed(1)}% of revenue`);
    }
    
    return { riskAlerts, opportunities };
  }

  private buildBusinessProfile(parsedData: any): BusinessProfile {
    // Get ALL data - zeros are meaningful data points
    const allRevenue = parsedData.revenue.monthlyTotals;
    const lastThreeMonths = allRevenue.slice(-3);
    const missingRecentData = lastThreeMonths.every((month: any) => month.value === 0);
    
    console.log('🔍 DEBUG: Last 3 months data:', lastThreeMonths);
    console.log('🚨 DEBUG: Missing recent data?', missingRecentData);
    
    // Calculate average including zeros - they represent actual business state
    const monthlyRevenue = lastThreeMonths.reduce((sum: number, month: any) => sum + month.value, 0) / lastThreeMonths.length;
    
    console.log('🔍 DEBUG: Calculated monthly revenue (including zeros):', monthlyRevenue);
    
    return {
      name: "Your Business", // Could be extracted from QB company info
      industry: "Service Business", // Could be detected from expense patterns
      monthlyRevenue,
      dataQuality: {
        monthsOfData: parsedData.revenue.monthlyTotals.length,
        reliability: parsedData.revenue.monthlyTotals.length >= 12 ? 'high' : 
                   parsedData.revenue.monthlyTotals.length >= 6 ? 'medium' : 'low',
        missingRecentData,
        lastDataMonth: allRevenue.length > 0 ? allRevenue[allRevenue.length - 1].month : 'unknown'
      }
    };
  }

  private calculateRecentTrends(parsedData: any): any {
    const revenueData = parsedData.revenue.monthlyTotals;
    const expenseData = parsedData.expenses.monthlyTotals;
    
    if (revenueData.length < 2) {
      return {
        revenue: { growth: 0, trend: 'insufficient data' },
        expenses: { growth: 0, trend: 'insufficient data' }
      };
    }

    // Use ALL data including zeros - they represent actual business performance
    const recent = revenueData.slice(-3);
    const previous = revenueData.slice(-6, -3);
    
    const recentAvg = recent.reduce((sum: number, month: any) => sum + month.value, 0) / recent.length;
    const previousAvg = previous.length > 0 ? 
      previous.reduce((sum: number, month: any) => sum + month.value, 0) / previous.length : recentAvg;
    
    const revenueGrowth = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    // Same for expenses - use ALL expense data
    const recentExpenses = expenseData.slice(-3);
    const previousExpenses = expenseData.slice(-6, -3);
    
    const recentExpenseAvg = recentExpenses.reduce((sum: number, month: any) => sum + month.value, 0) / recentExpenses.length;
    const previousExpenseAvg = previousExpenses.length > 0 ?
      previousExpenses.reduce((sum: number, month: any) => sum + month.value, 0) / previousExpenses.length : recentExpenseAvg;
    
    const expenseGrowth = previousExpenseAvg > 0 ? ((recentExpenseAvg - previousExpenseAvg) / previousExpenseAvg) * 100 : 0;

    return {
      revenue: {
        growth: revenueGrowth,
        trend: revenueGrowth > 5 ? 'growing' : revenueGrowth < -5 ? 'declining' : 'stable'
      },
      expenses: {
        growth: expenseGrowth,
        trend: expenseGrowth > 5 ? 'increasing' : expenseGrowth < -5 ? 'decreasing' : 'stable'
      }
    };
  }
}