'use client';

import React from 'react';
import { cn } from './cn';

export interface UiFormSectionProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function UiFormSection({ title, description, className, children }: UiFormSectionProps) {
  return (
    <section className={cn('ui-form-section', className)}>
      <div className="ui-form-section__header">
        <div className="ui-form-section__accent" aria-hidden />
        <h2 className="ui-form-section__title">{title}</h2>
      </div>
      {description ? <p className="ui-form-section__description">{description}</p> : null}
      <div className="ui-form-section__body">{children}</div>
    </section>
  );
}

export default UiFormSection;
