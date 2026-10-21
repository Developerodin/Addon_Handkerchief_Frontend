'use client';

import React, { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { PoReturnWorkspace } from './PoReturnWorkspace';

/**
 * PO return: scan QC-rejected rolls and issue a challan.
 */
export default function VendorReturnPage() {
  return (
    <RequireCrudPermission path="Fabric / Vendor return" action="read">
      <Toaster position="top-right" />
      <div className="main-content !px-4 !py-4 sm:!px-6 sm:!py-5">
        <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <header className="mb-4 flex items-center gap-2">
            <span className="h-5 w-[3px] rounded bg-primary" aria-hidden />
            <h1 className="text-sm font-bold text-gray-800">PO return</h1>
          </header>
          <Suspense fallback={<p className="text-sm text-gray-500">Loading returns…</p>}>
            <PoReturnWorkspace />
          </Suspense>
        </div>
      </div>
    </RequireCrudPermission>
  );
}
