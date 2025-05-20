import React, { useEffect, useState, useMemo } from 'react'; // Added useState and useMemo
import ReactDOM from 'react-dom';
import { ModelOption } from '../types';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelOption[];
  isLoading: boolean;
  currentModelId: string | null;
  onModelSelect: (modelId: string) => void;
  apiKeyStatus: 'valid' | 'invalid' | 'unchecked' | 'checking';
}

const MODAL_ROOT_ID = 'modal-root';

const ensureModalRoot = () => {
  let root = document.getElementById(MODAL_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = MODAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
};

const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  isOpen,
  onClose,
  models,
  isLoading,
  currentModelId,
  onModelSelect,
  apiKeyStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState(''); // State for the search query

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Modal content (always mounted, but visually hidden if not open)
  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 modal-fade ${
        isOpen ? 'modal-fade-in' : 'modal-fade-out pointer-events-none'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-semibold text-white mb-4">Select AI Model</h2>
        
        {/* Search Input */}
        <div className="mb-4">
          <input 
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models (e.g., gpt-4o, claude, vision)..."
            className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Search AI Models"
          />
        </div>

        {apiKeyStatus !== 'valid' && (
          <div className="mb-4 p-3 bg-yellow-700 bg-opacity-50 text-yellow-200 rounded-md">
            A valid OpenRouter API key is required to fetch and use models. Please check your API key in the AI Configuration.
          </div>
        )}

        {isLoading && apiKeyStatus === 'valid' && (
          <div className="flex items-center justify-center text-gray-300 h-32">
            <p>Loading models...</p>
          </div>
        )}
        
        {/* Filtered Model List */}
        {useMemo(() => {
          if (isLoading || apiKeyStatus !== 'valid') return null;

          const filteredModels = models.filter(model => 
            model.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            model.id.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredModels.length > 0) {
            return (
              <div className="overflow-y-auto flex-grow stable-scrollbar-y pr-2"> 
                <ul className="space-y-2">
                  {filteredModels.map((model) => (
                    <li key={model.id}>
                      <button
                        onClick={() => {
                          onModelSelect(model.id);
                          onClose(); 
                        }}
                        className={`w-full text-left px-4 py-3 rounded-md transition-colors text-sm
                          ${currentModelId === model.id 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                      >
                        <span className="font-medium">{model.name || model.id}</span>
                        {model.hasVision && <span className="text-xs text-cyan-300 ml-2">(Vision)</span>} {/* Display (Vision) tag */}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          } else if (searchQuery) {
            return (
              <div className="flex items-center justify-center text-gray-400 h-32">
                <p>No models match your search "{searchQuery}".</p>
              </div>
            );
          } else {
            return (
              <div className="flex items-center justify-center text-gray-400 h-32">
                <p>No models available or failed to load. Check API key and network.</p>
              </div>
            );
          }
        }, [models, isLoading, apiKeyStatus, searchQuery, currentModelId, onModelSelect, onClose])}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            type="button" // Added type="button"
            className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Ensure modal root exists and portal the modal content
  // This part should be outside the main component function if ensureModalRoot is called during module load,
  // but if it's meant to be dynamic, it's fine here. For React 18+, createRoot is preferred for new apps.
  // However, to minimize changes, we'll assume ensureModalRoot is correctly creating/finding the root.
  
  // The component should return null if not open, or the portal.
  // The current structure always renders modalContent and uses CSS to hide/show.
  // This is acceptable, but returning null when !isOpen is often cleaner.
  // For now, sticking to the existing logic of CSS-based visibility.

  if (typeof window === 'undefined') {
    // Don't attempt to create portal during SSR or build if window is not defined
    return null;
  }

  const modalRoot = ensureModalRoot();
  return ReactDOM.createPortal(modalContent, modalRoot);
};

export default ModelSelectionModal;
