'use client';

import React from 'react';
import { UiButton } from './UiButton';

export function UiListLoading({ label = 'Loading Data' }: { label?: string }) {
  return (
    <div className="ui-list-state">
      <div className="ui-list-state__spinner" />
      <p className="ui-list-state__label">{label}</p>
    </div>
  );
}

export function UiListError({ message }: { message: string }) {
  return (
    <div className="ui-list-state ui-list-state--error">
      <div className="ui-list-state__icon ui-list-state__icon--error">
        <i className="ri-error-warning-line text-xl" aria-hidden />
      </div>
      <p className="ui-list-state__message ui-list-state__message--error">{message}</p>
    </div>
  );
}

export interface UiListEmptyProps {
  title?: string;
  icon?: string;
  canCreate?: boolean;
  addHref?: string;
  addLabel?: string;
}

export function UiListEmpty({
  title = 'DATA EMPTY',
  icon = 'ri-stack-line',
  canCreate,
  addHref,
  addLabel,
}: UiListEmptyProps) {
  return (
    <div className="ui-list-state">
      <div className="ui-list-state__icon">
        <i className={icon} aria-hidden />
      </div>
      <h3 className="ui-list-state__title">{title}</h3>
      {canCreate && addHref ? (
        <UiButton variant="primary" href={addHref} icon="ri-add-line" className="mt-3">
          {addLabel}
        </UiButton>
      ) : null}
    </div>
  );
}
