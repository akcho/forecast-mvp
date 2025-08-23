'use client';

/**
 * ForecastDashboard - Main component for driver-based financial forecasting
 * Implements the UI design from FORECAST_DESIGN.md
 */

import { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { 
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { 
  BaseForecast, 
  AdjustedForecast, 
  DriverAdjustment, 
  ProjectedDriver,
  KeyMetricCard,
  ForecastResponse 
} from '@/types/forecastTypes';
import { LoadingState } from './LoadingSpinner';

interface ForecastDashboardProps {
  className?: string;
  forecastPeriod?: string;
}

export function ForecastDashboard({ className = '' }: ForecastDashboardProps) {
  const [forecast, setForecast] = useState<BaseForecast | AdjustedForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false); // Separate state for slider updates
  const [error, setError] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<DriverAdjustment[]>([]);
  const [activeTab, setActiveTab] = useState<'revenue' | 'expense' | 'external'>('revenue');
  // Driver controls are always visible - no toggle needed
  
  // Load initial forecast
  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/quickbooks/generate-forecast');
      const data: ForecastResponse = await response.json();
      
      if (!data.success || !data.forecast) {
        throw new Error(data.error || 'Failed to load forecast');
      }
      
      setForecast(data.forecast);
      console.log('✅ Forecast loaded:', data.forecast.summary);
      
    } catch (err) {
      console.error('❌ Error loading forecast:', err);
      setError(err instanceof Error ? err.message : 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  };

  const updateForecast = async (newAdjustments: DriverAdjustment[]) => {
    try {
      setUpdating(true);
      
      if (newAdjustments.length > 0) {
        const response = await fetch('/api/quickbooks/generate-forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adjustments: newAdjustments })
        });
        
        const data: ForecastResponse = await response.json();
        if (data.success && data.forecast) {
          setForecast(data.forecast);
        }
      } else {
        // No adjustments - get base forecast without setting loading state
        const response = await fetch('/api/quickbooks/generate-forecast');
        const data: ForecastResponse = await response.json();
        if (data.success && data.forecast) {
          setForecast(data.forecast);
        }
      }
    } catch (err) {
      console.error('❌ Error updating forecast:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDriverAdjustment = (driverId: string, impactPercent: number) => {
    console.log('🎛️ handleDriverAdjustment called:', { driverId, impactPercent });
    if (!forecast) return;
    
    // Create or update adjustment for this driver
    const existingAdjustmentIndex = adjustments.findIndex(adj => adj.driverId === driverId);
    let newAdjustments = [...adjustments];
    
    if (impactPercent === 0) {
      // Remove adjustment if impact is 0
      if (existingAdjustmentIndex !== -1) {
        newAdjustments.splice(existingAdjustmentIndex, 1);
      }
    } else {
      // Use June 2025 as forecast start date to match DriverForecastService
      const forecastStartDate = new Date('2025-06-01');
      
      const adjustment: DriverAdjustment = {
        id: `adj_${driverId}_${Date.now()}`,
        driverId,
        label: `Manual adjustment`,
        impact: impactPercent / 100, // Convert percentage to decimal
        startDate: forecastStartDate, // Start from forecast beginning
        createdBy: 'user',
        createdAt: new Date(),
        modifiedAt: new Date()
      };
      
      if (existingAdjustmentIndex !== -1) {
        newAdjustments[existingAdjustmentIndex] = adjustment;
      } else {
        newAdjustments.push(adjustment);
      }
    }
    
    // Update adjustments immediately for UI responsiveness
    setAdjustments(newAdjustments);
    
    // Update forecast immediately since this is now called only on pointer up
    updateForecast(newAdjustments);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingState type="general" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <div>
            <h3 className="font-medium text-red-800">Unable to Load Forecast</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button 
              onClick={loadForecast}
              className="mt-3 text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No forecast data available</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = forecast.monthlyProjections.map(projection => ({
    month: projection.month,
    revenue: projection.totalRevenue,
    expenses: Math.abs(projection.totalExpenses),
    netIncome: projection.netIncome,
    confidenceLow: projection.confidenceBand.low,
    confidenceHigh: projection.confidenceBand.high
  }));

  // Calculate key metrics
  const keyMetrics: KeyMetricCard[] = [
    {
      label: 'Total Revenue',
      value: forecast.summary.totalProjectedRevenue,
      format: 'currency' as const,
      trend: {
        direction: 'up' as const,
        value: 12.5,
        period: '13 weeks'
      },
      confidence: forecast.confidence.overall
    },
    {
      label: 'Net Income',
      value: forecast.summary.totalNetIncome,
      format: 'currency' as const,
      trend: {
        direction: forecast.summary.totalNetIncome > 0 ? 'up' : 'down',
        value: Math.abs(forecast.summary.totalNetIncome),
        period: '13 weeks'
      },
      confidence: forecast.confidence.overall
    },
    {
      label: 'Cash Runway',
      value: forecast.summary.projectedRunwayMonths,
      format: 'months' as const,
      confidence: forecast.confidence.overall
    },
    {
      label: 'Break-even',
      value: forecast.summary.breakEvenMonth || 0,
      format: 'months' as const,
      confidence: forecast.confidence.overall
    }
  ];

  return (
    <div className={`h-full ${className}`}>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Key Insights - Top Priority */}
        {forecast.insights && (
          <EnhancedInsightsPanel insights={forecast.insights} />
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {keyMetrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>

        {/* Chart and Controls Side by Side */}
        <div className="flex gap-6 h-full">
          {/* Main Chart */}
          <div className="flex-1 bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-gray-900">Financial Projections</h2>
                {updating && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Updating...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Revenue</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Expenses</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Net Income</span>
                </div>
              </div>
            </div>
            
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, '']} />
                  <Legend />
                  
                  {/* Main lines */}
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={false}
                    name="Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    dot={false}
                    name="Expenses"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="netIncome" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={false}
                    name="Net Income"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Driver Controls Sidebar - Aligned with Chart */}
          <div className="w-96 transition-all duration-300 overflow-visible">
            <div className="bg-white border border-gray-200 rounded-lg h-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Driver Controls</h2>
                <p className="text-sm text-gray-600 mt-1">Adjust drivers to see impact on forecast</p>
              </div>
              
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('revenue')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'revenue'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setActiveTab('expense')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'expense'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Expenses
                  </button>
                  <button
                    onClick={() => setActiveTab('external')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'external'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    External
                  </button>
                </nav>
              </div>
              
              {/* Tab Content */}
              <div className="p-6 overflow-y-auto overflow-x-visible h-full">
                {activeTab === 'revenue' && (
                  <div className="space-y-3">
                    {forecast.drivers
                      .filter(driver => driver.category === 'revenue')
                      .map(driver => (
                        <DriverControl
                          key={driver.name}
                          driver={driver}
                          adjustment={adjustments.find(adj => adj.driverId === driver.name)}
                          onAdjustment={(impactPercent) => handleDriverAdjustment(driver.name, impactPercent)}
                          compact={true}
                        />
                      ))
                    }
                  </div>
                )}
                
                {activeTab === 'expense' && (
                  <div className="space-y-3">
                    {forecast.drivers
                      .filter(driver => driver.category === 'expense')
                      .map(driver => (
                        <DriverControl
                          key={driver.name}
                          driver={driver}
                          adjustment={adjustments.find(adj => adj.driverId === driver.name)}
                          onAdjustment={(impactPercent) => handleDriverAdjustment(driver.name, impactPercent)}
                          compact={true}
                        />
                      ))
                    }
                  </div>
                )}
                
                {activeTab === 'external' && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">External Factors</p>
                    <p className="text-sm mt-2">Coming soon - market conditions, economic indicators, and external drivers</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// Enhanced Insights Panel with color-coded categories
function EnhancedInsightsPanel({ insights }: { insights: any }) {
  const { critical, summary } = insights;
  
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'opportunity': return <ArrowTrendingUpIcon className="h-5 w-5" />;
      case 'success': return <InformationCircleIcon className="h-5 w-5" />;
      default: return <InformationCircleIcon className="h-5 w-5" />;
    }
  };
  
  const getInsightColors = (type: string, priority: string) => {
    if (type === 'warning' && priority === 'high') {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-900',
        icon: 'text-red-600'
      };
    } else if (type === 'warning') {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200', 
        text: 'text-orange-900',
        icon: 'text-orange-600'
      };
    } else if (type === 'opportunity') {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900', 
        icon: 'text-green-600'
      };
    } else {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        icon: 'text-blue-600'
      };
    }
  };

  if (!insights.all || insights.all.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
          <InformationCircleIcon className="h-6 w-6 text-gray-600" />
          <span>Key Insights</span>
        </h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="relative group cursor-help">
            <span className="flex items-center space-x-1">
              <span className={`w-3 h-3 rounded-full ${
                summary.dataQualityScore >= 80 ? 'bg-green-500' :
                summary.dataQualityScore >= 60 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></span>
              <span>Data Quality: {summary.dataQualityScore}%</span>
            </span>
            
            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 w-80 p-4 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="space-y-3">
                <div>
                  <div className="font-semibold text-white mb-1">Data Quality Score</div>
                  <p className="text-gray-300">Measures completeness and reliability of your financial data for accurate forecasting.</p>
                </div>
                
                <div className="border-t border-gray-700 pt-2">
                  <div className="font-semibold text-white mb-1">Score Guide:</div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-gray-300">80-100%: Excellent - High confidence forecasts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      <span className="text-gray-300">60-79%: Good - Reliable with minor gaps</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span className="text-gray-300">Below 60%: Needs improvement</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-700 pt-2">
                  <div className="font-semibold text-white mb-1">How to Improve:</div>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Ensure consistent monthly data entry</li>
                    <li>• Fill gaps in historical transactions</li>
                    <li>• Categorize expenses properly in QuickBooks</li>
                    <li>• Record all revenue sources completely</li>
                    <li>• Maintain regular bookkeeping schedule</li>
                  </ul>
                </div>
              </div>
              
              {/* Tooltip arrow */}
              <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Critical Insights First */}
        {critical.map((insight: any) => {
          const colors = getInsightColors(insight.type, insight.priority);
          return (
            <div
              key={insight.id}
              className={`${colors.bg} ${colors.border} border rounded-lg p-4`}
            >
              <div className="flex items-start space-x-3">
                <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className={`font-semibold ${colors.text}`}>
                      {insight.title}
                    </h3>
                    {insight.priority === 'high' && (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        HIGH PRIORITY
                      </span>
                    )}
                  </div>
                  <p className={`${colors.text} text-sm mb-2`}>
                    {insight.message}
                  </p>
                  {insight.detail && (
                    <p className={`${colors.text.replace('900', '700')} text-xs mb-2`}>
                      {insight.detail}
                    </p>
                  )}
                  {insight.action && (
                    <div className={`${colors.bg.replace('50', '100')} rounded-md p-2 mt-2`}>
                      <p className={`${colors.text} text-xs font-medium`}>
                        💡 Recommended Action: {insight.action}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Other Important Insights */}
        {insights.all.filter((i: any) => i.priority !== 'high' || i.type !== 'warning').slice(0, 3).map((insight: any) => {
          const colors = getInsightColors(insight.type, insight.priority);
          return (
            <div
              key={insight.id}
              className={`${colors.bg} ${colors.border} border rounded-lg p-3`}
            >
              <div className="flex items-start space-x-3">
                <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${colors.text} text-sm`}>
                    {insight.title}
                  </h4>
                  <p className={`${colors.text} text-xs mt-1`}>
                    {insight.message}
                  </p>
                  {insight.action && (
                    <p className={`${colors.text.replace('900', '600')} text-xs mt-1 font-medium`}>
                      → {insight.action}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Component for individual metric cards
function MetricCard({ metric }: { metric: KeyMetricCard }) {
  const formatValue = (value: number, format: KeyMetricCard['format']) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'months':
        return `${value} months`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{metric.label}</h3>
      </div>
      
      <div className="mt-2">
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(metric.value, metric.format)}
        </div>
        
        {metric.trend && (
          <div className="flex items-center mt-2 text-sm">
            {metric.trend.direction === 'up' ? (
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-500 mr-2" />
            ) : metric.trend.direction === 'down' ? (
              <ArrowTrendingDownIcon className="h-5 w-5 text-red-500 mr-2" />
            ) : (
              <ClockIcon className="h-5 w-5 text-gray-500 mr-2" />
            )}
            <span className={
              metric.trend.direction === 'up' ? 'text-green-600' :
              metric.trend.direction === 'down' ? 'text-red-600' :
              'text-gray-600'
            }>
              {formatValue(metric.trend.value, metric.format)} over {metric.trend.period}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for driver adjustment controls
function DriverControl({ 
  driver, 
  adjustment, 
  onAdjustment,
  compact = false
}: { 
  driver: ProjectedDriver;
  adjustment?: DriverAdjustment;
  onAdjustment: (impactPercent: number) => void;
  compact?: boolean;
}) {
  const [sliderValue, setSliderValue] = useState(
    adjustment ? Math.round(adjustment.impact * 100) : 0
  );
  
  // Sync slider value with adjustment prop changes
  useEffect(() => {
    const newValue = adjustment ? Math.round(adjustment.impact * 100) : 0;
    setSliderValue(newValue);
  }, [adjustment]);

  const currentValue = driver.monthlyValues[0] || 0;
  
  // For contra-revenue accounts (negative values under revenue), invert slider behavior
  const isContraRevenue = driver.category === 'revenue' && currentValue < 0;
  const adjustmentMultiplier = isContraRevenue ? (1 - sliderValue / 100) : (1 + sliderValue / 100);
  const adjustedValue = currentValue * adjustmentMultiplier;

  const handleSliderChange = (value: number) => {
    console.log('🎚️ Slider changed:', { driverName: driver.name, oldValue: sliderValue, newValue: value });
    setSliderValue(value);
    // Don't trigger adjustment on every change - only on mouse/touch up
  };

  const handleSliderFinished = (value: number) => {
    console.log('🎯 Slider finished:', { driverName: driver.name, finalValue: value });
    onAdjustment(value);
  };

  if (compact) {
    return (
      <div className="border border-gray-200 rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">{driver.name}</h4>
            <p className="text-xs text-gray-500">
              {isContraRevenue 
                ? `$${Math.round(Math.abs(currentValue)).toLocaleString()}/mo discount`
                : `$${Math.round(currentValue).toLocaleString()}/mo`
              }
              {sliderValue !== 0 && (
                <span className="ml-1 text-xs">
                  → {isContraRevenue 
                      ? `$${Math.round(Math.abs(adjustedValue)).toLocaleString()}/mo discount`
                      : `$${Math.round(adjustedValue).toLocaleString()}`
                    }
                  {isContraRevenue && (
                    <span className={`ml-1 text-xs ${adjustedValue > currentValue ? 'text-red-600' : 'text-green-600'}`}>
                      ({Math.abs(adjustedValue) > Math.abs(currentValue) ? 'worse for revenue' : 'better for revenue'})
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          <div className="relative group">
            <div className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-help ${
              driver.confidence === 'high' ? 'bg-green-100 text-green-800' :
              driver.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {driver.confidence === 'high' ? 'H' : driver.confidence === 'medium' ? 'M' : 'L'}
            </div>
            <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              {driver.confidence === 'high' ? 'High - Very reliable data' :
               driver.confidence === 'medium' ? 'Medium - Moderately reliable data' :
               'Low - Limited or inconsistent data'}
              <div className="absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 w-8">-50%</span>
          <div className="flex-1">
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={sliderValue}
              onChange={(e) => handleSliderChange(parseInt(e.target.value))}
              onMouseUp={(e) => handleSliderFinished(parseInt((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => handleSliderFinished(parseInt((e.target as HTMLInputElement).value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <span className="text-xs text-gray-500 w-8">+50%</span>
          <div className="w-10 text-right">
            <span className={`text-xs font-medium ${
              sliderValue > 0 ? 'text-green-600' :
              sliderValue < 0 ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {sliderValue > 0 ? '+' : ''}{sliderValue}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{driver.name}</h4>
          <p className="text-sm text-gray-500">
            Current: {isContraRevenue 
              ? `$${Math.abs(currentValue).toLocaleString()}/mo discount`
              : `$${currentValue.toLocaleString()}/mo`
            }
            {sliderValue !== 0 && (
              <span className="ml-2">
                → {isContraRevenue 
                    ? `$${Math.abs(adjustedValue).toLocaleString()}/mo discount`
                    : `$${adjustedValue.toLocaleString()}/mo`
                  }
              </span>
            )}
          </p>
        </div>
        
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          driver.confidence === 'high' ? 'bg-green-100 text-green-800' :
          driver.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {driver.confidence.toUpperCase()}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500 w-12">-50%</span>
        
        <div className="flex-1">
          <input
            type="range"
            min="-50"
            max="50"
            step="5"
            value={sliderValue}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            onMouseUp={(e) => handleSliderFinished(parseInt((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleSliderFinished(parseInt((e.target as HTMLInputElement).value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <span className="text-sm text-gray-500 w-12">+50%</span>
        
        <div className="w-16 text-right">
          <span className={`text-sm font-medium ${
            sliderValue > 0 ? 'text-green-600' :
            sliderValue < 0 ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {sliderValue > 0 ? '+' : ''}{sliderValue}%
          </span>
        </div>
      </div>
    </div>
  );
}