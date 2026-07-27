"use client";

import React from "react";

export default function HandkerchiefDashboardContent() {
  return (
    <div className="main-content !p-[10px]">
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <div>
              <h1 className="text-sm font-bold text-gray-800">Addon Handkerchief</h1>
              <p className="text-[10px] text-gray-500">Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-24 px-6">
          <span className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6">
            <i className="ri-dashboard-3-line text-3xl text-purple-600" />
          </span>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Coming Soon</h2>
          <p className="text-sm text-gray-500 text-center max-w-md">
            The dashboard is under development. Analytics and insights will be available here shortly.
          </p>
        </div>
      </div>
    </div>
  );
}
