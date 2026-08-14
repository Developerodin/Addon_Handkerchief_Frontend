"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { PROCESS_DEPARTMENTS, MACHINE_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import { userService, type User } from '@/shared/services/userService';
import { getMachine, updateMachine } from '@/shared/services/phase3CatalogService';

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

  useEffect(() => {
    const fetchMachine = async () => {
      try {
        const data = await getMachine(params.id);
        setFormData({
          name: data.name || '',
          code: data.code || '',
          machineType: data.machineType || '',
          makeModel: data.makeModel || '',
          department: data.department || '',
          floor: data.floor || '',
          capacityPerShift: data.capacityPerShift !== undefined ? String(data.capacityPerShift) : '',
          maintenanceIntervalMonths: data.maintenanceIntervalMonths !== undefined ? String(data.maintenanceIntervalMonths) : '',
          lastMaintenanceDate: formatDateInput(data.lastMaintenanceDate),
          nextMaintenanceDate: formatDateInput(data.nextMaintenanceDate),
          maintenanceNotes: data.maintenanceNotes || '',
          assignedSupervisor: getSupervisorId(data.assignedSupervisor),
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
    <div className="main-content catalog-master-form">
      <Toaster position="top-right" />
      <Seo title="Edit Machine" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Edit Machine</h1>
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
                  <span className="text-sm font-medium text-gray-500">Edit Machine</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Name *</label>
                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="form-label">Code</label>
                <input type="text" name="code" className="form-control" value={formData.code} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Machine Type</label>
                <select name="machineType" className="form-control" value={formData.machineType} onChange={handleInputChange}>
                  {MACHINE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Make / Model</label>
                <input type="text" name="makeModel" className="form-control" value={formData.makeModel} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Department</label>
                <select name="department" className="form-control" value={formData.department} onChange={handleInputChange}>
                  {PROCESS_DEPARTMENTS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Floor</label>
                <input type="text" name="floor" className="form-control" value={formData.floor} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Capacity Per Shift</label>
                <input type="number" name="capacityPerShift" className="form-control" min="0" value={formData.capacityPerShift} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Maintenance Interval (Months)</label>
                <input type="number" name="maintenanceIntervalMonths" className="form-control" min="0" value={formData.maintenanceIntervalMonths} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Last Maintenance Date</label>
                <input type="date" name="lastMaintenanceDate" className="form-control" value={formData.lastMaintenanceDate} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Next Maintenance Date</label>
                <input type="date" name="nextMaintenanceDate" className="form-control" value={formData.nextMaintenanceDate} onChange={handleInputChange} />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Maintenance Notes</label>
                <textarea name="maintenanceNotes" className="form-control" value={formData.maintenanceNotes} onChange={handleInputChange} rows={3} />
              </div>
              <div>
                <label className="form-label">Assigned Supervisor</label>
                <select
                  name="assignedSupervisor"
                  className="form-control"
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
              <div>
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push('/catalog/machines')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Machine'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditMachinePageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Machines & Configuration" action="update">
      <EditMachinePage params={params} />
    </RequireCrudPermission>
  );
}
