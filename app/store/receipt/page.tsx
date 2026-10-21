import { redirect } from 'next/navigation';

/**
 * Keeps the old receipt URL pointed at the PO received screen.
 */
export default function ReceiptRedirectPage() {
  redirect('/store/po-received');
}
