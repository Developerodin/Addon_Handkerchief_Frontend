import React from 'react';
import { IssueStatus } from './fabricIssueMath';

const TONE: Record<IssueStatus, string> = {
  'Not issued': 'bg-[#F5F5F7] text-[#3A3A3C]',
  'In progress': 'bg-[#E8F2FC] text-[#0A4F8A]',
  Complete: 'bg-[#E7F6EC] text-[#0D5C2E]',
};

/**
 * Status word with a tint. The word is the signal. The color is extra.
 */
export function IssueStatusBadge({ status, label }: { status: IssueStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${TONE[status]}`}>
      {label || status}
    </span>
  );
}
