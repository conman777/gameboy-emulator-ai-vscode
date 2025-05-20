import React from 'react';
import GhostFreeLayout from './GhostFreeLayout';

interface StablePanelProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

/**
 * StablePanel - A specialized panel component that prevents ghosting/duplication
 * rendering issues by using advanced CSS techniques and proper containment.
 */
const StablePanel: React.FC<StablePanelProps> = ({
  children,
  title,
  className = '',
  titleClassName = '',
  contentClassName = ''
}) => {
  // Base panel styling with anti-ghosting properties
  const baseClassName = `
    rounded-lg shadow overflow-hidden
    will-change-transform
  `;

  return (
    <GhostFreeLayout 
      className={`${baseClassName} ${className}`}
      style={{
        // Add box shadow inside for better edge clarity
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
      }}
    >
      {title && (
        <div className={`font-semibold ${titleClassName}`}>
          {title}
        </div>
      )}
      <div className={`${contentClassName}`}>
        {children}
      </div>
    </GhostFreeLayout>
  );
};

export default React.memo(StablePanel);
