export interface AttributeOptionValue {
  _id?: string;
  id?: string;
  name?: string;
}

/** Map attribute option id or name to the display name used in selects. */
export function resolveAttributeOptionName(
  raw: string | undefined | null,
  optionValues: AttributeOptionValue[]
): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';

  const byId = optionValues.find(
    (opt) => String(opt._id ?? opt.id ?? '') === value
  );
  if (byId?.name) return byId.name;

  const byName = optionValues.find(
    (opt) => opt.name?.toLowerCase() === value.toLowerCase()
  );
  if (byName?.name) return byName.name;

  return value;
}

export interface StyleCodeDetailFields {
  styleCodeId?: string;
  styleCode?: string;
  eanCode?: string;
  mrp?: number;
  brand?: string;
  pack?: string;
}

/** Apply style-code master values onto a row, resolving brand/pack labels. */
export function mapStyleCodeToItemRow(
  sc: {
    id?: string;
    styleCodeId?: string;
    styleCode?: string;
    eanCode?: string;
    mrp?: number;
    brand?: string;
    pack?: string;
  },
  brandOptions: AttributeOptionValue[] = [],
  packOptions: AttributeOptionValue[] = []
): StyleCodeDetailFields {
  return {
    styleCodeId: sc.styleCodeId ?? sc.id ?? '',
    styleCode: sc.styleCode ?? '',
    eanCode: sc.eanCode ?? '',
    mrp: sc.mrp ?? 0,
    brand: resolveAttributeOptionName(sc.brand, brandOptions),
    pack: resolveAttributeOptionName(sc.pack, packOptions),
  };
}
