import React from 'react';
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PropertyType, FurnishingStatus, PROPERTY_TYPES } from '../types';

interface FilterModalProps {
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({ onClose }) => {
  const { 
    filterCriteria, 
    setFilterCriteria, 
    resetFilters 
  } = useApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-lg">Filter Listings</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Max Monthly Rent Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-slate-800">Maximum Rent</label>
              <span className="text-sm font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Up to ₹{filterCriteria.maxRent.toLocaleString('en-IN')}/mo
              </span>
            </div>
            <input 
              type="range" 
              min="2000" 
              max="30000" 
              step="500"
              value={filterCriteria.maxRent}
              onChange={(e) => setFilterCriteria(prev => ({ ...prev, maxRent: Number(e.target.value) }))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-1">
              <span>₹2,000</span>
              <span>₹15,000</span>
              <span>₹30,000+</span>
            </div>
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Property Type</label>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterCriteria(prev => ({ ...prev, propertyType: type }))}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all ${
                    filterCriteria.propertyType === type
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Bedrooms (BHK)</label>
            <div className="flex gap-2">
              {[
                { val: 0, label: 'Any' },
                { val: 1, label: '1 BHK / Room' },
                { val: 2, label: '2 BHK' },
                { val: 3, label: '3+ BHK' }
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFilterCriteria(prev => ({ ...prev, bedrooms: val }))}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                    filterCriteria.bedrooms === val
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Furnishing Status */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Furnishing</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: null, label: 'Any' },
                { val: 'FURNISHED' as FurnishingStatus, label: 'Furnished' },
                { val: 'SEMI_FURNISHED' as FurnishingStatus, label: 'Semi-Furnished' },
                { val: 'UNFURNISHED' as FurnishingStatus, label: 'Unfurnished' }
              ].map(({ val, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFilterCriteria(prev => ({ ...prev, furnishing: val }))}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                    filterCriteria.furnishing === val
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter: Verified only */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">Verified Listings Only</div>
              <div className="text-xs text-slate-500">Hide listings currently pending review</div>
            </div>
            <input 
              type="checkbox"
              checked={filterCriteria.statusOnlyApproved}
              onChange={(e) => setFilterCriteria(prev => ({ ...prev, statusOnlyApproved: e.target.checked }))}
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md shadow-blue-600/20"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
