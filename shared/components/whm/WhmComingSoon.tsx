'use client';

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

interface WhmComingSoonProps {
  seoTitle: string;
  title: string;
  description?: string;
}

/** Placeholder shell for WHM screens until live flows ship. */
export default function WhmComingSoon({
  seoTitle,
  title,
  description = 'This screen is under development. Warehouse management features will be available here soon.',
}: WhmComingSoonProps) {
  return (
    <div className="main-content !p-[10px]">
      <Seo title={seoTitle} />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <div>
              <h1 className="text-sm font-bold text-gray-800">{title}</h1>
              <nav className="text-[10px] text-gray-500" aria-label="Breadcrumb">
                <Link href="/whm/stock-inward/stock" className="text-purple-600 hover:underline">
                  WHM
                </Link>
                <span className="mx-1">/</span>
                <span>{title}</span>
              </nav>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
            Coming soon
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-24 px-6">
          <span className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6">
            <i className="bx bx-buildings text-3xl text-purple-600" aria-hidden />
          </span>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Coming Soon</h2>
          <p className="text-sm text-gray-500 text-center max-w-md">{description}</p>
        </div>
      </div>
    </div>
  );
}