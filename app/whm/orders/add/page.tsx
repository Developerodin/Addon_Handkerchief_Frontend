'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy path — orders live at /whm/orders */
export default function WhmOrdersAddRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/whm/orders/');
  }, [router]);
  return null;
}