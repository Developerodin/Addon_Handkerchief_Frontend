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
  <div className={`catalog-page-size-wrap ${className}`.trim()}>
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="catalog-page-size-select"
      aria-label="Rows per page"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          Show {option}
        </option>
      ))}
    </select>
    <i
      className="ri-arrow-down-s-line catalog-page-size-select__icon"
      aria-hidden
    />
  </div>
);

export default CatalogPageSizeSelect;
