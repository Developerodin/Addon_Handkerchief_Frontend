'use client';

import Link from 'next/link';
import React from 'react';
import { cn } from './cn';
import { UI_ICON_TONE_CLASS, UiIconTone } from './uiVariants';

type UiIconButtonBaseProps = {
  icon: string;
  tone?: UiIconTone;
  className?: string;
  title?: string;
  'aria-label'?: string;
  disabled?: boolean;
  loading?: boolean;
};

type UiIconButtonAsButton = UiIconButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof UiIconButtonBaseProps> & {
    href?: undefined;
  };

type UiIconButtonAsLink = UiIconButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof UiIconButtonBaseProps> & {
    href: string;
  };

export type UiIconButtonProps = UiIconButtonAsButton | UiIconButtonAsLink;

export function UiIconButton({
  icon,
  tone = 'default',
  className,
  title,
  disabled,
  loading,
  ...rest
}: UiIconButtonProps) {
  const classes = cn('ui-icon-btn', UI_ICON_TONE_CLASS[tone], className);
  const iconEl = <i className={cn(icon, 'text-xs')} aria-hidden />;

  if ('href' in rest && rest.href) {
    const { href, ...linkRest } = rest;
    return (
      <Link href={href} className={classes} title={title} {...linkRest}>
        {iconEl}
      </Link>
    );
  }

  const buttonRest = rest as UiIconButtonAsButton;
  return (
    <button
      type="button"
      className={classes}
      title={title}
      disabled={disabled || loading}
      {...buttonRest}
    >
      {iconEl}
    </button>
  );
}

export default UiIconButton;
