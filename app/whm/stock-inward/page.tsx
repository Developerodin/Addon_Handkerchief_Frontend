'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WhmStockInwardIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/whm/stock-inward/stock/');
  }, [router]);
  return null;
}