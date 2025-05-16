import React from 'react';

const LegalDisclaimer: React.FC = () => {
  return (
    <div className="mt-6 p-3 bg-yellow-900 bg-opacity-50 border border-yellow-700 rounded-md text-center">
      <p className="text-xs text-yellow-200">
        <strong>Disclaimer:</strong> You are responsible for ensuring you have the legal right to use any uploaded ROMs. 
        This application does not distribute or provide ROMs.
      </p>
    </div>
  );
};

export default LegalDisclaimer;
