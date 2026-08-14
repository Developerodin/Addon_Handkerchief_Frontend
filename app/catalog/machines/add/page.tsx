"use client"
import React, { useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { PROCESS_DEPARTMENTS, MACHINE_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import { userService, type User } from '@/shared/services/userService';
import { createMachine } from '@/shared/services/phase3CatalogService';

const AddMachinePage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    machineType: '',
    makeModel: '',
    department: '',
    floor: '',
    capacityPerShift: '',
    maintenanceIntervalMonths: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    maintenanceNotes: '',
    assignedSupervisor: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await userService.getUsers({ limit: 200, sortBy: 'name:asc' });
        setUsers(res.results || res.users || []);
      } catch {
        toast.error('Failed to load supervisors');
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
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
        machineType: formData.machineType || undefined,
        makeModel: formData.makeModel.trim(),
        department: formData.department || undefined,
        floor: formData.floor.trim(),
        capacityPerShift,
        maintenanceIntervalMonths,
        lastMaintenanceDate: formData.lastMaintenanceDate || null,
        nextMaintenanceDate: formData.nextMaintenanceDate || null,
        maintenanceNotes: formData.maintenanceNotes.trim(),
        assignedSupervisor: formData.assignedSupervisor || null,
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
    <div className="main-content catalog-master-form">
      <Toaster position="top-right" />
      <Seo title="Add Machine" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Machine</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link
                      href="/catalog/machines"
                      className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                    >
                      <i className="ri-home-line mr-2"></i>
                      Machines
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add Machine</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Name *</label>
                    <input type="text" id="name" name="name" className="form-control" placeholder="Machine name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="code" className="form-label">Code</label>
                    <input type="text" id="code" name="code" className="form-control" placeholder="Machine code" value={formData.code} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="machineType" className="form-label">Machine Type</label>
                    <select id="machineType" name="machineType" className="form-select" value={formData.machineType} onChange={handleInputChange}>
                      {MACHINE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="makeModel" className="form-label">Make / Model</label>
                    <input type="text" id="makeModel" name="makeModel" className="form-control" placeholder="Make and model" value={formData.makeModel} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="department" className="form-label">Department</label>
                    <select id="department" name="department" className="form-select" value={formData.department} onChange={handleInputChange}>
                      {PROCESS_DEPARTMENTS.map((opt) => (
                        <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="floor" className="form-label">Floor</label>
                    <input type="text" id="floor" name="floor" className="form-control" placeholder="Floor" value={formData.floor} onChange={handleInputChange} />
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
                  <div className="form-group col-span-1 md:col-span-2">
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
                    <label htmlFor="status" className="form-label">Status</label>
                    <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button type="submit" className="ti-btn ti-btn-primary" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Machine'}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/catalog/machines')}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AddMachinePageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Machines & Configuration" action="create">
      <AddMachinePage />
    </RequireCrudPermission>
  );
}
