'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  helpSupportFilesService,
  type HubFolder,
  type HubItem,
  getHubItemName,
  getHubItemMime,
  getHubItemFileUrl,
  getHubItemFileSize,
  isHubFolder,
} from '@/shared/services/helpSupportFilesService';
import { FileUploadService } from '@/shared/services/fileUploadService';
import DeleteHubItemConfirmModal from './DeleteHubItemConfirmModal';
import { resolveHubFileVisual, splitDisplayFileName } from '@/shared/utils/hubFileDisplay';

interface UploadProgressState {
  fileName: string;
  fileIndex: number;
  fileTotal: number;
  percent: number;
}

const getOverallUploadPercent = (progress: UploadProgressState) =>
  Math.round(((progress.fileIndex - 1 + progress.percent / 100) / progress.fileTotal) * 100);

/**
 * Shared file workspace for Management and Dev team.
 */
export default function FilesTab() {
  const [items, setItems] = useState<HubItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<HubFolder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HubItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRoot = useCallback(async () => {
    setLoading(true);
    try {
      const res = await helpSupportFilesService.getRootFolders();
      setItems(res.results || []);
      setCurrentFolder(null);
      setBreadcrumbs([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  const openFolder = useCallback(async (folder: HubFolder) => {
    setLoading(true);
    try {
      const res = await helpSupportFilesService.getFolderContents(folder.id);
      const resolvedFolder = isHubFolder(res.folder) ? res.folder : folder;
      setCurrentFolder(resolvedFolder);
      setItems(res.contents.results || []);
      setBreadcrumbs((prev) => {
        const exists = prev.find((b) => b.id === folder.id);
        if (exists) return prev.slice(0, prev.indexOf(exists) + 1);
        return [...prev, { id: folder.id, name: getHubItemName(folder) }];
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open folder');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const created = await helpSupportFilesService.createFolder(
        newFolderName.trim(),
        currentFolder?.id || null,
        newFolderDescription.trim() || undefined
      );
      toast.success('Folder created');
      setNewFolderName('');
      setNewFolderDescription('');
      setShowNewFolder(false);
      setItems((prev) => {
        const exists = prev.some((item) => item.id === created.id);
        if (exists) return prev;
        return [...prev, created];
      });
      if (currentFolder) await openFolder(currentFolder);
      else await loadRoot();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  const processUploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || uploading) return;
      if (!currentFolder) {
        toast.error('Open a folder first — files must be uploaded inside a folder');
        return;
      }

      setUploading(true);
      let uploadedCount = 0;

      try {
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          setUploadProgress({
            fileName: file.name,
            fileIndex: index + 1,
            fileTotal: files.length,
            percent: 0,
          });

          const uploaded = await helpSupportFilesService.uploadToS3(file, (percent) => {
            setUploadProgress({
              fileName: file.name,
              fileIndex: index + 1,
              fileTotal: files.length,
              percent,
            });
          });

          await helpSupportFilesService.registerFile({
            fileName: uploaded.fileName || file.name,
            fileUrl: uploaded.url || '',
            fileKey: uploaded.key || '',
            parentFolder: currentFolder.id,
            fileSize: uploaded.size,
            mimeType: uploaded.mimeType,
          });
          uploadedCount += 1;
        }

        toast.success(uploadedCount === 1 ? 'File uploaded' : `${uploadedCount} files uploaded`);
        if (currentFolder) await openFolder(currentFolder);
        else await loadRoot();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploadProgress(null);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [currentFolder, loadRoot, openFolder, uploading]
  );

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    await processUploadFiles(Array.from(files));
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (uploading || !canUpload) return;
    setIsDragOver(true);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (uploading || !canUpload) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    if (uploading || !canUpload) return;
    const droppedFiles = Array.from(event.dataTransfer.files || []);
    if (!droppedFiles.length) return;
    await processUploadFiles(droppedFiles);
  };

  const handleDeleteRequest = (event: React.MouseEvent, item: HubItem) => {
    event.stopPropagation();
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (isHubFolder(deleteTarget)) await helpSupportFilesService.deleteFolder(deleteTarget.id);
      else await helpSupportFilesService.deleteFile(deleteTarget.id);
      toast.success('Deleted');
      setDeleteTarget(null);
      if (currentFolder) await openFolder(currentFolder);
      else await loadRoot();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleItemActivate = (item: HubItem) => {
    if (isHubFolder(item)) {
      openFolder(item);
      return;
    }
    window.open(getHubItemFileUrl(item), '_blank', 'noopener,noreferrer');
  };

  const navigateBreadcrumb = async (index: number) => {
    if (index < 0) {
      await loadRoot();
      return;
    }
    const crumb = breadcrumbs[index];
    await openFolder({ id: crumb.id, type: 'folder', folder: { name: crumb.name, path: crumb.name } } as HubFolder);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleBack = async () => {
    if (!currentFolder) return;
    if (breadcrumbs.length <= 1) {
      await loadRoot();
      return;
    }
    await navigateBreadcrumb(breadcrumbs.length - 2);
  };

  const backLabel =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].name : 'Shared Files';

  const folderItems = items.filter(isHubFolder);
  const fileItems = items.filter((item) => !isHubFolder(item));
  const canUpload = Boolean(currentFolder);

  const renderItemCard = (item: HubItem) => {
    const name = getHubItemName(item);
    const mime = getHubItemMime(item);
    const folderItem = isHubFolder(item) ? item : null;
    const fileParts = folderItem ? null : splitDisplayFileName(name);
    const visual = folderItem
      ? { icon: 'ri-folder-3-fill', label: 'Folder', colorClass: 'text-amber-600', bgClass: 'bg-amber-50 ring-amber-100' }
      : resolveHubFileVisual(name, mime);
    const description =
      folderItem?.folder?.description?.trim() || (folderItem ? 'Click to open and upload files inside' : undefined);

    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={() => handleItemActivate(item)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleItemActivate(item);
          }
        }}
        title={name}
        className="group relative flex min-h-[112px] cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${visual.bgClass}`}
          >
            <i className={`${visual.icon} text-2xl ${visual.colorClass}`} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pr-6">
            {folderItem ? (
              <>
                <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-gray-900 group-hover:text-indigo-700">
                  {name}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{description}</p>
              </>
            ) : (
              <>
                <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-gray-900 group-hover:text-indigo-700">
                  {fileParts?.base || name}
                  {fileParts?.ext ? (
                    <span className="whitespace-nowrap font-bold text-indigo-600">{fileParts.ext}</span>
                  ) : null}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${visual.bgClass} ${visual.colorClass}`}>
                    {visual.label}
                  </span>
                  <span className="text-[10px] text-gray-500">{FileUploadService.formatFileSize(getHubItemFileSize(item))}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => handleDeleteRequest(event, item)}
          className="absolute right-3 top-3 rounded-md p-1.5 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
          aria-label={`Delete ${name}`}
        >
          <i className="ri-delete-bin-line text-base" aria-hidden />
        </button>
      </div>
    );
  };

  const renderItemSection = (title: string, sectionItems: HubItem[]) => {
    if (!sectionItems.length) return null;
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
            {sectionItems.length}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sectionItems.map(renderItemCard)}</div>
      </section>
    );
  };

  if (loading && !items.length) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div
      className="relative space-y-4"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && !uploading && canUpload && currentFolder && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/90 backdrop-blur-[1px]">
          <div className="text-center">
            <i className="ri-upload-cloud-2-line text-4xl text-indigo-600" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-indigo-700">Drop files to upload</p>
            <p className="mt-1 text-xs text-indigo-600/80">Uploading to {getHubItemName(currentFolder)}</p>
          </div>
        </div>
      )}

      {uploadProgress && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-indigo-900">
                Uploading {uploadProgress.fileIndex} of {uploadProgress.fileTotal}
              </p>
              <p className="truncate text-indigo-700/80">{uploadProgress.fileName}</p>
            </div>
            <span className="shrink-0 font-bold text-indigo-700">{getOverallUploadPercent(uploadProgress)}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width] duration-150 ease-out"
              style={{ width: `${getOverallUploadPercent(uploadProgress)}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {currentFolder && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <i className="ri-arrow-left-line text-sm" aria-hidden />
              Back to {backLabel}
            </button>
          )}
          <nav className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-gray-600" aria-label="Folder path">
            <button type="button" onClick={() => navigateBreadcrumb(-1)} className="font-semibold text-indigo-600 hover:underline">
              Shared Files
            </button>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.id}>
                <span className="text-gray-400">/</span>
                <button type="button" onClick={() => navigateBreadcrumb(i)} className="font-semibold text-indigo-600 hover:underline">
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowNewFolder(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <i className="ri-folder-add-line" aria-hidden /> New Folder
          </button>
          {canUpload && (
            <>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <i className="ri-upload-2-line" aria-hidden />
                {uploading ? 'Uploading…' : 'Upload Files'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </>
          )}
        </div>
      </div>

      {showNewFolder && (
        <div className="flex flex-col gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name (e.g. Design Assets, Excel Reports)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={newFolderDescription}
            onChange={(e) => setNewFolderDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleCreateFolder} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName('');
                setNewFolderDescription('');
              }}
              className="text-xs text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!items.length ? (
        currentFolder ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center transition ${
              uploading
                ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-70'
                : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
            }`}
          >
            <i
              className={`text-4xl ${uploading ? 'ri-loader-4-line animate-spin text-indigo-400' : 'ri-upload-cloud-2-line text-gray-300'}`}
              aria-hidden
            />
            <p className="mt-3 text-sm font-medium text-gray-600">This folder is empty</p>
            <p className="mt-1 max-w-md text-xs text-gray-500">
              Drag and drop files here, or click to browse. PDFs, images, Excel, and more (max 25MB).
            </p>
            {!uploading && (
              <span className="mt-4 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
                <i className="ri-upload-2-line" aria-hidden />
                Choose files
              </span>
            )}
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <i className="ri-folder-add-line text-4xl text-gray-300" aria-hidden />
            <p className="mt-3 text-sm font-medium text-gray-600">No folders yet</p>
            <p className="mt-1 max-w-md text-xs text-gray-500">
              Create folders for each topic (e.g. Design Assets, Excel Reports, Specs). Open a folder to upload files
              inside it.
            </p>
            <button
              type="button"
              onClick={() => setShowNewFolder(true)}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <i className="ri-folder-add-line" aria-hidden />
              New Folder
            </button>
          </div>
        )
      ) : (
        <div className="space-y-6">
          {renderItemSection(currentFolder ? 'Subfolders' : 'Folders', folderItems)}
          {currentFolder && renderItemSection('Files in this folder', fileItems)}
          {!currentFolder && fileItems.length > 0 && renderItemSection('Legacy files at root', fileItems)}
        </div>
      )}
      <DeleteHubItemConfirmModal
        open={Boolean(deleteTarget)}
        item={deleteTarget}
        deleting={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
