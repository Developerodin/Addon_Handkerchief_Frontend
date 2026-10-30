'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { FactoryDrawer } from '@/shared/components/factory/FactoryDrawer';
import { OrderLogPanel } from '@/shared/components/factory/OrderLogPanel';
import { UiIconButton, UiListEmpty, UiListError, UiListLoading, UiPagination, UiStatusBadge, UiTable } from '@/shared/components/ui';
import { useFactoryList } from '@/shared/hooks/useFactoryList';
import { factoryRequest, OrderDetail, ProductionOrderRow } from '@/shared/services/factoryApi';
import { ArticleViewTab, FabricEstimationTab, UpcomingTab } from './OrderExtraTabs';
import { FabricIssueFigures } from '@/app/store/issue/FabricIssueFigures';
import { issueBadge } from '@/app/store/issue/fabricIssueMath';
import { IssueStatusBadge } from '@/app/store/issue/IssueStatusBadge';
import { orderDateLabel, orderStatusLabel, priorityTone } from './orderLabels';
import { OrderView } from './OrderView';

const TABS = [
  ['orders', 'Orders'],
  ['articles', 'Article view'],
  ['fabric', 'Fabric estimation'],
  ['upcoming', 'Upcoming view'],
] as const;

const TILES = [
  ['in-progress', 'In progress', 'bg-blue-50 border-blue-100 text-blue-700', 'text-blue-900'],
  ['completed', 'Completed', 'bg-green-50 border-green-100 text-green-700', 'text-green-900'],
  ['pending', 'Pending', 'bg-yellow-50 border-yellow-100 text-yellow-700', 'text-yellow-900'],
  ['on-hold', 'On hold', 'bg-red-50 border-red-100 text-red-700', 'text-red-900'],
] as const;

/**
 * Production orders list. Header matches the supervisor screen: tiles, underline tabs, one filter row.
 */
export default function ProductionOrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('orders');
  const [tile, setTile] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [showFilters, setShowFilters] = useState(false);
  const list = useFactoryList<ProductionOrderRow>(
    '/production/orders',
    {
      ...(tile ? { tile } : {}),
      ...(status && !tile ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(sort === 'createdAt:asc' ? { sort } : {}),
    },
    10
  );
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [logOrderId, setLogOrderId] = useState('');
  const [error, setError] = useState('');
  const counts = list.counts || { pending: 0, inProgress: 0, completed: 0, onHold: 0 };
  const countFor = (id: string) =>
    id === 'pending' ? counts.pending : id === 'in-progress' ? counts.inProgress : id === 'completed' ? counts.completed : counts.onHold;
  const filtersOn = Boolean(status || priority || list.search || tile);

  /**
   * Puts the order on hold or takes it off.
   */
  const toggleHold = async (row: ProductionOrderRow) => {
    setError('');
    try {
      await factoryRequest(`/production/orders/${row.id}/hold`, {
        method: 'POST',
        body: JSON.stringify({ hold: row.status !== 'on-hold' }),
      });
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change hold');
    }
  };

  return (
    <RequireCrudPermission path="Production / Orders" action="read">
      <div className="main-content !p-[10px]">
        <Seo title="Production orders" />
        <div className="relative border border-gray-100 bg-white shadow-sm">
          <div className="p-[10px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-[3px] rounded-full bg-purple-600" />
                <h1 className="text-sm font-bold text-gray-800">Production orders</h1>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 shadow-sm">{list.total}</span>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1f1235] text-[10px] font-bold text-white"
                  title="Orders, article view, fabric estimation, and upcoming floors."
                >
                  i
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] shadow-sm hover:bg-gray-50 disabled:opacity-60"
                  onClick={() => list.reload().catch(() => undefined)}
                  disabled={list.loading}
                >
                  <i className={`ri-refresh-line text-xs ${list.loading ? 'animate-spin' : ''}`} aria-hidden /> Refresh
                </button>
                <Link
                  href="/production/orders/add"
                  className="flex items-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700"
                >
                  <i className="ri-add-line text-xs" aria-hidden /> Add New Order
                </Link>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Order counts">
              {TILES.map(([id, label, tone, numberTone]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={tile === id}
                  className={`flex items-center justify-between rounded border p-2 ${tone} ${tile === id ? 'ring-2 ring-purple-600' : ''}`}
                  onClick={() => {
                    setTab('orders');
                    setStatus('');
                    setTile((current) => (current === id ? '' : id));
                    list.setPage(1);
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
                  <span className={`text-sm font-bold ${numberTone}`}>{countFor(id)}</span>
                </button>
              ))}
            </div>

            <div className="flex border-b border-gray-200" role="tablist" aria-label="Production order views">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`border-b-2 px-3 py-2 text-[11px] font-bold ${tab === id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'orders' ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-[10px]">
              <button
                type="button"
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-bold ${showFilters ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-200 bg-white text-[#495057] hover:bg-gray-50'}`}
                aria-expanded={showFilters}
                onClick={() => setShowFilters((open) => !open)}
              >
                <i className="ri-filter-3-line text-xs" aria-hidden /> Filters {filtersOn ? <span aria-hidden>●</span> : null}
              </button>
              <label className="relative flex items-center">
                <span className="sr-only">Sort orders</span>
                <i className="ri-sort-desc pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400" aria-hidden />
                <select
                  aria-label="Sort orders"
                  className="appearance-none rounded border border-gray-200 bg-white py-1.5 pl-7 pr-6 text-[11px] font-bold text-[#495057]"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    list.setPage(1);
                  }}
                >
                  <option value="createdAt:desc">Newest first</option>
                  <option value="createdAt:asc">Oldest first</option>
                </select>
              </label>
              {filtersOn ? (
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold hover:bg-gray-50"
                  onClick={() => {
                    setStatus('');
                    setPriority('');
                    setTile('');
                    list.setSearch('');
                    list.setPage(1);
                  }}
                >
                  <i className="ri-close-line text-xs" aria-hidden /> Clear
                </button>
              ) : null}
              <div className="relative min-w-[140px] max-w-[240px] flex-1">
                <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400" aria-hidden />
                <input
                  aria-label="Search orders"
                  className="w-full rounded border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-[11px] font-medium placeholder:text-gray-400"
                  placeholder="Search order, article..."
                  value={list.search}
                  onChange={(event) => {
                    list.setSearch(event.target.value);
                    list.setPage(1);
                  }}
                />
              </div>
              <select
                aria-label="Rows per page"
                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-[#495057]"
                value={list.limit}
                onChange={(event) => {
                  list.setLimit(Number(event.target.value));
                  list.setPage(1);
                }}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    Show {size}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {tab === 'orders' && showFilters ? (
            <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50 p-[10px]">
              <select
                aria-label="Status"
                className="rounded border border-gray-200 bg-white px-2 py-1.5 text-[11px]"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setTile('');
                  list.setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="pending">Draft</option>
                <option value="released">Pending</option>
                <option value="in-progress">In progress</option>
                <option value="on-hold">On hold</option>
                <option value="closed">Completed</option>
              </select>
              <select
                aria-label="Priority"
                className="rounded border border-gray-200 bg-white px-2 py-1.5 text-[11px]"
                value={priority}
                onChange={(event) => {
                  setPriority(event.target.value);
                  list.setPage(1);
                }}
              >
                <option value="">All priorities</option>
                {['Urgent', 'High', 'Medium', 'Low'].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          ) : null}

          {error ? (
            <p className="px-4 py-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {tab === 'articles' ? <ArticleViewTab onLogs={setLogOrderId} /> : null}
          {tab === 'fabric' ? <FabricEstimationTab /> : null}
          {tab === 'upcoming' ? <UpcomingTab /> : null}
          {tab !== 'orders' ? null : list.loading ? (
            <UiListLoading />
          ) : list.error ? (
            <UiListError message={list.error} />
          ) : list.rows.length === 0 ? (
            <UiListEmpty icon="ri-file-list-line" canCreate addHref="/production/orders/add" addLabel="Add New Order" />
          ) : (
            <>
              <UiTable
                columns={[
                  {
                    key: 'order',
                    label: 'Order',
                    render: (row) => (
                      <span>
                        <span className="block text-[12px] font-bold text-gray-900">{row.orderNumber}</span>
                        {row.orderNote ? <span className="block max-w-[240px] truncate text-[11px] font-medium text-gray-700">{row.orderNote}</span> : null}
                        <span className="block text-[10px] text-gray-500">{orderDateLabel(row.orderDate)}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'articles',
                    label: 'Articles',
                    render: (row) => {
                      const names = (row.lines || []).map((line) => line.factoryCode || line.articleName).filter(Boolean);
                      return (
                        <span>
                          <span className="block text-[12px] font-semibold text-gray-800">{names.length ? names.join(', ') : '—'}</span>
                          <span className="block text-[10px] text-gray-500">
                            {row.articleCount || row.lines?.length || 1} · Qty {row.totalQty || row.targetQty}
                          </span>
                        </span>
                      );
                    },
                  },
                  { key: 'status', label: 'Status', render: (row) => <UiStatusBadge status={orderStatusLabel(row.status)} /> },
                  {
                    key: 'priority',
                    label: 'Priority',
                    render: (row) => {
                      const summary = row.fabricIssue || { status: 'not-issued' as const, rolls: 0, weightKg: 0, requiredMetres: 0 };
                      const badge = issueBadge(summary);
                      return (
                        <span className="grid gap-1">
                          <span className={`inline-flex w-fit items-center rounded px-2 py-0.5 text-[10px] font-medium ${priorityTone(row.priority)}`}>
                            {row.priority || 'Medium'}
                          </span>
                          <IssueStatusBadge status={badge.status} label={badge.label} />
                          <FabricIssueFigures summary={summary} />
                        </span>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    align: 'right',
                    render: (row) => (
                      <div className="flex items-center justify-end gap-1">
                        {(row.fabricIssue?.rolls || 0) > 0 ? (
                          <Link
                            href={`/store/fabric-return?orderId=${row.id}`}
                            className="inline-flex items-center rounded border border-gray-300 bg-white px-2 py-1 text-[10px] font-bold text-gray-800 hover:bg-gray-50"
                            aria-label={`Return fabric for ${row.orderNumber || 'order'}`}
                          >
                            Return
                          </Link>
                        ) : null}
                        <UiIconButton
                          icon="ri-eye-line"
                          tone="view"
                          title="View"
                          aria-label="View order"
                          onClick={async () => {
                            setError('');
                            try {
                              setDetail(await factoryRequest<OrderDetail>(`/production/orders/${row.id}`));
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Could not open the order');
                            }
                          }}
                        />
                        <UiIconButton icon="ri-file-list-3-line" tone="view" title="Logs" aria-label="Order logs" onClick={() => setLogOrderId(row.id)} />
                        <UiIconButton icon="ri-pencil-line" tone="edit" title="Edit" aria-label="Edit order" href={`/production/orders/${row.id}/edit`} />
                        {row.status !== 'pending' && row.status !== 'closed' ? (
                          <UiIconButton
                            icon="ri-pause-line"
                            tone="edit"
                            title={row.status === 'on-hold' ? 'Resume' : 'Hold'}
                            aria-label={row.status === 'on-hold' ? 'Resume order' : 'Hold order'}
                            onClick={() => toggleHold(row)}
                          />
                        ) : null}
                      </div>
                    ),
                  },
                ]}
                rows={list.rows}
                rowKey={(row) => row.id}
              />
              <UiPagination
                currentPage={list.page}
                totalPages={list.totalPages}
                totalResults={list.total}
                itemsPerPage={list.limit}
                onPageChange={list.setPage}
              />
            </>
          )}
        </div>
      </div>
      <FactoryDrawer
        title={detail?.order.orderNumber || 'Order'}
        subtitle={detail?.order.buyer || detail?.order.orderNote}
        status={detail ? orderStatusLabel(detail.order.status) : undefined}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <OrderView
            detail={detail}
            onChanged={async () => {
              setDetail(await factoryRequest<OrderDetail>(`/production/orders/${detail.order.id}`));
              await list.reload();
            }}
          />
        ) : null}
      </FactoryDrawer>
      <FactoryDrawer title="Order logs" subtitle="Who did what on this order" open={Boolean(logOrderId)} wide onClose={() => setLogOrderId('')}>
        {logOrderId ? <OrderLogPanel orderId={logOrderId} /> : null}
      </FactoryDrawer>
    </RequireCrudPermission>
  );
}
