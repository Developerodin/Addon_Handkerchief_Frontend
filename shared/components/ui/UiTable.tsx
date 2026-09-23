'use client';

import React from 'react';
import { cn } from './cn';

export interface UiTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  headerClassName?: string;
  cellClassName?: string;
  sticky?: 'right';
  render: (row: T) => React.ReactNode;
}

export interface UiTableProps<T> {
  columns: UiTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
  selectable?: {
    selectedIds: string[];
    selectAll: boolean;
    onSelectAll: () => void;
    onSelect: (id: string) => void;
    getRowId: (row: T) => string;
  };
  onRowClick?: (row: T) => void;
}

export function UiTable<T>({
  columns,
  rows,
  rowKey,
  className,
  selectable,
  onRowClick,
}: UiTableProps<T>) {
  return (
    <div className="ui-table-wrap overflow-x-auto min-h-[300px]">
      <table className={cn('ui-table', className)}>
        <thead className="ui-table__head">
          <tr>
            {selectable ? (
              <th className="ui-table__th ui-table__th--checkbox">
                <input
                  type="checkbox"
                  checked={selectable.selectAll}
                  onChange={selectable.onSelectAll}
                  className="ui-table__checkbox"
                  aria-label="Select all rows"
                />
              </th>
            ) : null}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'ui-table__th',
                  col.align === 'right' && 'ui-table__th--right',
                  col.align === 'center' && 'ui-table__th--center',
                  col.sticky === 'right' && 'ui-table__th--sticky-right',
                  col.headerClassName
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = rowKey(row);
            return (
              <tr
                key={id}
                className={cn('ui-table__row group', onRowClick && 'ui-table__row--clickable')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable ? (
                  <td className="ui-table__td ui-table__td--checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectable.selectedIds.includes(selectable.getRowId(row))}
                      onChange={() => selectable.onSelect(selectable.getRowId(row))}
                      className="ui-table__checkbox"
                      aria-label={`Select row ${selectable.getRowId(row)}`}
                    />
                  </td>
                ) : null}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'ui-table__td',
                      col.align === 'right' && 'ui-table__td--right',
                      col.align === 'center' && 'ui-table__td--center',
                      col.sticky === 'right' && 'ui-table__td--sticky-right',
                      col.cellClassName
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default UiTable;
