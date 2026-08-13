'use client';

import React from 'react';
import { FabricBomItem, PackagingBomItem, ProductBomHeader } from './ProductBomShared';
import { FabricBomTable } from './FabricBomTable';
import { RawMaterialBomTable } from './RawMaterialBomTable';

interface ProductBomTabProps {
  fabricItems: FabricBomItem[];
  onFabricChange: (items: FabricBomItem[]) => void;
  packagingItems: PackagingBomItem[];
  onPackagingChange: (items: PackagingBomItem[]) => void;
  disabled?: boolean;
}

export function ProductBomTab({
  fabricItems,
  onFabricChange,
  packagingItems,
  onPackagingChange,
  disabled,
}: ProductBomTabProps) {
  return (
    <div className="space-y-5">
      <ProductBomHeader
        fabricLineCount={fabricItems.filter((i) => i.fabricCatalogId).length}
        packagingLineCount={packagingItems.filter((i) => i.rawMaterialId).length}
      />
      <FabricBomTable items={fabricItems} onChange={onFabricChange} disabled={disabled} />
      <RawMaterialBomTable items={packagingItems} onChange={onPackagingChange} disabled={disabled} />
    </div>
  );
}

export default ProductBomTab;
