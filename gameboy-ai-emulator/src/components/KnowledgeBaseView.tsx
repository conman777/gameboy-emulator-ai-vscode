// KnowledgeBaseView.tsx - Component for viewing and managing AI's knowledge base
import React, { useState, useEffect, useCallback } from 'react';
import { 
  // KnowledgeEntry, // Now imported from ../types
  // NavigationPoint, // Now imported from ../types
  getAllKnowledgeEntries as fetchAllKnowledgeEntries, 
  getAllNavigationPoints,
  searchKnowledgeBase as searchServiceKnowledgeBase, 
  searchNavigationPoints,
  deleteKnowledgeEntry as deleteServiceKnowledgeEntry, 
  deleteNavigationPoint,
  // clearKnowledgeBase, // This function might need to be more granular or removed if deleting all per type
  addKnowledgeEntry as addServiceKnowledgeEntry 
} from '../services/KnowledgeBaseService';
import { KnowledgeEntry, NavigationPoint, GameBoyButton } from '../types'; // Import the new KnowledgeEntry, NavigationPoint, and GameBoyButton types

interface KnowledgeBaseViewProps {
  isVisible: boolean;
  onClose?: () => void;
  currentRomTitle?: string | null; // Pass current ROM title for adding entries
}

const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ 
  isVisible,
  onClose,
  currentRomTitle
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'navigation' | 'add_note'>('notes');
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [navigationPoints, setNavigationPoints] = useState<NavigationPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryType, setSelectedEntryType] = useState<string>('all'); // Changed from selectedCategory
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // State for adding new knowledge entry
  const [newEntryData, setNewEntryData] = useState<Partial<Omit<KnowledgeEntry, 'id' | 'createdAt'>>>({ 
    gameTitle: currentRomTitle || '',
    type: 'general_note',
    description: '',
    keywords: [],
    importance: 'medium',
  });

  const knowledgeEntryTypes: KnowledgeEntry['type'][] = [
    'objective', 'rule', 'tip', 'enemy_info', 'item_info', 'location_fact', 'strategy', 'control_info', 'general_note'
  ];

  const loadData = useCallback(() => {
    if (activeTab === 'notes') {
      setKnowledgeEntries(fetchAllKnowledgeEntries());
    } else if (activeTab === 'navigation') {
      setNavigationPoints(getAllNavigationPoints());
    }
  }, [activeTab]);
  
  useEffect(() => {
    loadData();
  }, [loadData]); // activeTab change will trigger loadData due to useCallback dependency

  useEffect(() => {
    // Update gameTitle in newEntryData if currentRomTitle changes and form is for adding
    if (activeTab === 'add_note') {
      setNewEntryData(prev => ({ ...prev, gameTitle: currentRomTitle || '' }));
    }
  }, [currentRomTitle, activeTab]);
  
  const handleSearch = () => {
    if (activeTab === 'notes') {
      // Use currentRomTitle for filtering by game if provided, otherwise search all
      const entries = searchServiceKnowledgeBase(searchQuery, currentRomTitle || undefined, selectedEntryType === 'all' ? undefined : [selectedEntryType]);
      setKnowledgeEntries(entries);
    } else if (activeTab === 'navigation') {
      setNavigationPoints(searchNavigationPoints(searchQuery)); // Navigation points are not game-specific in current model
    }
  };
  
  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedEntryType('all');
    loadData();
  };
  
  const handleDelete = (id: string) => {
    if (activeTab === 'notes') {
      if (window.confirm('Are you sure you want to delete this knowledge entry?')) {
        deleteServiceKnowledgeEntry(id);
        loadData();
      }
    } else if (activeTab === 'navigation') {
      if (window.confirm('Are you sure you want to delete this navigation point?')) {
        deleteNavigationPoint(id);
        loadData();
      }
    }
  };
  
  const handleClearAllKnowledge = () => {
    if (window.confirm('Are you sure you want to clear ALL knowledge entries (notes)? This cannot be undone!')) {
      const allEntries = fetchAllKnowledgeEntries();
      allEntries.forEach(entry => deleteServiceKnowledgeEntry(entry.id));
      loadData();
    }
  };

  const handleClearAllNavigation = () => {
    if (window.confirm('Are you sure you want to clear ALL navigation points? This cannot be undone!')) {
      const allNavPoints = getAllNavigationPoints();
      allNavPoints.forEach(point => deleteNavigationPoint(point.id));
      // Consider if clearKnowledgeBase should be more granular or if separate functions are better
      // For now, deleting one by one to ensure saveKnowledgeBase is called by the service for each type.
      loadData();
    }
  };
  
  const formatDate = (isoDateString: string) => {
    return new Date(isoDateString).toLocaleString();
  };
  
  const toggleEntryExpansion = (id: string) => {
    setExpandedEntryId(expandedEntryId === id ? null : id);
  };

  const handleNewEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEntryData(prev => ({
      ...prev,
      [name]: name === 'keywords' ? value.split(',').map(k => k.trim()).filter(k => k) : value
    }));
  };

  const handleAddNewEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryData.description || !newEntryData.gameTitle || !newEntryData.type) {
      alert('Please fill in Game Title, Type, and Description.');
      return;
    }
    addServiceKnowledgeEntry(newEntryData as Omit<KnowledgeEntry, 'id' | 'createdAt'>);
    setNewEntryData({ gameTitle: currentRomTitle || '', type: 'general_note', description: '', keywords: [], importance: 'medium' });
    setActiveTab('notes'); // Switch back to notes view
    loadData(); // Refresh notes
  };
  
  if (!isVisible) return null;
  
  const renderAddNoteForm = () => (
    <form onSubmit={handleAddNewEntry} className="p-4 space-y-4">
      <div>
        <label htmlFor="gameTitle" className="block text-sm font-medium text-indigo-200 mb-1">Game Title</label>
        <input type="text" name="gameTitle" id="gameTitle" value={newEntryData.gameTitle} onChange={handleNewEntryChange} required className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600" />
      </div>
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-indigo-200 mb-1">Type</label>
        <select name="type" id="type" value={newEntryData.type} onChange={handleNewEntryChange} className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600">
          {knowledgeEntryTypes.map(type => <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-indigo-200 mb-1">Description</label>
        <textarea name="description" id="description" value={newEntryData.description} onChange={handleNewEntryChange} required rows={4} className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"></textarea>
      </div>
      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-indigo-200 mb-1">Keywords (comma-separated)</label>
        <input type="text" name="keywords" id="keywords" value={(newEntryData.keywords || []).join(', ')} onChange={handleNewEntryChange} className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600" />
      </div>
      <div>
        <label htmlFor="importance" className="block text-sm font-medium text-indigo-200 mb-1">Importance</label>
        <select name="importance" id="importance" value={newEntryData.importance} onChange={handleNewEntryChange} className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      {/* relatedCoordinates can be added later if a map/grid interface is available for selection */}
      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Add Knowledge</button>
    </form>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between bg-indigo-900 p-4 rounded-t-lg">
          <h2 className="text-xl font-bold text-white">
            AI Knowledge Base
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button 
            className={`px-4 py-2 ${activeTab === 'notes' 
              ? 'bg-gray-700 text-white border-b-2 border-indigo-500' 
              : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('notes')}
          >
            View Knowledge
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'add_note' 
              ? 'bg-gray-700 text-white border-b-2 border-indigo-500' 
              : 'text-gray-400 hover:text-white'}`}
            onClick={() => {
              setNewEntryData({ gameTitle: currentRomTitle || '', type: 'general_note', description: '', keywords: [], importance: 'medium' });
              setActiveTab('add_note');
            }}
          >
            Add Knowledge
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'navigation' 
              ? 'bg-gray-700 text-white border-b-2 border-indigo-500' 
              : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('navigation')}
          >
            Navigation Map
          </button>
        </div>
        
        {/* Search and Filters (only for 'notes' and 'navigation' tabs) */}
        { (activeTab === 'notes' || activeTab === 'navigation') && (
          <div className="p-4 border-b border-gray-700 flex flex-wrap gap-2 items-center">
            <div className="flex-grow">
              <input
                type="text"
                placeholder={activeTab === 'notes' ? "Search descriptions, keywords..." : "Search navigation points..."}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            {activeTab === 'notes' && (
              <select
                className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                value={selectedEntryType} // Changed from selectedCategory
                onChange={(e) => {
                  setSelectedEntryType(e.target.value); // Changed
                  // Apply filter immediately by calling handleSearch
                  // To do this, we need to ensure handleSearch uses the latest state
                  // or pass the value directly. For simplicity, user can click search.
                }}
              >
                <option value="all">All Types</option>
                {knowledgeEntryTypes.map(type => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            )}
            
            <button
              className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              onClick={handleSearch}
            >
              Search
            </button>
            <button
              className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={handleClearSearch}
            >
              Clear Search
            </button>
            <button
              className={`px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 ${activeTab === 'notes' ? '' : 'hidden'}`}
              onClick={handleClearAllKnowledge} // Changed to be specific
              title="Clear all game notes/knowledge entries"
            >
              Clear All Notes
            </button>
             <button
              className={`px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 ${activeTab === 'navigation' ? '' : 'hidden'}`}
              onClick={handleClearAllNavigation} // Changed to be specific
              title="Clear all navigation points"
            >
              Clear Nav Map
            </button>
          </div>
        )}
        
        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-4">
          {activeTab === 'notes' ? (
            knowledgeEntries.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No knowledge entries found. Try adjusting search filters or add new knowledge.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {knowledgeEntries.map((entry) => (
                  <div 
                    key={entry.id}
                    className="bg-gray-700 rounded p-4 border border-gray-600 shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-indigo-300 font-semibold">{entry.gameTitle}</div>
                        <div 
                          className="text-white font-medium cursor-pointer mt-1 break-words"
                          onClick={() => toggleEntryExpansion(entry.id)}
                        >
                          {entry.description.length > 150 && expandedEntryId !== entry.id
                            ? `${entry.description.substring(0, 150)}... (click to expand)`
                            : entry.description
                          }
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Created: {formatDate(entry.createdAt)}
                        </div>
                      </div>
                      <button
                        className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                        onClick={() => handleDelete(entry.id)}
                        title="Delete entry"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-2 items-center text-xs">
                      <span className={`capitalize px-2 py-0.5 rounded font-semibold ${ 
                        entry.type === 'objective' ? 'bg-green-700 text-green-200' :
                        entry.type === 'rule' ? 'bg-red-700 text-red-200' :
                        entry.type === 'tip' ? 'bg-blue-700 text-blue-200' :
                        entry.type === 'enemy_info' ? 'bg-yellow-700 text-yellow-200' :
                        entry.type === 'item_info' ? 'bg-purple-700 text-purple-200' :
                        entry.type === 'location_fact' ? 'bg-pink-700 text-pink-200' :
                        entry.type === 'strategy' ? 'bg-teal-700 text-teal-200' :
                        entry.type === 'control_info' ? 'bg-orange-700 text-orange-200' :
                        'bg-gray-600 text-gray-200'
                      }`}>
                        {entry.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${entry.importance === 'high' ? 'bg-red-500 text-white' : entry.importance === 'medium' ? 'bg-yellow-500 text-black' : 'bg-gray-500 text-white'}`}>
                        Importance: {entry.importance}
                      </span>
                      {(entry.keywords && entry.keywords.length > 0) && (
                        <div className="flex flex-wrap gap-1">
                          {entry.keywords.map((keyword, i) => (
                            <span key={i} className="bg-gray-600 text-gray-200 px-2 py-0.5 rounded">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {entry.relatedCoordinates && (
                      <div className="mt-2 text-xs text-gray-400">
                        Related Coords: (X: {entry.relatedCoordinates.x}, Y: {entry.relatedCoordinates.y})
                      </div>
                    )}
                    
                    {/* Screenshot if available - assuming old structure might have it */}
                    {(entry as any).screenshot && (
                      <div className="mt-3">
                        <img 
                          src={`data:image/png;base64,${(entry as any).screenshot}`}
                          alt="Game screenshot (legacy entry)"
                          className="max-h-32 rounded border border-gray-600"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'add_note' ? (
            renderAddNoteForm()
          ) : (
            navigationPoints.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No navigation points found. Try adding some or check search filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {navigationPoints.map((point) => (
                  <div 
                    key={point.id}
                    className="bg-gray-700 rounded p-4 border border-gray-600 shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold break-words">{point.name}</h3>
                        <div className="text-sm text-indigo-300 font-medium">{point.gameTitle}</div>
                        <p className="text-sm text-gray-300 mt-1 break-words">{point.description}</p>
                      </div>
                      <button
                        className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                        onClick={() => handleDelete(point.id)}
                        title="Delete navigation point"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="text-gray-400">
                        <span className="font-semibold text-gray-300">From:</span> {point.fromLocation}
                      </div>
                      <div className="text-gray-400">
                        <span className="font-semibold text-gray-300">To:</span> {point.toLocation}
                      </div>
                    </div>
                    
                    {point.directions && point.directions.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-400 font-semibold">Directions:</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {point.directions.map((dir: GameBoyButton, i: number) => ( // Explicitly type dir and i
                            <span key={i} className="text-xs bg-indigo-700 text-indigo-200 px-1.5 py-0.5 rounded">
                              {dir}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(point.tags && point.tags.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-gray-400 font-semibold">Tags:</span>
                          {point.tags.map((tag, i) => (
                            <span key={i} className="text-xs bg-gray-600 text-gray-200 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      Created: {formatDate(point.createdAt)} {/* Use point.createdAt (string) */}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseView;
