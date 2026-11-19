"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
import { EQUIPMENT_ROLE_OPTIONS, PRODUCTION_FLOOR_OPTIONS } from '@/shared/constants/productionFloors';
import { userService, type User } from '@/shared/services/userService';
import { getMachine, listWorkers, updateMachine, type Worker } from '@/shared/services/phase3CatalogService';

const getSupervisorId = (ref?: string | { id?: string } | null): string => {
  if (!ref) return '';
  if (typeof ref === 'object') return ref.id || '';
  return ref;
};

const formatDateInput = (value?: string | null): string => {
  if (!value) return '';
  return value.split('T')[0];
};

function EditMachinePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    makeModel: '',
    floor: '',
    equipmentRole: 'machine' as 'machine' | 'table',
    capacityPerShift: '',
    maintenanceIntervalMonths: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    maintenanceNotes: '',
    assignedSupervisor: '',
    assignedOperator: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [userRes, workerRes] = await Promise.all([
          userService.getUsers({ limit: 200, sortBy: 'name:asc' }),
          listWorkers({ limit: 200 }),
        ]);
        setUsers(userRes.results || userRes.users || []);
        setWorkers(workerRes.results || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load machine lookups');
      } finally {
        setLoadingUsers(false);
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    const fetchMachine = async () => {
      try {
        const data = await getMachine(params.id);
        setFormData({
          name: data.name || '',
          code: data.code || '',
          makeModel: data.makeModel || '',
          floor: data.floor || '',
          equipmentRole: data.equipmentRole === 'table' ? 'table' : 'machine',
          capacityPerShift: data.capacityPerShift !== undefined ? String(data.capacityPerShift) : '',
          maintenanceIntervalMonths: data.maintenanceIntervalMonths !== undefined ? String(data.maintenanceIntervalMonths) : '',
          lastMaintenanceDate: formatDateInput(data.lastMaintenanceDate),
          nextMaintenanceDate: formatDateInput(data.nextMaintenanceDate),
          maintenanceNotes: data.maintenanceNotes || '',
          assignedSupervisor: getSupervisorId(data.assignedSupervisor),
          assignedOperator: getSupervisorId(data.assignedOperator),
          status: data.status || 'active',
        });
      } catch (error) {
        console.error('Error fetching machine:', error);
        toast.error('Failed to load machine');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMachine();
  }, [params.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    const capacityPerShift = formData.capacityPerShift.trim()
      ? parseInt(formData.capacityPerShift, 10)
      : undefined;
    const maintenanceIntervalMonths = formData.maintenanceIntervalMonths.trim()
      ? parseInt(formData.maintenanceIntervalMonths, 10)
      : undefined;

    if (formData.capacityPerShift.trim() && (isNaN(capacityPerShift!) || capacityPerShift! < 0)) {
      alert('Capacity per shift must be a valid number (0 or greater)');
      return;
    }
    if (formData.maintenanceIntervalMonths.trim() && (isNaN(maintenanceIntervalMonths!) || maintenanceIntervalMonths! < 0)) {
      alert('Maintenance interval must be a valid number (0 or greater)');
      return;
    }

    const loadingToast = toast.loading('Updating machine...');
    try {
      setIsSaving(true);
      await updateMachine(params.id, {
        name: formData.name.trim(),
        code: formData.code.trim(),
        makeModel: formData.makeModel.trim(),
        floor: formData.floor.trim(),
        equipmentRole: formData.equipmentRole,
        capacityPerShift,
        maintenanceIntervalMonths,
        lastMaintenanceDate: formData.lastMaintenanceDate || null,
        nextMaintenanceDate: formData.nextMaintenanceDate || null,
        maintenanceNotes: formData.maintenanceNotes.trim(),
        assignedSupervisor: formData.assignedSupervisor || null,
        assignedOperator: formData.assignedOperator || null,
        status: formData.status,
      });
      toast.success('Machine updated successfully', { id: loadingToast });
      router.push('/catalog/machines');
    } catch (error) {
      console.error('Error updating machine:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update machine');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content catalog-master-form">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Edit Machine"
        title="Edit Machine"
        listHref="/catalog/machines"
        listLabel="Machines"
        currentLabel="Edit"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Name</label>
            <input type="text" id="name" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="code" className="form-label">Code</label>
            <input type="text" id="code" name="code" className="form-control" value={formData.code} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="makeModel" className="form-label">Make / Model</label>
            <input type="text" id="makeModel" name="makeModel" className="form-control" value={formData.makeModel} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="floor" className="form-label">Production floor</label>
            <select id="floor" name="floor" className="form-select" value={formData.floor} onChange={handleInputChange}>
              <option value="">Select floor</option>
              {PRODUCTION_FLOOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="equipmentRole" className="form-label">Equipment type</label>
            <select
              id="equipmentRole"
              name="equipmentRole"
              className="form-select"
              value={formData.equipmentRole}
              onChange={handleInputChange}
            >
              {EQUIPMENT_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="capacityPerShift" className="form-label">Capacity Per Shift</label>
            <input type="number" id="capacityPerShift" name="capacityPerShift" className="form-control" min="0" value={formData.capacityPerShift} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="maintenanceIntervalMonths" className="form-label">Maintenance Interval (Months)</label>
            <input type="number" id="maintenanceIntervalMonths" name="maintenanceIntervalMonths" className="form-control" min="0" value={formData.maintenanceIntervalMonths} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="lastMaintenanceDate" className="form-label">Last Maintenance Date</label>
            <input type="date" id="lastMaintenanceDate" name="lastMaintenanceDate" className="form-control" value={formData.lastMaintenanceDate} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="nextMaintenanceDate" className="form-label">Next Maintenance Date</label>
            <input type="date" id="nextMaintenanceDate" name="nextMaintenanceDate" className="form-control" value={formData.nextMaintenanceDate} onChange={handleInputChange} />
          </div>
          <div className="form-group md:col-span-2">
            <label htmlFor="maintenanceNotes" className="form-label">Maintenance Notes</label>
            <textarea id="maintenanceNotes" name="maintenanceNotes" className="form-control" value={formData.maintenanceNotes} onChange={handleInputChange} rows={3} />
          </div>
          <div className="form-group">
            <label htmlFor="assignedSupervisor" className="form-label">Assigned Supervisor</label>
            <select
              id="assignedSupervisor"
              name="assignedSupervisor"
              className="form-select"
              value={formData.assignedSupervisor}
              onChange={handleInputChange}
              disabled={loadingUsers}
            >
              <option value="">Select Supervisor</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}{user.email ? ` (${user.email})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="assignedOperator" className="form-label">Assigned Operator</label>
            <select
              id="assignedOperator"
              name="assignedOperator"
              className="form-select"
              aria-label="Assigned operator"
              value={formData.assignedOperator}
              onChange={handleInputChange}
              disabled={loadingUsers}
            >
              <option value="">Select Operator</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}{worker.employeeCode ? ` (${worker.employeeCode})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="status" className="form-label">Status</label>
            <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <UiFormFooter
            submitLabel="Update Machine"
            isLoading={isSaving}
            onCancel={() => router.push('/catalog/machines')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
}

export default function EditMachinePageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Machines & Configuration" action="update">
      <EditMachinePage params={params} />
    </RequireCrudPermission>
  );
}
