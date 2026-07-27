"use client";

import React from "react";

interface CatalogPageSizeSelectProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  className?: string;
}

const DEFAULT_OPTIONS = [10, 50, 100, 500, 1000];

const CatalogPageSizeSelect: React.FC<CatalogPageSizeSelectProps> = ({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  className = "",
}) => (
  <div className={`relative ${className}`.trim()}>
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="catalog-page-size-select bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 cursor-pointer w-full"
      aria-label="Rows per page"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          Show {option}
        </option>
      ))}
    </select>
    <i
      className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
      aria-hidden
    />
  </div>
);

export default CatalogPageSizeSelect;
