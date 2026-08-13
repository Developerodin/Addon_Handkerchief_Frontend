'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { helpSupportService } from '@/shared/services/helpSupportService';
import { uploadTicketDocuments } from '@/shared/utils/ticketDocumentUpload';
import type { HelpSupportTicket } from '@/shared/types/helpSupport';
import { isHelpSupportAgent, canDeleteHelpSupportTickets } from '../helpSupportConstants';
import RaiseTicketModal from './RaiseTicketModal';
import EditTicketModal from './EditTicketModal';
import TicketTable, { TicketFilters } from './TicketTable';
import AnalyticsTab from './AnalyticsTab';
import DeleteTicketConfirmModal from './DeleteTicketConfirmModal';

interface TicketsTabProps {
  isManagement: boolean;
  userRole?: string;
  userEmail?: string;
}

type SubTab = 'list' | 'analytics';

/**
 * Issue tickets — raise, track, and resolve problems.
 */
export default function TicketsTab({ isManagement, userRole, userEmail }: TicketsTabProps) {
  const isAgent = isManagement || isHelpSupportAgent(userRole, userEmail);
  const canDelete = canDeleteHelpSupportTickets(userEmail);

  const [subTab, setSubTab] = useState<SubTab>('list');
  const [tickets, setTickets] = useState<HelpSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filters, setFilters] = useState<TicketFilters>({
    status: '',
    priority: '',
    disposition: '',
    category: '',
    search: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<HelpSupportTicket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<HelpSupportTicket | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await helpSupportService.listTickets({
        page,
        limit,
        ...(filters.status && { status: filters.status as HelpSupportTicket['status'] }),
        ...(filters.priority && { priority: filters.priority as HelpSupportTicket['priority'] }),
        ...(filters.disposition && { disposition: filters.disposition as HelpSupportTicket['disposition'] }),
        ...(filters.category && { category: filters.category as NonNullable<HelpSupportTicket['category']> }),
        ...(filters.search.trim() && { search: filters.search.trim() }),
        sortBy: 'createdAt:desc',
      });
      setTickets(res.results);
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    if (subTab === 'list') loadTickets();
  }, [subTab, loadTickets]);

  const openEditTicket = async (ticket: HelpSupportTicket) => {
    setTicketToEdit(ticket);
    setEditModalOpen(true);
    try {
      const full = await helpSupportService.getTicket(ticket.id);
      setTicketToEdit(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load ticket for editing');
    }
  };

  const handleCreate = async (payload: Parameters<typeof helpSupportService.createTicket>[0], pendingFiles: File[]) => {
    const created = await helpSupportService.createTicket(payload);
    if (pendingFiles.length) {
      const attachments = await uploadTicketDocuments(pendingFiles, created.id, created.ticketNumber);
      await helpSupportService.updateTicket(created.id, { attachments });
    }
    toast.success('Ticket raised successfully');
    setPage(1);
    loadTickets();
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    setDeleting(true);
    try {
      await helpSupportService.deleteTicket(ticketToDelete.id);
      toast.success(`Ticket ${ticketToDelete.ticketNumber} deleted`);
      setTicketToDelete(null);
      if (tickets.length === 1 && page > 1) setPage(page - 1);
      else loadTickets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete ticket');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border-b">
          <button
            type="button"
            onClick={() => setSubTab('list')}
            className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-bold ${subTab === 'list' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}
          >
            All Tickets
          </button>
          {isAgent && (
            <button
              type="button"
              onClick={() => setSubTab('analytics')}
              className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-bold ${subTab === 'analytics' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}
            >
              Analytics
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <i className="ri-add-line text-base" aria-hidden /> Raise Ticket
        </button>
      </div>

      {subTab === 'list' ? (
        <TicketTable
          tickets={tickets}
          loading={loading}
          isAgent={isAgent}
          canDelete={canDelete}
          onDeleteTicket={setTicketToDelete}
          onEditTicket={isAgent ? openEditTicket : undefined}
          page={page}
          limit={limit}
          totalPages={totalPages}
          totalResults={totalResults}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          filters={filters}
          onFilterChange={(key, value) => { setFilters((p) => ({ ...p, [key]: value })); setPage(1); }}
          onResetFilters={() => { setFilters({ status: '', priority: '', disposition: '', category: '', search: '' }); setPage(1); }}
        />
      ) : (
        <AnalyticsTab />
      )}

      <RaiseTicketModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />
      <EditTicketModal
        open={editModalOpen}
        ticket={ticketToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setTicketToEdit(null);
        }}
        onUpdated={loadTickets}
      />
      <DeleteTicketConfirmModal
        open={Boolean(ticketToDelete)}
        ticket={ticketToDelete}
        deleting={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setTicketToDelete(null)}
      />
    </div>
  );
}
