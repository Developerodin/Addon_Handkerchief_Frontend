"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment } from "react";

export default function MainDashboard() {
  return (
    <Fragment>
      <Seo title="Dashboard" />
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
          <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Dashboard</h1>
            </div>
          </div>
          <div className="p-[10px]">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center mb-4">
                <i className="ri-dashboard-line text-2xl text-purple-600"></i>
              </div>
              <h2 className="text-sm font-bold text-gray-800 mb-1">
                Handkerchief Admin
              </h2>
              <p className="text-[11px] text-gray-500 max-w-md">
                Dashboard modules will appear here as you add handkerchief
                features. Layout and header now match the socks frontend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
