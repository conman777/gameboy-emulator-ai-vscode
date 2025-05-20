import React from 'react';

interface GhostFreeLayoutProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * GhostFreeLayout - A special component that prevents rendering ghosting/duplicates
 * by using modern CSS containment and forcing GPU rendering in a clean way.
 */
const GhostFreeLayout: React.FC<GhostFreeLayoutProps> = ({ 
  children, 
  className = '',
  style = {}
}) => {
  // Force a single paint layer with hardware acceleration
  const ghostBustingStyles: React.CSSProperties = {
    // Create a new stacking context
    isolation: 'isolate',
    
    // Force hardware acceleration and establish containing block
    transform: 'translateZ(0)',
    
    // Prevent content from leaking outside container
    contain: 'layout paint',
    
    // Fix for Safari glitches
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    
    // Create a containing block for absolute positioning
    position: 'relative',
    
    // Prevent text from rendering before layout is stable
    textRendering: 'optimizeSpeed',
    
    // Apply any custom styles
    ...style
  };

  return (
    <div className={className} style={ghostBustingStyles}>
      {children}
    </div>
  );
};

export default React.memo(GhostFreeLayout);
