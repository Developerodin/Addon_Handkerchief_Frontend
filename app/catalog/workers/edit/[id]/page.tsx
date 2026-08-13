"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { PROCESS_DEPARTMENTS } from '@/shared/constants/handkerchiefCatalog';
import {
  getWorker,
  updateWorker,
} from '@/shared/services/phase3CatalogService';
import { userService, type User } from '@/shared/services/userService';

const formatDateForInput = (date?: string | null): string => {
  if (!date) return '';
  return date.split('T')[0];
};

function EditWorkerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    employeeCode: '',
    department: '',
    supervisor: '',
    skill: '',
    shift: '',
    contactNumber: '',
    barcode: '',
    joinDate: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await userService.getUsers({ limit: 500, sortBy: 'name:asc' });
        setUsers(res.results || res.users || []);
      } catch (err) {
        console.error('Error loading users:', err);
        toast.error('Failed to load supervisors');
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        const data = await getWorker(params.id);
        const supervisorId =
          typeof data.supervisor === 'object' && data.supervisor?.id
            ? data.supervisor.id
            : (data.supervisor as string) || '';
        setFormData({
          name: data.name || '',
          employeeCode: data.employeeCode || '',
          department: data.department || '',
          supervisor: supervisorId,
          skill: data.skill || '',
          shift: data.shift || '',
          contactNumber: data.contactNumber || '',
          barcode: data.barcode || '',
          joinDate: formatDateForInput(data.joinDate),
          status: data.status || 'active',
        });
      } catch (error) {
        console.error('Error fetching worker:', error);
        toast.error('Failed to load worker');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorker();
  }, [params.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.employeeCode.trim()) {
      alert('Name and Employee Code are required');
      return;
    }

    const loadingToast = toast.loading('Updating worker...');
    try {
      setIsSaving(true);
      await updateWorker(params.id, {
        name: formData.name.trim(),
        employeeCode: formData.employeeCode.trim().toUpperCase(),
        department: formData.department,
        supervisor: formData.supervisor || null,
        skill: formData.skill.trim(),
        shift: formData.shift.trim(),
        contactNumber: formData.contactNumber.trim(),
        barcode: formData.barcode.trim(),
        joinDate: formData.joinDate || null,
        status: formData.status,
      });
      toast.success('Worker updated successfully', { id: loadingToast });
      router.push('/catalog/workers');
    } catch (error) {
      console.error('Error updating worker:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update worker');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Worker" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Edit Worker</h1>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link
                  href="/catalog/workers"
                  className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                >
                  <i className="ri-home-line mr-2"></i>
                  Workers / Operators
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                  <span className="text-sm font-medium text-gray-500">Edit Worker</span>
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
                <label className="form-label">Employee Code *</label>
                <input type="text" name="employeeCode" className="form-control" value={formData.employeeCode} onChange={handleInputChange} required />
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
                <label className="form-label">Supervisor</label>
                <select
                  name="supervisor"
                  className="form-control"
                  value={formData.supervisor}
                  onChange={handleInputChange}
                  disabled={loadingUsers}
                >
                  <option value="">Select Supervisor</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Skill</label>
                <input type="text" name="skill" className="form-control" value={formData.skill} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Shift</label>
                <input type="text" name="shift" className="form-control" value={formData.shift} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Contact Number</label>
                <input type="text" name="contactNumber" className="form-control" value={formData.contactNumber} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Barcode</label>
                <input type="text" name="barcode" className="form-control" value={formData.barcode} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Join Date</label>
                <input type="date" name="joinDate" className="form-control" value={formData.joinDate} onChange={handleInputChange} />
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
                onClick={() => router.push('/catalog/workers')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Worker'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditWorkerPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Workers / Operators" action="update">
      <EditWorkerPage params={params} />
    </RequireCrudPermission>
  );
}
