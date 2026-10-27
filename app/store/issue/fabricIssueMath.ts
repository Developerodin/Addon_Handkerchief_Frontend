import { FabricEstimateRow, FabricIssueRow, OrderLineRow, ProductionOrderRow } from '@/shared/services/factoryApi';

export type IssueStatus = 'Not issued' | 'In progress' | 'Complete';

export interface FabricLineView {
  key: string;
  lineId: string;
  bomLineId: string;
  articleName: string;
  factoryCode: string;
  quantity: number;
  fabricName: string;
  fabricCatalogId: string;
  requiredMetres: number;
  fabricIssueStatus: 'open' | 'completed';
}

/**
 * Metres the article needs for one fabric. Display only. It does not set the status.
 */
export function requiredMetres(metresPerPiece: number, quantity: number): number {
  return Math.round((Number(metresPerPiece) || 0) * (Number(quantity) || 0) * 1000) / 1000;
}

/**
 * Factory code and article name, in the order the store reads them.
 */
export function articleLabel(factoryCode?: string, articleName?: string): string {
  const parts = [factoryCode, articleName].map((part) => (part || '').trim()).filter(Boolean);
  return parts.join(' ') || 'Article';
}

/**
 * @param value metres
 */
export function formatMetres(value: number): string {
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 3 })} m`;
}

/**
 * @param value kilograms
 */
export function formatKg(value: number): string {
  return `${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

/**
 * @param value ISO date from an order
 */
export function formatOrderDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB');
}

/**
 * @param value ISO date from an issue row
 */
export function formatIssueTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Catalog id wins when both sides have one. Otherwise the fabric name must match.
 */
export function fabricsMatch(
  line: { fabricCatalogId: string; fabricName: string },
  roll: { fabricId?: string; fabricName?: string }
): boolean {
  if (line.fabricCatalogId && roll.fabricId) return line.fabricCatalogId === roll.fabricId;
  const wanted = line.fabricName.trim().toLowerCase();
  const got = (roll.fabricName || '').trim().toLowerCase();
  return Boolean(wanted) && wanted === got;
}

/**
 * Roll count decides the badge. Metres never do.
 */
export function lineStatus(rollCount: number, fabricIssueStatus?: string): IssueStatus {
  if (fabricIssueStatus === 'completed') return 'Complete';
  if (rollCount > 0) return 'In progress';
  return 'Not issued';
}

/**
 * Card badge for one order: complete only when every article is marked complete.
 */
export function orderIssueStatus(order: ProductionOrderRow, issues: FabricIssueRow[]): IssueStatus {
  const lines = order.lines || [];
  const mine = issues.filter((row) => row.orderId === order.id);
  if (lines.length > 0 && lines.every((line) => line.fabricIssueStatus === 'completed')) return 'Complete';
  if (mine.length > 0 || lines.some((line) => line.fabricIssueStatus === 'completed')) return 'In progress';
  return 'Not issued';
}

/**
 * Fabric rows for an order. A missing snapshot falls back to the estimation payload.
 */
export function buildFabricLines(order: ProductionOrderRow, estimates: FabricEstimateRow[]): FabricLineView[] {
  return (order.lines || []).flatMap((line) => fabricRowsForArticle(line, estimates));
}

/**
 * @param line article on the order
 * @param estimates live bill of material when the line was not pinned
 */
function fabricRowsForArticle(line: OrderLineRow, estimates: FabricEstimateRow[]): FabricLineView[] {
  const fromSnapshot = line.snapshot?.fabricBom;
  const fromEstimate = estimates.find((row) => row.lineId === line.id)?.fabrics;
  const bom = fromSnapshot?.length ? fromSnapshot : fromEstimate || [];
  return bom.map((fabric) => {
    const bomLineId = fabric.bomLineId || fabric.fabricName;
    return {
      key: `${line.id}:${bomLineId}`,
      lineId: line.id,
      bomLineId,
      articleName: line.articleName || '',
      factoryCode: line.factoryCode || '',
      quantity: line.quantity,
      fabricName: fabric.fabricName || 'Fabric',
      fabricCatalogId: fabric.fabricCatalogId || '',
      requiredMetres: fabric.requiredMetres ?? requiredMetres(fabric.metresPerPiece, line.quantity),
      fabricIssueStatus: line.fabricIssueStatus === 'completed' ? 'completed' : 'open',
    };
  });
}

/**
 * Issues already posted against one fabric line.
 */
export function issuesForLine(issues: FabricIssueRow[], lineId: string, bomLineId: string): FabricIssueRow[] {
  return issues.filter((row) => row.lineId === lineId && row.bomLineId === bomLineId);
}

/**
 * @param rows issue rows for one fabric line
 */
export function issuedWeight(rows: FabricIssueRow[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.netWeight) || 0), 0);
}
