'use client';

import React, { useEffect, useMemo, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { UiButton } from '@/shared/components/ui';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import {
  FabricEstimateRow,
  FabricIssueRow,
  ProductionOrderRow,
  factoryRequest,
} from '@/shared/services/factoryApi';
import { OrderRail } from './OrderRail';
import { FabricRequirementTable } from './FabricRequirementTable';
import { IssueRollDrawer } from './IssueRollDrawer';
import { IssueLogDrawer } from './IssueLogDrawer';
import { articleLabel, buildFabricLines, formatOrderDate } from './fabricIssueMath';

/**
 * Issue fabric rolls to an order and article. Each scan is one roll against one fabric line.
 */
export default function IssuePage() {
  const orders = useFactoryList<ProductionOrderRow>('/production/orders', undefined, 100);
  const [selectedId, setSelectedId] = useState('');
  const [articleId, setArticleId] = useState('');
  const [issues, setIssues] = useState<FabricIssueRow[]>([]);
  const [issueError, setIssueError] = useState('');
  const [issueTick, setIssueTick] = useState(0);
  const [estimates, setEstimates] = useState<FabricEstimateRow[]>([]);
  const [estimateError, setEstimateError] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');

  const openOrders = useMemo(() => orders.rows.filter((order) => order.status !== 'closed'), [orders.rows]);
  const selected = openOrders.find((order) => order.id === selectedId) || null;
  const needsEstimate = Boolean(selected && (selected.lines || []).some((line) => !line.snapshot?.fabricBom?.length));

  useEffect(() => {
    const firstId = openOrders[0]?.id || '';
    if (!firstId) return;
    const stillVisible = openOrders.some((order) => order.id === selectedId);
    if (stillVisible) return;
    setSelectedId(firstId);
    setArticleId('all');
    setActiveKey('');
  }, [openOrders, selectedId]);

  useEffect(() => {
    let cancelled = false;
    factoryRequest<{ results: FabricIssueRow[] }>('/store/issues')
      .then((data) => {
        if (!cancelled) {
          setIssues(data.results || []);
          setIssueError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIssues([]);
          setIssueError(err instanceof Error ? err.message : 'Could not load issues');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [issueTick]);

  useEffect(() => {
    if (!selected || !needsEstimate) {
      setEstimates([]);
      setEstimateError('');
      setEstimating(false);
      return undefined;
    }
    let cancelled = false;
    setEstimating(true);
    factoryRequest<{ results: FabricEstimateRow[] }>(`/production/orders/fabric-estimation?orderId=${selected.id}`)
      .then((data) => {
        if (!cancelled) {
          setEstimates(data.results || []);
          setEstimateError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEstimates([]);
          setEstimateError(err instanceof Error ? err.message : 'Could not load fabric');
        }
      })
      .finally(() => {
        if (!cancelled) setEstimating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id, needsEstimate]);

  const fabricLines = useMemo(() => (selected ? buildFabricLines(selected, estimates) : []), [selected, estimates]);
  const visibleLines = articleId === 'all' ? fabricLines : fabricLines.filter((line) => line.lineId === articleId);
  const selectedArticle = (selected?.lines || []).find((line) => line.id === articleId) || null;
  const activeLine = fabricLines.find((line) => line.key === activeKey) || null;
  const logRows = selected ? issues.filter((row) => row.orderId === selected.id) : issues;

  /**
   * Another order opens on All, so every fabric line for that order is visible.
   */
  function selectOrder(orderId: string) {
    setSelectedId(orderId);
    setArticleId('all');
    setActiveKey('');
    setCompleteError('');
  }

  /**
   * Closes issuing for the selected article. Further scans are rejected.
   */
  async function markComplete() {
    if (!selected || !selectedArticle) return;
    setCompleting(true);
    setCompleteError('');
    try {
      await factoryRequest(`/production/orders/${selected.id}/lines/${selectedArticle.id}/fabric-issue-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      setActiveKey('');
      await orders.reload();
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Could not mark fabric issue complete');
    } finally {
      setCompleting(false);
    }
  }

  return (
    <RequireCrudPermission path="Fabric / Issue" action="read">
      <div className="main-content !px-4 !py-4">
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-5 w-[3px] rounded bg-primary" aria-hidden />
              <h1 className="text-sm font-bold text-[#111827]">Fabric issue</h1>
            </div>
            <UiButton type="button" variant="secondary" icon="ri-file-list-3-line" onClick={() => setLogsOpen(true)}>
              Issue log
            </UiButton>
          </header>
          <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)]">
            <OrderRail
              orders={openOrders}
              issues={issues}
              loading={orders.loading}
              error={orders.error || ''}
              search={orders.search}
              selectedId={selectedId}
              onSearch={(value) => {
                orders.setSearch(value);
                orders.setPage(1);
              }}
              onSelect={selectOrder}
            />
            <section className="min-w-0 p-4" aria-label="Fabric to issue">
              {!selected ? <p className="text-sm text-[#4B5563]">Select an order to issue fabric.</p> : null}
              {selected ? (
                <div className="grid gap-3">
                  <header>
                    <h2 className="text-sm font-bold text-[#111827]">{selected.orderNumber || 'Order'}</h2>
                    <p className="text-xs text-[#4B5563]">
                      {[selected.buyer, formatOrderDate(selected.orderDate), selected.orderNote].filter(Boolean).join(' · ') || 'No note'}
                    </p>
                  </header>
                  <ArticlePicker
                    lines={selected.lines || []}
                    articleId={articleId}
                    onSelect={(id) => {
                      setArticleId(id);
                      setActiveKey('');
                      setCompleteError('');
                    }}
                  />
                  {!articleId ? <p className="text-sm text-[#4B5563]">Select an article to see its fabric and issue rolls.</p> : null}
                  {articleId && estimating ? <p className="text-sm text-[#4B5563]">Loading fabric for this article.</p> : null}
                  {estimateError ? (
                    <p className="text-sm text-red-700" role="alert">
                      {estimateError}
                    </p>
                  ) : null}
                  {issueError ? (
                    <p className="text-sm text-red-700" role="alert">
                      {issueError}
                    </p>
                  ) : null}
                  {articleId && !estimating ? (
                    <FabricRequirementTable
                      lines={visibleLines}
                      issues={issues.filter((row) => row.orderId === selected.id)}
                      showArticle={articleId === 'all'}
                      activeKey={activeKey}
                      canComplete={Boolean(selectedArticle) && selectedArticle?.fabricIssueStatus !== 'completed' && visibleLines.length > 0}
                      completing={completing}
                      completeError={completeError}
                      onIssue={(line) => setActiveKey(line.key)}
                      onComplete={markComplete}
                    />
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
      <IssueRollDrawer
        open={Boolean(activeLine) && activeLine?.fabricIssueStatus !== 'completed'}
        orderId={selected?.id || ''}
        orderNumber={selected?.orderNumber || ''}
        line={activeLine}
        onClose={() => setActiveKey('')}
        onIssued={() => setIssueTick((value) => value + 1)}
      />
      <IssueLogDrawer
        open={logsOpen}
        orderNumber={selected?.orderNumber || ''}
        rows={logRows}
        onClose={() => setLogsOpen(false)}
      />
    </RequireCrudPermission>
  );
}

/**
 * Article chips for the selected order, including every article at once.
 */
function ArticlePicker({
  lines,
  articleId,
  onSelect,
}: {
  lines: { id: string; factoryCode?: string; articleName?: string; quantity: number }[];
  articleId: string;
  onSelect: (id: string) => void;
}) {
  const total = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  return (
    <div role="group" aria-label="Select article" className="flex flex-wrap gap-2">
      <ArticleChip label="All" detail={String(total)} pressed={articleId === 'all'} onClick={() => onSelect('all')} />
      {lines.map((line) => (
        <ArticleChip
          key={line.id}
          label={articleLabel(line.factoryCode, line.articleName)}
          detail={String(line.quantity)}
          pressed={articleId === line.id}
          onClick={() => onSelect(line.id)}
        />
      ))}
    </div>
  );
}

/**
 * One article, or every article on the order.
 */
function ArticleChip({
  label,
  detail,
  pressed,
  onClick,
}: {
  label: string;
  detail: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-7 min-w-16 rounded-md border px-2 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        pressed ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span className="block max-w-[9rem] truncate text-xs font-bold text-[#111827]">{label}</span>
      <span className="block text-[11px] text-[#4B5563]">{detail}</span>
    </button>
  );
}
