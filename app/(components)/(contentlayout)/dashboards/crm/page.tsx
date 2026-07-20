"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CrmDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboards/main/");
  }, [router]);

  return null;
}
