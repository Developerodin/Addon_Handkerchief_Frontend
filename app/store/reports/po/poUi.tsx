import React from 'react';

export const headCell = 'px-2 py-2 text-left text-[13px] font-semibold text-[#57534E]';
export const bodyCell = 'px-2 py-2 text-left text-sm text-[#1C1917] align-top border-t border-[#E7E5E4]';

/**
 * A titled block inside the order dossier.
 */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-[#E7E5E4] bg-white">
      <h3 className="px-3 py-2 text-sm font-semibold text-[#1C1917]">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Quiet line when a dossier section has no rows.
 * @param label - What is missing
 */
export function EmptyNote({ label }: { label: string }) {
  return <p className="px-3 pb-3 text-sm text-[#57534E]">{label}</p>;
}
