'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, content }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
      <button
        type="button"
        className="help-modal__backdrop"
        aria-label="Close help dialog"
        onClick={onClose}
      />

      <div className="help-modal__panel">
        <div className="help-modal__header">
          <h3 id="help-modal-title" className="help-modal__title">
            <i className="ri-information-line" aria-hidden="true" />
            <span>{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="help-modal__close"
            aria-label="Close"
          >
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        </div>

        <div className="help-modal__body">{content}</div>

        <div className="help-modal__footer">
          <button type="button" onClick={onClose} className="ti-btn ti-btn-primary-full help-modal__action">
            Got it!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HelpModal;
