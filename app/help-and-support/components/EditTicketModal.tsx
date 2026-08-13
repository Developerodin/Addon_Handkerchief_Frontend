'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { helpSupportService } from '@/shared/services/helpSupportService';
import type {
  HelpSupportTicket,
  TicketAttachment,
  TicketCategory,
  TicketPriority,
} from '@/shared/types/helpSupport';
import HubFilterSelect from './HubFilterSelect';
import TicketConfirmModal from './TicketConfirmModal';
import TicketDocumentUploader from './TicketDocumentUploader';

interface EditTicketModalProps {
  open: boolean;
  ticket: HelpSupportTicket | null;
  onClose: () => void;
  onUpdated: () => void;
}

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'New Feature Request' },
  { value: 'how_to', label: 'How To' },
  { value: 'data_issue', label: 'Data Issue' },
  { value: 'access', label: 'Access' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function EditTicketModal({ open, ticket, onClose, onUpdated }: EditTicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [points, setPoints] = useState<string[]>(['']);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open || !ticket) return;
    setTitle(ticket.title || '');
    setDescription(ticket.description || '');
    setCategory(ticket.category || 'other');
    setPriority(ticket.priority || 'medium');
    setPoints(ticket.pointsToBeCovered?.length ? ticket.pointsToBeCovered : ['']);
    setAttachments(ticket.attachments || []);
  }, [open, ticket]);

  if (!open || !ticket) return null;

  const saveChanges = async () => {
    setSubmitting(true);
    try {
      await helpSupportService.updateTicket(ticket.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        pointsToBeCovered: points.map((p) => p.trim()).filter(Boolean),
        attachments,
      });
      toast.success('Ticket updated');
      setConfirmOpen(false);
      onClose();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setConfirmOpen(true);
  };

  const handleAttachmentsUpdated = async (next: TicketAttachment[]) => {
    setAttachments(next);
    try {
      await helpSupportService.updateTicket(ticket.id, { attachments: next });
      toast.success('Documents updated');
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save documents');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase text-indigo-600">{ticket.ticketNumber}</p>
              <h2 className="text-base font-bold text-gray-900">Edit Ticket</h2>
              <p className="mt-1 text-xs text-gray-500">Update ticket details and documents.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <i className="ri-close-line text-lg" aria-hidden />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <HubFilterSelect
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                wrapperClassName="w-full"
                aria-label="Category"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </HubFilterSelect>
              <HubFilterSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                wrapperClassName="w-full"
                aria-label="Priority"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </HubFilterSelect>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title *"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              required
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-gray-700">Points to be covered</legend>
              <div className="space-y-2">
                {points.map((point, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const next = [...points];
                        next[idx] = e.target.value;
                        setPoints(next);
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder={`Point ${idx + 1}`}
                    />
                    {points.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPoints(points.filter((_, i) => i !== idx))}
                        className="rounded-lg border border-gray-300 px-2.5 text-gray-500 hover:text-red-500"
                      >
                        <i className="ri-subtract-line" aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPoints([...points, ''])}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  + Add point
                </button>
              </div>
            </fieldset>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-700">Documents</p>
              <TicketDocumentUploader
                ticketId={ticket.id}
                ticketNumber={ticket.ticketNumber}
                existingAttachments={attachments}
                disabled={submitting || uploadingDocs}
                onUploadingChange={setUploadingDocs}
                onAttachmentsChange={handleAttachmentsUpdated}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingDocs}
                className="inline-flex min-w-[130px] items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Save changes
              </button>
            </div>
          </form>
        </div>
      </div>

      <TicketConfirmModal
        open={confirmOpen}
        title="Save ticket changes?"
        message="This will update the ticket details for all viewers."
        confirmLabel="Save changes"
        busy={submitting}
        iconClassName="ri-save-line"
        onConfirm={saveChanges}
        onCancel={() => !submitting && setConfirmOpen(false)}
      />
    </>
  );
}
