"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  baseChartAnimations,
  colorMap,
  dashboardKpis,
  itemsByCategory,
  moduleActivity,
  monthlyCatalogTrend,
  processUsage,
  recentActivity,
  sparklineOptions,
  styleCodeStatus,
  type DashboardPeriod,
} from "@/shared/data/dashboards/handkerchiefDashboardData";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function HandkerchiefDashboardContent() {
  const [period, setPeriod] = useState<DashboardPeriod>("month");

  const kpis = dashboardKpis[period];
  const trend = monthlyCatalogTrend[period];

  const monthlyOptions = useMemo(
    () => ({
      ...baseChartAnimations,
      chart: {
        ...baseChartAnimations.chart,
        type: "bar" as const,
        height: 280,
        stacked: false,
        dropShadow: { enabled: true, color: "#000", top: 8, left: 4, blur: 8, opacity: 0.12 },
      },
      plotOptions: {
        bar: { horizontal: false, columnWidth: "52%", borderRadius: 6 },
      },
      colors: ["#7c3aed", "#10b981", "#f59e0b"],
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#e2e8f0",
        strokeDashArray: 4,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } },
      },
      xaxis: {
        categories: trend.categories,
        labels: { style: { colors: "#64748b", fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: "#64748b", fontSize: "11px" } },
      },
      legend: {
        position: "top" as const,
        horizontalAlign: "right" as const,
        fontSize: "11px",
        markers: { radius: 4, width: 10, height: 10 },
      },
      tooltip: { theme: "dark", style: { fontSize: "12px" } },
      fill: {
        opacity: 0.92,
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.15,
          opacityFrom: 0.95,
          opacityTo: 0.75,
          stops: [0, 100],
        },
      },
    }),
    [trend.categories]
  );

  const categoryDonutOptions = useMemo(
    () => ({
      ...baseChartAnimations,
      chart: { ...baseChartAnimations.chart, type: "donut" as const, height: 260 },
      labels: itemsByCategory.labels,
      colors: ["#7c3aed", "#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#94a3b8"],
      legend: { position: "bottom" as const, fontSize: "11px" },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: "62%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total Items",
                fontSize: "11px",
                color: "#64748b",
                formatter: () => "1,248",
              },
            },
          },
        },
      },
    }),
    []
  );

  const moduleBarOptions = useMemo(
    () => ({
      ...baseChartAnimations,
      chart: { ...baseChartAnimations.chart, type: "bar" as const, height: 280, stacked: true },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "58%" } },
      colors: ["#7c3aed", "#a78bfa"],
      xaxis: {
        categories: moduleActivity.categories,
        labels: { style: { colors: "#64748b", fontSize: "11px" } },
      },
      grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
      legend: { position: "top" as const, horizontalAlign: "right" as const, fontSize: "11px" },
      tooltip: { theme: "dark" },
    }),
    []
  );

  const processAreaOptions = useMemo(
    () => ({
      ...baseChartAnimations,
      chart: { ...baseChartAnimations.chart, type: "area" as const, height: 260 },
      stroke: { curve: "smooth" as const, width: 2 },
      colors: ["#7c3aed"],
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 0.4,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: processUsage.categories,
        labels: { style: { colors: "#64748b", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#64748b", fontSize: "11px" } } },
      grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
      tooltip: { theme: "dark" },
    }),
    []
  );

  const styleRadialOptions = useMemo(
    () => ({
      ...baseChartAnimations,
      chart: { ...baseChartAnimations.chart, type: "radialBar" as const, height: 260 },
      labels: styleCodeStatus.labels,
      colors: ["#10b981", "#ef4444", "#94a3b8"],
      plotOptions: {
        radialBar: {
          hollow: { size: "42%" },
          dataLabels: {
            name: { fontSize: "12px" },
            value: { fontSize: "16px", fontWeight: "700" },
            total: {
              show: true,
              label: "Style Codes",
              formatter: () => "542",
            },
          },
        },
      },
    }),
    []
  );

  return (
    <div className="main-content !p-[10px]">
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <div>
              <h1 className="text-sm font-bold text-gray-800">Handkerchief Admin</h1>
              <p className="text-[10px] text-gray-500">Master catalog overview & activity</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-gray-600">Period:</span>
            {(["week", "month", "quarter"] as DashboardPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all min-w-[60px] ${
                  period === p
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <Link
              href="/catalog/items"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors"
            >
              <i className="ri-external-link-line text-sm" />
              Open Catalog
            </Link>
          </div>
        </div>

        <div className="p-[10px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {kpis.map((kpi) => {
              const palette = colorMap[kpi.color as keyof typeof colorMap];
              return (
                <div
                  key={kpi.label}
                  className={`flex items-center justify-between p-3 rounded border-l-4 ${palette.border} ${palette.bg} border border-gray-100`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      {kpi.label}
                    </p>
                    <p className={`text-sm font-bold truncate ${palette.text}`}>{kpi.value}</p>
                    <p className={`text-[10px] ${kpi.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatPct(kpi.change)} vs last {period}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${palette.bg} ${palette.text}`}>
                      <i className={`${kpi.icon} text-base`} />
                    </span>
                    <ReactApexChart
                      options={sparklineOptions(palette.spark)}
                      series={[{ data: [...kpi.spark] }]}
                      type="line"
                      height={32}
                      width={72}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 pt-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Catalog Activity Trend
              </h3>
              <span className="text-[10px] text-gray-400">Items added · Updates · Imports</span>
            </div>
            <ReactApexChart
              options={monthlyOptions}
              series={[
                { name: "Items Added", data: trend.itemsAdded },
                { name: "Updates", data: trend.updates },
                { name: "Imports", data: trend.imports },
              ]}
              type="bar"
              height={280}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div className="rounded-lg border border-gray-100 p-3">
              <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-3">
                Items by Category
              </h3>
              <ReactApexChart
                options={categoryDonutOptions}
                series={itemsByCategory.series}
                type="donut"
                height={260}
              />
            </div>

            <div className="rounded-lg border border-gray-100 p-3">
              <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-3">
                Module Activity
              </h3>
              <ReactApexChart
                options={moduleBarOptions}
                series={[
                  { name: "Created", data: moduleActivity.creates },
                  { name: "Updated", data: moduleActivity.updates },
                ]}
                type="bar"
                height={280}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 border-t border-gray-100 pt-4 mt-4">
            <div className="rounded-lg border border-gray-100 p-3">
              <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-3">
                Process Usage Score
              </h3>
              <ReactApexChart
                options={processAreaOptions}
                series={[{ name: "Usage", data: processUsage.values }]}
                type="area"
                height={260}
              />
            </div>

            <div className="rounded-lg border border-gray-100 p-3">
              <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-3">
                Style Code Status
              </h3>
              <ReactApexChart
                options={styleRadialOptions}
                series={styleCodeStatus.series}
                type="radialBar"
                height={260}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Recent Catalog Activity
              </h3>
              <span className="text-[10px] text-gray-400">Static preview data</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="min-w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Module</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Action</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">User</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Time</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentActivity.map((row) => (
                    <tr key={`${row.module}-${row.time}`} className="hover:bg-gray-50/80">
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-gray-800">{row.module}</td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-600">{row.action}</td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-600">{row.user}</td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-500">{row.time}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            row.status === "success"
                              ? "bg-green-50 text-green-700"
                              : row.status === "warning"
                                ? "bg-amber-50 text-amber-700"
                                : row.status === "info"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
