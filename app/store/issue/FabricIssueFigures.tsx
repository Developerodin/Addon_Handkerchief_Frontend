import React from 'react';
import { FabricIssueSummary } from '@/shared/services/factoryApi';
import { formatKg, formatMetres } from './fabricIssueMath';

/**
 * Issued roll count, issued kilograms, and metres still on the bill of material.
 */
export function FabricIssueFigures({ summary }: { summary: FabricIssueSummary }) {
  const rolls = summary.rolls === 1 ? '1 roll issued' : `${summary.rolls} rolls issued`;
  return (
    <span className="block text-[10px] leading-4 text-[#4B5563]">
      <span className="block">
        {rolls} · {formatKg(summary.weightKg)}
      </span>
      {summary.requiredMetres > 0 ? <span className="block">{formatMetres(summary.requiredMetres)} left</span> : null}
    </span>
  );
}
