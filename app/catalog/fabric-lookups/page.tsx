'use client';

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useNavigation } from '@/shared/contextapi/navigationContext';

const modules = [
  { title: 'Fabric Catalog', description: 'Manage fabric master records', path: '/catalog/fabric', permissionPath: '/catalog/fabric' },
  { title: 'Fabric Type', description: 'Manage fabric types', path: '/catalog/fabric-type', permissionPath: '/catalog/fabric-type' },
  { title: 'Fabric Color', description: 'Manage fabric colors', path: '/catalog/fabric-color', permissionPath: '/catalog/fabric-color' },
  { title: 'Fabric Quality', description: 'Fiber composition and quality grades (e.g. 100% Cotton)', path: '/catalog/fabric-quality', permissionPath: '/catalog/fabric-quality' },
  { title: 'Yarn', description: 'Yarn options (e.g. 60\'s)', path: '/catalog/fabric-yarn', permissionPath: '/catalog/fabric-yarn' },
  { title: 'Count', description: 'Count options (e.g. 60COMPX60COMP)', path: '/catalog/fabric-count', permissionPath: '/catalog/fabric-count' },
  { title: 'Measurement', description: 'Manage measurement units', path: '/catalog/fabric-measurement', permissionPath: '/catalog/fabric-measurement' },
];

export default function FabricLookupsHubPage() {
  const { hasPermission } = useNavigation();

  return (
    <div className="main-content">
      <Seo title="Fabric Lookups" />
      <div className="box !bg-transparent border-0 shadow-none">
        <div className="box-header">
          <h1 className="box-title text-2xl font-semibold">Fabric Lookups</h1>
          <p className="text-gray-600 mt-2">Manage fabric catalog and lookup sub-masters.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const allowed = hasPermission(module.permissionPath);
          return (
            <div key={module.path} className="box">
              <div className="box-body">
                <h3 className="text-lg font-semibold mb-2">{module.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                {allowed ? (
                  <Link href={module.path} className="ti-btn ti-btn-primary ti-btn-sm">
                    Open
                  </Link>
                ) : (
                  <span className="ti-btn ti-btn-light ti-btn-sm opacity-50 cursor-not-allowed">Restricted</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
