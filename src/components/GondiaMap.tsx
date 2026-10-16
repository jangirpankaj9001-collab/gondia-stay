import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PropertyListing, GONDIA_LOCALITY_COORDS, isOccupied } from '../types';
import { MapPin, Navigation, Crosshair, Layers } from 'lucide-react';

interface GondiaMapProps {
  properties?: PropertyListing[];
  selectedPropertyId?: string | null;
  onSelectProperty?: (property: PropertyListing) => void;
  mode?: 'explore' | 'picker';
  pickerLocation?: { lat: number; lng: number };
  onPickerLocationChange?: (loc: { lat: number; lng: number; locality?: string }) => void;
  heightClass?: string;
}

const GONDIA_CENTER = { lat: 21.4556, lng: 80.1960 };

export const GondiaMap: React.FC<GondiaMapProps> = ({
  properties = [],
  selectedPropertyId,
  onSelectProperty,
  mode = 'explore',
  pickerLocation,
  onPickerLocationChange,
  heightClass = 'h-96'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter = mode === 'picker' && pickerLocation
      ? [pickerLocation.lat, pickerLocation.lng]
      : [GONDIA_CENTER.lat, GONDIA_CENTER.lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: mode === 'picker' ? 15 : 14,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // High quality OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors • GondiaStay'
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // In picker mode, allow user to click anywhere on map to position marker
    if (mode === 'picker') {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (onPickerLocationChange) {
          onPickerLocationChange({ lat, lng });
        }
      });
    }

    // Force map to recalculate size after DOM rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      pickerMarkerRef.current = null;
    };
  }, []);

  // Update Explore Mode Markers
  useEffect(() => {
    if (mode !== 'explore' || !mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    properties.forEach((property) => {
      // Ensure coordinates are within Gondia bounds
      const lat = property.latitude || GONDIA_CENTER.lat;
      const lng = property.longitude || GONDIA_CENTER.lng;
      const isSelected = selectedPropertyId === property.id;
      const occupied = isOccupied(property.occupancyStatus);

      // Create custom price badge / status HTML marker
      const markerHtml = `
        <div class="cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-110 z-50' : 'hover:scale-105'}">
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-full shadow-lg font-bold text-xs border ${
            occupied
              ? 'bg-rose-700 text-white border-rose-900 ring-2 ring-rose-300'
              : isSelected
                ? 'bg-blue-700 text-white border-blue-900 ring-4 ring-blue-400/50'
                : 'bg-white text-blue-900 border-slate-300 hover:border-blue-600'
          }">
            <span>${occupied ? 'OCCUPIED' : `₹${property.monthlyRent.toLocaleString('en-IN')}`}</span>
          </div>
          <div class="w-2 h-2 rotate-45 mx-auto -mt-1 ${
            occupied ? 'bg-rose-700' : isSelected ? 'bg-blue-700' : 'bg-white border-r border-b border-slate-300'
          }"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-property-marker',
        iconSize: [80, 36],
        iconAnchor: [40, 36]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Rich popup
      const photoThumb = property.photos && property.photos[0] ? property.photos[0] : '/hero_gondia_stays.jpg';
      const popupContent = `
        <div style="min-width: 200px; max-width: 240px; font-family: inherit;">
          <img src="${photoThumb}" alt="${property.title}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" onerror="this.src='/hero_gondia_stays.jpg'" />
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 800; color: ${occupied ? '#b91c1c' : '#1d4ed8'}; background: ${occupied ? '#fee2e2' : '#dbeafe'}; padding: 2px 6px; border-radius: 4px;">
              ${occupied ? 'OCCUPIED' : property.propertyType}
            </span>
            <span style="font-size: 12px; font-weight: 900; color: #0f172a;">
              ₹${property.monthlyRent.toLocaleString('en-IN')}/mo
            </span>
          </div>
          <div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${property.title}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            📍 ${property.locality}, Gondia
          </div>
          <button id="popup-btn-${property.id}" style="width: 100%; padding: 6px 10px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
            View Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-${property.id}`);
        if (btn && onSelectProperty) {
          btn.onclick = () => onSelectProperty(property);
        }
      });

      marker.on('click', () => {
        if (onSelectProperty) {
          onSelectProperty(property);
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [properties, selectedPropertyId, mode, onSelectProperty]);

  // Update Picker Mode Marker
  useEffect(() => {
    if (mode !== 'picker' || !mapInstanceRef.current) return;

    const lat = pickerLocation?.lat || GONDIA_CENTER.lat;
    const lng = pickerLocation?.lng || GONDIA_CENTER.lng;

    const pickerHtml = `
      <div class="cursor-grab active:cursor-grabbing flex flex-col items-center">
        <div class="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md whitespace-nowrap mb-0.5 flex items-center gap-1 border border-blue-400">
          <span>📍 Pinpoint Location</span>
        </div>
        <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-blue-500/40">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `;

    const pickerIcon = L.divIcon({
      html: pickerHtml,
      className: 'picker-marker-icon',
      iconSize: [120, 60],
      iconAnchor: [60, 56]
    });

    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], {
        icon: pickerIcon,
        draggable: true
      });

      marker.on('dragend', (e: any) => {
        const newPos = e.target.getLatLng();
        if (onPickerLocationChange) {
          onPickerLocationChange({ lat: newPos.lat, lng: newPos.lng });
        }
      });

      marker.addTo(mapInstanceRef.current);
      pickerMarkerRef.current = marker;
    }
  }, [mode, pickerLocation, onPickerLocationChange]);

  const handleJumpToLocality = (locality: string) => {
    const coords = GONDIA_LOCALITY_COORDS[locality];
    if (coords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1 });
      if (mode === 'picker' && onPickerLocationChange) {
        onPickerLocationChange({ lat: coords.lat, lng: coords.lng, locality });
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
        }
        if (mode === 'picker' && onPickerLocationChange) {
          onPickerLocationChange({ lat: latitude, lng: longitude });
        }
      },
      (err) => {
        alert('Could not detect location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col">
      {/* Top Locality Quick Jump Chips (in picker mode or explore) */}
      <div className="bg-white/95 backdrop-blur-xs px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none z-10">
        <div className="flex items-center gap-1.5 shrink-0 text-slate-700 text-xs font-bold">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>Gondia Areas:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {Object.keys(GONDIA_LOCALITY_COORDS).slice(0, 7).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => handleJumpToLocality(loc)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors whitespace-nowrap"
            >
              {loc}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 shadow-2xs"
          title="Detect my current location"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">My Location</span>
        </button>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className={`w-full ${heightClass} z-0`} />

      {/* Helper Bar */}
      {mode === 'picker' && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="font-medium text-slate-300">
              Click anywhere on map or drag pin to set exact property location in Gondia.
            </span>
          </div>
          {pickerLocation && (
            <div className="font-mono text-[11px] text-blue-300 bg-slate-800 px-2.5 py-0.5 rounded-md">
              Lat: {pickerLocation.lat.toFixed(4)}, Lng: {pickerLocation.lng.toFixed(4)}
            </div>
          )}
        </div>
      )}

      {mode === 'explore' && properties.length > 0 && (
        <div className="bg-white/95 px-3 py-1.5 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>{properties.length} approved Gondia properties mapped</span>
          <span className="text-slate-400">OpenStreetMap Live Tiles • Tap marker to view details</span>
        </div>
      )}
    </div>
  );
};
