/**
 * Joins fabric lookup names into the catalog name.
 * Empty segments are omitted. Order matches the backend util.
 */
export function buildFabricCatalogName(parts: {
  fabricTypeName?: string | null;
  colourName?: string | null;
  qualityName?: string | null;
  yarnName?: string | null;
  countName?: string | null;
}): string {
  return [parts.fabricTypeName, parts.colourName, parts.qualityName, parts.yarnName, parts.countName]
    .map((value) => (value == null ? '' : String(value).trim()))
    .filter(Boolean)
    .join('-');
}

/**
 * Label for a selected lookup.
 * Uses the name loaded with the catalog when that id is not in the active options list.
 */
export function resolveFabricLookupLabel(
  items: ReadonlyArray<{ id: string; name?: string }>,
  selectedId: string,
  loaded?: { id: string; name?: string }
): string {
  if (!selectedId) return '';
  const match = items.find((item) => item.id === selectedId);
  const matchedName = match?.name?.trim();
  if (matchedName) return matchedName;
  if (loaded?.id === selectedId) return String(loaded.name || '').trim();
  return '';
}
