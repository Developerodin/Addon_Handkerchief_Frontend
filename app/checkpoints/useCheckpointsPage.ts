'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import checkpointService from '@/shared/services/checkpointService';
import type { CheckpointItem, CheckpointModule } from '@/shared/types/checkpoint';
import { canManageCheckpointStructure, canToggleSignOff, type SignOffRequest } from './checkpointAccess';
import type { CheckpointFormMode } from './components/CheckpointFormModal';

export type ConfirmTarget =
  | { kind: 'module'; module: CheckpointModule }
  | { kind: 'item'; item: CheckpointItem };

interface AuthUser {
  role?: string;
  email?: string;
}

/**
 * Loads checkpoint modules and runs create, edit, delete, and sign-off actions.
 */
export function useCheckpointsPage() {
  const user = useSelector((state: { auth?: { user?: AuthUser } }) => state.auth?.user);
  const canManage = canManageCheckpointStructure(user?.email);
  const canToggle = canToggleSignOff(user?.email);

  const [modules, setModules] = useState<CheckpointModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [form, setForm] = useState<CheckpointFormMode | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [signOffRequest, setSignOffRequest] = useState<SignOffRequest | null>(null);
  const [logItem, setLogItem] = useState<CheckpointItem | null>(null);
  const [selectedId, setSelectedId] = useState('');

  const load = useCallback(async () => {
    const data = await checkpointService.list();
    setModules(data.modules);
    setError('');
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    checkpointService
      .list()
      .then((data) => {
        if (!active) return;
        setModules(data.modules);
        setError('');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load checkpoints');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!modules.length) {
      setSelectedId('');
      return;
    }
    if (!modules.some((module) => module.id === selectedId)) {
      setSelectedId(modules[0].id);
    }
  }, [modules, selectedId]);

  /**
   * Saves the open module or checkpoint form, then reloads the list.
   */
  const submitForm = async (mode: CheckpointFormMode) => {
    if (mode.kind === 'module') {
      if (mode.moduleId) await checkpointService.updateModule(mode.moduleId, mode.name);
      else await checkpointService.createModule(mode.name);
    } else if (mode.itemId) {
      await checkpointService.updateItem(mode.itemId, {
        title: mode.title,
        description: mode.description,
      });
    } else {
      await checkpointService.createItem(mode.moduleId, {
        title: mode.title,
        description: mode.description,
      });
    }
    setForm(null);
    try {
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Saved, but the list could not refresh';
      setError(message);
      toast.error(message);
    }
  };

  /**
   * Deletes the module or checkpoint waiting in the confirm dialog.
   */
  const confirmDelete = async () => {
    if (!confirm) return;
    setConfirming(true);
    try {
      if (confirm.kind === 'module') await checkpointService.deleteModule(confirm.module.id);
      else await checkpointService.deleteItem(confirm.item.id);
      setConfirm(null);
      if (confirm.kind === 'item' && logItem?.id === confirm.item.id) setLogItem(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setConfirming(false);
    }
  };

  /**
   * Applies the sign-off waiting in the confirm modal, then refreshes complete flags.
   */
  const confirmSignOff = async () => {
    if (!signOffRequest || pendingKey) return;
    const request = signOffRequest;
    setPendingKey(`${request.item.id}:${request.column}`);
    try {
      await checkpointService.signOff(request.item.id, request.column, request.checked);
      setSignOffRequest(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-off failed');
    } finally {
      setPendingKey(null);
    }
  };

  /**
   * Saves a pendency remark when the cell loses focus.
   * @returns false when the save failed
   */
  const saveRemark = async (item: CheckpointItem, pendencyRemark: string): Promise<boolean> => {
    if (pendencyRemark === (item.pendencyRemark || '')) return true;
    try {
      await checkpointService.updateRemark(item.id, pendencyRemark);
      await load();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the remark');
      return false;
    }
  };

  return {
    canManage,
    canEdit: canToggle,
    modules,
    selectedId,
    setSelectedId,
    loading,
    error,
    pendingKey,
    form,
    setForm,
    confirm,
    setConfirm,
    confirming,
    confirmDelete,
    signOffRequest,
    setSignOffRequest,
    confirmSignOff,
    logItem,
    setLogItem,
    submitForm,
    saveRemark,
  };
}
