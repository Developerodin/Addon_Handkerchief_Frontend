"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/shared/redux/store';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, authInitialized } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (authInitialized && !isAuthenticated) {
      router.replace('/auth/login/');
    }
  }, [authInitialized, isAuthenticated, router]);

  if (!authInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <span className="text-muted">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
