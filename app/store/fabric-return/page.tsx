'use client';

import React, { useEffect, useState } from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiButton } from '@/shared/components/ui';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listStorageRacks, StorageRack } from '@/shared/services/phase3CatalogService';

export default function FabricReturnPage() {
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [rackCode, setRackCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listStorageRacks({ limit: 200, page: 1 })
      .then((data) => setRacks((data.results || []).filter((rack) => rack.status !== 'inactive')))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load racks'));
  }, []);

  return (
    <RequireCrudPermission path="Fabric / Return" action="read">
      <CatalogMasterFormPage seoTitle="Fabric return" title="Fabric return" listHref="/store/racks" listLabel="Fabric storage" currentLabel="Fabric return">
        <form
          className="grid gap-3 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError('');
            try {
              await factoryRequest('/store/returns', {
                method: 'POST',
                body: JSON.stringify({ rollBarcode: barcode.trim(), rackCode }),
              });
              setMessage(`${barcode.trim()} is back on ${rackCode}`);
              setBarcode('');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Return failed');
            } finally {
              setLoading(false);
            }
          }}
        >
          <p className="text-sm text-gray-600">Scan a roll that came back from the floor or from a failed check, then put it on a rack.</p>
          <label className="form-label" htmlFor="returnRack">Rack</label>
          <select id="returnRack" aria-label="Rack" className="form-control" required value={rackCode} onChange={(event) => setRackCode(event.target.value)}>
            <option value="">Select rack</option>
            {racks.map((rack) => (
              <option key={rack.id} value={rack.code}>{rack.code} · {rack.name}</option>
            ))}
          </select>
          <label className="form-label" htmlFor="returnBarcode">Roll barcode</label>
          <input id="returnBarcode" aria-label="Roll barcode" className="form-control" required value={barcode} onChange={(event) => setBarcode(event.target.value)} />
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          <UiButton type="submit" variant="primary" disabled={loading}>Return to rack</UiButton>
        </form>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
