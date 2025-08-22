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
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  CurrencyDollarIcon, 
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

export function ForecastDashboard({ className = '', forecastPeriod = '13weeks' }: ForecastDashboardProps) {
  const [forecast, setForecast] = useState<BaseForecast | AdjustedForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<DriverAdjustment[]>([]);
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

  const handleDriverAdjustment = async (driverId: string, impactPercent: number) => {
    console.log('🎛️ handleDriverAdjustment called:', { driverId, impactPercent });
    if (!forecast) return;
    
    try {
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
      
      setAdjustments(newAdjustments);
      
      // Apply adjustments to forecast
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
        // No adjustments - reload base forecast
        loadForecast();
      }
      
    } catch (err) {
      console.error('❌ Error applying adjustment:', err);
    }
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

      {/* Main Content Area with Sidebar */}
      <div className="flex gap-6 h-full">
        {/* Main Content */}
        <div className="flex-1 space-y-6 transition-all duration-300">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {keyMetrics.map((metric, index) => (
              <MetricCard key={index} metric={metric} />
            ))}
          </div>

          {/* Main Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Financial Projections</h2>
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
        </div>

        {/* Collapsible Sidebar */}
        <div className="w-96 transition-all duration-300 overflow-visible">
          <div className="bg-white border border-gray-200 rounded-lg h-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Driver Controls</h2>
              <p className="text-sm text-gray-600 mt-1">Adjust drivers to see impact on forecast</p>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto overflow-x-visible h-full">
              {/* Revenue Drivers */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Revenue Drivers</h3>
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
              </div>

              {/* Expense Drivers */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Expense Drivers</h3>
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {forecast.summary.keyInsights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center space-x-2">
            <InformationCircleIcon className="h-6 w-6" />
            <span>Key Insights</span>
          </h2>
          <ul className="space-y-2">
            {forecast.summary.keyInsights.map((insight, index) => (
              <li key={index} className="flex items-start space-x-2 text-blue-800">
                <span className="text-blue-600 mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
    if (newValue !== sliderValue) {
      setSliderValue(newValue);
    }
  }, [adjustment, sliderValue]);

  const currentValue = driver.monthlyValues[0] || 0;
  const adjustedValue = currentValue * (1 + sliderValue / 100);

  const handleSliderChange = (value: number) => {
    console.log('🎚️ Slider changed:', { driverName: driver.name, oldValue: sliderValue, newValue: value });
    setSliderValue(value);
    onAdjustment(value);
  };

  if (compact) {
    return (
      <div className="border border-gray-200 rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">{driver.name}</h4>
            <p className="text-xs text-gray-500">
              ${Math.round(currentValue).toLocaleString()}/mo
              {sliderValue !== 0 && (
                <span className="ml-1 text-xs">
                  → ${Math.round(adjustedValue).toLocaleString()}
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
            Current: ${currentValue.toLocaleString()}/mo
            {sliderValue !== 0 && (
              <span className="ml-2">
                → ${adjustedValue.toLocaleString()}/mo
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