import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { ChatDataService } from '@/lib/services/ChatDataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({
        error: 'Authentication required',
        authenticated: false
      }, { status: 401 });
    }

    console.log('🧪 Testing comprehensive chat data integration...');
    const startTime = Date.now();

    const chatDataService = new ChatDataService();
    
    try {
      // Test enhanced context generation
      const enhancedContext = await chatDataService.getEnhancedChatContext(session.user.dbId);
      const formattedContext = chatDataService.formatEnhancedForAI(enhancedContext);
      
      const processingTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        processingTimeMs: processingTime,
        dataQuality: {
          availableDataSources: enhancedContext.businessProfile.dataQuality.availableDataSources,
          monthsOfData: enhancedContext.businessProfile.dataQuality.monthsOfData,
          reliability: enhancedContext.businessProfile.dataQuality.reliability
        },
        insights: {
          customersAnalyzed: enhancedContext.customerInsights.length,
          vendorsAnalyzed: enhancedContext.vendorInsights.length,
          inventoryItemsAnalyzed: enhancedContext.inventoryInsights.length,
          riskAlerts: enhancedContext.riskAlerts.length,
          opportunities: enhancedContext.opportunities.length
        },
        businessMetrics: {
          totalAssets: enhancedContext.businessProfile.totalAssets,
          totalLiabilities: enhancedContext.businessProfile.totalLiabilities,
          netWorth: enhancedContext.businessProfile.netWorth,
          currentRatio: enhancedContext.businessProfile.currentRatio,
          cashBalance: enhancedContext.businessProfile.cashBalance
        },
        cashFlowAnalysis: {
          operatingCashFlow: enhancedContext.cashFlowInsights.operatingCashFlow,
          netCashFlow: enhancedContext.cashFlowInsights.netCashFlow,
          burnRate: enhancedContext.cashFlowInsights.burnRate,
          runwayMonths: enhancedContext.cashFlowInsights.runwayMonths
        },
        topInsights: {
          customers: enhancedContext.customerInsights.slice(0, 5).map(c => ({
            name: c.name,
            companyName: c.companyName,
            email: c.email,
            phone: c.phone,
            totalInvoiced: c.totalInvoiced,
            currentBalance: c.currentBalance,
            averagePaymentDays: c.averagePaymentDays,
            riskLevel: c.riskLevel,
            revenuePercentage: c.revenuePercentage,
            invoiceCount: c.invoiceCount,
            paymentCount: c.paymentCount,
            paymentTerms: c.paymentTerms
          })),
          vendors: enhancedContext.vendorInsights.slice(0, 5).map(v => ({
            name: v.name,
            companyName: v.companyName,
            email: v.email,
            phone: v.phone,
            totalBilled: v.totalBilled,
            totalFromBills: v.totalFromBills,
            totalFromPurchases: v.totalFromPurchases,
            currentBalance: v.currentBalance,
            averagePaymentDays: v.averagePaymentDays,
            paymentOptimization: v.paymentOptimization,
            expensePercentage: v.expensePercentage,
            billCount: v.billCount,
            purchaseCount: v.purchaseCount,
            paymentTerms: v.paymentTerms,
            vendor1099: v.vendor1099
          })),
          riskAlerts: enhancedContext.riskAlerts,
          opportunities: enhancedContext.opportunities
        },
        formattedContextPreview: formattedContext.substring(0, 1000) + '...',
        fullContext: formattedContext
      });
      
    } catch (enhancedError) {
      console.log('❌ Enhanced context failed, testing fallback...');
      
      // Test fallback to P&L only
      try {
        const fallbackContext = await chatDataService.getChatContext({
          QueryResponse: { Report: null }
        });
        const fallbackFormatted = chatDataService.formatForAI(fallbackContext);
        
        return NextResponse.json({
          success: true,
          fallbackUsed: true,
          enhancedError: enhancedError instanceof Error ? enhancedError.message : 'Unknown error',
          processingTimeMs: Date.now() - startTime,
          fallbackContext: fallbackFormatted.substring(0, 500) + '...'
        });
        
      } catch (fallbackError) {
        return NextResponse.json({
          success: false,
          enhancedError: enhancedError instanceof Error ? enhancedError.message : 'Unknown error',
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          processingTimeMs: Date.now() - startTime
        });
      }
    }
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}