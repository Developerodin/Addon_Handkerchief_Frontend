'use client';

import React from 'react';
import { UiButton } from './UiButton';
import { cn } from './cn';

export function getPaginationItems(page: number, pages: number): (number | string)[] {
  const items: (number | string)[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) items.push(i);
  } else {
    items.push(1);
    if (page > 4) items.push('...');
    for (let i = Math.max(2, page - 2); i <= Math.min(pages - 1, page + 2); i++) items.push(i);
    if (page < pages - 3) items.push('...');
    items.push(pages);
  }
  return items;
}

export interface UiPaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function UiPagination({
  currentPage,
  totalPages,
  totalResults,
  itemsPerPage,
  onPageChange,
  className,
}: UiPaginationProps) {
  const start = totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = totalResults === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalResults);

  return (
    <div className={cn('ui-pagination', className)}>
      <div className="ui-pagination__summary">
        Showing <span>{start}</span> to <span>{end}</span> of <span>{totalResults}</span> entries{' '}
        <span className="opacity-50">→</span>
      </div>
      <div className="ui-pagination__controls">
        <UiButton
          variant="ghost"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        >
          Prev
        </UiButton>
        <div className="ui-pagination__pages">
          {getPaginationItems(currentPage, totalPages).map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="ui-pagination__ellipsis">
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(Number(page))}
                className={cn('ui-pagination__page', currentPage === page && 'ui-pagination__page--active')}
              >
                {page}
              </button>
            )
          )}
        </div>
        <UiButton
          variant="ghost"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        >
          Next
        </UiButton>
      </div>
    </div>
  );
}

export default UiPagination;
