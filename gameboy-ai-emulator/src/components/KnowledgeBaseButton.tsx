// KnowledgeBaseButton.tsx - A button component to open the knowledge base
import React from 'react';

interface KnowledgeBaseButtonProps {
  onClick: () => void;
  knowledgeCount: number;
}

const KnowledgeBaseButton: React.FC<KnowledgeBaseButtonProps> = ({ 
  onClick, 
  knowledgeCount 
}) => {
  return (
    <button
      className="flex items-center space-x-2 bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg shadow transition-colors"
      onClick={onClick}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>AI Knowledge Base</span>
      {knowledgeCount > 0 && (
        <span className="bg-white text-indigo-800 text-xs font-bold rounded-full px-2 py-0.5">
          {knowledgeCount}
        </span>
      )}
    </button>
  );
};

export default KnowledgeBaseButton;
