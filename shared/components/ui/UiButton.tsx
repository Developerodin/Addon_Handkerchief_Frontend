'use client';

import Link from 'next/link';
import React from 'react';
import { cn } from './cn';
import { UI_BUTTON_VARIANT_CLASS, UiButtonVariant } from './uiVariants';

type UiButtonBaseProps = {
  variant?: UiButtonVariant;
  className?: string;
  icon?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
};

type UiButtonAsButton = UiButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof UiButtonBaseProps> & {
    href?: undefined;
  };

type UiButtonAsLink = UiButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof UiButtonBaseProps> & {
    href: string;
  };

export type UiButtonProps = UiButtonAsButton | UiButtonAsLink;

export function UiButton({
  variant = 'secondary',
  className,
  icon,
  children,
  disabled,
  loading,
  ...rest
}: UiButtonProps) {
  const classes = cn('ui-btn', UI_BUTTON_VARIANT_CLASS[variant], className);
  const content = (
    <>
      {icon ? <i className={cn(icon, 'text-xs shrink-0')} aria-hidden /> : null}
      {children ? <span>{children}</span> : null}
    </>
  );

  if ('href' in rest && rest.href) {
    const { href, ...linkRest } = rest;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {content}
      </Link>
    );
  }

  const { type = 'button', ...buttonRest } = rest as UiButtonAsButton;
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...buttonRest}>
      {content}
    </button>
  );
}

export default UiButton;
