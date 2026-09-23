"use client"
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import HelpIcon from '@/shared/components/HelpIcon';
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud';
import CatalogRowActions from '@/shared/components/catalog/CatalogRowActions';
import CatalogPageSizeSelect from '@/shared/components/catalog/CatalogPageSizeSelect';
import { UiButton, UiSearchInput, UiPagination, UiListLoading, UiListError, UiListEmpty, UiStatusBadge } from '@/shared/components/ui';
import {
  LABEL_TYPE_OPTIONS,
  DEVICE_TYPE_OPTIONS,
  SCANNER_TYPE_OPTIONS,
} from '@/shared/constants/handkerchiefCatalog';
import {
  LabelTemplate,
  DeviceRegistry,
  createLabelTemplate,
  deleteLabelTemplate,
  listLabelTemplates,
  updateLabelTemplate,
  createDeviceRegistry,
  deleteDeviceRegistry,
  listDeviceRegistries,
  updateDeviceRegistry,
  getDeviceDisplay,
} from '@/shared/services/phase3CatalogService';

type TabKey = 'templates' | 'devices';

interface LabelExcelRow {
  'ID'?: string;
  'Name'?: string;
  'Label Type'?: string;
  'Size'?: string;
  'Encoded Fields'?: string;
  'Barcode Scheme'?: string;
  'Printer Device'?: string;
  'Status'?: string;
}

interface DeviceExcelRow {
  'ID'?: string;
  'Name'?: string;
  'Device Type'?: string;
  'Model'?: string;
  'Location'?: string;
  'Label Size'?: string;
  'Scanner Type'?: string;
  'Status'?: string;
}

const labelExcelColWidths = [
  { wch: 24 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 28 },
  { wch: 16 }, { wch: 20 }, { wch: 10 },
];

const deviceExcelColWidths = [
  { wch: 24 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
  { wch: 12 }, { wch: 12 }, { wch: 10 },
];

const getLabelTypeLabel = (type?: string) =>
  LABEL_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type || '—';

const getDeviceTypeLabel = (type?: string) =>
  DEVICE_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type || '—';

const getScannerTypeLabel = (type?: string) =>
  SCANNER_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type || '—';

const parseEncodedFields = (input?: string): string[] =>
  (input || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const toLabelExportRow = (template: LabelTemplate) => ({
  'ID': template.id,
  'Name': template.name,
  'Label Type': template.labelType || '',
  'Size': template.size || '',
  'Encoded Fields': (template.encodedFields || []).join(', '),
  'Barcode Scheme': template.barcodeScheme || '',
  'Printer Device': getDeviceDisplay(template.printerDevice),
  'Status': template.status,
});

const toDeviceExportRow = (device: DeviceRegistry) => ({
  'ID': device.id,
  'Name': device.name,
  'Device Type': device.deviceType || '',
  'Model': device.model || '',
  'Location': device.location || '',
  'Label Size': device.labelSize || '',
  'Scanner Type': device.scannerType || '',
  'Status': device.status,
});

const LabelTemplatesPage = () => {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'devices' ? 'devices' : 'templates';

  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('label-templates');
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Label templates state
  const [labelSelectedIds, setLabelSelectedIds] = useState<string[]>([]);
  const [labelSelectAll, setLabelSelectAll] = useState(false);
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [labelCurrentPage, setLabelCurrentPage] = useState(1);
  const [labelTemplates, setLabelTemplates] = useState<LabelTemplate[]>([]);
  const [labelIsLoading, setLabelIsLoading] = useState(true);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelItemsPerPage, setLabelItemsPerPage] = useState(10);
  const [labelTotalResults, setLabelTotalResults] = useState(0);
  const [labelTotalPages, setLabelTotalPages] = useState(1);
  const [labelImportProgress, setLabelImportProgress] = useState<number | null>(null);
  const labelFileInputRef = useRef<HTMLInputElement>(null);

  // Device registry state
  const [deviceSelectedIds, setDeviceSelectedIds] = useState<string[]>([]);
  const [deviceSelectAll, setDeviceSelectAll] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [deviceCurrentPage, setDeviceCurrentPage] = useState(1);
  const [devices, setDevices] = useState<DeviceRegistry[]>([]);
  const [deviceIsLoading, setDeviceIsLoading] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceItemsPerPage, setDeviceItemsPerPage] = useState(10);
  const [deviceTotalResults, setDeviceTotalResults] = useState(0);
  const [deviceTotalPages, setDeviceTotalPages] = useState(1);
  const [deviceImportProgress, setDeviceImportProgress] = useState<number | null>(null);
  const deviceFileInputRef = useRef<HTMLInputElement>(null);

  const fetchLabelTemplates = async (page = 1, limit = labelItemsPerPage, search = '') => {
    try {
      setLabelIsLoading(true);
      setLabelError(null);
      const data = await listLabelTemplates({ page, limit, search });
      setLabelTemplates(data.results);
      setLabelTotalResults(data.totalResults);
      setLabelTotalPages(data.totalPages);
    } catch (err) {
      setLabelError(err instanceof Error ? err.message : 'Failed to fetch label templates');
      setLabelTemplates([]);
      setLabelTotalPages(1);
      toast.error('Failed to load label templates');
    } finally {
      setLabelIsLoading(false);
    }
  };

  const fetchDevices = async (page = 1, limit = deviceItemsPerPage, search = '') => {
    try {
      setDeviceIsLoading(true);
      setDeviceError(null);
      const data = await listDeviceRegistries({ page, limit, search });
      setDevices(data.results);
      setDeviceTotalResults(data.totalResults);
      setDeviceTotalPages(data.totalPages);
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : 'Failed to fetch devices');
      setDevices([]);
      setDeviceTotalPages(1);
      toast.error('Failed to load devices');
    } finally {
      setDeviceIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchLabelTemplates(labelCurrentPage, labelItemsPerPage, labelSearchQuery);
    }
  }, [activeTab, labelCurrentPage, labelItemsPerPage, labelSearchQuery]);

  useEffect(() => {
    if (activeTab === 'devices') {
      fetchDevices(deviceCurrentPage, deviceItemsPerPage, deviceSearchQuery);
    }
  }, [activeTab, deviceCurrentPage, deviceItemsPerPage, deviceSearchQuery]);

  useEffect(() => {
    setLabelCurrentPage(1);
  }, [labelSearchQuery]);

  useEffect(() => {
    setDeviceCurrentPage(1);
  }, [deviceSearchQuery]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'devices') setActiveTab('devices');
    else if (tab === 'templates') setActiveTab('templates');
  }, [searchParams]);

  const handleLabelSelectAll = () => {
    if (labelSelectAll) setLabelSelectedIds([]);
    else setLabelSelectedIds(labelTemplates.map((t) => t.id));
    setLabelSelectAll(!labelSelectAll);
  };

  const handleLabelSelect = (id: string) => {
    if (labelSelectedIds.includes(id)) setLabelSelectedIds(labelSelectedIds.filter((x) => x !== id));
    else setLabelSelectedIds([...labelSelectedIds, id]);
  };

  const handleLabelDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this label template?')) return;
    try {
      await deleteLabelTemplate(id);
      setLabelTemplates((prev) => prev.filter((t) => t.id !== id));
      setLabelSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Label template deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete label template');
    }
  };

  const handleLabelDeleteSelected = async () => {
    if (!guardDelete()) return;
    if (labelSelectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${labelSelectedIds.length} selected template(s)?`)) return;

    try {
      let hasError = false;
      const results = await Promise.all(
        labelSelectedIds.map(async (id) => {
          try {
            await deleteLabelTemplate(id);
            return id;
          } catch {
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      setLabelTemplates((prev) => prev.filter((t) => !successful.includes(t.id)));
      setLabelSelectedIds([]);
      setLabelSelectAll(false);
      if (hasError) toast.error('Some label templates could not be deleted');
      else toast.success('Selected label templates deleted successfully');
    } catch {
      toast.error('Failed to delete some label templates');
    }
  };

  const handleDeviceSelectAll = () => {
    if (deviceSelectAll) setDeviceSelectedIds([]);
    else setDeviceSelectedIds(devices.map((d) => d.id));
    setDeviceSelectAll(!deviceSelectAll);
  };

  const handleDeviceSelect = (id: string) => {
    if (deviceSelectedIds.includes(id)) setDeviceSelectedIds(deviceSelectedIds.filter((x) => x !== id));
    else setDeviceSelectedIds([...deviceSelectedIds, id]);
  };

  const handleDeviceDelete = async (id: string) => {
    if (!guardDelete()) return;
    if (!window.confirm('Are you sure you want to delete this device?')) return;
    try {
      await deleteDeviceRegistry(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setDeviceSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Device deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete device');
    }
  };

  const handleDeviceDeleteSelected = async () => {
    if (!guardDelete()) return;
    if (deviceSelectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${deviceSelectedIds.length} selected device(s)?`)) return;

    try {
      let hasError = false;
      const results = await Promise.all(
        deviceSelectedIds.map(async (id) => {
          try {
            await deleteDeviceRegistry(id);
            return id;
          } catch {
            hasError = true;
            return null;
          }
        })
      );
      const successful = results.filter((id): id is string => id !== null);
      setDevices((prev) => prev.filter((d) => !successful.includes(d.id)));
      setDeviceSelectedIds([]);
      setDeviceSelectAll(false);
      if (hasError) toast.error('Some devices could not be deleted');
      else toast.success('Selected devices deleted successfully');
    } catch {
      toast.error('Failed to delete some devices');
    }
  };

  const handleLabelExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Name': 'Fabric Roll Label',
          'Label Type': 'fabric-roll',
          'Size': '100x50 mm',
          'Encoded Fields': 'fabricCode, rollNo, weight',
          'Barcode Scheme': 'CODE128',
          'Printer Device': 'Store Printer 1',
          'Status': 'active',
        },
        {
          'Name': 'Bundle Sticker',
          'Label Type': 'bundle-sticker',
          'Size': '50x30 mm',
          'Encoded Fields': 'bundleNo, styleCode, qty',
          'Barcode Scheme': 'CODE128',
          'Printer Device': 'Floor Printer 2',
          'Status': 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = labelExcelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Label Template');
      XLSX.writeFile(wb, 'label_template_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleLabelExport = async () => {
    try {
      const data = await listLabelTemplates({ page: 1, limit: 100000 });
      const exportData = data.results.map(toLabelExportRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = labelExcelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Label Templates');
      XLSX.writeFile(wb, `label_templates_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Label templates exported successfully');
    } catch (err) {
      console.error('Error exporting label templates:', err);
      toast.error('Failed to export label templates');
    }
  };

  const handleLabelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLabelImportProgress(0);
    const loadingToast = toast.loading('Importing label templates...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as LabelExcelRow[];
          let successCount = 0;
          let errorCount = 0;

          const [allTemplates, allDevices] = await Promise.all([
            listLabelTemplates({ page: 1, limit: 100000 }),
            listDeviceRegistries({ page: 1, limit: 100000 }),
          ]);
          const printers = allDevices.results.filter((d) => d.deviceType === 'printer');

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const name = (row['Name'] || '').toString().trim();
              const labelType = (row['Label Type'] || '').toString().trim();
              if (!name || !labelType) throw new Error('Missing required fields');

              const printerName = (row['Printer Device'] || '').toString().trim();
              let printerDevice: string | undefined;
              if (printerName) {
                const found = printers.find((p) => p.name.trim().toLowerCase() === printerName.toLowerCase());
                if (found) printerDevice = found.id;
              }

              const payload = {
                name,
                labelType: labelType as LabelTemplate['labelType'],
                size: (row['Size'] || '').toString().trim() || undefined,
                encodedFields: parseEncodedFields(row['Encoded Fields']?.toString()),
                barcodeScheme: (row['Barcode Scheme'] || '').toString().trim() || undefined,
                printerDevice,
                status: (row['Status']?.toString()?.toLowerCase() === 'active' ? 'active' : 'inactive') as
                  | 'active'
                  | 'inactive',
              };

              let templateId = row['ID']?.toString().trim();
              if (!templateId) {
                const found = allTemplates.results.find(
                  (t) => t.name.trim().toLowerCase() === name.toLowerCase()
                );
                if (found) templateId = found.id;
              }

              if (templateId) await updateLabelTemplate(templateId, payload);
              else await createLabelTemplate(payload);
              successCount++;
            } catch {
              errorCount++;
            }
            setLabelImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (labelFileInputRef.current) labelFileInputRef.current.value = '';
          setLabelImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} label templates`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} label templates`);
          fetchLabelTemplates(labelCurrentPage, labelItemsPerPage, labelSearchQuery);
        } catch {
          setLabelImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      setLabelImportProgress(null);
      toast.error('Failed to import label templates', { id: loadingToast });
    }
  };

  const handleDeviceExportTemplate = () => {
    try {
      const sampleData = [
        {
          'Name': 'Store Printer 1',
          'Device Type': 'printer',
          'Model': 'Zebra ZT410',
          'Location': 'Store - Ground Floor',
          'Label Size': '100x50 mm',
          'Scanner Type': '',
          'Status': 'active',
        },
        {
          'Name': 'Cutting Scanner',
          'Device Type': 'scanner',
          'Model': 'Honeywell 1900',
          'Location': 'Cutting Floor',
          'Label Size': '',
          'Scanner Type': 'handheld',
          'Status': 'active',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = deviceExcelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Device Template');
      XLSX.writeFile(wb, 'device_registry_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to download template');
    }
  };

  const handleDeviceExport = async () => {
    try {
      const data = await listDeviceRegistries({ page: 1, limit: 100000 });
      const exportData = data.results.map(toDeviceExportRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = deviceExcelColWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Device Registry');
      XLSX.writeFile(wb, `device_registry_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Devices exported successfully');
    } catch (err) {
      console.error('Error exporting devices:', err);
      toast.error('Failed to export devices');
    }
  };

  const handleDeviceImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDeviceImportProgress(0);
    const loadingToast = toast.loading('Importing devices...');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const workbook = XLSX.read(ev.target?.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as DeviceExcelRow[];
          let successCount = 0;
          let errorCount = 0;

          const allData = await listDeviceRegistries({ page: 1, limit: 100000 });
          const allDevices = allData.results;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const name = (row['Name'] || '').toString().trim();
              const deviceType = (row['Device Type'] || '').toString().trim();
              if (!name || !deviceType) throw new Error('Missing required fields');

              const payload = {
                name,
                deviceType: deviceType as DeviceRegistry['deviceType'],
                model: (row['Model'] || '').toString().trim() || undefined,
                location: (row['Location'] || '').toString().trim() || undefined,
                labelSize: (row['Label Size'] || '').toString().trim() || undefined,
                scannerType:
                  deviceType === 'scanner'
                    ? ((row['Scanner Type'] || '').toString().trim() as DeviceRegistry['scannerType']) || undefined
                    : undefined,
                status: (row['Status']?.toString()?.toLowerCase() === 'active' ? 'active' : 'inactive') as
                  | 'active'
                  | 'inactive',
              };

              let deviceId = row['ID']?.toString().trim();
              if (!deviceId) {
                const found = allDevices.find((d) => d.name.trim().toLowerCase() === name.toLowerCase());
                if (found) deviceId = found.id;
              }

              if (deviceId) await updateDeviceRegistry(deviceId, payload);
              else await createDeviceRegistry(payload);
              successCount++;
            } catch {
              errorCount++;
            }
            setDeviceImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }

          if (deviceFileInputRef.current) deviceFileInputRef.current.value = '';
          setDeviceImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} devices`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} devices`);
          fetchDevices(deviceCurrentPage, deviceItemsPerPage, deviceSearchQuery);
        } catch {
          setDeviceImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      setDeviceImportProgress(null);
      toast.error('Failed to import devices', { id: loadingToast });
    }
  };

  const isTemplatesTab = activeTab === 'templates';
  const isLoading = isTemplatesTab ? labelIsLoading : deviceIsLoading;
  const error = isTemplatesTab ? labelError : deviceError;
  const totalResults = isTemplatesTab ? labelTotalResults : deviceTotalResults;
  const currentPage = isTemplatesTab ? labelCurrentPage : deviceCurrentPage;
  const totalPages = isTemplatesTab ? labelTotalPages : deviceTotalPages;
  const itemsPerPage = isTemplatesTab ? labelItemsPerPage : deviceItemsPerPage;
  const selectedIds = isTemplatesTab ? labelSelectedIds : deviceSelectedIds;
  const importProgress = isTemplatesTab ? labelImportProgress : deviceImportProgress;

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Label Templates & Device Registry" />

      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card">
        <div className="p-[10px] catalog-list-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="ui-page-accent"></div>
              <h1 className="ui-page-title">Label Templates & Device Registry</h1>
              <span className="ui-page-count">{totalResults}</span>
              <HelpIcon
                title="Label Templates & Device Registry"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        Standardise barcode labels and register print/scan hardware used across the plant.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Manage label templates with encoded fields and printer mapping</li>
                        <li>Register printers and scanners with location details</li>
                        <li>Import and export via Excel on each tab</li>
                      </ul>
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          <div className="ui-tab-bar">
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`ui-tab ${activeTab === 'templates' ? 'ui-tab--active' : ''}`}
            >
              Label Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('devices')}
              className={`ui-tab ${activeTab === 'devices' ? 'ui-tab--active' : ''}`}
            >
              Device Registry
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <UiSearchInput
              placeholder="Search..."
              value={isTemplatesTab ? labelSearchQuery : deviceSearchQuery}
              onChange={(e) =>
                isTemplatesTab ? setLabelSearchQuery(e.target.value) : setDeviceSearchQuery(e.target.value)
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              <CatalogPageSizeSelect
                value={itemsPerPage}
                onChange={(value) => {
                  if (isTemplatesTab) {
                    setLabelItemsPerPage(value);
                    setLabelCurrentPage(1);
                  } else {
                    setDeviceItemsPerPage(value);
                    setDeviceCurrentPage(1);
                  }
                }}
              />
              <input
                type="file"
                ref={isTemplatesTab ? labelFileInputRef : deviceFileInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={isTemplatesTab ? handleLabelImport : handleDeviceImport}
              />
              {canImport && (
                <UiButton
                  variant="success"
                  icon="ri-upload-2-line"
                  onClick={() =>
                    (isTemplatesTab ? labelFileInputRef : deviceFileInputRef).current?.click()
                  }
                >
                  Import
                </UiButton>
              )}
              {importProgress !== null && (
                <div className="ui-import-progress">
                  <div className="ui-import-progress__bar" style={{ width: `${importProgress}%` }}></div>
                  <span className="ui-import-progress__label">{importProgress}%</span>
                </div>
              )}
              <UiButton
                variant="secondary"
                icon="ri-file-download-line"
                onClick={isTemplatesTab ? handleLabelExportTemplate : handleDeviceExportTemplate}
              >
                Template
              </UiButton>
              <UiButton
                variant="primary"
                icon="ri-download-2-line"
                onClick={isTemplatesTab ? handleLabelExport : handleDeviceExport}
              >
                Export
              </UiButton>
              {canDelete && selectedIds.length > 0 && (
                <UiButton
                  variant="danger"
                  icon="ri-delete-bin-line"
                  onClick={isTemplatesTab ? handleLabelDeleteSelected : handleDeviceDeleteSelected}
                >
                  Delete ({selectedIds.length})
                </UiButton>
              )}
              {canCreate && (
                <UiButton
                  variant="primary"
                  href={
                    isTemplatesTab
                      ? '/catalog/label-templates/add'
                      : '/catalog/label-templates/devices/add'
                  }
                  icon="ri-add-line"
                >
                  {isTemplatesTab ? 'Add Template' : 'Add Device'}
                </UiButton>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <UiListLoading />
          ) : error ? (
            <UiListError message={error} />
          ) : isTemplatesTab ? (
            labelTemplates.length === 0 ? (
              <UiListEmpty
                icon="ri-price-tag-3-line"
                canCreate={canCreate}
                addHref="/catalog/label-templates/add"
                addLabel="Add First Template"
              />
            ) : (
              <table className="ui-table w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={labelSelectAll}
                        onChange={handleLabelSelectAll}
                        className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                      />
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Label Type</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Size</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Encoded Fields</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Barcode Scheme</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Printer</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                    {(canUpdate || canDelete) && (
                      <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {labelTemplates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                        <input
                          type="checkbox"
                          checked={labelSelectedIds.includes(template.id)}
                          onChange={() => handleLabelSelect(template.id)}
                          className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                        />
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{template.name}</td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{getLabelTypeLabel(template.labelType)}</td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{template.size || '—'}</td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                        {(template.encodedFields || []).join(', ') || '—'}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{template.barcodeScheme || '—'}</td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{getDeviceDisplay(template.printerDevice)}</td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <UiStatusBadge status={template.status} />
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                          <CatalogRowActions
                            segment="label-templates"
                            editHref={`/catalog/label-templates/edit/${template.id}`}
                            onDelete={() => handleLabelDelete(template.id)}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : devices.length === 0 ? (
            <UiListEmpty
              icon="ri-printer-line"
              canCreate={canCreate}
              addHref="/catalog/label-templates/devices/add"
              addLabel="Add First Device"
            />
          ) : (
            <table className="ui-table w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input
                      type="checkbox"
                      checked={deviceSelectAll}
                      onChange={handleDeviceSelectAll}
                      className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                    />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Device Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Model</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Location</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Label Size</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Scanner Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  {(canUpdate || canDelete) && (
                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={deviceSelectedIds.includes(device.id)}
                        onChange={() => handleDeviceSelect(device.id)}
                        className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                      />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{device.name}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{getDeviceTypeLabel(device.deviceType)}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{device.model || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{device.location || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{device.labelSize || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {device.deviceType === 'scanner' ? getScannerTypeLabel(device.scannerType) : '—'}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <UiStatusBadge status={device.status} />
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        <CatalogRowActions
                          segment="label-templates"
                          editHref={`/catalog/label-templates/devices/edit/${device.id}`}
                          onDelete={() => handleDeviceDelete(device.id)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && !error && (
          <UiPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={totalResults}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) =>
              isTemplatesTab ? setLabelCurrentPage(page) : setDeviceCurrentPage(page)
            }
            className="p-[10px] pt-4 border-t border-gray-100 bg-white"
          />
        )}
      </div>
    </div>
  );
};

export default LabelTemplatesPage;
