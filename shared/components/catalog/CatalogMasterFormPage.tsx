'use client';

import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';

interface CatalogMasterFormPageProps {
  seoTitle: string;
  title: string;
  listHref: string;
  listLabel: string;
  currentLabel?: string;
  children: React.ReactNode;
}

/** Shared shell for Master Catalog add/edit forms — consistent padding, breadcrumb, label styling. */
export function CatalogMasterFormPage({
  seoTitle,
  title,
  listHref,
  listLabel,
  currentLabel,
  children,
}: CatalogMasterFormPageProps) {
  return (
    <div className="main-content catalog-master-form">
      <Seo title={seoTitle} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex flex-wrap justify-between items-center gap-3 !px-0 !py-2 !border-0">
              <h1 className="box-title text-xl md:text-2xl font-semibold !text-gray-900 before:!bg-purple-600">
                {title}
              </h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center flex-wrap gap-x-1 md:gap-x-2">
                  <li>
                    <Link
                      href={listHref}
                      className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                    >
                      {listLabel}
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <i className="ri-arrow-right-s-line text-gray-400 mx-1" aria-hidden />
                    <span className="text-sm font-medium text-gray-500">{currentLabel || title}</span>
                  </li>
                </ol>
              </nav>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default CatalogMasterFormPage;
