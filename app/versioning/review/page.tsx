"use client";

import { useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { listRevisionReviews, RevisionReview } from '@/shared/services/versioningService';

/**
 * Lists change requests held for review. Publishing stays on the API.
 */
export default function RevisionReviewPage() {
  const [rows, setRows] = useState<RevisionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listRevisionReviews()
      .then((results) => {
        if (active) setRows(results);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load reviews');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="p-6" aria-labelledby="revision-review-heading">
      <Seo title="Revision review" />
      <header className="mb-6">
        <h1 id="revision-review-heading" className="text-xl font-semibold text-gray-900">
          Revision review
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Holds that need a decision. A published revision is not edited here.
        </p>
      </header>
      {loading && <p className="text-sm text-gray-600">Loading reviews…</p>}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-gray-600">No reviews are waiting.</p>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{row.scopeId}</p>
                <p className="text-xs text-gray-500">{row.reason || 'No reason given'}</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-amber-800">{row.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
