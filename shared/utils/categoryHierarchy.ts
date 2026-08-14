export const MAX_CATEGORY_DEPTH = 3;

export const CATEGORY_LEVEL_LABELS: Record<number, string> = {
  1: 'Category',
  2: 'Child',
  3: 'Grandchild',
};

export interface CategoryRecord {
  id: string;
  name: string;
  parent?: string | null | { id: string; name: string };
  description?: string;
  sortOrder?: number;
  status?: 'active' | 'inactive';
  image?: string;
}

export function normalizeParentId(parent: CategoryRecord['parent']): string | null {
  if (!parent) return null;
  if (typeof parent === 'object') return parent.id || null;
  return String(parent);
}

export function buildParentMap(categories: CategoryRecord[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const cat of categories) {
    map.set(cat.id, normalizeParentId(cat.parent));
  }
  return map;
}

export function getCategoryLevel(
  categoryId: string,
  parentMap: Map<string, string | null>
): number {
  let level = 1;
  let currentId: string | null = categoryId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const parentId = parentMap.get(currentId);
    if (!parentId) return level;
    level += 1;
    currentId = parentId;
  }

  return Math.min(level, MAX_CATEGORY_DEPTH);
}

export function getCategoryPath(
  categoryId: string,
  categories: CategoryRecord[],
  nameMap?: Map<string, string>
): string[] {
  const parentMap = buildParentMap(categories);
  const names =
    nameMap ||
    new Map(categories.map((cat) => [cat.id, cat.name]));

  const path: string[] = [];
  let currentId: string | null = categoryId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const name = names.get(currentId);
    if (name) path.unshift(name);
    currentId = parentMap.get(currentId) ?? null;
  }

  return path;
}

export function getDescendantIds(
  categoryId: string,
  parentMap: Map<string, string | null>
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const [id, parentId] of parentMap.entries()) {
    if (!parentId) continue;
    const list = childrenByParent.get(parentId) || [];
    list.push(id);
    childrenByParent.set(parentId, list);
  }

  const descendants: string[] = [];
  const stack = [...(childrenByParent.get(categoryId) || [])];

  while (stack.length) {
    const id = stack.pop()!;
    descendants.push(id);
    stack.push(...(childrenByParent.get(id) || []));
  }

  return descendants;
}

export interface ParentOption {
  id: string;
  label: string;
  level: number;
}

/**
 * Valid parent options for add/edit forms.
 * - Only level 1 and 2 categories can be parents (so new node stays within 3 levels).
 * - Excludes self and descendants on edit.
 */
export function getValidParentOptions(
  categories: CategoryRecord[],
  options?: { excludeIds?: string[] }
): ParentOption[] {
  const parentMap = buildParentMap(categories);
  const exclude = new Set(options?.excludeIds || []);

  return categories
    .filter((cat) => !exclude.has(cat.id))
    .map((cat) => {
      const level = getCategoryLevel(cat.id, parentMap);
      const path = getCategoryPath(cat.id, categories);
      return {
        id: cat.id,
        level,
        label: path.join(' › '),
      };
    })
    .filter((cat) => cat.level < MAX_CATEGORY_DEPTH)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getLevelLabel(level: number): string {
  return CATEGORY_LEVEL_LABELS[level] || `Level ${level}`;
}
