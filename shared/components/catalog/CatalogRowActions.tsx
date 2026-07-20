"use client";

import Link from 'next/link';
import { useCatalogCrud, CatalogSegment } from '@/shared/hooks/useCatalogCrud';

interface CatalogRowActionsProps {
  segment: CatalogSegment;
  editHref: string;
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteLoading?: boolean;
}

export default function CatalogRowActions({
  segment,
  editHref,
  onDelete,
  deleteDisabled,
  deleteLoading,
}: CatalogRowActionsProps) {
  const { canUpdate, canDelete } = useCatalogCrud(segment);

  if (!canUpdate && !canDelete) return null;

  return (
    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
      {canUpdate && (
        <Link
          href={editHref}
          className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors"
          title="Edit"
        >
          <i className="ri-pencil-line text-xs" />
        </Link>
      )}
      {canDelete && (
        <button
          type="button"
          className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
          onClick={onDelete}
          title="Delete"
          disabled={deleteDisabled || deleteLoading}
        >
          <i className="ri-delete-bin-line text-xs" />
        </button>
      )}
    </div>
  );
}
