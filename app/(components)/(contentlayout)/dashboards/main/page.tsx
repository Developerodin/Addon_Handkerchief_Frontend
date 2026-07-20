"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment } from "react";
import HandkerchiefDashboardContent from "./HandkerchiefDashboardContent";

export default function MainDashboard() {
  return (
    <Fragment>
      <Seo title="Dashboard" />
      <HandkerchiefDashboardContent />
    </Fragment>
  );
}
