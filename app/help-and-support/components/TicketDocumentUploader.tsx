'use client';

import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { MAX_UPLOAD_FILE_SIZE_MB } from '@/shared/services/fileUploadService';
import type { TicketAttachment } from '@/shared/types/helpSupport';
import { uploadTicketDocuments } from '@/shared/utils/ticketDocumentUpload';

interface TicketDocumentUploaderProps {
  ticketId?: string;
  ticketNumber?: string;
  existingAttachments?: TicketAttachment[];
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  /** Create flow — selected files before ticket exists */
  onPendingFilesChange?: (files: File[]) => void;
  /** Update flow — merged attachments after upload */
  onAttachmentsChange?: (attachments: TicketAttachment[]) => void;
}

export default function TicketDocumentUploader({
  ticketId,
  ticketNumber,
  existingAttachments = [],
  disabled = false,
  onUploadingChange,
  onPendingFilesChange,
  onAttachmentsChange,
}: TicketDocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ fileName: string; percent: number } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const canUploadToHub = Boolean(ticketId && ticketNumber);

  const updatePending = (files: File[]) => {
    setPendingFiles(files);
    onPendingFilesChange?.(files);
  };

  const handlePick = async (fileList: FileList | null) => {
    if (!fileList?.length || disabled || uploading) return;

    const files = Array.from(fileList).filter((f) => {
      if (f.size > MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds ${MAX_UPLOAD_FILE_SIZE_MB}MB`);
        return false;
      }
      return true;
    });
    if (!files.length) return;

    if (!canUploadToHub) {
      updatePending([...pendingFiles, ...files]);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    try {
      const uploaded = await uploadTicketDocuments(files, ticketId!, ticketNumber!, (fileName, percent) => {
        setProgress({ fileName, percent });
      });
      onAttachmentsChange?.([...existingAttachments, ...uploaded]);
      toast.success(uploaded.length === 1 ? 'Document uploaded' : `${uploaded.length} documents uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removePending = (index: number) => {
    updatePending(pendingFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 disabled:opacity-50"
      >
        <i className="ri-attachment-2" aria-hidden />
        {uploading ? 'Uploading…' : 'Add documents (optional)'}
      </button>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handlePick(e.target.files)} />
      {!canUploadToHub && pendingFiles.length > 0 && (
        <ul className="space-y-1">
          {pendingFiles.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
            >
              <span className="truncate text-gray-700">{file.name}</span>
              <button type="button" onClick={() => removePending(index)} className="text-gray-400 hover:text-red-500">
                <i className="ri-close-line" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {progress && (
        <p className="text-[11px] text-indigo-600">
          Uploading {progress.fileName}… {progress.percent}%
        </p>
      )}
      <p className="text-[10px] text-gray-500">
        Single or multiple files, max {MAX_UPLOAD_FILE_SIZE_MB}MB each. Stored in Ticket Documents folder.
      </p>
    </div>
  );
}
