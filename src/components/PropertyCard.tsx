import React, { useState } from 'react';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Sofa, 
  Star, 
  Heart, 
  MessageCircle, 
  Phone, 
  Camera, 
  CheckCircle2, 
  Sparkles,
  Edit3,
  Trash2,
  ShieldCheck,
  ArrowRight,
  Home,
  CheckCircle
} from 'lucide-react';
import { PropertyListing, isOccupied, isApproved } from '../types';
import { useApp } from '../context/AppContext';
import { formatDisplayPhone, openWhatsApp, dialPhone } from '../utils/contact';

interface PropertyCardProps {
  property: PropertyListing;
  isOwnerView?: boolean;
  onEdit?: (property: PropertyListing) => void;
  onDelete?: (property: PropertyListing) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isOwnerView = false,
  onEdit,
  onDelete
}) => {
  const { 
    favorites, 
    toggleFavorite, 
    navigateTo, 
    toggleFeatured,
    updatePropertyOccupancy
  } = useApp();

  const isFav = favorites.includes(property.id);
  const occupied = isOccupied(property.occupancyStatus);

  const mainPhoto = property.photos && property.photos.length > 0 
    ? property.photos[0] 
    : '/hero_gondia_stays.jpg';

  const defaultMsg = `Hello ${property.ownerName}, I saw your listing for '${property.title}' in ${property.locality}, Gondia on Gondia Stay. Is it available for rent?`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col group">
      
      {/* Top Image Box */}
      <div 
        onClick={() => navigateTo('detail', property)}
        className="relative h-48 sm:h-52 w-full overflow-hidden cursor-pointer bg-slate-100"
      >
        <img 
          src={mainPhoto} 
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = '/hero_gondia_stays.jpg';
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-900/40" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {occupied ? (
              <span className="bg-rose-700 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md border border-rose-900 tracking-wider flex items-center gap-1 animate-pulse">
                OCCUPIED
              </span>
            ) : (
              <span className="bg-blue-600/90 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs">
                {property.propertyType}
              </span>
            )}
            {property.isFeatured && (
              <span className="bg-amber-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                <Star className="w-3.5 h-3.5 fill-current" />
                Featured
              </span>
            )}
            {property.status === 'PENDING' && isOwnerView && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2 py-0.5 rounded-lg">
                Pending Review
              </span>
            )}
          </div>

          {/* Favorite Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(property.id);
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md ${
              isFav ? 'bg-red-50 text-red-500' : 'bg-white/90 text-slate-700 hover:text-red-500'
            }`}
            aria-label="Bookmark property"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-current text-red-500' : ''}`} />
          </button>
        </div>

        {/* Multi-photo indicator if owner added multiple */}
        {property.photos && property.photos.length > 1 && (
          <div className="absolute top-3 right-14 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {property.photos.length} Photos
          </div>
        )}

        {/* Bottom overlay: Rent & Deposit */}
        <div className="absolute bottom-3 left-3 text-white">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-amber-300 drop-shadow-xs">
              ₹{property.monthlyRent.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-medium text-slate-200">/month</span>
            <span className="text-xs text-slate-300 ml-2">
              • Dep: ₹{property.securityDeposit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 
            onClick={() => navigateTo('detail', property)}
            className="font-bold text-slate-900 text-base leading-snug hover:text-blue-600 transition-colors cursor-pointer line-clamp-1"
          >
            {property.title}
          </h3>

          {/* Locality & Address */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5 font-medium">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-blue-700">{property.locality}, Gondia</span>
            <span className="truncate">• {property.address}</span>
          </div>

          {/* Key Specs */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 mt-3.5 py-2 px-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-slate-400" />
              <span>{property.bedrooms} Bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-slate-400" />
              <span>{property.bathrooms} Bath</span>
            </div>
            <div className="flex items-center gap-1">
              <Sofa className="w-4 h-4 text-slate-400" />
              <span className="truncate">{property.furnishing.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Amenities Preview */}
          <div className="flex items-center gap-1.5 flex-wrap mt-3">
            {property.amenities.slice(0, 3).map((amenity, idx) => (
              <span key={idx} className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                {amenity}
              </span>
            ))}
            {property.amenities.length > 3 && (
              <span className="text-[10px] text-slate-400 font-semibold">
                +{property.amenities.length - 3} more
              </span>
            )}
          </div>

          {/* Available From & Free Listing indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <span>Available: <strong className="text-slate-800">{property.availableFrom}</strong></span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              100% Free Listing
            </span>
          </div>
        </div>

        {/* Action Buttons: Tenant View vs Owner View */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          {isOwnerView ? (
            /* Landlord controls */
            <div className="space-y-2.5">
              {/* Landlord Contact Info Pill */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-700 truncate">
                  Owner: {property.ownerName} ({formatDisplayPhone(property.ownerPhone)})
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  occupied ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {occupied ? 'Occupied' : 'Available'}
                </span>
              </div>

              {/* Requirement 5: Owner-only Mark as Rented / Occupied and Mark as Available Again */}
              {isApproved(property.status) && (
                <button
                  type="button"
                  onClick={() => updatePropertyOccupancy(property.id, occupied ? 'AVAILABLE' : 'OCCUPIED')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-xs ${
                    occupied
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {occupied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark as Available Again</span>
                    </>
                  ) : (
                    <>
                      <Home className="w-3.5 h-3.5" />
                      <span>Mark as Rented / Occupied</span>
                    </>
                  )}
                </button>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleFeatured(property.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-colors ${
                    property.isFeatured 
                      ? 'bg-amber-50 text-amber-800 border-amber-300' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {property.isFeatured ? 'Highlighted' : 'Highlight (Free)'}
                </button>

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(property)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1"
                    title="Edit listing"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(property)}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold flex items-center gap-1"
                    title="Delete listing"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Tenant View: Check Occupancy Status */
            occupied ? (
              /* Requirement 5: When occupied, hide owner contact number and WhatsApp button from tenant view */
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                  <div>
                    <div className="leading-tight">OCCUPIED / RENTED</div>
                    <div className="text-[10px] text-rose-600 font-normal">Contact & enquiries paused</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('detail', property)}
                  className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-bold transition-colors"
                >
                  View Info
                </button>
              </div>
            ) : (
              /* Available Property: Direct WhatsApp, Call, and Details */
              <div className="flex items-center gap-2">
                {/* Direct WhatsApp Button */}
                <button
                  type="button"
                  onClick={() => openWhatsApp(property.ownerWhatsappNumber || property.ownerPhone, defaultMsg)}
                  className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>WhatsApp</span>
                </button>

                {/* Direct Call Button */}
                <button
                  type="button"
                  onClick={() => dialPhone(property.ownerPhone)}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>

                {/* View Details Button */}
                <button
                  type="button"
                  onClick={() => navigateTo('detail', property)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="View full details"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
