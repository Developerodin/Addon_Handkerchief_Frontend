"use client"
import React, { useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { PROCESS_DEPARTMENTS } from '@/shared/constants/handkerchiefCatalog';
import { createWorker } from '@/shared/services/phase3CatalogService';
import { userService, type User } from '@/shared/services/userService';

const AddWorkerPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.employeeCode.trim()) {
      alert('Name and Employee Code are required');
      return;
    }

    try {
      setIsLoading(true);
      await createWorker({
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
      toast.success('Worker created successfully');
      router.push('/catalog/workers');
    } catch (err) {
      console.error('Error creating worker:', err);
      alert(err instanceof Error ? err.message : 'Failed to create worker');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Worker" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Worker</h1>
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
                      <span className="text-sm font-medium text-gray-500">Add Worker</span>
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
                    <input type="text" id="name" name="name" className="form-control" placeholder="Worker name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="employeeCode" className="form-label">Employee Code *</label>
                    <input type="text" id="employeeCode" name="employeeCode" className="form-control" placeholder="Employee code" value={formData.employeeCode} onChange={handleInputChange} required />
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
                    <label htmlFor="supervisor" className="form-label">Supervisor</label>
                    <select
                      id="supervisor"
                      name="supervisor"
                      className="form-select"
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
                  <div className="form-group">
                    <label htmlFor="skill" className="form-label">Skill</label>
                    <input type="text" id="skill" name="skill" className="form-control" placeholder="Operation / skill" value={formData.skill} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="shift" className="form-label">Shift</label>
                    <input type="text" id="shift" name="shift" className="form-control" placeholder="e.g. Morning, Evening" value={formData.shift} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contactNumber" className="form-label">Contact Number</label>
                    <input type="text" id="contactNumber" name="contactNumber" className="form-control" placeholder="Phone number" value={formData.contactNumber} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="barcode" className="form-label">Barcode</label>
                    <input type="text" id="barcode" name="barcode" className="form-control" placeholder="Leave blank to auto-generate" value={formData.barcode} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="joinDate" className="form-label">Join Date</label>
                    <input type="date" id="joinDate" name="joinDate" className="form-control" value={formData.joinDate} onChange={handleInputChange} />
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
                      {isLoading ? 'Saving...' : 'Save Worker'}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/catalog/workers')}
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

export default function AddWorkerPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Workers / Operators" action="create">
      <AddWorkerPage />
    </RequireCrudPermission>
  );
}
