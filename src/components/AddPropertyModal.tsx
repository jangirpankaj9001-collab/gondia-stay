import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Zap,
  Plus,
  Home,
  Bed,
  Bath,
  IndianRupee,
  Calendar,
  Check,
  Crosshair,
  Info
} from 'lucide-react';
import { GondiaMap } from './GondiaMap';
import {
  PropertyListing,
  PropertyType,
  AccommodationType,
  FurnishingStatus,
  KitchenAvailability,
  ContactMethod,
  SuitableTenantType,
  GONDIA_LOCALITIES,
  GONDIA_LOCALITY_COORDS,
  PROPERTY_TYPES,
  ACCOMMODATION_TYPES
} from '../types';
import {
  compressAndResizeImage,
  validateImageFile,
  formatBytes,
  getFileFingerprint
} from '../utils/imageOptimizer';
import { uploadMultiplePropertyPhotos } from '../firebase/storageService';
import { isValidIndianMobileNumber } from '../utils/contact';
import { useApp } from '../context/AppContext';

interface PhotoItem {
  id: string;
  file?: File;
  url: string;
  isExisting?: boolean;
  name?: string;
  originalSize?: number;
  originalSizeFormatted?: string;
  optimizedSize?: number;
  optimizedSizeFormatted?: string;
  savedPercentage?: number;
  fingerprint?: string;
  isOptimizing?: boolean;
}

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyToEdit?: PropertyListing | null;
  onSaveProperty: (property: PropertyListing, isEdit: boolean, editToken?: string) => Promise<any>;
  isAdmin?: boolean;
  editToken?: string | null;
  currentOwner: {
    id?: string;
    name: string;
    phone: string;
    whatsappNumber?: string;
    email?: string;
  };
  onSuccessToast?: (msg: string) => void;
}

const COMMON_AMENITIES = [
  '24/7 Water',
  'Wi-Fi',
  'Bike Parking',
  'Car Parking',
  'Power Backup',
  'CCTV',
  'RO Purifier',
  'Balcony',
  'Attached Washroom',
  'Air Conditioner',
  'Geyser',
  'Wardrobe',
  'Refrigerator'
];

const TENANT_OPTIONS: { value: SuitableTenantType; label: string }[] = [
  { value: 'ALL', label: 'All Suitable' },
  { value: 'FAMILIES', label: 'Families' },
  { value: 'STUDENTS', label: 'Students' },
  { value: 'WORKING_PROFESSIONALS', label: 'Working Professionals' }
];

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  isOpen,
  onClose,
  propertyToEdit = null,
  onSaveProperty,
  isAdmin = false,
  editToken = null,
  currentOwner,
  onSuccessToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState(GONDIA_LOCALITIES[1] || 'Civil Lines');
  const [propertyType, setPropertyType] = useState<PropertyType>('FLAT');
  const [accommodationType, setAccommodationType] = useState<AccommodationType>('1_BHK');
  const [monthlyRent, setMonthlyRent] = useState<number | string>(8000);
  const [securityDeposit, setSecurityDeposit] = useState<number | string>(16000);
  const [bedrooms, setBedrooms] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [kitchenAvailable, setKitchenAvailable] = useState<KitchenAvailability>('PRIVATE');
  const [hallAvailable, setHallAvailable] = useState<boolean>(true);
  const [furnishing, setFurnishing] = useState<FurnishingStatus>('SEMI_FURNISHED');
  const [suitableTenants, setSuitableTenants] = useState<SuitableTenantType[]>(['ALL']);
  const [availableFrom, setAvailableFrom] = useState<string>('Immediate');
  const [occupancyStatus, setOccupancyStatus] = useState<'AVAILABLE' | 'OCCUPIED'>('AVAILABLE');
  const [amenities, setAmenities] = useState<string[]>(['24/7 Water', 'Wi-Fi']);
  const [description, setDescription] = useState<string>('');

  // Map Pinpoint Coordinates
  const [pickerLocation, setPickerLocation] = useState<{ lat: number; lng: number }>({
    lat: GONDIA_LOCALITY_COORDS['Civil Lines']?.lat || 21.4602,
    lng: GONDIA_LOCALITY_COORDS['Civil Lines']?.lng || 80.1945
  });
  const [hasCustomPin, setHasCustomPin] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const { isOwnerAuthenticated, isAdminAuthenticated, authUser } = useApp();
  const isRealOwnerLoggedIn = Boolean(isOwnerAuthenticated && !isAdminAuthenticated);

  // Landlord Contact
  const [ownerName, setOwnerName] = useState(
    (!propertyToEdit && isRealOwnerLoggedIn && currentOwner?.name) ? currentOwner.name : ''
  );
  const [ownerPhone, setOwnerPhone] = useState(
    (!propertyToEdit && isRealOwnerLoggedIn && currentOwner?.phone) ? currentOwner.phone : ''
  );
  const [ownerWhatsappNumber, setOwnerWhatsappNumber] = useState(
    (!propertyToEdit && isRealOwnerLoggedIn && (currentOwner?.whatsappNumber || currentOwner?.phone)) 
      ? (currentOwner.whatsappNumber || currentOwner.phone) 
      : ''
  );
  const [ownerPreferredContact, setOwnerPreferredContact] = useState<ContactMethod>('BOTH');

  // Photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; completed: number; total: number } | null>(null);

  // Status & Errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedPropertyInfo, setSavedPropertyInfo] = useState<{
    id: string;
    title: string;
    locality: string;
    rent: number;
    ownerName: string;
    ownerPhone: string;
  } | null>(null);

  // Populate or reset form fields when modal opens or propertyToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (propertyToEdit) {
      setTitle(propertyToEdit.title || '');
      setAddress(propertyToEdit.address || '');
      const loc = propertyToEdit.locality || GONDIA_LOCALITIES[1] || 'Civil Lines';
      setLocality(loc);
      setPropertyType(propertyToEdit.propertyType || 'FLAT');
      setAccommodationType(propertyToEdit.accommodationType || '1_BHK');
      setMonthlyRent(propertyToEdit.monthlyRent ?? 8000);
      setSecurityDeposit(propertyToEdit.securityDeposit ?? (propertyToEdit.monthlyRent ? propertyToEdit.monthlyRent * 2 : 16000));
      setBedrooms(propertyToEdit.bedrooms ?? 1);
      setBathrooms(propertyToEdit.bathrooms ?? 1);
      setKitchenAvailable(propertyToEdit.kitchenAvailable || 'PRIVATE');
      setHallAvailable(propertyToEdit.hallAvailable !== undefined ? propertyToEdit.hallAvailable : true);
      setFurnishing(propertyToEdit.furnishing || 'SEMI_FURNISHED');
      setSuitableTenants(propertyToEdit.suitableTenants && propertyToEdit.suitableTenants.length > 0 ? propertyToEdit.suitableTenants : ['ALL']);
      setAvailableFrom(propertyToEdit.availableFrom || 'Immediate');
      setOccupancyStatus((propertyToEdit.occupancyStatus as any) || 'AVAILABLE');
      setAmenities(propertyToEdit.amenities || ['24/7 Water', 'Wi-Fi']);
      setDescription(propertyToEdit.description || '');

      // Restore exact latitude and longitude or fallback to locality center
      const hasCoords = typeof propertyToEdit.latitude === 'number' && typeof propertyToEdit.longitude === 'number' && propertyToEdit.latitude !== 0;
      const initialLat = hasCoords ? propertyToEdit.latitude : (GONDIA_LOCALITY_COORDS[loc]?.lat || 21.4602);
      const initialLng = hasCoords ? propertyToEdit.longitude : (GONDIA_LOCALITY_COORDS[loc]?.lng || 80.1945);
      setPickerLocation({ lat: initialLat, lng: initialLng });
      setHasCustomPin(hasCoords);

      setOwnerName(propertyToEdit.ownerName || '');
      setOwnerPhone(propertyToEdit.ownerPhone || '');
      setOwnerWhatsappNumber(propertyToEdit.ownerWhatsappNumber || propertyToEdit.ownerPhone || '');
      setOwnerPreferredContact(propertyToEdit.ownerPreferredContact || 'BOTH');

      const existingItems: PhotoItem[] = (propertyToEdit.photos || []).map((url, idx) => ({
        id: `existing_${idx}_${Date.now()}`,
        url,
        isExisting: true,
        name: `Photo ${idx + 1}`,
        fingerprint: `existing_${url}`
      }));
      setPhotos(existingItems);
      setFormError(null);
      setIsSuccess(false);
    } else {
      setTitle('');
      setAddress('');
      const defaultLoc = GONDIA_LOCALITIES[1] || 'Civil Lines';
      setLocality(defaultLoc);
      setPropertyType('FLAT');
      setAccommodationType('1_BHK');
      setMonthlyRent(8000);
      setSecurityDeposit(16000);
      setBedrooms(1);
      setBathrooms(1);
      setKitchenAvailable('PRIVATE');
      setHallAvailable(true);
      setFurnishing('SEMI_FURNISHED');
      setSuitableTenants(['ALL']);
      setAvailableFrom('Immediate');
      setOccupancyStatus('AVAILABLE');
      setAmenities(['24/7 Water', 'Wi-Fi']);
      setDescription('');

      const defaultCoords = GONDIA_LOCALITY_COORDS[defaultLoc] || { lat: 21.4602, lng: 80.1945 };
      setPickerLocation(defaultCoords);
      setHasCustomPin(false);

      const shouldAutoFill = Boolean(isRealOwnerLoggedIn && currentOwner?.name);
      setOwnerName(shouldAutoFill ? (currentOwner?.name || '') : '');
      setOwnerPhone(shouldAutoFill ? (currentOwner?.phone || '') : '');
      setOwnerWhatsappNumber(shouldAutoFill ? (currentOwner?.whatsappNumber || currentOwner?.phone || '') : '');
      setOwnerPreferredContact('BOTH');

      setPhotos([]);
      setFormError(null);
      setIsSuccess(false);
      setSavedPropertyInfo(null);
    }
  }, [isOpen, propertyToEdit, currentOwner, isRealOwnerLoggedIn]);

  const handleLocalityChange = (newLocality: string) => {
    setLocality(newLocality);
    // If owner hasn't custom-dragged pin, center map on chosen locality
    if (!hasCustomPin) {
      const coords = GONDIA_LOCALITY_COORDS[newLocality];
      if (coords) {
        setPickerLocation({ lat: coords.lat, lng: coords.lng });
      }
    }
  };

  const handlePickerLocationChange = (loc: { lat: number; lng: number; locality?: string }) => {
    setPickerLocation({ lat: loc.lat, lng: loc.lng });
    setHasCustomPin(true);
    if (loc.locality && GONDIA_LOCALITIES.includes(loc.locality)) {
      setLocality(loc.locality);
    }
  };

  const handlePinpointMyLocation = () => {
    if (!navigator.geolocation) {
      if (onSuccessToast) onSuccessToast('Geolocation is not supported by your browser');
      else alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickerLocation({ lat: latitude, lng: longitude });
        setHasCustomPin(true);
        setIsLocating(false);
        if (onSuccessToast) onSuccessToast('Location pinned via device GPS!');
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        const errMsg = err.code === 1 ? 'Location permission denied' : 'Could not detect location';
        if (onSuccessToast) onSuccessToast(errMsg);
        else alert(errMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (!isOpen) return null;

  // Photo handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const existingFingerprints = new Set(photos.map(p => p.fingerprint).filter(Boolean) as string[]);
    const newItems: PhotoItem[] = [];
    const filesToOptimize: { id: string; file: File }[] = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setFormError(validation.error || 'Invalid photo format.');
        continue;
      }

      const fingerprint = getFileFingerprint(file);
      if (existingFingerprints.has(fingerprint)) continue;
      existingFingerprints.add(fingerprint);

      const itemId = `new_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const origSize = file.size;

      newItems.push({
        id: itemId,
        file,
        url: URL.createObjectURL(file),
        isExisting: false,
        name: file.name,
        originalSize: origSize,
        originalSizeFormatted: formatBytes(origSize),
        fingerprint,
        isOptimizing: true
      });

      filesToOptimize.push({ id: itemId, file });
    }

    if (newItems.length > 0) {
      setPhotos(prev => [...prev, ...newItems]);

      filesToOptimize.forEach(({ id, file }) => {
        compressAndResizeImage(file, {
          maxDimension: 1280,
          targetMaxBytes: 350 * 1024,
          initialQuality: 0.78,
          minQuality: 0.65
        })
          .then(optimized => {
            setPhotos(current =>
              current.map(item => {
                if (item.id === id) {
                  return {
                    ...item,
                    file: optimized.file,
                    url: optimized.previewUrl,
                    optimizedSize: optimized.compressedSize,
                    optimizedSizeFormatted: optimized.compressedSizeFormatted,
                    savedPercentage: optimized.savedPercentage,
                    isOptimizing: false
                  };
                }
                return item;
              })
            );
          })
          .catch(() => {
            setPhotos(current =>
              current.map(item => (item.id === id ? { ...item, isOptimizing: false } : item))
            );
          });
      });
    }

    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      if (target && !target.isExisting && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const handleMakeCoverPhoto = (index: number) => {
    if (index === 0) return;
    setPhotos(prev => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const toggleTenant = (value: SuitableTenantType) => {
    setSuitableTenants(prev => {
      if (value === 'ALL') return ['ALL'];
      const filtered = prev.filter(t => t !== 'ALL');
      if (filtered.includes(value)) {
        const next = filtered.filter(t => t !== value);
        return next.length === 0 ? ['ALL'] : next;
      }
      return [...filtered, value];
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!title.trim()) {
      setFormError('Please enter a descriptive property title.');
      return;
    }
    if (!address.trim()) {
      setFormError('Please provide the street address or nearest landmark in Gondia.');
      return;
    }
    if (!ownerName.trim()) {
      setFormError('Please provide the landlord / owner name.');
      return;
    }
    if (!ownerPhone.trim()) {
      setFormError('Please provide a contact phone number.');
      return;
    }
    if (!isValidIndianMobileNumber(ownerPhone)) {
      setFormError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 for phone number.');
      return;
    }
    if (!ownerWhatsappNumber.trim()) {
      setFormError('Please provide a WhatsApp number.');
      return;
    }
    if (!isValidIndianMobileNumber(ownerWhatsappNumber)) {
      setFormError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 for WhatsApp number.');
      return;
    }
    const rentNum = Number(monthlyRent);
    if (isNaN(rentNum) || rentNum <= 0) {
      setFormError('Please provide a valid monthly rent amount in Rupees.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Process & Upload any new photos to Cloudinary
      let finalPhotoUrls: string[] = [];
      const newPhotosToUpload = photos.filter(p => !p.isExisting && p.file);
      const existingPhotosToKeep = photos.filter(p => p.isExisting).map(p => p.url);

      if (newPhotosToUpload.length > 0) {
        setIsUploadingPhotos(true);
        setUploadProgress({
          percent: 20,
          completed: 0,
          total: newPhotosToUpload.length
        });

        const filesToUpload: File[] = [];
        for (const item of newPhotosToUpload) {
          if (item.file) {
            if (item.isOptimizing) {
              try {
                const opt = await compressAndResizeImage(item.file, {
                  maxDimension: 1280,
                  targetMaxBytes: 350 * 1024,
                  initialQuality: 0.78,
                  minQuality: 0.65
                });
                filesToUpload.push(opt.file);
              } catch {
                filesToUpload.push(item.file);
              }
            } else {
              filesToUpload.push(item.file);
            }
          }
        }

        const uploadedUrls = await uploadMultiplePropertyPhotos(
          filesToUpload,
          (info) => {
            setUploadProgress({
              percent: info.percent,
              completed: info.completed,
              total: info.total
            });
          },
          2,
          (completedFile, cloudUrl) => {
            const fp = getFileFingerprint(completedFile);
            setPhotos(current =>
              current.map(p => {
                if (p.fingerprint === fp || (p.file && p.file.name === completedFile.name)) {
                  return {
                    ...p,
                    url: cloudUrl,
                    isExisting: true,
                    file: undefined,
                    isOptimizing: false
                  };
                }
                return p;
              })
            );
          }
        );

        let uploadIdx = 0;
        for (const item of photos) {
          if (item.isExisting) {
            finalPhotoUrls.push(item.url);
          } else if (uploadIdx < uploadedUrls.length) {
            finalPhotoUrls.push(uploadedUrls[uploadIdx++]);
          }
        }
      } else {
        finalPhotoUrls = existingPhotosToKeep;
      }

      if (finalPhotoUrls.length === 0) {
        finalPhotoUrls = ['/hero_gondia_stays.jpg'];
      }

      const finalLat = typeof pickerLocation?.lat === 'number' && !isNaN(pickerLocation.lat)
        ? pickerLocation.lat
        : (GONDIA_LOCALITY_COORDS[locality]?.lat ?? 21.4602);
      const finalLng = typeof pickerLocation?.lng === 'number' && !isNaN(pickerLocation.lng)
        ? pickerLocation.lng
        : (GONDIA_LOCALITY_COORDS[locality]?.lng ?? 80.1945);

      if (propertyToEdit) {
        // Edit existing listing
        const updated: PropertyListing = {
          ...propertyToEdit,
          title: title.trim(),
          address: address.trim(),
          locality,
          city: propertyToEdit.city || 'Gondia',
          propertyType,
          accommodationType,
          monthlyRent: rentNum,
          securityDeposit: Number(securityDeposit) || rentNum * 2,
          bedrooms: Number(bedrooms) || 1,
          bathrooms: Number(bathrooms) || 1,
          kitchenAvailable,
          hallAvailable: Boolean(hallAvailable),
          furnishing,
          suitableTenants,
          availableFrom: availableFrom.trim() || 'Immediate',
          occupancyStatus,
          amenities,
          description: description.trim(),
          photos: finalPhotoUrls,
          ownerId: propertyToEdit.ownerId && propertyToEdit.ownerId !== 'owner_unauthenticated'
            ? propertyToEdit.ownerId
            : (isRealOwnerLoggedIn && authUser?.uid ? authUser.uid : (propertyToEdit.ownerId || 'owner_unauthenticated')),
          ownerEmail: propertyToEdit.ownerEmail || (isRealOwnerLoggedIn && authUser?.email ? authUser.email : (ownerPhone ? `${ownerPhone.replace(/\D/g, '')}@gondiastay.local` : '')),
          ownerName: ownerName.trim(),
          ownerPhone: ownerPhone.trim(),
          ownerWhatsappNumber: (ownerWhatsappNumber || ownerPhone).trim(),
          ownerPreferredContact,
          latitude: finalLat,
          longitude: finalLng
        };

        await onSaveProperty(updated, true, editToken || undefined);
        setSavedPropertyInfo({
          id: updated.id,
          title: updated.title,
          locality: updated.locality,
          rent: updated.monthlyRent,
          ownerName: updated.ownerName || '',
          ownerPhone: updated.ownerPhone || ''
        });
        setIsSuccess(true);
        if (onSuccessToast) onSuccessToast('Listing updated successfully!');
      } else {
        // Create new property listing linked to actual logged in owner
        const actualOwnerId = (isRealOwnerLoggedIn && authUser?.uid)
          ? authUser.uid
          : (isRealOwnerLoggedIn && currentOwner?.id ? currentOwner.id : 'owner_unauthenticated');

        const actualOwnerEmail = (isRealOwnerLoggedIn && authUser?.email)
          ? authUser.email
          : (isRealOwnerLoggedIn && currentOwner?.email ? currentOwner.email : (ownerPhone ? `${ownerPhone.replace(/\D/g, '')}@gondiastay.local` : ''));

        const newProp: PropertyListing = {
          id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: title.trim(),
          address: address.trim(),
          locality,
          city: 'Gondia',
          propertyType,
          accommodationType,
          monthlyRent: rentNum,
          securityDeposit: Number(securityDeposit) || rentNum * 2,
          bedrooms: Number(bedrooms) || 1,
          bathrooms: Number(bathrooms) || 1,
          kitchenAvailable,
          hallAvailable: Boolean(hallAvailable),
          furnishing,
          suitableTenants,
          availableFrom: availableFrom.trim() || 'Immediate',
          status: 'pending', // Requirement: Always saved with status 'pending'
          occupancyStatus: 'AVAILABLE',
          amenities,
          description: description.trim(),
          photos: finalPhotoUrls,
          ownerId: actualOwnerId,
          ownerEmail: actualOwnerEmail,
          ownerName: ownerName.trim(),
          ownerPhone: ownerPhone.trim(),
          ownerWhatsappNumber: (ownerWhatsappNumber || ownerPhone).trim(),
          ownerPreferredContact,
          latitude: finalLat,
          longitude: finalLng,
          createdAt: Date.now()
        };

        const res = await onSaveProperty(newProp, false);
        setSavedPropertyInfo({
          id: res?.propertyId || newProp.id,
          title: newProp.title,
          locality: newProp.locality,
          rent: newProp.monthlyRent,
          ownerName: newProp.ownerName || '',
          ownerPhone: newProp.ownerPhone || ''
        });
        setIsSuccess(true);
        if (onSuccessToast) onSuccessToast('Property listing submitted for admin approval!');
      }
    } catch (err: any) {
      console.error('Failed to save property listing:', err);
      setFormError(err.message || 'Failed to save property. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingPhotos(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* =========================================================================
            HEADER BANNER (Matching AddServiceModal Blue Banner & Style)
           ========================================================================= */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-5 sm:p-6 flex items-start justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                <Building2 className="w-3 h-3 text-amber-300" />
                Gondia Rental Stays
              </span>
              <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                0% Brokerage
              </span>
              {propertyToEdit && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Editing Listing
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              {propertyToEdit ? `Edit: ${propertyToEdit.title}` : 'Add Your Property in Gondia'}
            </h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Connect directly with verified tenants, students, and families looking for stays in Gondia with 0% brokerage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            MODAL BODY (Clean, Mobile-Friendly Form or Success View)
           ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {isSuccess && savedPropertyInfo ? (
            /* SUCCESS CONFIRMATION VIEW */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-xl font-black text-slate-900">
                  {propertyToEdit
                    ? (!isAdmin && propertyToEdit.status === 'approved'
                        ? 'Proposed Changes Submitted for Reapproval!'
                        : 'Property Listing Updated!')
                    : 'Property Submitted Successfully!'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isAdmin
                    ? 'Your property listing has been saved & published directly to Cloud Firestore.'
                    : (propertyToEdit && propertyToEdit.status === 'approved'
                        ? 'Your live approved listing remains fully active and visible to tenants across Gondia. Proposed changes will be reviewed by an administrator before updating the live listing.'
                        : 'Your property has been submitted with status "Pending". It will appear publicly on GondiaStay across all devices as soon as verified by our administrator.')}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto text-left space-y-1 text-xs">
                <p className="font-black text-slate-900 text-sm">{savedPropertyInfo.title}</p>
                <p className="text-slate-600 flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {savedPropertyInfo.locality}, Gondia
                </p>
                <p className="font-extrabold text-blue-700 text-sm mt-1">₹{savedPropertyInfo.rent}/month</p>
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                  Landlord: <span className="font-bold text-slate-800">{savedPropertyInfo.ownerName}</span> • {savedPropertyInfo.ownerPhone}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Close & View My Properties
                </button>
              </div>
            </div>
          ) : (
            /* PROPERTY FORM VIEW */
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Provider Reapproval Notice for Approved Listings */}
              {propertyToEdit && !isAdmin && propertyToEdit.status === 'approved' && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold block mb-0.5">Editing Approved Live Listing</strong>
                    <span className="leading-relaxed">
                      Your current live listing remains fully visible to tenants across Gondia. Proposed changes will be submitted separately for admin reapproval and will replace live data only after being approved.
                    </span>
                  </div>
                </div>
              )}
              
              {/* Error Alert */}
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{formError}</div>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Upload Progress Banner */}
              {isUploadingPhotos && uploadProgress && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Uploading Photos to Cloud...
                    </span>
                    <span>{uploadProgress.completed} / {uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Home className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    1. Basic Property Details
                  </h3>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Spacious 2BHK Family Flat with Balcony near Railway Station"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-semibold outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Gondia Locality *
                    </label>
                    <select
                      value={locality}
                      onChange={(e) => handleLocalityChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-semibold outline-none transition-colors cursor-pointer"
                    >
                      {GONDIA_LOCALITIES.filter(l => l !== 'All').map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Property Category *
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-semibold outline-none transition-colors cursor-pointer"
                    >
                      {PROPERTY_TYPES.filter(t => t.type !== 'ALL').map(pt => (
                        <option key={pt.type} value={pt.type}>{pt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Accommodation Type *
                    </label>
                    <select
                      value={accommodationType}
                      onChange={(e) => setAccommodationType(e.target.value as AccommodationType)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-semibold outline-none transition-colors cursor-pointer"
                    >
                      {ACCOMMODATION_TYPES.map(at => (
                        <option key={at.type} value={at.type}>{at.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Furnishing Status *
                    </label>
                    <select
                      value={furnishing}
                      onChange={(e) => setFurnishing(e.target.value as FurnishingStatus)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-semibold outline-none transition-colors cursor-pointer"
                    >
                      <option value="SEMI_FURNISHED">Semi-Furnished</option>
                      <option value="FURNISHED">Fully Furnished</option>
                      <option value="UNFURNISHED">Unfurnished</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Pricing & Availability */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    2. Pricing & Availability
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Monthly Rent (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        required
                        min="500"
                        value={monthlyRent}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setMonthlyRent(val);
                          if (typeof val === 'number' && (!securityDeposit || Number(securityDeposit) === Number(monthlyRent) * 2)) {
                            setSecurityDeposit(val * 2);
                          }
                        }}
                        placeholder="8000"
                        className="w-full pl-7 pr-3 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Security Deposit (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="16000"
                        className="w-full pl-7 pr-3 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Available From
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                      placeholder="Immediate / 1st of next month"
                      className="w-full pl-8 pr-3 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Room Features & Amenities */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Bed className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    3. Room Configuration & Amenities
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Bedrooms</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Bathrooms</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Kitchen</label>
                    <select
                      value={kitchenAvailable}
                      onChange={(e) => setKitchenAvailable(e.target.value as KitchenAvailability)}
                      className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    >
                      <option value="PRIVATE">Private</option>
                      <option value="SHARED">Shared</option>
                      <option value="NONE">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Hall / Living</label>
                    <button
                      type="button"
                      onClick={() => setHallAvailable(!hallAvailable)}
                      className={`w-full py-2 text-xs font-bold rounded-xl border transition-all ${
                        hallAvailable
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {hallAvailable ? 'Yes, Included' : 'No Hall'}
                    </button>
                  </div>
                </div>

                {/* Suitable Tenants */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Suitable For
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TENANT_OPTIONS.map(opt => {
                      const isSelected = suitableTenants.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleTenant(opt.value)}
                          className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amenities Checklist */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Included Amenities
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COMMON_AMENITIES.map(amenity => {
                      const isChecked = amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-left transition-all border ${
                            isChecked
                              ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                              : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{amenity}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 4: Address & Map Pinpoint */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    4. Street Address & Map Location
                  </h3>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Street Address / Landmark *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near Jain Mandir, Main Road, Civil Lines"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-semibold outline-none"
                  />
                </div>

                {/* Interactive Map Pinpoint on Gondia Map */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                      Pinpoint on Map
                    </label>
                    <button
                      type="button"
                      onClick={handlePinpointMyLocation}
                      disabled={isLocating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                      title="Use device GPS to pinpoint property location"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span>Pinpointing...</span>
                        </>
                      ) : (
                        <span>📍 Pinpoint My Location</span>
                      )}
                    </button>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative">
                    <GondiaMap
                      mode="picker"
                      pickerLocation={pickerLocation}
                      onPickerLocationChange={handlePickerLocationChange}
                      heightClass="h-60 sm:h-72"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Description & Property Highlights
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe ventilation, sunlight, water timing, nearby coaching centers, or rules (e.g. gated campus, no loud music after 10 PM)."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl font-medium outline-none resize-none"
                  />
                </div>
              </div>

              {/* Section 5: Photos (Fast Cloudinary Upload) */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      5. Property Photos ({photos.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">Fast auto-compression</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {photos.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Tap to Upload Property Photos</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">JPG, PNG, WebP up to 25 MB • Cover photo auto-assigned</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {photos.map((photo, idx) => (
                        <div
                          key={photo.id}
                          className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group"
                        >
                          <img
                            src={photo.url}
                            alt={photo.name || 'Photo'}
                            className="w-full h-full object-cover"
                          />

                          {/* Cover Photo Badge */}
                          {idx === 0 ? (
                            <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                              Cover Photo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMakeCoverPhoto(idx)}
                              className="absolute top-1.5 left-1.5 bg-black/60 hover:bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs transition-colors cursor-pointer"
                            >
                              Set as Cover
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photo.id)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Optimization Badge */}
                          {photo.isOptimizing ? (
                            <span className="absolute bottom-2 left-2 bg-black/70 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-xs">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Optimizing...
                            </span>
                          ) : photo.optimizedSize && photo.originalSize && photo.originalSize > photo.optimizedSize ? (
                            <span className="absolute bottom-2 left-2 bg-emerald-700/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-xs">
                              <Zap className="w-2.5 h-2.5 text-amber-300" /> {photo.optimizedSizeFormatted}
                            </span>
                          ) : null}
                        </div>
                      ))}

                      {/* Add More Tile */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-4/3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <Plus className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">Add More</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 6: Landlord / Owner Contact Identity */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      6. Landlord Contact Details
                    </h3>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold">Displayed on listing card</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Landlord Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={ownerPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOwnerPhone(val);
                        if (!ownerWhatsappNumber || ownerWhatsappNumber === ownerPhone) {
                          setOwnerWhatsappNumber(val);
                        }
                      }}
                      placeholder="10-digit mobile (e.g. 98230 12345)"
                      className={`w-full px-3 py-2 text-xs bg-white border ${
                        ownerPhone && !isValidIndianMobileNumber(ownerPhone)
                          ? 'border-rose-400 focus:border-rose-600'
                          : 'border-slate-300 focus:border-blue-600'
                      } rounded-xl font-semibold outline-none`}
                    />
                    {ownerPhone && !isValidIndianMobileNumber(ownerPhone) && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1">
                        Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={ownerWhatsappNumber}
                      onChange={(e) => setOwnerWhatsappNumber(e.target.value)}
                      placeholder="10-digit WhatsApp (e.g. 98230 12345)"
                      className={`w-full px-3 py-2 text-xs bg-white border ${
                        ownerWhatsappNumber && !isValidIndianMobileNumber(ownerWhatsappNumber)
                          ? 'border-rose-400 focus:border-rose-600'
                          : 'border-slate-300 focus:border-blue-600'
                      } rounded-xl font-semibold outline-none`}
                    />
                    {ownerWhatsappNumber && !isValidIndianMobileNumber(ownerWhatsappNumber) && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1">
                        Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Tenant Contact Preference
                  </label>
                  <div className="flex gap-4">
                    {(['BOTH', 'WHATSAPP', 'PHONE'] as ContactMethod[]).map(method => (
                      <label key={method} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="ownerContactPreference"
                          checked={ownerPreferredContact === method}
                          onChange={() => setOwnerPreferredContact(method)}
                          className="accent-blue-600"
                        />
                        <span>{method === 'BOTH' ? 'WhatsApp & Calls' : method === 'WHATSAPP' ? 'WhatsApp Only' : 'Phone Only'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  SUBMIT & CLOSE BUTTONS BAR (Clear, Prominent, Mobile-Friendly)
                 ========================================================================= */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-xs py-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingPhotos}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {(isSubmitting || isUploadingPhotos) && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isUploadingPhotos
                      ? 'Uploading Photos...'
                      : isSubmitting
                        ? 'Saving Listing...'
                        : propertyToEdit
                          ? (isAdmin
                              ? 'Save & Publish Directly'
                              : (propertyToEdit.status === 'approved'
                                  ? 'Submit Changes for Reapproval'
                                  : 'Update Listing'))
                          : 'Submit for Admin Approval'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
