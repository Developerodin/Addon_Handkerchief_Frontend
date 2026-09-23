export type UiButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
export type UiIconTone = 'default' | 'edit' | 'copy' | 'delete' | 'view';

export const UI_BUTTON_VARIANT_CLASS: Record<UiButtonVariant, string> = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  success: 'ui-btn-success',
  danger: 'ui-btn-danger',
  ghost: 'ui-btn-ghost',
};

export const UI_ICON_TONE_CLASS: Record<UiIconTone, string> = {
  default: 'ui-icon-btn--default',
  edit: 'ui-icon-btn--edit',
  copy: 'ui-icon-btn--copy',
  delete: 'ui-icon-btn--delete',
  view: 'ui-icon-btn--view',
};
