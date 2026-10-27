'use client';

import React, { useMemo, useState } from 'react';
import { FabricIssueRow } from '@/shared/services/factoryApi';
import { UiButton, UiTable, UiTableColumn } from '@/shared/components/ui';
import {
  FabricLineView,
  IssueStatus,
  articleLabel,
  formatKg,
  formatMetres,
  issuedWeight,
  issuesForLine,
  lineStatus,
} from './fabricIssueMath';
import { IssueStatusBadge } from './IssueStatusBadge';

type SortKey = 'fabric' | 'required' | 'issued' | 'weight' | 'status';

const STATUS_RANK: Record<IssueStatus, number> = {
  'Not issued': 0,
  'In progress': 1,
  Complete: 2,
};

/**
 * Fabric lines for the selected article. Issued is a roll count. Required metres stay as reference.
 */
export function FabricRequirementTable({
  lines,
  issues,
  showArticle,
  activeKey,
  canComplete,
  completing,
  completeError,
  onIssue,
  onComplete,
}: {
  lines: FabricLineView[];
  issues: FabricIssueRow[];
  showArticle: boolean;
  activeKey: string;
  canComplete: boolean;
  completing: boolean;
  completeError: string;
  onIssue: (line: FabricLineView) => void;
  onComplete: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('fabric');
  const [sortAsc, setSortAsc] = useState(true);
  const sorted = useMemo(() => sortLines(lines, issues, sortKey, sortAsc), [lines, issues, sortKey, sortAsc]);

  const columns: UiTableColumn<FabricLineView>[] = [
    {
      key: 'issue',
      label: 'Issue',
      render: (line) => {
        const closed = line.fabricIssueStatus === 'completed';
        return (
          <UiButton
            type="button"
            variant="primary"
            disabled={closed}
            title={closed ? 'Fabric issue is complete for this article.' : 'Issue a roll'}
            onClick={() => onIssue(line)}
          >
            Issue
          </UiButton>
        );
      },
    },
    {
      key: 'fabric',
      label: 'Fabric',
      render: (line) => (
        <span>
          <span className="block text-sm font-bold text-[#111827]">{line.fabricName}</span>
          {showArticle ? (
            <span className="block text-xs text-[#4B5563]">{articleLabel(line.factoryCode, line.articleName)}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'required',
      label: 'Required',
      render: (line) => <span className="text-sm text-[#111827]">{formatMetres(line.requiredMetres)}</span>,
    },
    {
      key: 'issued',
      label: 'Issued',
      render: (line) => {
        const count = issuesForLine(issues, line.lineId, line.bomLineId).length;
        return <span className="text-sm font-bold text-[#111827]">{count === 1 ? '1 roll' : `${count} rolls`}</span>;
      },
    },
    {
      key: 'weight',
      label: 'Weight',
      render: (line) => (
        <span className="text-sm text-[#111827]">{formatKg(issuedWeight(issuesForLine(issues, line.lineId, line.bomLineId)))}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (line) => {
        const count = issuesForLine(issues, line.lineId, line.bomLineId).length;
        return <IssueStatusBadge status={lineStatus(count, line.fabricIssueStatus)} />;
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-gray-200">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563]">Fabric for this article</h3>
        <span className="text-xs text-[#4B5563]">
          {lines.length} fabric {lines.length === 1 ? 'line' : 'lines'}
        </span>
      </div>
      {lines.length === 0 ? (
        <p className="px-3 py-8 text-sm text-[#4B5563]">This article has no fabric on its bill of material.</p>
      ) : (
        <UiTable
          columns={withSort(columns, sortKey, sortAsc, setSortKey, setSortAsc)}
          rows={sorted}
          rowKey={(line) => line.key}
          rowClassName={(line) => (line.key === activeKey ? 'bg-[#E8F2FC]' : undefined)}
        />
      )}
      {canComplete ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-[#F5F5F7] px-3 py-2">
          <p className="text-sm text-[#4B5563]">Mark fabric issue complete when this article has the rolls it needs.</p>
          <UiButton type="button" variant="primary" icon="ri-check-line" loading={completing} onClick={onComplete}>
            Mark fabric issue complete
          </UiButton>
        </div>
      ) : null}
      {completeError ? (
        <p className="px-3 py-2 text-sm text-red-700" role="alert">
          {completeError}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Clicking the active column flips direction. Another column starts ascending.
 */
function toggleSort(
  current: SortKey,
  asc: boolean,
  next: SortKey,
  setKey: (key: SortKey) => void,
  setAsc: (value: boolean) => void
) {
  if (current === next) setAsc(!asc);
  else {
    setKey(next);
    setAsc(true);
  }
}

/**
 * Puts a sort button on the columns that carry a number or a name.
 */
function withSort(
  columns: UiTableColumn<FabricLineView>[],
  sortKey: SortKey,
  sortAsc: boolean,
  setKey: (key: SortKey) => void,
  setAsc: (value: boolean) => void
): UiTableColumn<FabricLineView>[] {
  return columns.map((column) => {
    if (column.key === 'issue') return column;
    const key = column.key as SortKey;
    return {
      ...column,
      label: (
        <button
          type="button"
          className="inline-flex min-h-7 items-center gap-1 font-bold uppercase"
          aria-sort={sortKey === key ? (sortAsc ? 'ascending' : 'descending') : 'none'}
          onClick={() => toggleSort(sortKey, sortAsc, key, setKey, setAsc)}
        >
          {column.label}
          {sortKey === key ? <span aria-hidden>{sortAsc ? '↑' : '↓'}</span> : null}
        </button>
      ),
    };
  });
}

/**
 * @param lines fabric rows
 * @param issues posted rolls
 */
function sortLines(lines: FabricLineView[], issues: FabricIssueRow[], sortKey: SortKey, sortAsc: boolean): FabricLineView[] {
  const copy = [...lines];
  copy.sort((left, right) => {
    const delta = compareLines(left, right, issues, sortKey);
    return sortAsc ? delta : -delta;
  });
  return copy;
}

/**
 * @param left one fabric line
 * @param right another fabric line
 */
function compareLines(left: FabricLineView, right: FabricLineView, issues: FabricIssueRow[], sortKey: SortKey): number {
  if (sortKey === 'required') return left.requiredMetres - right.requiredMetres;
  if (sortKey === 'issued') {
    return issuesForLine(issues, left.lineId, left.bomLineId).length - issuesForLine(issues, right.lineId, right.bomLineId).length;
  }
  if (sortKey === 'weight') {
    return issuedWeight(issuesForLine(issues, left.lineId, left.bomLineId)) - issuedWeight(issuesForLine(issues, right.lineId, right.bomLineId));
  }
  if (sortKey === 'status') {
    const leftStatus = lineStatus(issuesForLine(issues, left.lineId, left.bomLineId).length, left.fabricIssueStatus);
    const rightStatus = lineStatus(issuesForLine(issues, right.lineId, right.bomLineId).length, right.fabricIssueStatus);
    return STATUS_RANK[leftStatus] - STATUS_RANK[rightStatus];
  }
  return left.fabricName.localeCompare(right.fabricName);
}
