import React, { useState } from 'react';
import HelpModal from './HelpModal';

interface HelpIconProps {
  title: string;
  content: React.ReactNode;
  className?: string;
}

const HelpIcon: React.FC<HelpIconProps> = ({ title, content, className = "" }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`help-icon-btn ${className}`}
        title="Page help"
        aria-label="Open page help"
      >
        <i className="ri-information-line" aria-hidden="true" />
      </button>
      
      <HelpModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={title}
        content={content}
      />
    </>
  );
};

export default HelpIcon; 