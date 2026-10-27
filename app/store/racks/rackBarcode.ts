import * as XLSX from 'xlsx';
import { StorageRackCard } from './RackDetailsDrawer';

/**
 * Downloads the racks currently in the grid.
 */
export function downloadRacksExcel(racks: StorageRackCard[]): void {
  const rows = racks.map((rack) => ({
    Code: rack.code,
    Name: rack.name,
    Barcode: rack.barcode || rack.code,
    Section: rack.zone || '',
    Floor: rack.floor || '',
    Rolls: rack.count,
    Fabrics: (rack.fabrics || []).join(', '),
    Status: rack.status,
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Racks');
  XLSX.writeFile(book, 'rolls-storage-racks.xlsx');
}
