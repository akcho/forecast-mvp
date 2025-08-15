import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { LandscapingDataAnalyzer } from '@/lib/services/LandscapingDataAnalyzer';

/**
 * Sprint 1: API endpoint to test our business complexity analysis
 * against real QuickBooks data from landscaping business
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get QuickBooks connection
    const connection = await getValidConnection(session.user.dbId);
    if (!connection) {
      return NextResponse.json({ error: 'No QuickBooks connection available' }, { status: 404 });
    }

    const qbAPI = new QuickBooksServerAPI(
      connection.access_token,
      connection.refresh_token,
      connection.realm_id
    );

    // Initialize analyzer and extract data
    const analyzer = new LandscapingDataAnalyzer(qbAPI);
    
    console.log('Extracting comprehensive landscaping data...');
    const businessData = await analyzer.extractComprehensiveData(connection.realm_id);
    
    console.log('Analyzing business complexity...');
    const complexityProfile = analyzer.analyzeBusinessComplexity(businessData);

    // Sprint 1 specific analysis results
    const sprint1Results = {
      // Data extraction results
      dataExtraction: {
        success: true,
        availableMonths: businessData.availableMonths,
        dataQuality: businessData.dataQuality,
        extractedMetrics: {
          currentCash: businessData.currentCash,
          monthlyRevenue: businessData.monthlyRevenue,
          monthlyExpenses: businessData.monthlyExpenses,
          netCashFlow: businessData.netCashFlow,
          totalReceivables: businessData.totalReceivables,
          fixedAssets: businessData.fixedAssets,
        }
      },
      
      // Business classification results
      businessAnalysis: {
        detectedType: businessData.businessType,
        revenueConsistency: businessData.revenueConsistency,
        complexity: complexityProfile.complexity,
        confidence: complexityProfile.confidence
      },

      // Assumption testing results
      assumptionTests: [
        {
          assumption: 'A/R >$10K requires analysis',
          testValue: businessData.totalReceivables,
          threshold: 10000,
          result: businessData.totalReceivables > 10000 ? 'triggered' : 'not_triggered',
          recommendation: complexityProfile.requiresARAnalysis ? 'Include A/R aging tab' : 'Skip A/R analysis'
        },
        {
          assumption: 'Equipment >$25K requires schedule',
          testValue: businessData.fixedAssets,
          threshold: 25000,
          result: businessData.fixedAssets > 25000 ? 'triggered' : 'not_triggered',
          recommendation: complexityProfile.requiresEquipmentSchedule ? 'Include equipment schedule' : 'Skip equipment analysis'
        },
        {
          assumption: 'Service business detection',
          testValue: businessData.businessType,
          threshold: 'service',
          result: businessData.businessType === 'service' ? 'confirmed' : 'unexpected',
          recommendation: `Detected as ${businessData.businessType} business`
        }
      ],

      // Tab relevance analysis
      recommendedTabs: {
        essential: ['P&L Statement', 'Balance Sheet', 'Cash Flow Statement', 'Assumptions Hub'],
        useful: complexityProfile.requiresCustomerAnalysis ? ['Customer Analysis'] : [],
        conditional: [
          ...(complexityProfile.requiresARAnalysis ? ['A/R Aging'] : []),
          ...(complexityProfile.requiresSeasonalAnalysis ? ['Seasonal Analysis'] : []),
          ...(complexityProfile.requiresEquipmentSchedule ? ['Equipment Schedule'] : [])
        ],
        skip: []
      },

      // Learning insights
      insights: [
        `Business detected as ${businessData.businessType} with ${complexityProfile.confidence}% confidence`,
        `Data quality: ${businessData.dataQuality} with ${businessData.availableMonths} months available`,
        `Net cash flow: $${businessData.netCashFlow.toLocaleString()}/month`,
        `A/R balance: $${businessData.totalReceivables.toLocaleString()} ${complexityProfile.requiresARAnalysis ? '(requires analysis)' : '(minimal)'}`,
        `Fixed assets: $${businessData.fixedAssets.toLocaleString()} ${complexityProfile.requiresEquipmentSchedule ? '(requires schedule)' : '(minimal)'}`
      ],

      // Next steps for Sprint 1
      nextSteps: [
        'Review assumption test results vs expectations',
        'Validate tab recommendations with business context',
        'Document any unexpected findings',
        'Refine complexity thresholds based on results'
      ]
    };

    return NextResponse.json(sprint1Results);

  } catch (error) {
    console.error('Sprint 1 analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze landscaping data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}