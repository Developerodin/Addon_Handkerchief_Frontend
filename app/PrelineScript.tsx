'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

declare global {
  interface Window {
    HSStaticMethods?: { autoInit: () => void };
    HSOverlay?: { autoInit: () => void };
  }
}

export default function PrelineScript() {
  const path = usePathname();

  useEffect(() => {
    const loadPreline = async () => {
      try {
        const preline = await import('preline/dist/preline.js');
        const api = preline.default ?? preline;

        if (typeof window !== 'undefined' && api?.HSStaticMethods) {
          window.HSStaticMethods = api.HSStaticMethods;
          window.HSOverlay = api.HSOverlay;
          api.HSStaticMethods.autoInit?.();
          api.HSOverlay?.autoInit?.();
        }
      } catch (error) {
        console.error('Error initializing Preline:', error);
      }
    };

    loadPreline();
  }, [path]);

  return null;
}
