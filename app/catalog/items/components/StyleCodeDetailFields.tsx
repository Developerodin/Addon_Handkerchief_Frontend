'use client';

import React from 'react';
import { AttributeOptionValue, resolveAttributeOptionName } from '@/shared/utils/styleCodeFields';

interface StyleCodeDetailFieldsProps {
  styleCode: string;
  eanCode: string;
  mrp: number | string;
  brand?: string;
  pack?: string;
  onBrowseStyleCode: () => void;
  browseDisabled?: boolean;
}

/** Read-only style code detail row — values come from the style code master. */
export function StyleCodeDetailFields({
  styleCode,
  eanCode,
  mrp,
  brand,
  pack,
  onBrowseStyleCode,
  browseDisabled,
}: StyleCodeDetailFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <div>
        <label className="form-label">Style Code</label>
        <input
          type="text"
          className="form-control cursor-pointer"
          value={styleCode}
          readOnly
          onClick={onBrowseStyleCode}
          placeholder="Click to browse style codes..."
          disabled={browseDisabled}
        />
      </div>
      <div>
        <label className="form-label">EAN Code</label>
        <input type="text" className="form-control bg-gray-50" value={eanCode} readOnly />
      </div>
      <div>
        <label className="form-label">MRP</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="form-control bg-gray-50"
          value={mrp}
          readOnly
        />
      </div>
      <div>
        <label className="form-label">Brand</label>
        <input type="text" className="form-control bg-gray-50" value={brand ?? ''} readOnly />
      </div>
      <div>
        <label className="form-label">Pack</label>
        <input type="text" className="form-control bg-gray-50" value={pack ?? ''} readOnly />
      </div>
    </div>
  );
}

interface StyleCodeBrandPackSelectsProps {
  brand: string;
  pack: string;
  brandOptions: AttributeOptionValue[];
  packOptions: AttributeOptionValue[];
  onBrandChange: (value: string) => void;
  onPackChange: (value: string) => void;
  disabled?: boolean;
}

/** Editable brand/pack selects with fallback option when value is not in attribute master. */
export function StyleCodeBrandPackSelects({
  brand,
  pack,
  brandOptions,
  packOptions,
  onBrandChange,
  onPackChange,
  disabled,
}: StyleCodeBrandPackSelectsProps) {
  const brandValue = resolveAttributeOptionName(brand, brandOptions);
  const packValue = resolveAttributeOptionName(pack, packOptions);

  return (
    <>
      <div>
        <label className="form-label">Brand</label>
        <select
          className="form-control"
          value={brandValue}
          onChange={(e) => onBrandChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Select Brand</option>
          {brandOptions.map((opt) => (
            <option key={opt._id ?? opt.id ?? opt.name} value={opt.name}>
              {opt.name}
            </option>
          ))}
          {brandValue && !brandOptions.some((opt) => opt.name === brandValue) && (
            <option value={brandValue}>{brandValue}</option>
          )}
        </select>
      </div>
      <div>
        <label className="form-label">Pack</label>
        <select
          className="form-control"
          value={packValue}
          onChange={(e) => onPackChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Select Pack</option>
          {packOptions.map((opt) => (
            <option key={opt._id ?? opt.id ?? opt.name} value={opt.name}>
              {opt.name}
            </option>
          ))}
          {packValue && !packOptions.some((opt) => opt.name === packValue) && (
            <option value={packValue}>{packValue}</option>
          )}
        </select>
      </div>
    </>
  );
}

export default StyleCodeDetailFields;
