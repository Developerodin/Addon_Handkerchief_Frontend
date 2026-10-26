import { API_BASE_URL } from '@/shared/data/utilities/api';
import {
  normalizeFabricDesign,
  normalizeFabricFinish,
  normalizeFabricWash,
} from '@/shared/constants/handkerchiefCatalog';
import {
  FabricCatalog,
  createFabricCatalog,
  listFabricCatalogs,
  updateFabricCatalog,
} from '@/shared/services/fabricCatalogService';
import {
  fabricColorApi,
  fabricCountApi,
  fabricMeasurementApi,
  fabricQualityApi,
  fabricTypeApi,
  fabricYarnApi,
} from '@/shared/services/fabricLookupService';
import { buildFabricCatalogName } from '@/shared/utils/fabricCatalogName';
import {
  AttributeOptionValue,
  resolveAttributeOptionName,
} from '@/shared/utils/styleCodeFields';

export interface FabricMasterExcelRow {
  ID?: string;
  'Fabric Sort No.'?: string;
  'Mill Old Fabric Sort No.'?: string;
  'Mill New Fabric Sort No.'?: string;
  'Fabric Type'?: string;
  Color?: string;
  Quality?: string;
  Yarn?: string;
  Count?: string;
  Construction?: string;
  Weave?: string;
  Design?: string;
  Wash?: string;
  Finish?: string;
  'Stitch Type'?: string;
  'Stitch type'?: string;
  GSM?: string | number;
  'GSM Measurement'?: string;
  GLM?: string | number;
  'GLM Measurement'?: string;
  'Finished Width'?: string | number;
  'Finished Width Measurement'?: string;
  Rate?: string | number;
  GST?: string;
  'HSN Code'?: string;
  'Min Quantity in Kg'?: string | number;
  Status?: string;
  Remarks?: string;
  Remark?: string;
}

export interface FabricImportResult {
  successCount: number;
  errorCount: number;
  firstError: string;
}

interface NamedLookup {
  id: string;
  name: string;
}

/**
 * Stable hex color so a newly imported color name has a required color code.
 */
function colorCodeFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return `#${(hash & 0xffffff).toString(16).padStart(6, '0')}`;
}

/**
 * Finds a lookup by name, creating it when the sheet names one that is not in the master yet.
 */
async function ensureLookup(
  items: NamedLookup[],
  label: string,
  create: (name: string) => Promise<NamedLookup>
): Promise<string | null> {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const found = items.find((item) => item.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (found) return found.id;
  const created = await create(trimmed);
  items.push(created);
  return created.id;
}

/**
 * Finds a lookup by name. Does not create one.
 */
function findLookupId(items: NamedLookup[], label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  return items.find((item) => item.name.trim().toLowerCase() === trimmed.toLowerCase())?.id || null;
}

/**
 * Parses a non-negative number from an Excel cell.
 */
function parseNumber(value: string | number | undefined, fallback = 0): number {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Maps a stitch-type cell onto an attributes-master option. Blank stays blank.
 */
function normalizeFabricStitchType(value: string, optionValues: AttributeOptionValue[]): string {
  const raw = value.trim();
  if (!raw) return '';
  const resolved = resolveAttributeOptionName(raw, optionValues);
  const matched = optionValues.find((opt) => (opt.name || '').toLowerCase() === resolved.toLowerCase());
  if (!matched?.name) {
    throw new Error(`Invalid Stitch Type: ${raw}`);
  }
  return matched.name;
}

/**
 * Imports fabric master rows.
 * An ID is used only when that catalog already exists. Otherwise the sort number is the match key.
 * Missing type, color, quality, yarn, and count masters are created so the server can build the name.
 */
export async function importFabricMasterRows(
  rows: FabricMasterExcelRow[],
  onProgress: (percent: number) => void
): Promise<FabricImportResult> {
  const [allData, typesData, colorsData, qualitiesData, yarnsData, countsData, measurementsData, attributesRes] =
    await Promise.all([
      listFabricCatalogs({ page: 1, limit: 100000 }),
      fabricTypeApi.list({ page: 1, limit: 1000, status: 'active' }),
      fabricColorApi.list({ page: 1, limit: 1000, status: 'active' }),
      fabricQualityApi.list({ page: 1, limit: 1000, status: 'active' }),
      fabricYarnApi.list({ page: 1, limit: 1000, status: 'active' }),
      fabricCountApi.list({ page: 1, limit: 1000, status: 'active' }),
      fabricMeasurementApi.list({ page: 1, limit: 1000, status: 'active' }),
      fetch(`${API_BASE_URL}/product-attributes?limit=1000`),
    ]);

  const allFabrics = allData.results;
  const types = typesData.results;
  const colors = colorsData.results;
  const qualities = qualitiesData.results;
  const yarns = yarnsData.results;
  const counts = countsData.results;
  const measurements = measurementsData.results;

  let stitchTypeOptions: AttributeOptionValue[] = [];
  if (attributesRes.ok) {
    const attributesData = await attributesRes.json();
    const attributes = attributesData?.results || [];
    stitchTypeOptions = attributes
      .filter((attr: { name?: string }) => (attr?.name || '').toLowerCase() === 'stitch type')
      .flatMap((attr: { optionValues?: AttributeOptionValue[] }) => attr?.optionValues || []);
  } else {
    throw new Error('Failed to load stitch type options');
  }

  let successCount = 0;
  let errorCount = 0;
  let firstError = '';

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const generatedName = buildFabricCatalogName({
        fabricTypeName: (row['Fabric Type'] || '').toString(),
        colourName: (row.Color || '').toString(),
        qualityName: (row.Quality || '').toString(),
        yarnName: (row.Yarn || '').toString(),
        countName: (row.Count || '').toString(),
      });
      if (!generatedName) {
        throw new Error('Set at least one of fabric type, color, quality, yarn, or count');
      }

      const fabricSortNo = (row['Fabric Sort No.'] || '').toString().trim();
      const payload = {
        fabricSortNo,
        millOldFabricSortNo: (row['Mill Old Fabric Sort No.'] || '').toString().trim(),
        millNewFabricSortNo: (row['Mill New Fabric Sort No.'] || '').toString().trim(),
        fabricType: await ensureLookup(types, (row['Fabric Type'] || '').toString(), (name) =>
          fabricTypeApi.create({ name, status: 'active' })
        ),
        color: await ensureLookup(colors, (row.Color || '').toString(), (name) =>
          fabricColorApi.create({ name, colorCode: colorCodeFromName(name), status: 'active' })
        ),
        quality: await ensureLookup(qualities, (row.Quality || '').toString(), (name) =>
          fabricQualityApi.create({ name, composition: name, status: 'active' })
        ),
        yarn: await ensureLookup(yarns, (row.Yarn || '').toString(), (name) =>
          fabricYarnApi.create({ name, status: 'active' })
        ),
        count: await ensureLookup(counts, (row.Count || '').toString(), (name) =>
          fabricCountApi.create({ name, status: 'active' })
        ),
        construction: (row.Construction || '').toString().trim(),
        weave: (row.Weave || '').toString().trim(),
        design: normalizeFabricDesign((row.Design || '').toString()),
        wash: normalizeFabricWash((row.Wash || '').toString()),
        finish: normalizeFabricFinish((row.Finish || '').toString()),
        stitchType: normalizeFabricStitchType(
          (row['Stitch Type'] || row['Stitch type'] || '').toString(),
          stitchTypeOptions
        ),
        gsm: parseNumber(row.GSM ?? row.GLM),
        gsmMeasurement: findLookupId(
          measurements,
          (row['GSM Measurement'] || row['GLM Measurement'] || '').toString()
        ),
        finishedWidth: parseNumber(row['Finished Width']),
        finishedWidthMeasurement: findLookupId(
          measurements,
          (row['Finished Width Measurement'] || '').toString()
        ),
        rate: parseNumber(row.Rate),
        gst: (row.GST || '').toString().trim(),
        hsnCode: (row['HSN Code'] || '').toString().trim(),
        minQuantity: parseNumber(row['Min Quantity in Kg']),
        status: (row.Status?.toString()?.toLowerCase() === 'inactive' ? 'inactive' : 'active') as
          | 'active'
          | 'inactive',
        remark: (row.Remarks || row.Remark || '').toString().trim(),
      };

      const sheetId = (row.ID || '').toString().trim();
      const byId = sheetId ? allFabrics.find((fabric) => fabric.id === sheetId) : undefined;
      const bySort = fabricSortNo
        ? allFabrics.find(
            (fabric) => (fabric.fabricSortNo || '').trim().toLowerCase() === fabricSortNo.toLowerCase()
          )
        : undefined;
      const byName =
        !sheetId && !fabricSortNo
          ? allFabrics.find((fabric) => fabric.name.trim().toLowerCase() === generatedName.toLowerCase())
          : undefined;
      const fabricId = byId?.id || bySort?.id || byName?.id || '';

      const saved = fabricId
        ? await updateFabricCatalog(fabricId, payload)
        : await createFabricCatalog(payload);
      rememberFabric(allFabrics, saved);
      successCount += 1;
    } catch (error) {
      errorCount += 1;
      if (!firstError) {
        firstError = error instanceof Error ? error.message : 'Import failed';
      }
    }
    onProgress(rows.length ? Math.round(((i + 1) / rows.length) * 100) : 100);
  }

  return { successCount, errorCount, firstError };
}

/**
 * Keeps the in-memory catalog list in sync so later rows match the row just saved.
 */
function rememberFabric(allFabrics: FabricCatalog[], saved: FabricCatalog): void {
  const index = allFabrics.findIndex((fabric) => fabric.id === saved.id);
  if (index >= 0) {
    allFabrics[index] = saved;
    return;
  }
  allFabrics.push(saved);
}
