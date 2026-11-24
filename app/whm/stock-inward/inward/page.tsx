'use client';

import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import WhmInwardReceivedPanel from './components/WhmInwardReceivedPanel';
type InwardTab = 'production' | 'inward-received' | 'upcoming';

export default function WhmInwardPage() {
  const [tab, setTab] = useState<InwardTab>('inward-received');

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Inward" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 rounded-t">
        <div className="flex border-b border-gray-300 px-[10px] pt-1 flex-wrap gap-x-1">
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === 'production'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab('production')}
          >
            Production receiving
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === 'inward-received'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab('inward-received')}
          >
            Inward Received
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === 'upcoming'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab('upcoming')}
          >
            Upcoming
          </button>
        </div>

        {tab === 'inward-received' ? (
          <WhmInwardReceivedPanel />
        ) : tab === 'production' ? (
          <div className="p-[10px] border-t border-gray-100 min-h-[280px] flex flex-col items-center justify-center text-center">
            <i className="ri-building-4-line text-4xl text-teal-500 mb-3" aria-hidden />
            <h2 className="text-sm font-bold text-gray-700 mb-1">Production receiving</h2>
            <p className="text-[11px] text-gray-500 max-w-md">
              Receive checked handkerchiefs from factory floor into FG stock (by product, sort no, style code). (Static placeholder.)
            </p>
          </div>
        ) : (
          <div className="p-[10px] border-t border-gray-100 min-h-[280px]">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <i className="ri-truck-line text-4xl text-amber-400 mb-3" aria-hidden />
              <h2 className="text-sm font-bold text-gray-700 mb-1">Upcoming inward</h2>
              <p className="text-[11px] text-gray-500 max-w-md">
                Expected receipts from factory QC and holding transfers will appear here. (Static placeholder.)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}