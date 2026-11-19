"use client";

import { UiIconButton } from '@/shared/components/ui/UiIconButton';
import { useCatalogCrud, CatalogSegment } from '@/shared/hooks/useCatalogCrud';

interface CatalogRowActionsProps {
  segment: CatalogSegment;
  editHref: string;
  onDelete: () => void;
  onReplicate?: () => void;
  onPrint?: () => void;
  deleteDisabled?: boolean;
  deleteLoading?: boolean;
  replicateLoading?: boolean;
}

export default function CatalogRowActions({
  segment,
  editHref,
  onDelete,
  onReplicate,
  onPrint,
  deleteDisabled,
  deleteLoading,
  replicateLoading,
}: CatalogRowActionsProps) {
  const { canCreate, canUpdate, canDelete } = useCatalogCrud(segment);

  if (!canUpdate && !canDelete && !(canCreate && onReplicate)) return null;

  return (
    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
      {canUpdate && (
        <UiIconButton href={editHref} icon="ri-pencil-line" tone="edit" title="Edit" aria-label="Edit" />
      )}
      {onPrint && (
        <UiIconButton
          icon="ri-barcode-line"
          tone="default"
          title="Print barcode"
          aria-label="Print barcode"
          onClick={onPrint}
        />
      )}
      {canCreate && onReplicate && (
        <UiIconButton
          icon="ri-file-copy-line"
          tone="copy"
          title="Replicate"
          aria-label="Replicate"
          onClick={onReplicate}
          disabled={replicateLoading}
        />
      )}
      {canDelete && (
        <UiIconButton
          icon="ri-delete-bin-line"
          tone="delete"
          title="Delete"
          aria-label="Delete"
          onClick={onDelete}
          disabled={deleteDisabled || deleteLoading}
        />
      )}
    </div>
  );
}
