import type { ApexOptions } from 'apexcharts';

export type DashboardPeriod = 'week' | 'month' | 'quarter';

export const dashboardKpis = {
  week: [
    { label: 'Catalog Items', value: '1,248', change: 4.2, color: 'blue', icon: 'ri-box-3-line', spark: [820, 910, 880, 960, 1020, 1100, 1248] },
    { label: 'Categories', value: '86', change: 1.8, color: 'purple', icon: 'ri-folder-3-line', spark: [78, 80, 81, 83, 84, 85, 86] },
    { label: 'Style Codes', value: '542', change: 6.4, color: 'amber', icon: 'ri-price-tag-3-line', spark: [480, 495, 510, 518, 525, 534, 542] },
    { label: 'Raw Materials', value: '318', change: 3.1, color: 'green', icon: 'ri-stack-line', spark: [290, 296, 301, 305, 309, 314, 318] },
  ],
  month: [
    { label: 'Catalog Items', value: '1,248', change: 12.4, color: 'blue', icon: 'ri-box-3-line', spark: [620, 740, 810, 890, 980, 1120, 1248] },
    { label: 'Categories', value: '86', change: 3.2, color: 'purple', icon: 'ri-folder-3-line', spark: [72, 74, 76, 79, 81, 84, 86] },
    { label: 'Style Codes', value: '542', change: 8.1, color: 'amber', icon: 'ri-price-tag-3-line', spark: [420, 455, 478, 498, 512, 528, 542] },
    { label: 'Raw Materials', value: '318', change: 5.6, color: 'green', icon: 'ri-stack-line', spark: [250, 265, 278, 289, 298, 308, 318] },
  ],
  quarter: [
    { label: 'Catalog Items', value: '1,248', change: 18.9, color: 'blue', icon: 'ri-box-3-line', spark: [420, 560, 720, 880, 980, 1140, 1248] },
    { label: 'Categories', value: '86', change: 9.4, color: 'purple', icon: 'ri-folder-3-line', spark: [58, 62, 68, 72, 77, 82, 86] },
    { label: 'Style Codes', value: '542', change: 14.2, color: 'amber', icon: 'ri-price-tag-3-line', spark: [310, 360, 410, 450, 480, 512, 542] },
    { label: 'Raw Materials', value: '318', change: 11.3, color: 'green', icon: 'ri-stack-line', spark: [210, 235, 255, 272, 288, 304, 318] },
  ],
} as const;

export const monthlyCatalogTrend = {
  week: {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    itemsAdded: [18, 24, 21, 28, 32, 14, 12],
    updates: [42, 38, 45, 51, 48, 22, 19],
    imports: [6, 8, 5, 11, 9, 3, 2],
  },
  month: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    itemsAdded: [86, 92, 104, 118, 126, 142],
    updates: [210, 198, 225, 248, 236, 262],
    imports: [24, 28, 31, 36, 34, 39],
  },
  quarter: {
    categories: ['Q1 W1', 'Q1 W2', 'Q1 W3', 'Q2 W1', 'Q2 W2', 'Q2 W3'],
    itemsAdded: [220, 248, 265, 290, 312, 338],
    updates: [540, 580, 610, 640, 680, 720],
    imports: [68, 74, 79, 86, 92, 98],
  },
};

export const itemsByCategory = {
  labels: ['Handkerchiefs', 'Premium Cotton', 'Gift Sets', 'Embroidered', 'Plain Weave', 'Others'],
  series: [420, 286, 164, 132, 118, 128],
};

export const moduleActivity = {
  categories: ['Items', 'Categories', 'Raw Material', 'Processes', 'Attributes', 'Style Codes'],
  creates: [142, 18, 36, 24, 28, 64],
  updates: [262, 42, 58, 48, 52, 88],
};

export const styleCodeStatus = {
  labels: ['Active', 'Inactive', 'Draft'],
  // Radial bar expects percentage values (0–100), not raw counts.
  series: [86, 10, 4],
};

export const processUsage = {
  categories: ['Knitting', 'Dyeing', 'Cutting', 'Embroidery', 'Packing', 'QC'],
  values: [88, 72, 64, 58, 92, 76],
};

export const recentActivity = [
  { module: 'Items', action: 'Bulk import completed', user: 'Admin', time: '12 min ago', status: 'success' },
  { module: 'Style Codes', action: '12 style codes updated', user: 'Catalog Team', time: '34 min ago', status: 'success' },
  { module: 'Categories', action: 'New category added', user: 'Admin', time: '1 hr ago', status: 'info' },
  { module: 'Raw Material', action: 'Export downloaded', user: 'Production', time: '2 hr ago', status: 'neutral' },
  { module: 'Attributes', action: 'Attribute values synced', user: 'Admin', time: '3 hr ago', status: 'success' },
  { module: 'Processes', action: 'Process sequence edited', user: 'Catalog Team', time: '5 hr ago', status: 'warning' },
];

export const sparklineOptions = (color: string): ApexOptions => ({
  chart: {
    type: 'line',
    width: 72,
    height: 32,
    sparkline: { enabled: true },
    animations: { enabled: true, speed: 600 },
    events: {
      mounted: (chart) => {
        chart.windowResizeHandler();
      },
    },
  },
  stroke: { curve: 'smooth', width: 2 },
  colors: [color],
  tooltip: { enabled: false },
});

const chartMountedEvent = {
  mounted: (chart: { windowResizeHandler: () => void }) => {
    chart.windowResizeHandler();
  },
};

export const baseChartAnimations: ApexOptions = {
  chart: {
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 800,
      animateGradually: { enabled: true, delay: 120 },
      dynamicAnimation: { enabled: true, speed: 350 },
    },
    toolbar: { show: false },
    background: 'transparent',
    events: chartMountedEvent,
  },
};

export const colorMap = {
  blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-600', spark: '#2563eb' },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-600', spark: '#7c3aed' },
  amber: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', spark: '#d97706' },
  green: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-700', spark: '#059669' },
};
