import type { Dispatch, SetStateAction } from 'react';
import {
  itemScopeId,
  listScopeRevisions,
  newLineId,
  OrderDetail,
  routeFromItem,
  ScopeRevision,
} from '@/shared/services/factoryApi';
import { getProductById } from '@/shared/services/productService';

export interface BomRow {
  fabricName?: string;
  quantity?: number;
}

interface ItemDetail {
  id?: string;
  name?: string;
  articleName?: string;
  factoryCode?: string;
  productionType?: string;
  piecesPerCut?: number;
  styleCodes?: unknown;
  bom?: BomRow[];
}

export interface DraftLine {
  key: string;
  id?: string;
  itemId: string;
  articleCode: string;
  articleName: string;
  productionType: string;
  piecesPerCut: number;
  quantity: string;
  priority: string;
  remarks: string;
  revisionId: string;
  revisions: ScopeRevision[];
  unpublished: boolean;
  bom: BomRow[];
}

/**
 * One blank article row.
 */
export function emptyLine(): DraftLine {
  return {
    key: newLineId(),
    itemId: '',
    articleCode: '',
    articleName: '',
    productionType: 'normal',
    piecesPerCut: 3,
    quantity: '',
    priority: 'Medium',
    remarks: '',
    revisionId: '',
    revisions: [],
    unpublished: false,
    bom: [],
  };
}

/**
 * Metres of each fabric for the quantity typed on the line.
 */
export function metresPreview(line: DraftLine): string[] {
  const qty = Number(line.quantity) || 0;
  return (line.bom || [])
    .filter((row) => row.fabricName || row.quantity)
    .map((row) => `${row.fabricName || 'Fabric'} ${Math.round((Number(row.quantity) || 0) * qty * 1000) / 1000} m`);
}

/**
 * Blocks save and release the same way the knitting order form does.
 * An item with no fabric BOM cannot be raised. Qty must be above 0 and at most 100,000.
 */
export function validateDraft(lines: DraftLine[]): string {
  const filled = lines.filter((line) => line.itemId || line.quantity || line.articleCode);
  if (!filled.length) return 'Select an item';
  for (const line of filled) {
    if (!line.itemId) return 'Select an article';
    const qty = Number(line.quantity);
    if (!(qty > 0)) return 'Qty must be greater than 0';
    if (qty > 100000) return 'Qty cannot exceed 100,000';
    if (!line.bom.length) return 'Fabric BOM is missing for this article. An order cannot be raised for it.';
  }
  return '';
}

/**
 * Factory codes on more than one row. Warning only, same as the knitting form.
 */
export function duplicateCodes(lines: DraftLine[]): string[] {
  const counts = new Map<string, number>();
  lines.forEach((line) => {
    const code = line.articleCode.trim().toLowerCase();
    if (!code) return;
    counts.set(code, (counts.get(code) || 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([code]) => code);
}

/**
 * Badge colour for the order information strip.
 */
export function statusTone(label: string): string {
  if (label === 'Pending' || label === 'Draft') return 'bg-yellow-100 text-yellow-800';
  if (label === 'In progress') return 'bg-blue-100 text-blue-800';
  if (label === 'Completed') return 'bg-green-100 text-green-800';
  if (label === 'On hold') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

/**
 * Patches one row without losing the others.
 */
export function updateLine(
  setLines: Dispatch<SetStateAction<DraftLine[]>>,
  index: number,
  patch: Partial<DraftLine>
) {
  setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
}

/**
 * Loads route, revisions, and the live fabric BOM for the preview on the form.
 */
export async function applyItem(
  setLines: Dispatch<SetStateAction<DraftLine[]>>,
  index: number,
  itemId: string
) {
  const product = (await getProductById(itemId)) as ItemDetail | null;
  if (!product) throw new Error('Item not found');
  const route = routeFromItem(String(product.productionType || ''));
  let revisions: ScopeRevision[] = [];
  try {
    const data = await listScopeRevisions(itemScopeId({ ...product, id: itemId, productionType: route }));
    revisions = data.results || [];
  } catch (err) {
    if (!(err instanceof Error)) throw err;
  }
  updateLine(setLines, index, {
    itemId,
    articleCode: product.factoryCode || '',
    articleName: product.articleName || product.name || '',
    productionType: route,
    piecesPerCut: Number(product.piecesPerCut) === 4 ? 4 : 3,
    revisions,
    revisionId: revisions[revisions.length - 1]?.id || '',
    unpublished: revisions.length === 0,
    bom: product.bom || [],
  });
}

/**
 * Restores a saved line, including its published revisions.
 */
export async function hydrateLine(line: NonNullable<OrderDetail['order']['lines']>[number]): Promise<DraftLine> {
  const draft = emptyLine();
  draft.id = line.id;
  draft.itemId = line.itemId || '';
  draft.articleCode = line.factoryCode || '';
  draft.articleName = line.articleName || '';
  draft.productionType = line.productionType;
  draft.piecesPerCut = line.piecesPerCut === 4 ? 4 : 3;
  draft.quantity = String(line.quantity || '');
  draft.priority = line.priority || 'Medium';
  draft.remarks = line.remarks || '';
  draft.revisionId = line.revisionId || '';
  if (!line.itemId) return draft;
  const product = (await getProductById(line.itemId)) as ItemDetail | null;
  if (!product) return draft;
  if (!draft.articleCode) draft.articleCode = product.factoryCode || '';
  if (!draft.articleName) draft.articleName = product.articleName || product.name || '';
  draft.bom = product.bom || [];
  try {
    const data = await listScopeRevisions(itemScopeId({ ...product, id: line.itemId, productionType: line.productionType }));
    draft.revisions = data.results || [];
    draft.unpublished = draft.revisions.length === 0;
  } catch (err) {
    if (!(err instanceof Error)) throw err;
    draft.unpublished = true;
  }
  return draft;
}
