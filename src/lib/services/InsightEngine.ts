/**
 * InsightEngine - Generates intelligent, data-driven insights for financial forecasts
 */

import { 
  Insight, 
  CategorizedInsights, 
  InsightAnalyzer,
  DataQualityMetrics 
} from '@/types/insightTypes';
import { ParsedProfitLoss } from '../quickbooks/types';
import { DiscoveredDriver } from '@/types/forecastTypes';

export class InsightEngine {
  private analyzers: InsightAnalyzer[] = [];

  constructor() {
    // Initialize analyzers
    this.analyzers = [
      new DataQualityAnalyzer(),
      new AnomalyAnalyzer(),
      new TrendAnalyzer(),
      new MarginAnalyzer(),
      new ConcentrationAnalyzer()
    ];
  }

  /**
   * Generate comprehensive insights from financial data
   */
  generateInsights(
    monthlyData: ParsedProfitLoss,
    drivers: DiscoveredDriver[],
    forecast: any[]
  ): CategorizedInsights {
    console.log('🧠 Generating intelligent insights...');
    
    const allInsights: Insight[] = [];
    
    // Run each analyzer
    for (const analyzer of this.analyzers) {
      try {
        const insights = analyzer.analyze(monthlyData, drivers, forecast);
        allInsights.push(...insights);
        console.log(`✅ ${analyzer.constructor.name}: ${insights.length} insights`);
      } catch (error) {
        console.error(`❌ Error in ${analyzer.constructor.name}:`, error);
      }
    }
    
    // Score and rank insights
    const rankedInsights = this.rankInsights(allInsights);
    
    // Categorize insights
    const categorized = this.categorizeInsights(rankedInsights);
    
    console.log(`🎯 Generated ${categorized.all.length} total insights`);
    return categorized;
  }

  /**
   * Rank insights by importance/impact
   */
  private rankInsights(insights: Insight[]): Insight[] {
    return insights
      .map(insight => ({
        ...insight,
        score: this.calculateInsightScore(insight)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15); // Top 15 most important
  }

  /**
   * Calculate importance score for an insight
   */
  private calculateInsightScore(insight: Insight): number {
    let score = 0;
    
    // Priority weights
    switch (insight.priority) {
      case 'high': score += 100; break;
      case 'medium': score += 50; break;
      case 'low': score += 10; break;
    }
    
    // Type weights
    switch (insight.type) {
      case 'warning': score += 80; break;
      case 'opportunity': score += 60; break;
      case 'info': score += 30; break;
      case 'success': score += 20; break;
    }
    
    // Financial impact
    if (insight.impact?.value) {
      score += Math.min(Math.abs(insight.impact.value) / 100, 50);
    }
    
    // Actionability bonus
    if (insight.action) {
      score += 25;
    }
    
    // Recency bonus
    if (insight.timeframe === 'current' || insight.timeframe === 'recent') {
      score += 30;
    }
    
    return score;
  }

  /**
   * Categorize insights into different buckets
   */
  private categorizeInsights(insights: Insight[]): CategorizedInsights {
    const critical = insights.filter(i => i.priority === 'high' && i.type === 'warning');
    const warnings = insights.filter(i => i.type === 'warning');
    const opportunities = insights.filter(i => i.type === 'opportunity');
    const dataQuality = insights.filter(i => i.category === 'data_quality');
    
    // Calculate data quality score
    const dataQualityScore = this.calculateDataQualityScore(dataQuality);
    
    return {
      critical,
      warnings,
      opportunities,
      dataQuality,
      all: insights,
      summary: {
        totalInsights: insights.length,
        criticalCount: critical.length,
        warningCount: warnings.length,
        opportunityCount: opportunities.length,
        dataQualityScore
      }
    };
  }

  /**
   * Calculate overall data quality score (0-100)
   */
  private calculateDataQualityScore(dataQualityInsights: Insight[]): number {
    if (dataQualityInsights.length === 0) return 100;
    
    // Start at 100 and deduct points for each issue
    let score = 100;
    
    for (const insight of dataQualityInsights) {
      switch (insight.priority) {
        case 'high': score -= 30; break;
        case 'medium': score -= 15; break;
        case 'low': score -= 5; break;
      }
    }
    
    return Math.max(score, 0);
  }
}

/**
 * Data Quality Analyzer - Detects categorization and data completeness issues
 */
class DataQualityAnalyzer implements InsightAnalyzer {
  analyze(monthlyData: ParsedProfitLoss, drivers: DiscoveredDriver[]): Insight[] {
    const insights: Insight[] = [];
    
    // Check for uncategorized expenses
    const miscDriver = drivers.find(d => 
      d.category === 'expense' && 
      (d.name.toLowerCase().includes('misc') || d.name.toLowerCase().includes('other'))
    );
    
    if (miscDriver) {
      const totalExpenses = drivers
        .filter(d => d.category === 'expense')
        .reduce((sum, d) => sum + (d.baseValue || 0), 0);
      
      const miscPercent = ((miscDriver.baseValue || 0) / totalExpenses) * 100;
      
      if (miscPercent > 10) {
        insights.push({
          id: `data-quality-misc-${Date.now()}`,
          type: 'warning',
          priority: miscPercent > 25 ? 'high' : 'medium',
          category: 'data_quality',
          title: 'Uncategorized Expenses',
          message: `${miscPercent.toFixed(0)}% of expenses are uncategorized`,
          detail: `$${(miscDriver.baseValue || 0).toLocaleString()} in "${miscDriver.name}" limits forecast accuracy`,
          action: 'Categorize these transactions in QuickBooks for better insights',
          impact: {
            metric: 'forecast_confidence',
            value: -miscPercent,
            unit: '%'
          },
          timeframe: 'current',
          score: 0
        });
      }
    }
    
    // Check for data gaps (months with zero revenue)
    if (monthlyData?.revenue?.monthlyTotals) {
      const zeroRevenueMonths = monthlyData.revenue.monthlyTotals.filter(m => m.value === 0);
      
      if (zeroRevenueMonths.length > 0) {
        insights.push({
          id: `data-quality-gaps-${Date.now()}`,
          type: 'warning',
          priority: zeroRevenueMonths.length > 2 ? 'high' : 'medium',
          category: 'data_quality',
          title: 'Missing Revenue Data',
          message: `${zeroRevenueMonths.length} months with zero revenue`,
          detail: `Months: ${zeroRevenueMonths.map(m => m.month).join(', ')}`,
          action: 'Verify if this is accurate or if transactions are missing',
          timeframe: 'historical',
          score: 0
        });
      }
    }
    
    return insights;
  }
}

/**
 * Anomaly Analyzer - Detects unusual spikes and drops
 */
class AnomalyAnalyzer implements InsightAnalyzer {
  analyze(monthlyData: ParsedProfitLoss, drivers: DiscoveredDriver[]): Insight[] {
    const insights: Insight[] = [];
    
    // Check each expense line for anomalies
    if (monthlyData?.expenses?.lines) {
      for (const line of monthlyData.expenses.lines) {
        const values = line.monthlyValues.map(m => m.value).filter(v => v > 0);
        
        if (values.length < 3) continue; // Need at least 3 points
        
        const anomaly = this.detectAnomaly(values);
        
        if (anomaly.isAnomaly && anomaly.severity === 'extreme') {
          const anomalyIndex = values.length - 1; // Assume most recent
          const anomalyValue = values[anomalyIndex];
          
          insights.push({
            id: `anomaly-${line.name}-${Date.now()}`,
            type: 'warning',
            priority: 'high',
            category: 'anomaly',
            title: `Unusual ${anomaly.direction === 'spike' ? 'Spike' : 'Drop'} Detected`,
            message: `${line.name} ${anomaly.direction === 'spike' ? 'spiked' : 'dropped'} to $${anomalyValue.toLocaleString()}`,
            detail: `${anomaly.standardDeviations.toFixed(1)} standard deviations from normal range`,
            action: 'Verify if this is a one-time event or new recurring pattern',
            impact: {
              metric: 'monthly_expense',
              value: anomalyValue - anomaly.expectedRange.max,
              unit: '$'
            },
            timeframe: 'recent',
            score: 0,
            metadata: {
              driverName: line.name,
              values: values.slice(-3)
            }
          });
        }
      }
    }
    
    return insights;
  }
  
  private detectAnomaly(values: number[]): any {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const lastValue = values[values.length - 1];
    const zScore = Math.abs((lastValue - mean) / stdDev);
    
    return {
      isAnomaly: zScore > 2,
      severity: zScore > 3 ? 'extreme' : zScore > 2.5 ? 'moderate' : 'mild',
      direction: lastValue > mean ? 'spike' : 'drop',
      standardDeviations: zScore,
      expectedRange: {
        min: mean - 2 * stdDev,
        max: mean + 2 * stdDev
      }
    };
  }
}

/**
 * Trend Analyzer - Identifies growth and decline patterns
 */
class TrendAnalyzer implements InsightAnalyzer {
  analyze(monthlyData: ParsedProfitLoss, drivers: DiscoveredDriver[]): Insight[] {
    const insights: Insight[] = [];
    
    // Find fastest growing revenue drivers
    const revenueDrivers = drivers.filter(d => d.category === 'revenue');
    const growingDrivers = revenueDrivers.filter(d => d.growthRate > 0.1); // >10% annual growth
    
    if (growingDrivers.length > 0) {
      const fastestGrowing = growingDrivers.reduce((top, driver) => 
        driver.growthRate > top.growthRate ? driver : top
      );
      
      insights.push({
        id: `trend-growth-${fastestGrowing.name}-${Date.now()}`,
        type: 'opportunity',
        priority: 'medium',
        category: 'trend',
        title: 'Strong Growth Trend',
        message: `${fastestGrowing.name} growing ${(fastestGrowing.growthRate * 100).toFixed(0)}% annually`,
        detail: 'Consider investing more resources in this high-growth area',
        action: 'Increase marketing or capacity for this service',
        impact: {
          metric: 'annual_revenue_growth',
          value: fastestGrowing.growthRate * 100,
          unit: '%'
        },
        timeframe: 'recent',
        score: 0,
        metadata: {
          driverName: fastestGrowing.name
        }
      });
    }
    
    return insights;
  }
}

/**
 * Margin Analyzer - Analyzes profitability by service/category
 */
class MarginAnalyzer implements InsightAnalyzer {
  analyze(monthlyData: ParsedProfitLoss, drivers: DiscoveredDriver[]): Insight[] {
    const insights: Insight[] = [];
    
    // Calculate total revenue and expenses
    const totalRevenue = drivers
      .filter(d => d.category === 'revenue')
      .reduce((sum, d) => sum + (d.baseValue || 0), 0);
    
    const totalExpenses = drivers
      .filter(d => d.category === 'expense')
      .reduce((sum, d) => sum + (d.baseValue || 0), 0);
    
    const overallMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    
    if (overallMargin > 50) {
      insights.push({
        id: `margin-healthy-${Date.now()}`,
        type: 'success',
        priority: 'low',
        category: 'margin',
        title: 'Healthy Profit Margins',
        message: `Overall margin is ${overallMargin.toFixed(0)}% - well above industry average`,
        detail: 'Strong profitability indicates efficient operations',
        timeframe: 'current',
        score: 0
      });
    } else if (overallMargin < 20) {
      insights.push({
        id: `margin-low-${Date.now()}`,
        type: 'warning',
        priority: 'medium',
        category: 'margin',
        title: 'Low Profit Margins',
        message: `Overall margin is ${overallMargin.toFixed(0)}% - below recommended 20-30%`,
        detail: 'Consider reviewing pricing strategy or reducing costs',
        action: 'Analyze pricing and cost structure',
        timeframe: 'current',
        score: 0
      });
    }
    
    return insights;
  }
}

/**
 * Concentration Analyzer - Identifies revenue concentration risks
 */
class ConcentrationAnalyzer implements InsightAnalyzer {
  analyze(monthlyData: ParsedProfitLoss, drivers: DiscoveredDriver[]): Insight[] {
    const insights: Insight[] = [];
    
    const revenueDrivers = drivers.filter(d => d.category === 'revenue');
    
    if (revenueDrivers.length === 0) return insights;
    
    // Calculate concentration (what % comes from top 2 drivers)
    const sortedByRevenue = revenueDrivers
      .sort((a, b) => (b.baseValue || 0) - (a.baseValue || 0));
    
    const totalRevenue = revenueDrivers.reduce((sum, d) => sum + (d.baseValue || 0), 0);
    const top2Revenue = sortedByRevenue.slice(0, 2).reduce((sum, d) => sum + (d.baseValue || 0), 0);
    const concentrationPercent = (top2Revenue / totalRevenue) * 100;
    
    if (concentrationPercent > 80) {
      insights.push({
        id: `concentration-high-${Date.now()}`,
        type: 'warning',
        priority: 'medium',
        category: 'concentration',
        title: 'High Revenue Concentration',
        message: `${concentrationPercent.toFixed(0)}% of revenue from just 2 services`,
        detail: `Top services: ${sortedByRevenue.slice(0, 2).map(d => d.name).join(', ')}`,
        action: 'Consider diversifying revenue streams to reduce risk',
        impact: {
          metric: 'revenue_concentration',
          value: concentrationPercent,
          unit: '%'
        },
        timeframe: 'current',
        score: 0
      });
    }
    
    return insights;
  }
}