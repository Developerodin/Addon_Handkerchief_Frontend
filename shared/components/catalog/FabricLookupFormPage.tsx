'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogSegment } from '@/shared/hooks/useCatalogCrud';
import { FabricLookupStatus } from '@/shared/services/fabricLookupService';
import { CatalogLookupField } from '@/shared/components/catalog/CatalogLookupField';

type LookupApi<T> = {
  get: (id: string) => Promise<T>;
  create: (payload: Partial<T>) => Promise<T>;
  update: (id: string, payload: Partial<T>) => Promise<T>;
};

export interface FabricLookupField {
  name: string;
  label: string;
  type?: 'text' | 'select' | 'color' | 'number' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface FabricLookupFormConfig<T extends Record<string, unknown>> {
  segment: CatalogSegment;
  permissionPath: string;
  title: string;
  listPath: string;
  api: LookupApi<T>;
  fields: FabricLookupField[];
  getInitialValues: () => T;
  mapFromEntity: (entity: T) => T;
  mapToPayload?: (values: T) => Partial<T>;
  validate?: (values: T) => string | null;
}

function FabricLookupForm<T extends Record<string, unknown>>({
  config,
  entityId,
}: {
  config: FabricLookupFormConfig<T>;
  entityId?: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(Boolean(entityId));
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<T>(config.getInitialValues());

  useEffect(() => {
    if (!entityId) return;
    const load = async () => {
      try {
        const data = await config.api.get(entityId);
        setFormData(config.mapFromEntity(data));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to load');
        router.push(config.listPath);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [entityId, config, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = config.validate?.(formData);
    if (validationError) {
      alert(validationError);
      return;
    }
    try {
      setIsSaving(true);
      const payload = config.mapToPayload ? config.mapToPayload(formData) : formData;
      if (entityId) await config.api.update(entityId, payload);
      else await config.api.create(payload);
      router.push(config.listPath);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content catalog-master-form flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="main-content catalog-master-form">
      <Seo title={entityId ? `Edit ${config.title}` : `Add ${config.title}`} />
      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">{entityId ? `Edit ${config.title}` : `Add ${config.title}`}</h1>
          <Link href={config.listPath} className="text-sm text-gray-500 hover:text-primary">
            Back to list
          </Link>
        </div>
      </div>
      <div className="box">
        <div className="box-body">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {config.fields.map((field) => (
              <div key={field.name} className="form-group">
                <label htmlFor={field.name} className="form-label">
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                {field.type === 'select' ? (
                  field.name === 'status' ? (
                    <select
                      id={field.name}
                      name={field.name}
                      className="form-select"
                      value={String(formData[field.name] ?? '')}
                      onChange={handleChange}
                      required={field.required}
                    >
                      <option value="">Select</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <CatalogLookupField
                      hideLabel
                      label={field.label}
                      value={String(formData[field.name] ?? '')}
                      items={(field.options ?? []).map((opt) => ({ id: opt.value, name: opt.label }))}
                      getItemId={(item) => item.id}
                      getItemLabel={(item) => item.name}
                      modalTitle={`Select ${field.label}`}
                      searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
                      columns={[{ key: 'name', label: 'Name', render: (item) => item.name }]}
                      placeholder={`Select ${field.label}`}
                      required={field.required}
                      onChange={(id) => setFormData((prev) => ({ ...prev, [field.name]: id }))}
                    />
                  )
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    name={field.name}
                    className="form-control"
                    rows={3}
                    value={String(formData[field.name] ?? '')}
                    onChange={handleChange}
                    required={field.required}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type={field.type === 'color' ? 'color' : field.type === 'number' ? 'number' : 'text'}
                    id={field.name}
                    name={field.name}
                    className="form-control"
                    value={String(formData[field.name] ?? '')}
                    onChange={handleChange}
                    required={field.required}
                    placeholder={field.placeholder}
                    min={field.type === 'number' ? 0 : undefined}
                    max={field.type === 'number' ? 100 : undefined}
                  />
                )}
              </div>
            ))}
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="ti-btn ti-btn-secondary" onClick={() => router.push(config.listPath)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function FabricLookupAddPage<T extends Record<string, unknown>>({
  config,
}: {
  config: FabricLookupFormConfig<T>;
}) {
  return (
    <RequireCrudPermission path={config.permissionPath} action="create">
      <FabricLookupForm config={config} />
    </RequireCrudPermission>
  );
}

export function FabricLookupEditPage<T extends Record<string, unknown>>({
  config,
  params,
}: {
  config: FabricLookupFormConfig<T>;
  params: { id: string };
}) {
  return (
    <RequireCrudPermission path={config.permissionPath} action="update">
      <FabricLookupForm config={config} entityId={params.id} />
    </RequireCrudPermission>
  );
}

export const statusField: FabricLookupField = {
  name: 'status',
  label: 'Status',
  type: 'select',
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
};

export type SimpleLookupForm = {
  name: string;
  status: FabricLookupStatus;
};

export const simpleLookupInitial = (): SimpleLookupForm => ({ name: '', status: 'active' });

export const simpleLookupFields: FabricLookupField[] = [
  { name: 'name', label: 'Name', required: true },
  statusField,
];
