"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
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
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Add Worker"
        title="Add Worker"
        listHref="/catalog/workers"
        listLabel="Workers / Operators"
        currentLabel="Add"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Name</label>
            <input type="text" id="name" name="name" className="form-control" placeholder="Worker name" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="employeeCode" className="form-label required">Employee Code</label>
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
          <UiFormFooter
            submitLabel="Save Worker"
            isLoading={isLoading}
            onCancel={() => router.push('/catalog/workers')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
};

export default function AddWorkerPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Workers / Operators" action="create">
      <AddWorkerPage />
    </RequireCrudPermission>
  );
}
