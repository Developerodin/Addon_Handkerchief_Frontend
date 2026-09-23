'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';

interface CatalogMasterFormPageProps {
  seoTitle: string;
  title: string;
  listHref: string;
  listLabel: string;
  currentLabel?: string;
  helpIcon?: ReactNode;
  headerActions?: ReactNode;
  singleColumn?: boolean;
  children: ReactNode;
}

/** Shared shell for Master Catalog add/edit forms — ERP header, card, dense fields. */
export function CatalogMasterFormPage({
  seoTitle,
  title,
  listHref,
  listLabel,
  currentLabel,
  helpIcon,
  headerActions,
  singleColumn,
  children,
}: CatalogMasterFormPageProps) {
  return (
    <div className="main-content catalog-master-form !p-[10px]">
      <Seo title={seoTitle} />
      <div className="catalog-form-card mx-0">
        <div className="catalog-form-header">
          <div className="catalog-form-header__title-row">
            <div className="ui-page-accent" />
            <h1 className="ui-page-title">{title}</h1>
            {helpIcon}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <nav className="catalog-form-breadcrumb" aria-label="Breadcrumb">
              <Link href={listHref} className="catalog-form-breadcrumb__link">
                {listLabel}
              </Link>
              <i className="ri-arrow-right-s-line text-gray-300 text-xs" aria-hidden />
              <span className="catalog-form-breadcrumb__current">{currentLabel || title}</span>
            </nav>
            {headerActions}
          </div>
        </div>
        <div className={singleColumn ? 'catalog-form-body catalog-form-body--single' : 'catalog-form-body'}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default CatalogMasterFormPage;
