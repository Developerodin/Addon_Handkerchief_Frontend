'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CatalogLookupSelectModal } from '@/shared/components/catalog/CatalogLookupSelectModal';
import { ThreadCatalog, listThreadCatalogs } from '@/shared/services/threadCatalogService';
import { ThreadSupplierThreadDetail } from '@/shared/services/threadSupplierService';

export type ThreadDetailFormRow = ThreadSupplierThreadDetail;

/** Catalog row plus the name field the lookup modal requires. */
type ThreadPickerItem = ThreadCatalog & { name: string };

const threadModalColumns = [
  {
    key: 'threadCode',
    label: 'Thread code',
    render: (item: ThreadPickerItem) => item.threadCode || '—',
  },
  {
    key: 'threadType',
    label: 'Thread type',
    render: (item: ThreadPickerItem) => item.threadType || '—',
  },
];

/**
 * Matches a catalog row against the modal search box.
 * @param item - Thread catalog row
 * @param search - Current search text
 */
const filterThreadCatalog = (item: ThreadPickerItem, search: string) => {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [item.threadCode, item.threadType].some((value) => String(value ?? '').toLowerCase().includes(query));
};

interface ThreadSupplierDetailsSectionProps {
  value: ThreadDetailFormRow[];
  onChange: (details: ThreadDetailFormRow[]) => void;
}

/**
 * Thread detail lines on a supplier form. Each line picks one catalog row.
 */
export function ThreadSupplierDetailsSection({ value, onChange }: ThreadSupplierDetailsSectionProps) {
  const [threads, setThreads] = useState<ThreadCatalog[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRowIndex, setModalRowIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadThreads = async () => {
      try {
        setIsLoadingThreads(true);
        const data = await listThreadCatalogs({ page: 1, limit: 10000, status: 'active' });
        setThreads(data.results);
      } catch (error) {
        console.error('Failed to load thread catalog', error);
        setThreads([]);
      } finally {
        setIsLoadingThreads(false);
      }
    };
    loadThreads();
  }, []);

  const pickerItems = useMemo<ThreadPickerItem[]>(
    () => threads.map((thread) => ({ ...thread, name: thread.threadCode })),
    [threads]
  );

  const threadMap = useMemo(
    () =>
      threads.reduce<Record<string, ThreadCatalog>>((acc, thread) => {
        acc[thread.id] = thread;
        return acc;
      }, {}),
    [threads]
  );

  /**
   * Prepends an empty thread detail line.
   */
  const addThreadDetail = () => {
    onChange([{ threadCatalogId: '', threadCode: '', threadType: '' }, ...value]);
  };

  /**
   * Removes one thread detail line.
   * @param index - Row index
   */
  const removeThreadDetail = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index));
  };

  /**
   * Opens the catalog picker for one line.
   * @param index - Row index
   */
  const openThreadModal = (index: number) => {
    setModalRowIndex(index);
    setModalOpen(true);
  };

  /**
   * Writes the selected catalog row onto the open line.
   * @param thread - Chosen catalog row
   */
  const handleSelectThread = (thread: ThreadPickerItem) => {
    if (modalRowIndex === null) return;
    const duplicate = value.some((detail, idx) => idx !== modalRowIndex && detail.threadCatalogId === thread.id);
    if (duplicate) {
      alert('This thread is already added to thread details');
      return;
    }
    const next = [...value];
    next[modalRowIndex] = {
      threadCatalogId: thread.id,
      threadCode: thread.threadCode || '',
      threadType: thread.threadType || '',
    };
    onChange(next);
    setModalOpen(false);
    setModalRowIndex(null);
  };

  return (
    <div className="col-span-1 md:col-span-2 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Thread Details</h3>
        <button
          type="button"
          className="ti-btn ti-btn-primary flex items-center gap-1 whitespace-nowrap px-4 py-2"
          onClick={addThreadDetail}
          disabled={isLoadingThreads || threads.length === 0}
          aria-label="Add thread detail"
        >
          <i className="ri-add-line" /> Add Thread Detail
        </button>
      </div>

      {isLoadingThreads && (
        <p className="text-sm text-gray-500 flex items-center gap-2" role="status">
          <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
          Loading thread catalog...
        </p>
      )}

      {!isLoadingThreads && threads.length === 0 && (
        <p className="text-sm text-red-500" role="alert">
          No active threads found. Add threads in Thread Catalog before linking them here.
        </p>
      )}

      {value.length === 0 ? (
        <p className="text-sm text-gray-500">
          No thread details added. Use &quot;Add Thread Detail&quot; to link threads from Thread Catalog.
        </p>
      ) : (
        value.map((detail, index) => {
          const selectedThread = detail.threadCatalogId ? threadMap[detail.threadCatalogId] : undefined;
          const displayCode = selectedThread?.threadCode || detail.threadCode || '';
          return (
            <div key={`thread-detail-${index}`} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
                <div className="md:col-span-4 min-w-0">
                  <label className="form-label" htmlFor={`thread-code-${index}`}>
                    Thread code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id={`thread-code-${index}`}
                      type="text"
                      readOnly
                      value={displayCode}
                      onClick={() => !isLoadingThreads && threads.length > 0 && openThreadModal(index)}
                      className="form-control cursor-pointer pr-9 truncate"
                      placeholder="Click to select thread"
                      aria-label={`Thread code for line ${index + 1}`}
                      disabled={isLoadingThreads || threads.length === 0}
                    />
                    <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm" />
                  </div>
                </div>
                <div className="md:col-span-4 min-w-0">
                  <label className="form-label" htmlFor={`thread-type-${index}`}>
                    Thread type
                  </label>
                  <input
                    id={`thread-type-${index}`}
                    type="text"
                    readOnly
                    className="form-control bg-gray-50 truncate"
                    aria-label={`Thread type for line ${index + 1}`}
                    value={selectedThread?.threadType || detail.threadType || '—'}
                  />
                </div>
                <div className="md:col-span-4 flex md:justify-end">
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger flex items-center gap-1 whitespace-nowrap px-3 py-2 mb-0 w-full md:w-auto"
                    onClick={() => removeThreadDetail(index)}
                    aria-label={`Remove thread detail ${index + 1}`}
                  >
                    <i className="ri-delete-bin-line me-1" /> Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      <CatalogLookupSelectModal
        open={modalOpen}
        title="Select Thread"
        searchPlaceholder="Search by thread code or thread type..."
        items={pickerItems}
        columns={threadModalColumns}
        getItemKey={(item) => item.id}
        filterItem={filterThreadCatalog}
        onClose={() => {
          setModalOpen(false);
          setModalRowIndex(null);
        }}
        onSelect={handleSelectThread}
      />
    </div>
  );
}
