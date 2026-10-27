import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PropertyListing, GONDIA_LOCALITY_COORDS, isOccupied } from '../types';
import { 
  MapPin, 
  Layers, 
  Plus, 
  Minus, 
  Loader2, 
  Compass, 
  Check, 
  AlertCircle 
} from 'lucide-react';

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

/**
 * Formats rent into compact Indian currency representation (e.g. ₹6k, ₹20k, ₹30k).
 */
export const formatCompactRent = (amount: number): string => {
  if (isNaN(amount) || amount <= 0) return '₹0';
  if (amount >= 100000) {
    const l = amount / 100000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return `₹${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `₹${amount}`;
};

// Free, reliable OpenStreetMap-compatible tile layer presets (NO API key required)
const TILE_LAYERS = {
  osm: {
    name: 'OpenStreetMap (Standard)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors • GondiaStay'
  },
  hot: {
    name: 'Humanitarian OSM (High Contrast)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors • Style: HOT'
  }
};

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
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const localitiesLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [activeLayerKey, setActiveLayerKey] = useState<'osm' | 'hot'>('osm');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showLocalityLabels, setShowLocalityLabels] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [locationToast, setLocationToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!locationToast) return;
    const timer = setTimeout(() => setLocationToast(null), 4000);
    return () => clearTimeout(timer);
  }, [locationToast]);

  // Switch Tile Layer
  const setTileLayer = useCallback((layerKey: 'osm' | 'hot') => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const config = TILE_LAYERS[layerKey] || TILE_LAYERS.osm;
    const newLayer = L.tileLayer(config.url, {
      subdomains: config.subdomains,
      maxZoom: config.maxZoom,
      attribution: config.attribution,
      crossOrigin: true
    });

    // Graceful error handling for tile network issues
    newLayer.on('tileerror', (e) => {
      console.warn('[GondiaMap] Tile load warning handled gracefully:', e);
    });

    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
    setActiveLayerKey(layerKey);
  }, []);

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
      minZoom: 11,
      maxZoom: 19,
      zoomControl: false, // Using custom smooth controls
      scrollWheelZoom: true,
      bounceAtZoomLimits: true
    });

    // Default to 100% free, reliable OpenStreetMap tiles (no API key required)
    const config = TILE_LAYERS.osm;
    const initialTile = L.tileLayer(config.url, {
      subdomains: config.subdomains,
      maxZoom: config.maxZoom,
      attribution: config.attribution,
      crossOrigin: true
    });

    initialTile.on('tileerror', (e) => {
      console.warn('[GondiaMap] Initial tile load notice:', e);
    });

    initialTile.addTo(map);
    tileLayerRef.current = initialTile;

    const localitiesGroup = L.layerGroup().addTo(map);
    localitiesLayerRef.current = localitiesGroup;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    mapInstanceRef.current = map;

    // Pinpoint mode: click on map to reposition pinpoint marker
    if (mode === 'picker') {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (onPickerLocationChange) {
          onPickerLocationChange({ lat, lng });
        }
      });
    }

    // Force map to recalculate size after DOM rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      localitiesLayerRef.current = null;
      pickerMarkerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  // Render Locality Landmark Labels on the Map for clear navigation
  useEffect(() => {
    if (!mapInstanceRef.current || !localitiesLayerRef.current) return;
    localitiesLayerRef.current.clearLayers();

    if (!showLocalityLabels) return;

    Object.entries(GONDIA_LOCALITY_COORDS).forEach(([name, coords]) => {
      const isSelected = mode === 'explore' && properties.some(
        p => p.id === selectedPropertyId && p.locality === name
      );

      const html = `
        <div class="locality-pill-badge pointer-events-auto cursor-pointer transition-all duration-150 ${isSelected ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-105'}">
          <div style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); color: #ffffff; padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; gap: 3px;">
            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 9999px; background: #38bdf8;"></span>
            <span>${name}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: 'custom-locality-marker',
        iconSize: [80, 24],
        iconAnchor: [40, 12]
      });

      const marker = L.marker([coords.lat, coords.lng], {
        icon,
        interactive: true,
        zIndexOffset: -50 // Keep under property markers
      });

      marker.on('click', () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 0.8 });
        }
        if (mode === 'picker' && onPickerLocationChange) {
          onPickerLocationChange({ lat: coords.lat, lng: coords.lng, locality: name });
        }
      });

      localitiesLayerRef.current?.addLayer(marker);
    });
  }, [showLocalityLabels, mode, properties, selectedPropertyId, onPickerLocationChange]);

  // Update Explore Mode Property Markers
  useEffect(() => {
    if (mode !== 'explore' || !mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    properties.forEach((property) => {
      const lat = property.latitude || GONDIA_CENTER.lat;
      const lng = property.longitude || GONDIA_CENTER.lng;
      const isSelected = selectedPropertyId === property.id;
      const occupied = isOccupied(property.occupancyStatus);

      // Rent formatted as compact ₹6k, ₹20k, ₹30k
      const compactPrice = formatCompactRent(property.monthlyRent);

      // Large 48px touch target with crisp typography and subtle drop pointer
      const markerHtml = `
        <div class="property-marker-target cursor-pointer select-none transition-transform duration-200 ${isSelected ? 'scale-115 z-50' : 'hover:scale-105 active:scale-95'}" style="touch-action: manipulation;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 10px; min-width: 58px; height: 32px; border-radius: 9999px; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; font-weight: 800; letter-spacing: -0.01em; box-shadow: 0 4px 14px rgba(0,0,0,0.22); border: 1.5px solid ${
            occupied
              ? '#881337'
              : isSelected
                ? '#1e3a8a'
                : '#cbd5e1'
          }; background: ${
            occupied
              ? '#be123c'
              : isSelected
                ? '#1d4ed8'
                : '#ffffff'
          }; color: ${
            occupied || isSelected ? '#ffffff' : '#0f172a'
          };">
            <span>${occupied ? 'OCCUPIED' : compactPrice}</span>
          </div>
          <div style="width: 8px; height: 8px; transform: rotate(45deg); margin: -4px auto 0 auto; background: ${
            occupied ? '#be123c' : isSelected ? '#1d4ed8' : '#ffffff'
          }; border-right: 1.5px solid ${
            occupied ? '#881337' : isSelected ? '#1e3a8a' : '#cbd5e1'
          }; border-bottom: 1.5px solid ${
            occupied ? '#881337' : isSelected ? '#1e3a8a' : '#cbd5e1'
          };"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-property-marker-container',
        iconSize: [90, 48],
        iconAnchor: [45, 44]
      });

      const marker = L.marker([lat, lng], { 
        icon: customIcon,
        zIndexOffset: isSelected ? 500 : 100
      });

      // Rich popup with compact rent prominent and detailed view
      const photoThumb = property.photos && property.photos[0] ? property.photos[0] : '/hero_gondia_stays.jpg';
      const popupContent = `
        <div style="min-width: 220px; max-width: 260px; font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 2px;">
          <div style="position: relative; width: 100%; height: 110px; border-radius: 10px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
            <img src="${photoThumb}" alt="${property.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/hero_gondia_stays.jpg'" />
            <span style="position: absolute; top: 6px; left: 6px; font-size: 10px; font-weight: 800; color: ${occupied ? '#ffffff' : '#0f172a'}; background: ${occupied ? '#be123c' : '#ffffff'}; padding: 2px 7px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
              ${occupied ? 'OCCUPIED' : property.propertyType}
            </span>
          </div>
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 3px;">
            <div style="font-size: 16px; font-weight: 900; color: #1e40af; line-height: 1;">
              ${compactPrice}<span style="font-size: 11px; font-weight: 600; color: #64748b;">/month</span>
            </div>
            <div style="font-size: 10px; color: #64748b; font-weight: 600;">
              ₹${property.monthlyRent.toLocaleString('en-IN')}
            </div>
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${property.title}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            <span>📍 ${property.locality}, Gondia</span>
          </div>
          <button id="popup-btn-${property.id}" style="width: 100%; padding: 8px 12px; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; transition: background 0.15s; box-shadow: 0 2px 4px rgba(37,99,235,0.25);">
            View Details & Contact
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        autoPan: true,
        autoPanPadding: [30, 30]
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-${property.id}`);
        if (btn && onSelectProperty) {
          btn.onclick = () => onSelectProperty(property);
        }
      });

      marker.on('click', () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.35 });
        }
        if (onSelectProperty) {
          onSelectProperty(property);
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [properties, selectedPropertyId, mode, onSelectProperty]);

  // Update Pinpoint Mode Marker (Preserved & Enhanced)
  useEffect(() => {
    if (mode !== 'picker' || !mapInstanceRef.current) return;

    const lat = pickerLocation?.lat || GONDIA_CENTER.lat;
    const lng = pickerLocation?.lng || GONDIA_CENTER.lng;

    const pickerHtml = `
      <div class="cursor-grab active:cursor-grabbing flex flex-col items-center select-none" style="touch-action: none;">
        <div style="background: #1d4ed8; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; box-shadow: 0 3px 8px rgba(0,0,0,0.3); white-space: nowrap; margin-bottom: 2px; border: 1px solid #60a5fa; display: flex; align-items: center; gap: 4px;">
          <span>📍 Pinpoint Location</span>
        </div>
        <div style="width: 36px; height: 36px; border-radius: 9999px; background: #2563eb; color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.45); border: 2.5px solid #ffffff;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `;

    const pickerIcon = L.divIcon({
      html: pickerHtml,
      className: 'picker-marker-container',
      iconSize: [140, 68],
      iconAnchor: [70, 62]
    });

    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.setLatLng([lat, lng]);
      if (mapInstanceRef.current && !mapInstanceRef.current.getBounds().contains([lat, lng])) {
        mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
      }
    } else {
      const marker = L.marker([lat, lng], {
        icon: pickerIcon,
        draggable: true,
        zIndexOffset: 1000
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

  // Jump to specific locality
  const handleJumpToLocality = (locality: string) => {
    const coords = GONDIA_LOCALITY_COORDS[locality];
    if (coords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 0.9 });
      if (mode === 'picker' && onPickerLocationChange) {
        onPickerLocationChange({ lat: coords.lat, lng: coords.lng, locality });
      }
    }
  };

  // Zoom helpers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn(1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut(1);
    }
  };

  // Reset to Gondia City Center
  const handleResetToGondia = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([GONDIA_CENTER.lat, GONDIA_CENTER.lng], 14, { duration: 0.9 });
    }
  };

  // Current Location Feature: centers on user location with location-pin icon
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationToast({
        type: 'error',
        message: 'Geolocation is not supported by your browser.'
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;

        if (mapInstanceRef.current) {
          // Smooth fly to current location
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.2 });

          // Render or update animated User Location Pin marker
          const userLocationHtml = `
            <div class="user-location-pin-wrapper select-none">
              <div class="user-pulse-halo"></div>
              <div class="user-pin-bubble">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
            </div>
          `;

          const userIcon = L.divIcon({
            html: userLocationHtml,
            className: 'user-location-div-icon',
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            const uMarker = L.marker([latitude, longitude], {
              icon: userIcon,
              zIndexOffset: 800
            });
            uMarker.bindPopup(`
              <div style="font-family: system-ui, sans-serif; font-size: 12px; font-weight: 700; color: #1e3a8a; padding: 4px;">
                📍 You are here
              </div>
            `);
            uMarker.addTo(mapInstanceRef.current);
            userMarkerRef.current = uMarker;
          }
        }

        if (mode === 'picker' && onPickerLocationChange) {
          onPickerLocationChange({ lat: latitude, lng: longitude });
        }

        setLocationToast({
          type: 'success',
          message: 'Centered on your current location!'
        });
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Could not retrieve your location.';
        if (err.code === 1) {
          msg = 'Location permission denied. Please allow location access in browser settings.';
        } else if (err.code === 2) {
          msg = 'Location position unavailable. Please check GPS/network.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again.';
        }
        setLocationToast({ type: 'error', message: msg });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-md bg-slate-100 flex flex-col">
      
      {/* Top Locality Quick Jump Chips (in explore mode only) */}
      {mode === 'explore' && (
        <div className="bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2 border-b border-slate-200/80 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none z-10 shadow-2xs">
          <div className="flex items-center gap-1.5 shrink-0 text-slate-800 text-xs font-black uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">Gondia Hubs:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {Object.keys(GONDIA_LOCALITY_COORDS).slice(0, 8).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => handleJumpToLocality(loc)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                {loc}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Center map on my current location"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-white" />
            )}
            <span>{isLocating ? 'Locating...' : 'My Location'}</span>
          </button>
        </div>
      )}

      {/* Map Canvas */}
      <div className="relative w-full overflow-hidden">
        <div ref={mapContainerRef} className={`w-full ${heightClass} z-0`} />

        {/* Location Toast Notification */}
        {locationToast && (
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-500 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all animate-fadeIn ${
            locationToast.type === 'success' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-rose-600 text-white'
          }`}>
            {locationToast.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{locationToast.message}</span>
          </div>
        )}

        {/* Floating Map Controls (Right Side) */}
        <div className="absolute top-3 right-3 z-400 flex flex-col gap-2">
          
          {/* Dedicated Current-Location Button with Location-Pin Icon */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-10 h-10 rounded-2xl bg-white hover:bg-blue-50 text-blue-700 border border-slate-200/90 shadow-md flex items-center justify-center transition-all cursor-pointer hover:shadow-lg active:scale-90 group"
            title="Center map on my current location (GPS)"
            aria-label="My Location"
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <MapPin className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Smooth Zoom Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer border-b border-slate-100"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Reset View to Gondia Center */}
          <button
            type="button"
            onClick={handleResetToGondia}
            className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-md flex items-center justify-center transition-all cursor-pointer text-[10px] font-black uppercase"
            title="Reset to Gondia City Center"
          >
            Center
          </button>

          {/* Map Layer Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-md flex items-center justify-center transition-all cursor-pointer"
              title="Change map style"
              aria-label="Change map style"
            >
              <Layers className="w-4 h-4 text-slate-700" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 z-500 animate-fadeIn text-xs">
                <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">
                  Map Cartography
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTileLayer('osm');
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl font-bold flex items-center justify-between cursor-pointer ${
                    activeLayerKey === 'osm'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>OpenStreetMap Standard</span>
                  {activeLayerKey === 'osm' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTileLayer('hot');
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl font-bold flex items-center justify-between cursor-pointer ${
                    activeLayerKey === 'hot'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Humanitarian High-Contrast</span>
                  {activeLayerKey === 'hot' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <div className="border-t border-slate-100 my-1 pt-1">
                  <label className="flex items-center gap-2 px-2 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLocalityLabels}
                      onChange={(e) => setShowLocalityLabels(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Show Locality Labels</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pinpoint Helper in Picker Mode */}
        {mode === 'picker' && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto z-400 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-lg border border-slate-200 text-xs flex items-center justify-between gap-3 max-w-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-extrabold text-slate-800 block">Tap map or drag pin</span>
                <span className="text-slate-500">
                  {pickerLocation ? `${pickerLocation.lat.toFixed(4)}, ${pickerLocation.lng.toFixed(4)}` : 'Coordinates set'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl border border-blue-200 text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
              title="Pinpoint current location"
            >
              <MapPin className="w-3 h-3 text-blue-600" />
              <span>Use GPS</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Footer Details (Explore Mode) */}
      {mode === 'explore' && (
        <div className="bg-white/95 px-3.5 py-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 z-10">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-bold text-slate-800">
              {properties.length} Approved Stays in Gondia
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Rent shown as ₹6k, ₹20k, ₹30k</span>
          </div>
          <div className="text-slate-400 text-[10px]">
            HD Clear Roads & Localities • Tap markers for instant details
          </div>
        </div>
      )}

      {/* Embedded CSS for marker animations and pulse effects */}
      <style>{`
        .custom-property-marker-container {
          background: transparent !important;
          border: none !important;
        }
        .picker-marker-container {
          background: transparent !important;
          border: none !important;
        }
        .custom-locality-marker {
          background: transparent !important;
          border: none !important;
        }
        .user-location-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .user-location-pin-wrapper {
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-pulse-halo {
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          background: rgba(37, 99, 235, 0.35);
          animation: mapUserPulse 2s infinite ease-out;
        }
        .user-pin-bubble {
          position: relative;
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          background: #2563eb;
          color: #ffffff;
          border: 2.5px solid #ffffff;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @keyframes mapUserPulse {
          0% {
            transform: scale(0.6);
            opacity: 0.9;
          }
          70% {
            transform: scale(1.6);
            opacity: 0;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
