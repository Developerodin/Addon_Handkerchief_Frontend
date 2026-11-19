"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
import { EQUIPMENT_ROLE_OPTIONS, PRODUCTION_FLOOR_OPTIONS } from '@/shared/constants/productionFloors';
import { userService, type User } from '@/shared/services/userService';
import { createMachine, listWorkers, type Worker } from '@/shared/services/phase3CatalogService';

const AddMachinePage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setIsLoading(true);
      await createMachine({
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
      toast.success('Machine created successfully');
      router.push('/catalog/machines');
    } catch (err) {
      console.error('Error creating machine:', err);
      alert(err instanceof Error ? err.message : 'Failed to create machine');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Add Machine"
        title="Add Machine"
        listHref="/catalog/machines"
        listLabel="Machines"
        currentLabel="Add"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Name</label>
            <input type="text" id="name" name="name" className="form-control" placeholder="Machine name" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="code" className="form-label">Code</label>
            <input type="text" id="code" name="code" className="form-control" placeholder="Machine code" value={formData.code} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="makeModel" className="form-label">Make / Model</label>
            <input type="text" id="makeModel" name="makeModel" className="form-control" placeholder="Make and model" value={formData.makeModel} onChange={handleInputChange} />
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
            <input type="number" id="capacityPerShift" name="capacityPerShift" className="form-control" min="0" placeholder="Units per shift" value={formData.capacityPerShift} onChange={handleInputChange} />
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
            <textarea id="maintenanceNotes" name="maintenanceNotes" className="form-control" placeholder="Maintenance notes" value={formData.maintenanceNotes} onChange={handleInputChange} rows={3} />
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
            submitLabel="Save Machine"
            isLoading={isLoading}
            onCancel={() => router.push('/catalog/machines')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
};

export default function AddMachinePageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Machines & Configuration" action="create">
      <AddMachinePage />
    </RequireCrudPermission>
  );
}
