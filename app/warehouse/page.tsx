import { redirect } from 'next/navigation';

/** Packing & Dispatch home goes straight to packing. */
export default function WarehouseHome() {
  redirect('/warehouse/packing');
}