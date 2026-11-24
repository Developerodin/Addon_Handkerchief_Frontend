'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import WhmWarehouseInventoryPanel from './components/WhmWarehouseInventoryPanel';

type StockTab = 'inventory' | 'operations';

export default function WhmStockPage() {
  const [tab, setTab] = useState<StockTab>('inventory');

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Stock" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 rounded-t">
        <div className="flex border-b border-gray-300 px-[10px] pt-1 flex-wrap gap-x-1">
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === 'inventory' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab('inventory')}
          >
            Finished goods (pcs)
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === 'operations' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab('operations')}
          >
            Operations
          </button>
        </div>

        {tab === 'inventory' ? (
          <WhmWarehouseInventoryPanel />
        ) : (
          <div className="min-h-[280px] border-t border-gray-100 p-[10px] text-[11px] text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">Inbound / outbound flows</p>
            <p>
              Inward lines live under{' '}
              <Link href="/whm/stock-inward/inward/" className="text-teal-700 font-bold hover:underline">
                Stock & inward → Inward
              </Link>
              . Orders and fulfillment use{' '}
              <Link href="/whm/orders/" className="text-teal-700 font-bold hover:underline">
                WHM Orders
              </Link>
              .
            </p>
            <p className="text-gray-400 text-[10px]">Static placeholder until WHMS inventory APIs are connected.</p>
          </div>
        )}
      </div>
    </div>
  );
}