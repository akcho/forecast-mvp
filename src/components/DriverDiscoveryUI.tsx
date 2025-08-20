/**
 * Basic UI for displaying driver discovery results
 * Simple interface to see the calculated driver data
 */

'use client';

import { useState, useEffect } from 'react';
import { DiscoveredDriver, DriverDiscoveryResult } from '@/types/driverTypes';

interface DriverDiscoveryUIProps {
  // Optional props for configuration
}

export function DriverDiscoveryUI({}: DriverDiscoveryUIProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverData, setDriverData] = useState<DriverDiscoveryResult | null>(null);

  useEffect(() => {
    fetchDriverData();
  }, []);

  const fetchDriverData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching driver discovery data...');
      const response = await fetch('/api/quickbooks/discover-drivers');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch driver data');
      }
      
      console.log('✅ Driver data received:', data);
      setDriverData(data.analysis);
    } catch (err) {
      console.error('❌ Error fetching driver data:', err);
      setError((err as Error).message || 'Failed to load driver data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          🔍 Analyzing your QuickBooks data to discover business drivers...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Driver Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchDriverData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!driverData) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No driver data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Business Driver Discovery
        </h1>
        <p className="text-gray-600 mb-4">
          We analyzed {driverData.summary.monthsAnalyzed} months of your QuickBooks data and found{' '}
          <span className="font-semibold text-blue-600">{driverData.summary.driversFound} key drivers</span>{' '}
          that explain <span className="font-semibold">{driverData.summary.businessCoverage}%</span> of your business
        </p>
        
        {/* Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 What are Business Drivers?</h3>
          <p className="text-sm text-blue-800 mb-2">
            Business drivers are the specific revenue and expense items that have the biggest impact on your financial performance. 
            Instead of trying to forecast every line item, we focus on what matters most.
          </p>
          <div className="text-sm text-blue-700">
            <strong>Our systematic analysis considers:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><strong>Materiality:</strong> How big this item is relative to your business</li>
              <li><strong>Predictability:</strong> How well it follows trends (easier to forecast)</li>
              <li><strong>Variability:</strong> How much it changes month-to-month</li>
              <li><strong>Data Quality:</strong> How complete your historical data is</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{driverData.summary.driversFound}</div>
          <div className="text-sm text-blue-800">Drivers Found</div>
          <div className="text-xs text-blue-600 mt-1">
            Key financial items that significantly impact your business
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg group relative">
          <div className="text-2xl font-bold text-green-600">{driverData.summary.businessCoverage}%</div>
          <div className="text-sm text-green-800 flex items-center">
            Business Coverage
            <span className="ml-1 text-green-600 cursor-help" title="How much of your overall financial activity these drivers explain">ℹ️</span>
          </div>
          <div className="text-xs text-green-600 mt-1">
            {driverData.summary.businessCoverage >= 80 ? "Excellent coverage of your business" :
             driverData.summary.businessCoverage >= 60 ? "Good coverage of your business" :
             driverData.summary.businessCoverage >= 40 ? "Moderate coverage of your business" :
             "Limited coverage - more historical data needed"}
          </div>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-64 z-10">
            <strong>Business Coverage:</strong> Percentage of your overall financial activity explained by these drivers. 
            Calculated as the average of revenue coverage (how much of your income these revenue drivers represent) 
            and expense coverage (how much of your costs these expense drivers represent).
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg group relative">
          <div className="text-2xl font-bold text-purple-600">{driverData.summary.averageConfidence}%</div>
          <div className="text-sm text-purple-800 flex items-center">
            Avg Confidence
            <span className="ml-1 text-purple-600 cursor-help" title="How reliable our forecasting will be for these drivers">ℹ️</span>
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {driverData.summary.averageConfidence >= 70 ? "High forecasting confidence" :
             driverData.summary.averageConfidence >= 50 ? "Medium forecasting confidence" :
             "Lower forecasting confidence"}
          </div>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-64 z-10">
            <strong>Confidence:</strong> How reliable our forecasts will be for these drivers. 
            Based on predictability (how well they follow trends), data quality (completeness of historical data), 
            and variability (consistency over time). Higher confidence means more accurate forecasts.
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg group relative">
          <div className="text-2xl font-bold text-orange-600">{driverData.summary.dataQuality}</div>
          <div className="text-sm text-orange-800 flex items-center">
            Data Quality
            <span className="ml-1 text-orange-600 cursor-help" title="How complete your historical data is">ℹ️</span>
          </div>
          <div className="text-xs text-orange-600 mt-1">
            {driverData.summary.dataQuality === 'excellent' ? "Excellent historical data" :
             driverData.summary.dataQuality === 'good' ? "Good historical data" :
             driverData.summary.dataQuality === 'fair' ? "Adequate historical data" :
             "Limited historical data available"}
          </div>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-64 z-10">
            <strong>Data Quality:</strong> How complete your historical financial data is. 
            Based on how many months have actual transaction data vs empty periods. 
            Better data quality leads to more accurate driver discovery and forecasting.
          </div>
        </div>
      </div>

      {/* Primary Drivers */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 Primary Drivers</h2>
        <div className="space-y-4">
          {driverData.recommendations.primaryDrivers.map((driver, index) => (
            <DriverCard key={driver.name} driver={driver} rank={index + 1} />
          ))}
        </div>
      </div>

      {/* Secondary Drivers */}
      {driverData.recommendations.secondaryDrivers.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Secondary Drivers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {driverData.recommendations.secondaryDrivers.map((driver) => (
              <DriverCard key={driver.name} driver={driver} compact />
            ))}
          </div>
        </div>
      )}

      {/* Processing Info */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Analysis completed in {driverData.metadata.processingTimeMs}ms</span>
          <button 
            onClick={fetchDriverData}
            className="text-blue-600 hover:text-blue-800"
          >
            🔄 Refresh Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper functions for business-friendly display
function getBusinessFriendlyTrend(trend: string, growthRate: number): string {
  const annualGrowth = Math.abs(growthRate * 100);
  
  if (trend === 'growing') {
    if (annualGrowth > 20) return 'Growing fast';
    if (annualGrowth > 10) return 'Growing steadily';
    return 'Growing slowly';
  } else if (trend === 'declining') {
    if (annualGrowth > 20) return 'Declining fast';
    if (annualGrowth > 10) return 'Declining steadily';
    return 'Declining slowly';
  } else {
    return 'Staying steady';
  }
}

function getRevenueRelationship(correlation: number): string {
  const corr = Math.abs(correlation);
  
  if (corr > 0.8) return 'Very connected';
  if (corr > 0.6) return 'Somewhat connected';
  if (corr > 0.3) return 'Loosely connected';
  return 'Independent';
}

function DriverCard({ driver, rank, compact = false }: { 
  driver: DiscoveredDriver; 
  rank?: number; 
  compact?: boolean;
}) {
  const categoryColors = {
    revenue: 'bg-green-100 text-green-800',
    expense: 'bg-red-100 text-red-800',
    balance_sheet: 'bg-blue-100 text-blue-800'
  };

  const confidenceColors = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800'
  };

  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 truncate">{driver.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${categoryColors[driver.category]}`}>
            {driver.category}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Impact:</span>
            <span className="ml-1 font-medium">{driver.impactScore}/100</span>
          </div>
          <div>
            <span className="text-gray-600">Coverage:</span>
            <span className="ml-1 font-medium">{driver.coverage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {rank && (
            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              {rank}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{driver.name}</h3>
            <p className="text-sm text-gray-600">{driver.businessType}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-sm rounded-full ${categoryColors[driver.category]}`}>
            {driver.category}
          </span>
          <span className={`px-3 py-1 text-sm rounded-full ${confidenceColors[driver.confidence]}`}>
            {driver.confidence}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div className="text-center group relative">
          <div className="text-2xl font-bold text-blue-600">{driver.impactScore}</div>
          <div className="text-xs text-gray-600 cursor-help">Impact Score</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-48 z-10">
            <strong>Impact Score (0-100):</strong> Overall importance to your business. 
            Combines materiality, predictability, variability, and data quality.
          </div>
        </div>
        <div className="text-center group relative">
          <div className="text-2xl font-bold text-green-600">{driver.materiality}</div>
          <div className="text-xs text-gray-600 cursor-help">Materiality</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-48 z-10">
            <strong>Materiality (0-100):</strong> How big this driver is relative to your total business. 
            Higher = larger portion of revenue/expenses.
          </div>
        </div>
        <div className="text-center group relative">
          <div className="text-2xl font-bold text-purple-600">{driver.predictability}</div>
          <div className="text-xs text-gray-600 cursor-help">Predictability</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-48 z-10">
            <strong>Predictability (0-100):</strong> How well this driver follows clear trends. 
            Higher = easier to forecast accurately.
          </div>
        </div>
        <div className="text-center group relative">
          <div className="text-2xl font-bold text-orange-600">{driver.variability}</div>
          <div className="text-xs text-gray-600 cursor-help">Variability</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-48 z-10">
            <strong>Variability (0-100):</strong> How much this driver changes month-to-month. 
            Higher = more volatile, harder to predict.
          </div>
        </div>
        <div className="text-center group relative">
          <div className="text-2xl font-bold text-indigo-600">{driver.coverage.toFixed(1)}%</div>
          <div className="text-xs text-gray-600 cursor-help">Coverage</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-48 z-10">
            <strong>Coverage:</strong> What percentage of your {driver.category} this driver represents. 
            Shows its relative size within revenue or expenses.
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span className="group relative cursor-help">
          Pattern: <span className="font-medium">{getBusinessFriendlyTrend(driver.trend, driver.growthRate)}</span>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-48 z-10">
            How this driver has been changing over time based on your historical data
          </div>
        </span>
        <span className="group relative cursor-help">
          Avg Monthly: <span className="font-medium">${Math.round(driver.monthlyValues.reduce((sum: number, val: number) => sum + val, 0) / driver.monthlyValues.length).toLocaleString()}</span>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-48 z-10">
            Average monthly value for this driver over your historical period
          </div>
        </span>
        <span className="group relative cursor-help">
          Follows Revenue: <span className="font-medium">{getRevenueRelationship(driver.correlationWithRevenue)}</span>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-48 z-10">
            How closely this driver moves up and down with your revenue changes
          </div>
        </span>
      </div>
    </div>
  );
}