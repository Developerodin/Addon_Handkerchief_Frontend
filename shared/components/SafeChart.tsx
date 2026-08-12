'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart error boundary caught error:', error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

interface SafeChartProps {
  options: Record<string, unknown>;
  series: unknown;
  type: string;
  height?: number | string;
  width?: number | string;
  chartTitle?: string;
  fallbackMessage?: string;
}

const SafeChart: React.FC<SafeChartProps> = ({
  options,
  series,
  type,
  height = 350,
  width = '100%',
  chartTitle = 'Chart',
  fallbackMessage = 'Chart data unavailable',
}) => {
  const [hasError, setHasError] = useState(false);
  const [safeOptions, setSafeOptions] = useState<Record<string, unknown> | null>(null);
  const [safeSeries, setSafeSeries] = useState<unknown>(null);

  const sanitizeData = (data: unknown): unknown => {
    if (!data) return [];

    if (Array.isArray(data)) {
      return data.map((item) => {
        if (typeof item === 'number') {
          return Number.isNaN(item) || !Number.isFinite(item) ? 0 : item;
        }
        if (typeof item === 'string') {
          return item || 'Unknown';
        }
        if (typeof item === 'object' && item !== null) {
          const sanitized: Record<string, unknown> = {};
          Object.keys(item as Record<string, unknown>).forEach((key) => {
            const value = (item as Record<string, unknown>)[key];
            if (value === undefined || value === null) {
              sanitized[key] = 0;
            } else if (typeof value === 'number' && (Number.isNaN(value) || !Number.isFinite(value))) {
              sanitized[key] = 0;
            } else if (typeof value === 'string' && value.trim() === '') {
              sanitized[key] = 'Unknown';
            } else {
              sanitized[key] = value;
            }
          });
          return sanitized;
        }
        return item;
      });
    }

    return data;
  };

  const sanitizeOptions = (opts: Record<string, unknown> | null | undefined): Record<string, unknown> => {
    if (!opts) {
      return {
        chart: { type, height, toolbar: { show: false } },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#6b7280'],
        grid: { borderColor: '#f1f1f1', strokeDashArray: 3 },
      };
    }

    const sanitized = { ...opts };

    if (!sanitized.chart) {
      sanitized.chart = { type, height, toolbar: { show: false } };
    }

    if (type !== 'donut' && type !== 'pie') {
      if (!sanitized.xaxis) sanitized.xaxis = { categories: ['No Data'] };
      if (!sanitized.yaxis) sanitized.yaxis = { title: { text: 'No Data Available' } };
    }

    const chart = sanitized.chart as Record<string, unknown>;
    if (chart.images) delete chart.images;
    if (!chart.type) chart.type = type;
    if (!chart.height) chart.height = height;

    const xaxis = sanitized.xaxis as { categories?: unknown[] } | undefined;
    if (xaxis?.categories) {
      xaxis.categories = xaxis.categories.map((cat) =>
        cat === undefined || cat === null ? 'Unknown' : String(cat)
      );
    }

    if (sanitized.labels && Array.isArray(sanitized.labels)) {
      sanitized.labels = sanitized.labels.map((label) =>
        label === undefined || label === null ? 'Unknown' : String(label)
      );
    }

    if ((type === 'donut' || type === 'pie') && !sanitized.labels) {
      sanitized.labels = ['No Data'];
    }

    return sanitized;
  };

  const sanitizeSeries = (seriesData: unknown): unknown => {
    if (!seriesData) {
      return type === 'donut' || type === 'pie' ? [0] : [{ name: 'No Data', data: [0] }];
    }

    if (type === 'donut' || type === 'pie') {
      if (Array.isArray(seriesData)) {
        const cleanData = seriesData.map((item) => (Array.isArray(item) ? sanitizeData(item) : sanitizeData(item)));
        return cleanData.length > 0 ? cleanData : [0];
      }
      return [0];
    }

    if (Array.isArray(seriesData)) {
      return seriesData.map((s) => {
        if (!s || typeof s !== 'object') {
          return { name: 'Unknown', data: [0] };
        }
        const row = s as { name?: string; data?: unknown[] };
        return {
          name: row.name || 'Unknown',
          data: sanitizeData(row.data || [0]),
        };
      });
    }

    return [{ name: 'No Data', data: [0] }];
  };

  useEffect(() => {
    try {
      setHasError(false);
      setSafeSeries(sanitizeSeries(series));
      setSafeOptions(sanitizeOptions(options as Record<string, unknown>));
    } catch (error) {
      console.error(`Error sanitizing chart data for ${chartTitle}:`, error);
      setHasError(true);
    }
  }, [options, series, chartTitle, height, type]);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      if (
        error.message &&
        (error.message.includes('toString') ||
          error.message.includes('apexcharts') ||
          error.message.includes('Cannot read properties of undefined') ||
          error.message.includes('images'))
      ) {
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [chartTitle]);

  if (hasError) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
        <div className="text-center">
          <i className="ri-error-warning-line mb-2 text-4xl" aria-hidden />
          <p className="font-medium">{fallbackMessage}</p>
          <p className="text-sm text-gray-500">{chartTitle}</p>
        </div>
      </div>
    );
  }

  if (!safeOptions || !safeSeries) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-400" />
          <p>Loading chart...</p>
        </div>
      </div>
    );
  }

  return (
    <ChartErrorBoundary
      onError={() => {
        setHasError(true);
      }}
    >
      <div className="chart-container">
        <ReactApexChart
          options={safeOptions}
          series={safeSeries}
          type={type}
          height={height}
          width={width}
        />
      </div>
    </ChartErrorBoundary>
  );
};

export default SafeChart;
