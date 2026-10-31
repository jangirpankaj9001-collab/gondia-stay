import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Bed, 
  Bath, 
  Sofa, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  Plus, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Navigation, 
  Heart,
  Share2,
  Trash2,
  Edit3,
  Utensils,
  Bookmark,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  LayoutDashboard,
  Info,
  Database,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  UploadCloud,
  Camera,
  ImagePlus,
  Zap,
  Home,
  UserCheck,
  LogOut,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  ShieldAlert,
  Mail,
  X,
  Wrench,
  Droplets,
  Shirt,
  Pencil,
  RotateCcw
} from 'lucide-react';
import { 
  uploadMultiplePropertyPhotos, 
  validateImageFile, 
  UploadProgressInfo,
  compressAndResizeImage,
  formatBytes,
  getFileFingerprint,
  getCachedPhotoUrl
} from './firebase/storageService';
import { fetchPropertyDirect, fetchPropertyByEditToken } from './firebase/propertiesService';
import { fetchServiceByEditToken } from './firebase/servicesService';
import { useApp, useBackHandler, isAuthorizedAdminEmail } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav, ServicesHouseIcon } from './components/BottomNav';
import { PropertyCard } from './components/PropertyCard';
import { TiffinCard } from './components/TiffinCard';
import { ServiceCard } from './components/ServiceCard';
import { ServiceCategoryGrid } from './components/ServiceCategoryGrid';
import { AddServiceModal } from './components/AddServiceModal';
import { AddPropertyModal } from './components/AddPropertyModal';
import { FilterModal } from './components/FilterModal';
import { FirebaseModal } from './components/FirebaseModal';
import { GondiaMap } from './components/GondiaMap';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { 
  PropertyListing, 
  PropertyType, 
  AccommodationType,
  ACCOMMODATION_TYPES,
  KitchenAvailability,
  SuitableTenantType,
  FurnishingStatus, 
  ContactMethod, 
  GONDIA_LOCALITIES, 
  GONDIA_LOCALITY_COORDS,
  PROPERTY_TYPES,
  SortOption,
  OwnerProfile,
  isApproved,
  isPending,
  isRejected,
  isOccupied,
  isAvailable,
  ServiceItem,
  ServiceCategory,
  SERVICE_CATEGORIES
} from './types';
import { formatDisplayPhone, openWhatsApp, dialPhone, openGoogleMaps, isValidIndianMobileNumber } from './utils/contact';

export const App: React.FC = () => {
  const {
    properties,
    tiffinServices,
    services,
    saveService,
    updateService,
    moderateService,
    deleteService,
    moderatePropertyEdit,
    moderateServiceEdit,
    isServiceOwner,
    isPropertyOwner,
    favorites,
    currentOwner,
    searchQuery,
    selectedLocality,
    selectedType,
    sortOption,
    filterCriteria,
    selectedProperty,
    activeTab,
    toastMessage,
    isFirestoreLoading,
    firestoreError,
    isFirebaseConnected,
    isAdminAuthenticated,
    isFirebaseModalOpen,
    setSearchQuery,
    setSelectedLocality,
    setSelectedType,
    setSortOption,
    updateOwnerPhone,
    updateOwnerProfile,
    updatePropertyOccupancy,
    saveProperty,
    deleteProperty,
    pendingPropertyDeletion,
    undoPropertyDeletion,
    toggleFeatured,
    approveProperty,
    navigateTo,
    goBack,
    showToast,
    resetFilters,
    loginAdminWithEmailPassword,
    sendAdminVerificationEmail,
    checkAdminVerificationStatus,
    logoutAdmin,
    adminUser,
    authUser,
    isOwnerAuthenticated,
    logoutOwner,
    setIsFirebaseModalOpen,
    clearFirestoreError,
    myListingTokens,
    saveListingToken,
    getListingToken,
    myServiceTokens,
    saveServiceToken,
    getServiceToken,
    saveServiceId,
    ownerSubTab,
    setOwnerSubTab,
    openPostListing
  } = useApp();

  const [firebaseModalTab, setFirebaseModalTab] = useState<'status' | 'rules' | 'manual' | 'cloudinary' | 'json'>('status');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyListing | null>(null);
  const [currentEditToken, setCurrentEditToken] = useState<string | null>(null);
  const [newlyCreatedLinkInfo, setNewlyCreatedLinkInfo] = useState<{ propertyId: string; editToken: string; editUrl: string; title: string } | null>(null);
  const [showPrivateLinkModal, setShowPrivateLinkModal] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [copiedPropId, setCopiedPropId] = useState<string | null>(null);
  const [adminModerationFilter, setAdminModerationFilter] = useState<'pending' | 'pending_edits' | 'approved' | 'rejected'>('pending');
  const [adminModerationSection, setAdminModerationSection] = useState<'properties' | 'services'>('properties');
  const [adminServiceModerationFilter, setAdminServiceModerationFilter] = useState<'pending' | 'pending_edits' | 'approved' | 'rejected'>('pending');
  
  // Services Section States
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<'ALL' | ServiceCategory>('ALL');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [serviceLocalityFilter, setServiceLocalityFilter] = useState('All');
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);
  const [isServicesDashboardOpen, setIsServicesDashboardOpen] = useState(false);
  const [isOwnerDashboardOpen, setIsOwnerDashboardOpen] = useState(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);

  // Global Delete Confirmation Dialog state
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    itemType: 'property' | 'service';
    itemTitle?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    itemType: 'property',
    onConfirm: () => {},
  });

  // Android Phone Back-Button & Browser History Handlers for Dialogs & Modals
  useBackHandler(showFilterModal, () => setShowFilterModal(false), 'filter-modal');
  useBackHandler(isAddPropertyModalOpen, () => setIsAddPropertyModalOpen(false), 'add-property-modal');
  useBackHandler(isAddServiceModalOpen, () => setIsAddServiceModalOpen(false), 'add-service-modal');
  useBackHandler(isServicesDashboardOpen, () => setIsServicesDashboardOpen(false), 'services-dashboard');
  useBackHandler(isOwnerDashboardOpen, () => setIsOwnerDashboardOpen(false), 'owner-dashboard');
  useBackHandler(showPrivateLinkModal, () => setShowPrivateLinkModal(false), 'private-link-modal');
  useBackHandler(ownerSubTab === 'moderation', () => setOwnerSubTab('listings'), 'admin-moderation');
  useBackHandler(isFirebaseModalOpen, () => setIsFirebaseModalOpen(false), 'firebase-modal');

  // Sync external post listing triggers to open AddPropertyModal
  useEffect(() => {
    if (ownerSubTab === 'new') {
      setIsAddPropertyModalOpen(true);
      setOwnerSubTab('listings');
    }
  }, [ownerSubTab, setOwnerSubTab]);

  const [phoneInput, setPhoneInput] = useState(currentOwner.phone);
  const [selectedMapLocality, setSelectedMapLocality] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthSubmitting, setAdminAuthSubmitting] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [moderatingPropId, setModeratingPropId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Check URL parameters for private edit link (?edit=<id>&token=<token>) or admin access (?admin=true, #admin, etc.)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      const editPropId = searchParams.get('edit') || hashParams.get('edit');
      const token = searchParams.get('token') || hashParams.get('token');

      if (editPropId && token) {
        saveListingToken(editPropId, token);
        setCurrentEditToken(token);

        fetchPropertyDirect(editPropId, token).then((prop) => {
          if (prop) {
            handleEditClick(prop, token);
            navigateTo('owner');
            setOwnerSubTab('new');
            showToast('Private edit link verified! You can update your listing.');
          } else {
            showToast('Listing not found or invalid private edit link.');
          }
        }).catch(err => {
          console.error('Error fetching property via edit link:', err);
        });
      }

      // Check URL parameters for standalone property edit link (?token=gst_...)
      if (token && token.startsWith('gst_') && !token.startsWith('gst_srv_') && !editPropId) {
        fetchPropertyByEditToken(token).then(({ property, propertyId }) => {
          if (propertyId) {
            saveListingToken(propertyId, token);
            setCurrentEditToken(token);
            if (property) {
              handleEditClick(property, token);
              navigateTo('owner');
              setOwnerSubTab('new');
              showToast('Private edit link verified! You can update your listing.');
            }
          } else {
            showToast('Listing not found or invalid private edit link.');
          }
        }).catch(err => {
          console.error('Error fetching property via edit link:', err);
        });
      }

      // Check URL parameters for private service edit link (?service=<id>&token=<token> or ?token=gst_srv_...)
      const serviceEditId = searchParams.get('service') || searchParams.get('serviceEdit') || hashParams.get('service') || hashParams.get('serviceEdit');
      const isServiceToken = Boolean(token && (token.startsWith('gst_srv_') || serviceEditId));

      if (isServiceToken && token) {
        if (serviceEditId) {
          saveServiceId(serviceEditId);
          saveServiceToken(serviceEditId, token);
        }

        fetchServiceByEditToken(token, serviceEditId || undefined).then(({ service, serviceId }) => {
          const resolvedId = serviceId || serviceEditId;
          if (resolvedId) {
            saveServiceId(resolvedId);
            saveServiceToken(resolvedId, token);
            if (service) {
              setServiceToEdit(service);
              setIsAddServiceModalOpen(true);
            }
            navigateTo('services');
            showToast('Private service edit link verified! You can update your service listing.');
          } else {
            showToast('Service listing not found or invalid private edit link.');
          }
        }).catch(err => {
          console.error('Error fetching service via edit link:', err);
        });
      }

      // Secure direct URL routing to Admin Moderation Panel
      const isAdminRoute = 
        searchParams.get('admin') === 'true' || 
        searchParams.get('admin') === '1' || 
        searchParams.get('tab') === 'admin' || 
        searchParams.get('subtab') === 'moderation' || 
        window.location.hash === '#admin' || 
        window.location.hash === '#moderation';

      if (isAdminRoute) {
        navigateTo('owner');
        setOwnerSubTab('moderation');
      }

      // Secure direct URL routing to Firebase Connection panel (?firebase=true, #firebase, ?db=true, #firestore)
      const isFirebaseDirectRoute = 
        searchParams.get('firebase') === 'true' || 
        searchParams.get('db') === 'true' || 
        searchParams.get('firestore') === 'true' || 
        window.location.hash === '#firebase' || 
        window.location.hash === '#firestore' ||
        window.location.hash === '#db';

      if (isFirebaseDirectRoute) {
        if (isAdminAuthenticated) {
          setIsFirebaseModalOpen(true);
        } else {
          navigateTo('owner');
          setOwnerSubTab('moderation');
          showToast('Administrator authentication required to access Cloud Firestore settings.');
        }
      }
    } catch (e) {
      console.warn('URL parameter parse notice:', e);
    }
  }, []);

  // Selected photos for property listing (supports multiple photos, gallery picker, reordering, duplicate prevention, and compression)
  const [selectedPhotos, setSelectedPhotos] = useState<Array<{
    id: string;
    file?: File;
    url: string;
    isExisting: boolean;
    name: string;
    originalSize?: number;
    originalSizeFormatted?: string;
    optimizedSize?: number;
    optimizedSizeFormatted?: string;
    savedPercentage?: number;
    fingerprint?: string;
    isOptimizing?: boolean;
  }>>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState<boolean>(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [activeDetailPhotoIndex, setActiveDetailPhotoIndex] = useState<number>(0);

  // Reset detail photo index when selected property changes
  useEffect(() => {
    setActiveDetailPhotoIndex(0);
  }, [selectedProperty]);

  // Gallery photo selection handler with duplicate prevention and automatic compression
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setPhotoUploadError(null);

    // Track existing fingerprints to prevent duplicate selection
    const existingFingerprints = new Set(
      selectedPhotos
        .map(p => p.fingerprint)
        .filter((fp): fp is string => Boolean(fp))
    );

    const newItems: Array<{
      id: string;
      file?: File;
      url: string;
      isExisting: boolean;
      name: string;
      originalSize?: number;
      originalSizeFormatted?: string;
      optimizedSize?: number;
      optimizedSizeFormatted?: string;
      savedPercentage?: number;
      fingerprint?: string;
      isOptimizing?: boolean;
    }> = [];

    const filesToOptimize: Array<{ id: string; file: File }> = [];
    let duplicateCount = 0;
    const batchSeen = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setPhotoUploadError(validation.error || 'Invalid file');
        continue;
      }

      const fingerprint = getFileFingerprint(file);
      if (existingFingerprints.has(fingerprint) || batchSeen.has(fingerprint)) {
        duplicateCount++;
        continue;
      }
      batchSeen.add(fingerprint);

      // Check if photo was already uploaded to Firebase Storage (instant 0s reuse)
      const cachedCloudUrl = getCachedPhotoUrl(fingerprint);
      const itemId = `photo_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      const origSize = file.size;

      if (cachedCloudUrl) {
        newItems.push({
          id: itemId,
          file: undefined,
          url: cachedCloudUrl,
          isExisting: true,
          name: file.name,
          originalSize: origSize,
          originalSizeFormatted: formatBytes(origSize),
          optimizedSize: origSize,
          optimizedSizeFormatted: 'Cloud Ready',
          savedPercentage: 100,
          fingerprint,
          isOptimizing: false
        });
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: itemId,
        file,
        url: previewUrl,
        isExisting: false,
        name: file.name,
        originalSize: origSize,
        originalSizeFormatted: formatBytes(origSize),
        fingerprint,
        isOptimizing: true
      });

      filesToOptimize.push({ id: itemId, file });
    }

    if (duplicateCount > 0) {
      showToast(`Skipped ${duplicateCount} duplicate photo${duplicateCount > 1 ? 's' : ''} already in list.`);
    }

    if (newItems.length > 0) {
      setSelectedPhotos(prev => [...prev, ...newItems]);
      showToast(`Added ${newItems.length} photo${newItems.length > 1 ? 's' : ''} (fast compression active)...`);

      // Fast client-side optimization targeting 150–300 KB for instant uploads
      filesToOptimize.forEach(({ id, file }) => {
        compressAndResizeImage(file, {
          maxDimension: 1280,
          targetMaxBytes: 350 * 1024,
          initialQuality: 0.78,
          minQuality: 0.65
        })
          .then((optimized) => {
            setSelectedPhotos(current =>
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
          .catch((err) => {
            console.warn('Background optimization error for', file.name, err);
            setSelectedPhotos(current =>
              current.map(item => (item.id === id ? { ...item, isOptimizing: false } : item))
            );
          });
      });
    }

    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setSelectedPhotos(prev => {
      const target = prev.find(p => p.id === id);
      if (target && !target.isExisting && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const handleMakeCoverPhoto = (index: number) => {
    if (index === 0) return;
    setSelectedPhotos(prev => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
    showToast("Set as primary cover photo!");
  };

  // Photo optimization summary statistics for UI
  const totalOriginalBytes = useMemo(() => {
    return selectedPhotos.reduce((sum, p) => sum + (p.originalSize || 0), 0);
  }, [selectedPhotos]);

  const totalOptimizedBytes = useMemo(() => {
    return selectedPhotos.reduce((sum, p) => sum + (p.optimizedSize || p.originalSize || 0), 0);
  }, [selectedPhotos]);

  const hasNewPhotos = useMemo(() => {
    return selectedPhotos.some(p => !p.isExisting);
  }, [selectedPhotos]);

  const anyPhotoOptimizing = useMemo(() => {
    return selectedPhotos.some(p => p.isOptimizing);
  }, [selectedPhotos]);

  // Owner Profile editing state
  const [isEditingOwnerProfile, setIsEditingOwnerProfile] = useState(false);
  const [ownerProfileForm, setOwnerProfileForm] = useState({
    name: currentOwner.name,
    phone: currentOwner.phone,
    whatsappNumber: currentOwner.whatsappNumber || currentOwner.phone,
    email: currentOwner.email || ''
  });
  useBackHandler(isEditingOwnerProfile, () => setIsEditingOwnerProfile(false), 'edit-owner-profile');

  useEffect(() => {
    setOwnerProfileForm({
      name: currentOwner.name,
      phone: currentOwner.phone,
      whatsappNumber: currentOwner.whatsappNumber || currentOwner.phone,
      email: currentOwner.email || ''
    });
    setPhoneInput(currentOwner.phone);
  }, [currentOwner]);

  // Complete Property Listing Form State (Requirement 3)
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    locality: GONDIA_LOCALITIES[1], // Civil Lines
    propertyType: 'FLAT' as PropertyType,
    accommodationType: '1_BHK' as AccommodationType,
    monthlyRent: 8000,
    securityDeposit: 16000,
    bedrooms: 1,
    bathrooms: 1,
    kitchenAvailable: 'PRIVATE' as KitchenAvailability,
    hallAvailable: true,
    furnishing: 'SEMI_FURNISHED' as FurnishingStatus,
    suitableTenants: ['ALL'] as SuitableTenantType[],
    availableFrom: 'Immediate',
    amenities: ['24/7 Water', 'Wi-Fi'],
    ownerName: '',
    ownerPhone: '',
    ownerWhatsappNumber: '',
    ownerPreferredContact: 'BOTH' as ContactMethod,
    latitude: 21.4602,
    longitude: 80.1945,
    photos: [] as string[]
  });

  // Filtered properties for Explore, Map & Saved
  // Requirement 4 & 5: Show only approved and available listings to public users
  // Exclude occupied properties from available-property searches unless includeOccupied filter is checked
  // Requirement 6: Comprehensive search by title, locality, address, accommodation type, rent, amenities
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // Ordinary user tabs strictly require approved status
      if (activeTab === 'explore' || activeTab === 'map' || activeTab === 'saved') {
        if (!isApproved(p.status)) return false;
      }

      // Requirement: Occupied properties must be hidden from public Rentals (Explore & Map); Available properties reappear automatically
      if (activeTab === 'explore' || activeTab === 'map') {
        if (isOccupied(p.occupancyStatus)) {
          return false;
        }
      }

      // Saved tab filter
      if (activeTab === 'saved' && !favorites.includes(p.id)) {
        return false;
      }

      // Locality
      if (selectedLocality !== 'All') {
        if (!searchQuery.trim()) {
          if (p.locality !== selectedLocality) return false;
        } else {
          // If searching, check if query specifies any known locality
          const qLower = searchQuery.toLowerCase();
          const mentionsLocality = GONDIA_LOCALITIES.some(
            loc => loc !== 'All' && qLower.includes(loc.toLowerCase())
          );
          if (!mentionsLocality && p.locality !== selectedLocality) {
            return false;
          }
        }
      }

      // Property Type
      if (selectedType !== 'ALL') {
        if (!searchQuery.trim()) {
          if (p.propertyType !== selectedType) return false;
        } else {
          const qLower = searchQuery.toLowerCase();
          const mentionsType = ['flat', 'house', 'room', 'pg', 'apartment', 'villa', '1bhk', '2bhk', '3bhk'].some(t => qLower.includes(t));
          if (!mentionsType && p.propertyType !== selectedType) {
            return false;
          }
        }
      }

      // Rent
      if (p.monthlyRent < filterCriteria.minRent || p.monthlyRent > filterCriteria.maxRent) {
        return false;
      }

      // Bedrooms
      if (filterCriteria.bedrooms > 0 && p.bedrooms < filterCriteria.bedrooms) {
        return false;
      }

      // Furnishing
      if (filterCriteria.furnishing && p.furnishing !== filterCriteria.furnishing) {
        return false;
      }

      // Requirement 6: Enhanced Explore Search across Gondia localities & available properties
      if (searchQuery.trim()) {
        const rawQ = searchQuery.toLowerCase().trim();
        const stopWords = new Set(['in', 'at', 'near', 'for', 'with', 'the', 'of', 'and', 'or', 'a', 'an']);
        const allTokens = rawQ
          .replace(/[,;:]/g, ' ')
          .split(/\s+/)
          .filter(Boolean);

        const meaningfulTokens = allTokens.filter(t => !stopWords.has(t));
        const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;

        // Every token in query must match some property attribute
        const matchesAllTokens = tokens.every(token => {
          const tokenClean = token.replace(/[^a-z0-9]/g, '');

          // 1. Rent / Price matching (e.g. 8000, 10000, 5000)
          const cleanNum = parseInt(token.replace(/[^0-9]/g, ''), 10);
          const matchesRent = !isNaN(cleanNum) && cleanNum >= 500 && (
            Math.abs(p.monthlyRent - cleanNum) <= 2000 || p.monthlyRent <= cleanNum
          );

          // 2. Direct string matching on Title, Address, Locality, City
          const matchesTitle = p.title?.toLowerCase().includes(token);
          const matchesAddress = p.address?.toLowerCase().includes(token);
          const matchesLocality = p.locality?.toLowerCase().includes(token) ||
                                  p.locality?.toLowerCase().replace(/\s+/g, '').includes(tokenClean);
          const matchesCity = (p.city || 'Gondia').toLowerCase().includes(token);

          // 3. Property Type & Synonyms (flat, apartment, house, room, pg, hostel)
          const propTypeStr = (p.propertyType || '').toLowerCase().replace(/_/g, ' ');
          const propTypeClean = (p.propertyType || '').toLowerCase().replace(/_/g, '');
          const matchesType = propTypeStr.includes(token) || 
                             propTypeClean.includes(tokenClean) ||
                             (token === 'flat' && p.propertyType === 'FLAT') ||
                             (token === 'flats' && p.propertyType === 'FLAT') ||
                             (token === 'apartment' && p.propertyType === 'FLAT') ||
                             (token === 'apartments' && p.propertyType === 'FLAT') ||
                             (token === 'house' && p.propertyType === 'INDEPENDENT_HOUSE') ||
                             (token === 'villa' && p.propertyType === 'INDEPENDENT_HOUSE') ||
                             (token === 'pg' && p.propertyType === 'PG') ||
                             (token === 'hostel' && p.propertyType === 'PG') ||
                             (token === 'room' && (p.propertyType === 'ROOM' || p.accommodationType === 'ROOM' || p.bedrooms === 1)) ||
                             (token === 'rooms' && (p.propertyType === 'ROOM' || p.accommodationType === 'ROOM' || p.bedrooms > 0));

          // 4. Accommodation Type (1bhk, 2bhk, 3bhk, 4bhk, 1rk, room, bhk)
          const accStr = (p.accommodationType || '').toLowerCase().replace(/_/g, ' ');
          const accClean = (p.accommodationType || '').toLowerCase().replace(/_/g, '');
          const matchesAcc = accStr.includes(token) || 
                             accClean.includes(tokenClean) ||
                             (tokenClean === '1bhk' && p.accommodationType === '1_BHK') ||
                             (tokenClean === '2bhk' && p.accommodationType === '2_BHK') ||
                             (tokenClean === '3bhk' && p.accommodationType === '3_BHK') ||
                             (tokenClean === '4bhk' && (p.accommodationType === '4_PLUS_BHK' || p.bedrooms >= 4)) ||
                             (tokenClean === '1rk' && (p.accommodationType === 'ROOM' || p.accommodationType === '1_BHK')) ||
                             (token === '1' && (p.accommodationType === '1_BHK' || p.bedrooms === 1)) ||
                             (token === '2' && (p.accommodationType === '2_BHK' || p.bedrooms === 2)) ||
                             (token === '3' && (p.accommodationType === '3_BHK' || p.bedrooms === 3)) ||
                             (token === 'bhk' && p.bedrooms > 0);

          // 5. Furnishing
          const matchesFurnishing = p.furnishing?.toLowerCase().replace(/_/g, ' ').includes(token) ||
                                    (token === 'furnished' && (p.furnishing === 'FURNISHED' || p.furnishing === 'SEMI_FURNISHED')) ||
                                    (token === 'unfurnished' && p.furnishing === 'UNFURNISHED');

          // 6. Amenities
          const matchesAmenities = (p.amenities || []).some(a => 
            a.toLowerCase().includes(token) || a.toLowerCase().replace(/[^a-z0-9]/g, '').includes(tokenClean)
          );

          // 7. Suitable Tenants
          const matchesSuitable = (p.suitableTenants || []).some(s => 
            s.toLowerCase().replace(/_/g, ' ').includes(token)
          ) || (token === 'bachelor' && (p.suitableTenants?.includes('WORKING_PROFESSIONALS') || p.suitableTenants?.includes('STUDENTS') || p.suitableTenants?.includes('ALL'))) ||
               (token === 'family' && (p.suitableTenants?.includes('FAMILIES') || p.suitableTenants?.includes('ALL'))) ||
               (token === 'student' && (p.suitableTenants?.includes('STUDENTS') || p.suitableTenants?.includes('ALL')));

          // 8. Availability / Occupancy status
          const matchesOccupancy = (token === 'available' || token === 'vacant') 
            ? !isOccupied(p.occupancyStatus)
            : (token === 'rented' || token === 'occupied') 
              ? isOccupied(p.occupancyStatus) 
              : false;

          return matchesTitle || matchesAddress || matchesLocality || matchesCity || matchesType || 
                 matchesAcc || matchesFurnishing || matchesAmenities || matchesSuitable || matchesRent || matchesOccupancy;
        });

        if (!matchesAllTokens) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'RENT_LOW_TO_HIGH') {
        return a.monthlyRent - b.monthlyRent;
      }
      if (sortOption === 'RENT_HIGH_TO_LOW') {
        return b.monthlyRent - a.monthlyRent;
      }
      if (sortOption === 'NEWEST') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      // RELEVANCE: Featured first, then newest
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [properties, activeTab, favorites, selectedLocality, selectedType, filterCriteria, searchQuery, sortOption]);

  // Owner properties (can see their own listings regardless of status)
  const myProperties = useMemo(() => {
    if (isAdminAuthenticated) return properties;
    return properties.filter(p => isPropertyOwner(p));
  }, [properties, isAdminAuthenticated, isPropertyOwner]);

  // Properties grouped for Admin Moderation Workflow
  const pendingProperties = useMemo(() => {
    return properties.filter(p => isPending(p.status));
  }, [properties]);

  const pendingEditProperties = useMemo(() => {
    return properties.filter(p => Boolean(p.hasPendingEdit && p.pendingEdit));
  }, [properties]);

  const approvedProperties = useMemo(() => {
    return properties.filter(p => isApproved(p.status));
  }, [properties]);

  const rejectedProperties = useMemo(() => {
    return properties.filter(p => (p.status || '').toLowerCase() === 'rejected');
  }, [properties]);

  // Gondia Services grouped for Admin Moderation & Public display
  const pendingServices = useMemo(() => {
    return services.filter(s => isPending(s.status));
  }, [services]);

  const pendingEditServices = useMemo(() => {
    return services.filter(s => Boolean(s.hasPendingEdit && s.pendingEdit));
  }, [services]);

  const approvedServices = useMemo(() => {
    return services.filter(s => isApproved(s.status));
  }, [services]);

  const rejectedServices = useMemo(() => {
    return services.filter(s => (s.status || '').toLowerCase() === 'rejected');
  }, [services]);

  // Filtered services for the Services Tab
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      // Ordinary public visitors only see approved listings
      if (!isAdminAuthenticated && !isApproved(s.status)) {
        return false;
      }

      // Category filter
      if (selectedServiceCategory !== 'ALL' && s.category !== selectedServiceCategory) {
        return false;
      }

      // Locality filter
      if (serviceLocalityFilter !== 'All') {
        const inAreas = (s.serviceAreas || []).some(area => 
          area.toLowerCase() === 'all gondia' || 
          area.toLowerCase() === serviceLocalityFilter.toLowerCase()
        );
        const inBaseLocality = (s.locality || '').toLowerCase() === serviceLocalityFilter.toLowerCase();
        if (!inAreas && !inBaseLocality) {
          return false;
        }
      }

      // Search Query filter
      if (serviceSearchQuery.trim()) {
        const queryLower = serviceSearchQuery.toLowerCase().trim();
        const matchesTitle = s.title.toLowerCase().includes(queryLower);
        const matchesProvider = s.providerName.toLowerCase().includes(queryLower);
        const matchesDesc = s.description.toLowerCase().includes(queryLower);
        const matchesCategory = (s.category || '').toLowerCase().includes(queryLower);
        const matchesAreas = (s.serviceAreas || []).some(a => a.toLowerCase().includes(queryLower));
        const matchesSpecialties = (s.specialties || []).some(spec => spec.toLowerCase().includes(queryLower));

        if (!matchesTitle && !matchesProvider && !matchesDesc && !matchesCategory && !matchesAreas && !matchesSpecialties) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Highlight Mess/Tiffin or featured services
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      if (a.category === 'MESS_TIFFIN' && b.category !== 'MESS_TIFFIN' && selectedServiceCategory === 'ALL') return -1;
      if (a.category !== 'MESS_TIFFIN' && b.category === 'MESS_TIFFIN' && selectedServiceCategory === 'ALL') return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [services, selectedServiceCategory, serviceLocalityFilter, serviceSearchQuery, isAdminAuthenticated]);

  // Services available for the Category Grid (filtered by locality & query, preserving all categories)
  const servicesForCategoryGrid = useMemo(() => {
    return services.filter(s => {
      if (!isAdminAuthenticated && !isApproved(s.status)) return false;

      // Locality filter
      if (serviceLocalityFilter !== 'All') {
        const inAreas = (s.serviceAreas || []).some(area => 
          area.toLowerCase() === 'all gondia' || 
          area.toLowerCase() === serviceLocalityFilter.toLowerCase()
        );
        const inBaseLocality = (s.locality || '').toLowerCase() === serviceLocalityFilter.toLowerCase();
        if (!inAreas && !inBaseLocality) return false;
      }

      // Search Query filter
      if (serviceSearchQuery.trim()) {
        const queryLower = serviceSearchQuery.toLowerCase().trim();
        const matchesTitle = s.title.toLowerCase().includes(queryLower);
        const matchesProvider = s.providerName.toLowerCase().includes(queryLower);
        const matchesDesc = s.description.toLowerCase().includes(queryLower);
        const matchesCategory = (s.category || '').toLowerCase().includes(queryLower);
        const matchesAreas = (s.serviceAreas || []).some(a => a.toLowerCase().includes(queryLower));
        const matchesSpecialties = (s.specialties || []).some(spec => spec.toLowerCase().includes(queryLower));

        if (!matchesTitle && !matchesProvider && !matchesDesc && !matchesCategory && !matchesAreas && !matchesSpecialties) {
          return false;
        }
      }

      return true;
    });
  }, [services, isAdminAuthenticated, serviceLocalityFilter, serviceSearchQuery]);

  // Handle Form Submission
  // Requirement 1 & 2: Connect owner listing form to Firestore and save immediately
  // Requirement 3: Set every new listing's status to "pending"
  // Requirement 11: Handle loading states and show clear error if listing cannot be saved
  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);
    setPhotoUploadError(null);

    if (!formData.title.trim() || !formData.address.trim()) {
      showToast('Please provide property title and detailed address');
      return;
    }

    if (!formData.ownerName.trim() || !formData.ownerPhone.trim()) {
      showToast('Please provide landlord name and contact phone number');
      return;
    }

    if (editingProperty) {
      const tokenToUse = currentEditToken || myListingTokens[editingProperty.id];
      if (!tokenToUse && !isAdminAuthenticated) {
        setSubmissionError('Private edit link token required. Please use your private edit link to modify this property.');
        showToast('Private edit link required to edit listing.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Process and upload any new pending photos to Cloudinary CDN
      let finalPhotoUrls: string[] = [];

      const newPhotosToUpload = selectedPhotos.filter(p => !p.isExisting && p.file);
      const existingPhotosToKeep = selectedPhotos.filter(p => p.isExisting).map(p => p.url);

      if (newPhotosToUpload.length > 0) {
        setIsUploadingPhotos(true);
        setUploadProgress({
          fileName: 'Fast photo upload in progress (in seconds)...',
          percent: 15,
          completed: 0,
          total: newPhotosToUpload.length,
          phase: 'uploading'
        });

        // Collect ready files (already compressed on selection)
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
        
        try {
          // Upload to Cloudinary with controlled concurrency 2 and resumable compression
          const uploadedUrls = await uploadMultiplePropertyPhotos(
            filesToUpload,
            (info) => {
              setUploadProgress(info);
            },
            2,
            (completedFile, cloudUrl) => {
              // Immediately mark finished photo as existing so it is never restarted on network retry
              const fp = getFileFingerprint(completedFile);
              setSelectedPhotos(current =>
                current.map(p => {
                  if (
                    p.fingerprint === fp ||
                    (p.file && p.file.name === completedFile.name && p.file.size === completedFile.size)
                  ) {
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
          for (const item of selectedPhotos) {
            if (item.isExisting) {
              finalPhotoUrls.push(item.url);
            } else if (uploadIdx < uploadedUrls.length) {
              finalPhotoUrls.push(uploadedUrls[uploadIdx++]);
            }
          }
        } catch (uploadErr: any) {
          console.error('Cloudinary photo upload failed:', uploadErr);
          const errorMsg = uploadErr.message || 'Check Cloudinary connection and upload preset';
          setPhotoUploadError(errorMsg);
          throw new Error(errorMsg);
        } finally {
          setIsUploadingPhotos(false);
          setUploadProgress(null);
        }
      } else {
        finalPhotoUrls = existingPhotosToKeep;
      }

      // If no photos provided, fallback to standard Gondia Stays photo
      if (finalPhotoUrls.length === 0) {
        finalPhotoUrls = ['/hero_gondia_stays.jpg'];
      }

      if (editingProperty) {
        const updated: PropertyListing = {
          ...editingProperty,
          title: formData.title.trim(),
          address: formData.address.trim(),
          locality: formData.locality,
          city: editingProperty.city || 'Gondia',
          propertyType: formData.propertyType,
          accommodationType: formData.accommodationType,
          monthlyRent: Number(formData.monthlyRent),
          securityDeposit: Number(formData.securityDeposit),
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          kitchenAvailable: formData.kitchenAvailable,
          hallAvailable: Boolean(formData.hallAvailable),
          furnishing: formData.furnishing,
          suitableTenants: formData.suitableTenants,
          availableFrom: formData.availableFrom,
          amenities: formData.amenities,
          photos: finalPhotoUrls,
          ownerId: editingProperty.ownerId || 'owner_unauthenticated',
          ownerEmail: editingProperty.ownerEmail || (formData.ownerPhone ? `${formData.ownerPhone.replace(/\D/g, '')}@gondiastay.local` : ''),
          ownerName: formData.ownerName.trim(),
          ownerPhone: formData.ownerPhone.trim(),
          ownerWhatsappNumber: (formData.ownerWhatsappNumber || formData.ownerPhone).trim(),
          ownerPreferredContact: formData.ownerPreferredContact,
          latitude: Number(formData.latitude) || 21.4602,
          longitude: Number(formData.longitude) || 80.1945,
        };
        const tokenToUse = currentEditToken || myListingTokens[editingProperty.id];
        await saveProperty(updated, true, tokenToUse);
        setEditingProperty(null);
        setCurrentEditToken(null);
        setOwnerSubTab('listings');
      } else {
        // Zero-login submission: Generates private edit link
        const newProp: PropertyListing = {
          id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: formData.title.trim(),
          address: formData.address.trim(),
          locality: formData.locality,
          city: 'Gondia',
          propertyType: formData.propertyType,
          accommodationType: formData.accommodationType,
          monthlyRent: Number(formData.monthlyRent),
          securityDeposit: Number(formData.securityDeposit),
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          kitchenAvailable: formData.kitchenAvailable,
          hallAvailable: Boolean(formData.hallAvailable),
          furnishing: formData.furnishing,
          suitableTenants: formData.suitableTenants,
          availableFrom: formData.availableFrom,
          amenities: formData.amenities,
          photos: finalPhotoUrls,
          ownerId: 'owner_unauthenticated',
          ownerEmail: formData.ownerPhone ? `${formData.ownerPhone.replace(/\D/g, '')}@gondiastay.local` : '',
          ownerName: formData.ownerName.trim(),
          ownerPhone: formData.ownerPhone.trim(),
          ownerWhatsappNumber: (formData.ownerWhatsappNumber || formData.ownerPhone).trim(),
          ownerPreferredContact: formData.ownerPreferredContact,
          status: 'pending', // Requirement 4: Set every new listing's status to "pending"
          occupancyStatus: 'AVAILABLE',
          latitude: Number(formData.latitude) || 21.4602,
          longitude: Number(formData.longitude) || 80.1945,
          createdAt: Date.now()
        };
        const res = await saveProperty(newProp, false);
        setNewlyCreatedLinkInfo({
          propertyId: res.propertyId,
          editToken: res.editToken,
          editUrl: res.editUrl,
          title: formData.title.trim()
        });
        setShowPrivateLinkModal(true);
      }

      // Cleanup preview URLs and reset
      selectedPhotos.forEach(p => {
        if (!p.isExisting && p.url.startsWith('blob:')) {
          URL.revokeObjectURL(p.url);
        }
      });
      setSelectedPhotos([]);
      setFormData({
        title: '',
        address: '',
        locality: GONDIA_LOCALITIES[1],
        propertyType: 'FLAT',
        accommodationType: '1_BHK',
        monthlyRent: 8000,
        securityDeposit: 16000,
        bedrooms: 1,
        bathrooms: 1,
        kitchenAvailable: 'PRIVATE',
        hallAvailable: true,
        furnishing: 'SEMI_FURNISHED',
        suitableTenants: ['ALL'],
        availableFrom: 'Immediate',
        amenities: ['24/7 Water', 'Wi-Fi'],
        ownerName: '',
        ownerPhone: '',
        ownerWhatsappNumber: '',
        ownerPreferredContact: 'BOTH',
        latitude: 21.4602,
        longitude: 80.1945,
        photos: []
      });
      setSubmissionError(null);
      setPhotoUploadError(null);
      setOwnerSubTab('listings');
    } catch (err: any) {
      console.error('Submission failed:', err);
      setSubmissionError(err.message || 'Failed to save listing to Cloud Firestore. Please check your connection or Firebase settings.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingPhotos(false);
    }
  };

  const handleEditClick = (property: PropertyListing, token?: string) => {
    let tokenToUse = token || currentEditToken || myListingTokens[property.id];
    if (tokenToUse) {
      setCurrentEditToken(tokenToUse);
    }
    setEditingProperty(property);
    setSubmissionError(null);
    setPhotoUploadError(null);
    setFormData({
      title: property.title,
      address: property.address,
      locality: property.locality,
      propertyType: property.propertyType,
      accommodationType: property.accommodationType || '1_BHK',
      monthlyRent: property.monthlyRent,
      securityDeposit: property.securityDeposit,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      kitchenAvailable: property.kitchenAvailable || 'PRIVATE',
      hallAvailable: property.hallAvailable !== undefined ? property.hallAvailable : true,
      furnishing: property.furnishing,
      suitableTenants: property.suitableTenants || ['ALL'],
      availableFrom: property.availableFrom,
      amenities: property.amenities,
      ownerName: property.ownerName || '',
      ownerPhone: property.ownerPhone || '',
      ownerWhatsappNumber: property.ownerWhatsappNumber || property.ownerPhone || '',
      ownerPreferredContact: property.ownerPreferredContact,
      latitude: property.latitude || GONDIA_LOCALITY_COORDS[property.locality]?.lat || 21.4602,
      longitude: property.longitude || GONDIA_LOCALITY_COORDS[property.locality]?.lng || 80.1945,
      photos: property.photos || []
    });

    // Populate selectedPhotos with existing property photos
    const existingItems = (property.photos || []).map((url, idx) => ({
      id: `existing_${idx}_${Date.now()}`,
      url,
      isExisting: true,
      name: `Photo ${idx + 1}`,
      fingerprint: `existing_${url}`
    }));
    setSelectedPhotos(existingItems);
    setIsAddPropertyModalOpen(true);
  };

  const handleStartNewListing = () => {
    setEditingProperty(null);
    setCurrentEditToken(null);
    setSubmissionError(null);
    setPhotoUploadError(null);
    setSelectedPhotos([]);
    setFormData({
      title: '',
      address: '',
      locality: GONDIA_LOCALITIES[1],
      propertyType: 'FLAT',
      accommodationType: '1_BHK',
      monthlyRent: 8000,
      securityDeposit: 16000,
      bedrooms: 1,
      bathrooms: 1,
      kitchenAvailable: 'PRIVATE',
      hallAvailable: true,
      furnishing: 'SEMI_FURNISHED',
      suitableTenants: ['ALL'],
      availableFrom: 'Immediate',
      amenities: ['24/7 Water', 'Wi-Fi'],
      ownerName: '',
      ownerPhone: '',
      ownerWhatsappNumber: '',
      ownerPreferredContact: 'BOTH',
      latitude: 21.4602,
      longitude: 80.1945,
      photos: []
    });
    setIsAddPropertyModalOpen(true);
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists 
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity]
      };
    });
  };

  const availableAmenities = [
    '24/7 Water', 'Wi-Fi', 'Parking (Bike/Car)', 'Power Backup', 
    'Geyser', 'CCTV Security', 'Balcony', 'Kitchen Setup'
  ];

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);

    const emailTrimmed = adminEmail.trim().toLowerCase();
    if (!isAuthorizedAdminEmail(emailTrimmed)) {
      setAdminAuthError('Access Denied: Only the authorized GondiaStay administrator account can access this console.');
      return;
    }

    if (!adminPassword.trim()) {
      setAdminAuthError('Please enter your administrator password.');
      return;
    }

    setAdminAuthSubmitting(true);
    const res = await loginAdminWithEmailPassword(emailTrimmed, adminPassword.trim());
    setAdminAuthSubmitting(false);
    if (res.success) {
      setAdminPassword('');
      setAdminAuthError(null);
    } else {
      setAdminAuthError(res.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleModerate = async (propId: string, approve: boolean) => {
    setModeratingPropId(propId);
    try {
      await approveProperty(propId, approve);
    } finally {
      setModeratingPropId(null);
    }
  };

  const handleModeratePropertyEdit = async (propId: string, approve: boolean) => {
    setModeratingPropId(propId);
    try {
      await moderatePropertyEdit(propId, approve);
      showToast(approve ? 'Property edits approved and published live!' : 'Property edits rejected. Live listing preserved.');
    } catch (err: any) {
      showToast(err.message || 'Failed to moderate property edit');
    } finally {
      setModeratingPropId(null);
    }
  };

  const handleModerateServiceEdit = async (serviceId: string, approve: boolean) => {
    try {
      await moderateServiceEdit(serviceId, approve);
      showToast(approve ? 'Service edits approved and published live!' : 'Service edits rejected. Live listing preserved.');
    } catch (err: any) {
      showToast(err.message || 'Failed to moderate service edit');
    }
  };

  const handleSearchSubmit = (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : searchQuery).trim();
    if (!q) {
      showToast('Please type a locality, flat, 1BHK, 2BHK, room, or price to search.');
      return;
    }
    if (customQuery !== undefined) {
      setSearchQuery(customQuery);
    }

    // Check if query directly specifies a known Gondia locality
    const matchedLocality = GONDIA_LOCALITIES.find(
      loc => loc !== 'All' && q.toLowerCase().includes(loc.toLowerCase())
    );
    if (matchedLocality) {
      setSelectedLocality(matchedLocality);
    } else {
      setSelectedLocality('All');
    }

    // Reset type filter so user searches broadly across all stays
    setSelectedType('ALL');

    // Scroll smoothly to properties results
    setTimeout(() => {
      const resultsEl = document.getElementById('properties-results');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);

    showToast(`Searching for "${q}" across Gondia stays...`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12">
      {/* Top Header */}
      <Header />

      {/* Database Status Alert Bar (if disconnected - Admin Only) */}
      {isAdminAuthenticated && !isFirebaseConnected && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs px-4 py-2.5 shadow-xs flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 shrink-0 text-amber-200" />
              <span>
                <strong>Cloud Firestore Sync:</strong> Connect your existing Firebase project to enable cross-device persistence for GondiaStay.
              </span>
            </div>
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-colors shadow-xs cursor-pointer"
            >
              Configure Firebase
            </button>
          </div>
        </div>
      )}

      {firestoreError && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs px-4 py-2.5 shadow-sm flex items-center justify-between animate-in fade-in">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-200" />
              <span className="leading-snug">
                <strong>Database Notice:</strong> {firestoreError}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdminAuthenticated && (
                <>
                  <button
                    onClick={() => {
                      setFirebaseModalTab('rules');
                      setIsFirebaseModalOpen(true);
                    }}
                    className="bg-white text-amber-900 hover:bg-amber-50 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
                  >
                    Rules Guide
                  </button>
                  <button
                    onClick={() => {
                      setFirebaseModalTab('status');
                      setIsFirebaseModalOpen(true);
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Settings
                  </button>
                </>
              )}
              <button
                onClick={() => clearFirestoreError()}
                className="hover:bg-white/20 text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ===================== EXPLORE TAB ===================== */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            
            {/* Hero Banner with Direct Landlord Highlights */}
            {/* Hero Banner with Direct Landlord Highlights */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-blue-600 text-white shadow-lg">
              <div className="relative z-10 p-4 sm:p-7 md:p-8 max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-bold border border-emerald-400/30">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>100% Verified Landlords in Gondia • 0% Brokerage</span>
                </div>

                <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  Find Rooms, Flats & Hostels in <span className="text-amber-400">Gondia</span>
                </h1>

                {/* Functional Explore Search Bar */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearchSubmit();
                  }}
                  className="pt-1 flex items-center gap-2 max-w-xl"
                >
                  <div className="relative flex-1 flex items-center bg-white rounded-xl shadow-xs border border-white/20 p-1">
                    <div className="pl-2.5 pr-1.5 text-slate-400 flex items-center pointer-events-none shrink-0">
                      <Search className="w-4 h-4" />
                    </div>
                    <input 
                      type="text"
                      placeholder="Search locality, flat, 1BHK, 2BHK, room, rent..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchSubmit();
                        }
                      }}
                      className="w-full py-1.5 px-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-xs font-semibold focus:outline-hidden"
                    />
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          showToast('Search cleared');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors mr-1 cursor-pointer shrink-0"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                      title="Search"
                      aria-label="Search"
                    >
                      <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="hidden sm:inline">Search</span>
                    </button>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setShowFilterModal(true)}
                    className="h-10 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all border border-white/30 backdrop-blur-xs flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer shadow-xs"
                    title="Filter properties"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filters</span>
                  </button>
                </form>

                {/* Popular Quick Search Tags */}
                <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-blue-100 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Quick Search:
                  </span>
                  {[
                    { label: '1 BHK', query: '1bhk' },
                    { label: '2 BHK', query: '2bhk' },
                    { label: 'Flats', query: 'flat' },
                    { label: 'Civil Lines', query: 'Civil Lines' },
                    { label: 'Ram Nagar', query: 'Ram Nagar' },
                    { label: 'Kudwa Naka', query: 'Kudwa Naka' },
                    { label: 'Rooms / PG', query: 'room' },
                    { label: 'Under ₹8,000', query: '8000' }
                  ].map(tag => (
                    <button
                      key={tag.label}
                      type="button"
                      onClick={() => handleSearchSubmit(tag.query)}
                      className={`text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-bold transition-all cursor-pointer backdrop-blur-xs ${
                        searchQuery.toLowerCase() === tag.query.toLowerCase()
                          ? 'bg-amber-400 text-slate-900 shadow-xs'
                          : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Locality Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedLocality('All')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedLocality === 'All' || selectedLocality === 'All Gondia'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Gondia
              </button>
              {GONDIA_LOCALITIES.filter(loc => loc !== 'All' && loc !== 'All Gondia').map(loc => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocality(loc)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedLocality === loc
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            {/* Property Type Pills & Sort Options Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {PROPERTY_TYPES.map(pt => (
                  <button
                    key={pt.type}
                    onClick={() => setSelectedType(pt.type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedType === pt.type
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Sort by:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                >
                  <option value="RELEVANCE">Relevance & Featured</option>
                  <option value="RENT_LOW_TO_HIGH">Rent: Low to High</option>
                  <option value="RENT_HIGH_TO_LOW">Rent: High to Low</option>
                  <option value="NEWEST">Newest Listings</option>
                </select>
              </div>
            </div>

            {/* Active Search Results Banner */}
            {searchQuery.trim() && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-blue-900 font-medium">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Search className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Searching across all Gondia localities:</span>
                    <span className="font-extrabold text-blue-950 text-sm">
                      "{searchQuery}"
                    </span>
                    <span className="text-blue-700 font-bold ml-1.5">
                      ({filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    showToast('Search cleared. Showing all verified properties.');
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 transition-colors shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              </div>
            )}

            {/* Listings Grid Header */}
            <div id="properties-results" className="flex items-center justify-between scroll-mt-20">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {selectedLocality === 'All' ? 'All Verified Properties' : `Properties in ${selectedLocality}`}
                </h2>
                <p className="text-xs text-slate-500">
                  Showing {filteredProperties.length} approved listings from Cloud Firestore
                </p>
              </div>

              {(searchQuery || selectedLocality !== 'All' || selectedType !== 'ALL') && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Database Loading State */}
            {isFirestoreLoading && properties.length === 0 && (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Connecting to Cloud Firestore...</h3>
                <p className="text-xs text-slate-500">Syncing live property listings across all devices</p>
              </div>
            )}

            {/* Properties Grid (Requirement 6 & 7: Shows only approved listings across all visitors) */}
            {!isFirestoreLoading && filteredProperties.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}

            {/* Empty State (Requirement 6) */}
            {!isFirestoreLoading && filteredProperties.length === 0 && (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200 space-y-4">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  {searchQuery.trim() ? `No properties found for "${searchQuery}"` : 'No approved properties found'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {searchQuery.trim() 
                    ? 'No approved and available properties matched your search. Check your spelling, try searching by locality (e.g. Civil Lines, Ram Nagar), accommodation type (e.g. 1 BHK, 2 BHK, separate room), or clear your search query.'
                    : properties.length === 0 
                      ? 'Your Cloud Firestore database is active and ready. When landlords submit listings, they will appear here live across all devices once approved by admin.'
                      : 'No properties match your current filters. Try resetting your price or amenity filters to explore more stays.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {searchQuery.trim() && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        showToast('Search cleared. Showing all verified properties.');
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear Search
                    </button>
                  )}
                  {(selectedLocality !== 'All' || selectedType !== 'ALL') && (
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>

                {searchQuery.trim() && (
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                    <span className="text-xs text-slate-400 font-semibold w-full block">Try searching popular Gondia categories:</span>
                    {['Civil Lines', 'Ram Nagar', '1 BHK', '2 BHK', 'Flat', 'Room'].map(alt => (
                      <button
                        key={alt}
                        type="button"
                        onClick={() => handleSearchSubmit(alt)}
                        className="text-xs px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================== MAP TAB ===================== */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Interactive Gondia City Map
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live hotspots from Cloud Firestore across Civil Lines, Rail Toly, and Ram Nagar
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Approved Listings</span>
                </div>
              </div>

              {/* Interactive OpenStreetMap of Gondia (Requirement 2) */}
              <div className="w-full">
                <GondiaMap
                  properties={properties.filter(p => isApproved(p.status))}
                  selectedPropertyId={selectedProperty?.id}
                  onSelectProperty={(property) => {
                    navigateTo('detail', property);
                  }}
                  mode="explore"
                  heightClass="h-[460px] sm:h-[540px]"
                />
              </div>

              {/* Stays in selected map locality */}
              <div className="mt-6">
                <h3 className="text-base font-bold text-slate-900 mb-3">
                  {selectedMapLocality ? `Stays in ${selectedMapLocality}` : 'All Mapped Stays in Gondia'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProperties.map(p => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== SERVICES TAB ===================== */}
        {(activeTab === 'services' || activeTab === 'tiffin') && (
          <div className="space-y-6">
            
            {/* Compact Header - keeps subcategories grid immediately visible without scrolling */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div className="flex items-center gap-3">
                <ServicesHouseIcon className="w-12 h-12 sm:w-14 sm:h-14" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Home Services for You
                    </h1>
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                      Gondia
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      0% Commission
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified daily tiffin, cooks, cleaning, repairs, laundry & chilled RO water across Gondia
                  </p>
                </div>
              </div>

              {/* Row with "Select Location" beside "About Services" */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Highlighted "Select Location" with modern location-pin icon & subtle background/border */}
                <div className="relative flex-1 sm:flex-initial">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/70 hover:bg-blue-100/60 border border-blue-200/90 hover:border-blue-300 rounded-xl shadow-2xs transition-all duration-150 cursor-pointer min-h-[38px]">
                    <div className="w-5 h-5 rounded-md bg-blue-600/15 text-blue-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 whitespace-nowrap truncate max-w-[130px] sm:max-w-[160px]">
                      {serviceLocalityFilter === 'All' ? 'Select Location' : serviceLocalityFilter}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-auto sm:ml-1" />
                  </div>

                  {/* Dropdown selector for Gondia Localities */}
                  <select
                    value={serviceLocalityFilter}
                    onChange={(e) => setServiceLocalityFilter(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                    aria-label="Select Location in Gondia"
                    title="Select Location in Gondia"
                  >
                    <option value="All">Select Location (All Gondia)</option>
                    {GONDIA_LOCALITIES.filter(l => l !== 'All').map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* About Services button beside Select Location on the same row */}
                <button
                  type="button"
                  onClick={() => setIsServicesDashboardOpen(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/90 shadow-2xs shrink-0 whitespace-nowrap min-h-[38px]"
                  title="View Services Overview & Dashboard Details"
                >
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>About Home Services</span>
                </button>
              </div>
            </div>

            {/* "Add Your Services" button placed directly below */}
            <button
              type="button"
              onClick={() => {
                setServiceToEdit(null);
                setIsAddServiceModalOpen(true);
              }}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm sm:text-base py-3.5 px-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer border border-amber-300/80"
              title="Add your local service in Gondia"
            >
              <div className="w-7 h-7 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="tracking-tight font-black text-slate-950">Add Your Services</span>
              <span className="hidden xs:inline-block text-xs font-bold text-slate-800 bg-slate-950/10 px-2.5 py-0.5 rounded-full ml-1">
                Reach Local Tenants & Homeowners in Gondia
              </span>
            </button>

            {/* Expanded Services Dashboard Details Modal */}
            {isServicesDashboardOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
                <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-2xl relative overflow-hidden max-w-2xl w-full border border-blue-500/30">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                          <Wrench className="w-3.5 h-3.5 text-amber-300" />
                          Gondia Verified Home Services
                        </span>
                        <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          0% Commission
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsServicesDashboardOpen(false)}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Close Dashboard"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
                        Home, Mess & Student Services in Gondia
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                        Discover authentic daily Mess & Tiffin services, verified maids, housekeeping deep cleaners, laundry, licensed electricians, plumbers, chilled RO water cans, and security guards across Gondia.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        Direct connection • Verified Phone & WhatsApp
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsServicesDashboardOpen(false);
                            setServiceToEdit(null);
                            setIsAddServiceModalOpen(true);
                          }}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>Add Your Service</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Locality / Category Filter Indicator */}
            {(serviceLocalityFilter !== 'All' || selectedServiceCategory !== 'ALL') && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-blue-50/70 border border-blue-200/70 rounded-2xl text-xs animate-in fade-in">
                <div className="flex items-center gap-2 text-slate-700 font-medium truncate">
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Filtered by:</span>
                  {serviceLocalityFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-blue-200 text-blue-700 font-bold text-xs shadow-2xs">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      {serviceLocalityFilter}
                    </span>
                  )}
                  {selectedServiceCategory !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-blue-200 text-slate-800 font-bold text-xs shadow-2xs">
                      Category: {selectedServiceCategory}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setServiceLocalityFilter('All');
                    setSelectedServiceCategory('ALL');
                  }}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/90 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Reset service filters"
                >
                  Reset All
                </button>
              </div>
            )}

            {/* Service Categories in Grid View with Modern Sub Icons & Inside Appropriate Owners Listed */}
            <ServiceCategoryGrid 
              services={servicesForCategoryGrid}
              selectedCategory={selectedServiceCategory}
              onSelectCategory={setSelectedServiceCategory}
              isAdmin={isAdminAuthenticated}
              onModerate={moderateService}
              onDelete={deleteService}
              onEdit={(srv) => {
                setServiceToEdit(srv);
                setIsAddServiceModalOpen(true);
              }}
            />
          </div>
        )}

        {/* ===================== SAVED TAB ===================== */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-600" />
                Saved Favorites ({favorites.length})
              </h2>
              <p className="text-xs text-slate-500">
                Quickly access properties you have bookmarked for easy contact
              </p>
            </div>

            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No saved favorites yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Browse stays in Gondia and tap the heart icon on any card to save it here for quick reference.
                </p>
                <button
                  onClick={() => navigateTo('explore')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Explore Stays in Gondia
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================== OWNER HUB TAB ===================== */}
        {activeTab === 'owner' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            
            {/* Compact Header - keeps listings and navigation immediately visible without scrolling */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Welcome, {currentOwner.name ? (currentOwner.name.startsWith('Mr.') ? currentOwner.name : `Mr. ${currentOwner.name}`) : 'Landlord'}
                  </h1>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Landlord
                  </span>
                  {isFirebaseConnected && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Database className="w-3 h-3" /> Cloud Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {myProperties.length} total properties ({myProperties.filter(p => isApproved(p.status)).length} live) • Gondia, Maharashtra
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsOwnerDashboardOpen(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="View My Dashboard & Stats"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
                  <span>My Dashboard</span>
                  <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                    {myProperties.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Large, Attractive Full-Width Row Button for "Add Your Property" matching "Add Your Service" style & size */}
            <button
              type="button"
              onClick={handleStartNewListing}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm sm:text-base py-3.5 px-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer border border-amber-300/80"
              title="Add your rental property in Gondia"
            >
              <div className="w-7 h-7 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="tracking-tight font-black text-slate-950">Add Your Property</span>
              <span className="hidden xs:inline-block text-xs font-bold text-slate-800 bg-slate-950/10 px-2.5 py-0.5 rounded-full ml-1">
                Post Room, Flat or House in Gondia
              </span>
            </button>

            {/* Expanded Owner Dashboard Details Modal */}
            {isOwnerDashboardOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-2xl space-y-6 max-w-2xl w-full border border-slate-800 my-8">
                  
                  {/* Top Bar inside expanded dashboard */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Verified Landlord Console
                        </span>
                        {isFirebaseConnected && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Database className="w-3 h-3" /> Cloud Firestore Active
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                        Welcome, {currentOwner.name ? (currentOwner.name.startsWith('Mr.') ? currentOwner.name : `Mr. ${currentOwner.name}`) : 'Landlord'}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Real Owner Account stored in Cloud Firestore • Gondia, Maharashtra
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => setIsEditingOwnerProfile(!isEditingOwnerProfile)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-xs transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isEditingOwnerProfile ? 'Close Editor' : 'Edit Profile'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsOwnerDashboardOpen(false)}
                        className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Close Dashboard"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Owner Contact and WhatsApp Number Card */}
                  <div className="bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Registered Contact Number</span>
                        <div className="text-sm font-extrabold text-white mt-0.5 flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-blue-400" />
                          <span>{currentOwner.phone ? formatDisplayPhone(currentOwner.phone) : 'Not set yet (tap Edit Profile to add)'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Registered WhatsApp Number</span>
                        <div className="text-sm font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 fill-current text-emerald-400" />
                          <span>{(currentOwner.whatsappNumber || currentOwner.phone) ? formatDisplayPhone(currentOwner.whatsappNumber || currentOwner.phone) : 'Not set yet'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {Boolean(currentOwner.whatsappNumber || currentOwner.phone) && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(currentOwner.whatsappNumber || currentOwner.phone, `Hello ${currentOwner.name ? (currentOwner.name.startsWith('Mr.') ? currentOwner.name : `Mr. ${currentOwner.name}`) : 'Landlord'}, contacting you regarding your property listings on GondiaStay.`)}
                          className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>WhatsApp Owner</span>
                        </button>
                      )}
                      {Boolean(currentOwner.phone) && (
                        <button
                          type="button"
                          onClick={() => dialPhone(currentOwner.phone)}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Owner Profile Editor */}
                  {isEditingOwnerProfile && (
                    <div className="bg-slate-800 p-5 rounded-2xl border border-blue-500/30 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-blue-400" />
                          Edit Real Landlord Profile (Cloud Firestore)
                        </h3>
                        <span className="text-[10px] text-slate-400">Syncs automatically to cloud</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">Landlord Name *</label>
                          <input
                            type="text"
                            value={ownerProfileForm.name}
                            onChange={(e) => setOwnerProfileForm({ ...ownerProfileForm, name: e.target.value })}
                            placeholder="e.g. Ramesh Patel"
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">Phone Number *</label>
                          <input
                            type="text"
                            value={ownerProfileForm.phone}
                            onChange={(e) => setOwnerProfileForm({ ...ownerProfileForm, phone: e.target.value })}
                            placeholder="10-digit mobile (e.g. 98230 12345)"
                            className={`w-full px-3 py-2 text-xs bg-slate-900 border ${
                              ownerProfileForm.phone && !isValidIndianMobileNumber(ownerProfileForm.phone)
                                ? 'border-rose-500 focus:border-rose-400'
                                : 'border-slate-700 focus:border-blue-500'
                            } rounded-xl text-white font-semibold outline-none`}
                          />
                          {ownerProfileForm.phone && !isValidIndianMobileNumber(ownerProfileForm.phone) && (
                            <p className="text-[10px] text-rose-400 font-semibold mt-1">
                              Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">WhatsApp Number *</label>
                          <input
                            type="text"
                            value={ownerProfileForm.whatsappNumber}
                            onChange={(e) => setOwnerProfileForm({ ...ownerProfileForm, whatsappNumber: e.target.value })}
                            placeholder="10-digit WhatsApp (e.g. 98230 12345)"
                            className={`w-full px-3 py-2 text-xs bg-slate-900 border ${
                              ownerProfileForm.whatsappNumber && !isValidIndianMobileNumber(ownerProfileForm.whatsappNumber)
                                ? 'border-rose-500 focus:border-rose-400'
                                : 'border-slate-700 focus:border-blue-500'
                            } rounded-xl text-white font-semibold outline-none`}
                          />
                          {ownerProfileForm.whatsappNumber && !isValidIndianMobileNumber(ownerProfileForm.whatsappNumber) && (
                            <p className="text-[10px] text-rose-400 font-semibold mt-1">
                              Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingOwnerProfile(false)}
                          className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!ownerProfileForm.name.trim()) {
                              showToast("Please provide owner name.");
                              return;
                            }
                            if (!ownerProfileForm.phone.trim() || !isValidIndianMobileNumber(ownerProfileForm.phone)) {
                              showToast("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 for phone.");
                              return;
                            }
                            const wa = (ownerProfileForm.whatsappNumber || ownerProfileForm.phone).trim();
                            if (!wa || !isValidIndianMobileNumber(wa)) {
                              showToast("Please enter a valid 10-digit Indian WhatsApp number starting with 6, 7, 8, or 9.");
                              return;
                            }
                            await updateOwnerProfile({
                              name: ownerProfileForm.name.trim(),
                              phone: ownerProfileForm.phone.trim(),
                              whatsappNumber: wa
                            });
                            setIsEditingOwnerProfile(false);
                          }}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-lg shadow-xs cursor-pointer"
                        >
                          Save Profile to Firebase
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Stat Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                      <span className="text-xs text-slate-400 font-semibold">Your Listings</span>
                      <div className="text-2xl font-extrabold text-white mt-1">{myProperties.length}</div>
                    </div>

                    <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                      <span className="text-xs text-slate-400 font-semibold">Approved (Live)</span>
                      <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                        {myProperties.filter(p => isApproved(p.status)).length}
                      </div>
                    </div>

                    <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                      <span className="text-xs text-slate-400 font-semibold">Pending Review</span>
                      <div className="text-2xl font-extrabold text-amber-400 mt-1">
                        {myProperties.filter(p => isPending(p.status)).length}
                      </div>
                    </div>

                    <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                      <span className="text-xs text-slate-400 font-semibold">Total Pending</span>
                      <div className="text-2xl font-extrabold text-amber-300 mt-1">
                        {pendingProperties.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Owner Hub Sub-Tabs / Admin Panel Header */}
            {ownerSubTab === 'moderation' ? (
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setOwnerSubTab('listings')}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to My Properties</span>
                </button>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Admin Moderation Console</span>
                  </div>
                  {isAdminAuthenticated && (
                    <button
                      type="button"
                      onClick={logoutAdmin}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between border-b border-slate-200">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setOwnerSubTab('listings')}
                    className="pb-3 px-3 text-xs font-bold border-b-2 border-blue-600 text-blue-700 transition-all flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>My Properties ({myProperties.length})</span>
                  </button>
                  {isAdminAuthenticated && (
                    <button
                      onClick={() => setOwnerSubTab('moderation')}
                      className="pb-3 px-3 text-xs font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin Panel</span>
                      {pendingProperties.length > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                          {pendingProperties.length}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* Edit Phone Number Inline */}
                <div className="hidden sm:flex items-center gap-2 pb-2">
                  <span className="text-xs font-bold text-slate-500">Contact:</span>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="10-digit mobile"
                    className={`px-2.5 py-1 text-xs border ${
                      phoneInput && !isValidIndianMobileNumber(phoneInput)
                        ? 'border-rose-400 focus:border-rose-600'
                        : 'border-slate-200 focus:border-blue-600'
                    } rounded-lg w-36 font-semibold outline-none`}
                  />
                  <button
                    onClick={() => {
                      if (!isValidIndianMobileNumber(phoneInput)) {
                        showToast("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
                        return;
                      }
                      updateOwnerPhone(phoneInput);
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}

            {/* Sub-tab 1: My Properties List */}
            {ownerSubTab === 'listings' && (
              <div className="space-y-4">
                {myProperties.length > 0 ? (
                  <div className="space-y-3">
                    {myProperties.map(property => (
                      <div 
                        key={property.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={property.photos[0] || '/hero_gondia_stays.jpg'} 
                            alt={property.title} 
                            className="w-16 h-16 rounded-xl object-cover shrink-0" 
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isApproved(property.status)
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPending(property.status)
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isApproved(property.status) ? 'Approved • Live' : isPending(property.status) ? 'Pending Approval' : 'Rejected'}
                              </span>

                              {/* Requirement 5: Occupancy badge */}
                              {isOccupied(property.occupancyStatus) ? (
                                <span className="bg-rose-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                                  OCCUPIED / RENTED
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Available for Rent
                                </span>
                              )}

                              {property.hasPendingEdit && (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Proposed Edit Pending Reapproval</span>
                                </span>
                              )}

                              {property.isFeatured && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-600" /> Featured
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mt-1">{property.title}</h4>
                            <p className="text-xs text-slate-500">{property.address}, {property.locality}</p>
                            <div className="flex items-center gap-2 text-xs mt-1 flex-wrap">
                              <span className="font-extrabold text-blue-700">₹{property.monthlyRent}/month</span>
                              {property.ownerName && (
                                <>
                                  <span className="text-slate-700 font-bold">
                                    Owner: {property.ownerName}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                </>
                              )}
                              {property.ownerPhone && (
                                <>
                                  <span className="text-slate-600 font-medium">
                                    Tel: {formatDisplayPhone(property.ownerPhone)}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                </>
                              )}
                              {(property.ownerWhatsappNumber || property.ownerPhone) && (
                                <span className="text-emerald-700 font-bold">
                                  WA: {formatDisplayPhone(property.ownerWhatsappNumber || property.ownerPhone)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions for owner */}
                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                          {/* Owner & Admin Available / Occupied Toggle */}
                          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => {
                                if (isOccupied(property.occupancyStatus)) {
                                  updatePropertyOccupancy(property.id, 'AVAILABLE', myListingTokens[property.id]);
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                !isOccupied(property.occupancyStatus)
                                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title="Mark Available: listing appears in public Rentals"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Available</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isOccupied(property.occupancyStatus)) {
                                  updatePropertyOccupancy(property.id, 'OCCUPIED', myListingTokens[property.id]);
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isOccupied(property.occupancyStatus)
                                  ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title="Mark Occupied: listing hidden from public Rentals"
                            >
                              <Home className="w-3.5 h-3.5" />
                              <span>Occupied</span>
                            </button>
                          </div>

                          {isAdminAuthenticated && (
                            <button
                              onClick={() => toggleFeatured(property.id)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Toggle featured badge (Admin Only)"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">{property.isFeatured ? 'Featured' : 'Make Featured'}</span>
                            </button>
                          )}

                          {/* Functional Edit Button beside Delete button */}
                          <button
                            type="button"
                            onClick={() => handleEditClick(property, myListingTokens[property.id])}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-blue-200/80 shadow-2xs"
                            title="Edit Listing Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              setDeleteConfirmState({
                                isOpen: true,
                                itemType: 'property',
                                itemTitle: property.title,
                                onConfirm: () => {
                                  deleteProperty(property.id);
                                  setDeleteConfirmState(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No properties listed yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Tap below to add your room, flat, or student PG directly to Cloud Firestore.</p>
                    <button
                      onClick={handleStartNewListing}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                    >
                      Post Your First Listing
                    </button>
                  </div>
                )}

                {/* My Home Services Section (if owner has registered any local services) */}
                {(() => {
                  const myOwnerServices = services.filter(s => isServiceOwner(s));
                  if (myOwnerServices.length === 0) return null;
                  return (
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                            <ServicesHouseIcon className="w-4 h-4" />
                            <span>My Home Services ({myOwnerServices.length})</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Your local business & home service listings in Gondia
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setServiceToEdit(null);
                            setIsAddServiceModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Service</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {myOwnerServices.map(srv => (
                          <div 
                            key={srv.id}
                            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <img 
                                src={srv.photos[0] || (srv.category === 'MESS_TIFFIN' ? '/hero_tiffin_mess.jpg' : '/hero_gondia_stays.jpg')}
                                alt={srv.title}
                                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    isApproved(srv.status)
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isPending(srv.status)
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {isApproved(srv.status) ? 'Approved • Live' : isPending(srv.status) ? 'Pending Verification' : 'Rejected'}
                                  </span>
                                  {srv.hasPendingEdit && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-300 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-700" />
                                      <span>Edit Pending Approval</span>
                                    </span>
                                  )}
                                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                    {srv.category}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 mt-0.5">{srv.title}</h4>
                                <p className="text-xs text-slate-500">Rate: <span className="font-bold text-slate-700">{srv.charges}</span> • Tel: {formatDisplayPhone(srv.phone)}</p>
                              </div>
                            </div>

                            {/* Approved status / edit button - Pending Approval button removed per request */}
                            {isApproved(srv.status) && !srv.hasPendingEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setServiceToEdit(srv);
                                  setIsAddServiceModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border self-end sm:self-center bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold border-emerald-300"
                                title="Edit Service Listing"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Approved ✓</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Sub-tab 2: Admin Approval Workflow */}
            {/* Requirement 4: Real-time listener automatically updates admin dashboard */}
            {/* Requirement 5: Let admin approve or reject listings */}
            {/* Requirement 10: Never allow users to approve their own listings */}
            {ownerSubTab === 'moderation' && (
              <div className="space-y-4">
                
                {/* Admin Authentication Barrier */}
                {!isAdminAuthenticated ? (
                  authUser && !isAuthorizedAdminEmail(authUser.email) ? (
                    /* 403 Forbidden Access Barrier for Non-Admin Logged In Users */
                    <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 shadow-sm space-y-4 max-w-lg mx-auto text-center">
                      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                        <ShieldAlert className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full uppercase tracking-wider">
                          403 Forbidden • Access Denied
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 pt-1">Administrator Privileges Required</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          You are currently signed in as <strong className="text-slate-900 font-semibold">{authUser.email}</strong>. This account is not authorized to access or manage the GondiaStay admin console.
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Administrative access is strictly restricted to authorized administrators.
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                        <button
                          type="button"
                          onClick={() => setOwnerSubTab('listings')}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Return to My Properties
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await logoutAdmin();
                          }}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out & Switch Account</span>
                        </button>
                      </div>
                    </div>
                  ) : authUser && isAuthorizedAdminEmail(authUser.email) && !authUser.emailVerified ? (
                    /* Email Verification Barrier for Admin Account */
                    <div className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-8 shadow-sm space-y-4 max-w-lg mx-auto text-center">
                      <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                        <Mail className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider">
                          Email Verification Required
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 pt-1">Verify Email Ownership</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          You are authenticated with an administrator account, but this administrator account requires verified email ownership before administrative privileges (approval, rejection, deletion, and edits) can be exercised.
                        </p>
                        <p className="text-[11px] text-amber-700">
                          Please verify your email address to unlock the admin console.
                        </p>
                      </div>

                      {verificationError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>{verificationError}</span>
                        </div>
                      )}

                      {verificationSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 text-left">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span>{verificationSuccess}</span>
                        </div>
                      )}

                      <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                        <button
                          type="button"
                          disabled={isSendingVerification}
                          onClick={async () => {
                            setVerificationError(null);
                            setVerificationSuccess(null);
                            setIsSendingVerification(true);
                            try {
                              const res = await sendAdminVerificationEmail();
                              if (res.success) {
                                setVerificationSuccess(`Verification email sent to ${authUser?.email || 'your email'}. Please check your inbox and spam folder.`);
                              } else {
                                setVerificationError(res.error || 'Failed to send verification email. Please try again.');
                              }
                            } catch (err: any) {
                              setVerificationError(err?.message || 'An error occurred while sending verification email.');
                            } finally {
                              setIsSendingVerification(false);
                            }
                          }}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isSendingVerification ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          <span>{isSendingVerification ? 'Sending Email...' : 'Send Verification Email'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSendingVerification}
                          onClick={async () => {
                            setVerificationError(null);
                            setVerificationSuccess(null);
                            const verified = await checkAdminVerificationStatus();
                            if (!verified) {
                              setVerificationError('Email ownership is not verified yet. Please check your inbox, click the verification link, and then click Refresh.');
                            }
                          }}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>I Have Verified • Refresh</span>
                        </button>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await logoutAdmin();
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Secure Admin Login Barrier for Unauthenticated Access */
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5 max-w-lg mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
                        <Lock className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="text-center space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          GondiaStay Admin Panel
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900">Administrator Sign-In</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Authorized admin access only. Sign in with the registered administrator credentials to review pending submissions, approve or reject listings, and manage properties.
                        </p>
                      </div>

                      <form onSubmit={handleAdminLogin} className="space-y-3.5 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Admin Account Email
                          </label>
                          <input
                            type="email"
                            required
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            placeholder="Enter administrator email address"
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Admin Password
                          </label>
                          <input
                            type="password"
                            required
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Enter your administrator password"
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 font-mono"
                          />
                        </div>

                        {adminAuthError && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{adminAuthError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={adminAuthSubmitting}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {adminAuthSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <Key className="w-4 h-4 text-amber-400" />
                          )}
                          <span>{adminAuthSubmitting ? 'Authenticating...' : 'Sign In to Admin Portal'}</span>
                        </button>
                      </form>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-center">
                        <Lock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                        All administrative actions are authenticated and validated directly through Firebase security rules.
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    {/* Admin Status Header */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
                      <div className="flex items-center gap-2 font-bold">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span>Admin Moderation Clearance Active (Firebase Authenticated)</span>
                          <span className="block text-[11px] font-normal text-emerald-700">
                            Logged in as: <strong className="font-semibold">Administrator</strong> • Real-time listener active
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setFirebaseModalTab('status');
                            setIsFirebaseModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                          title="Cloud Firestore Connection & Database Settings"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>Firestore Connection</span>
                        </button>
                        <button
                          type="button"
                          onClick={logoutAdmin}
                          className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>

                    {/* Admin Moderation Section Selector (Properties vs Services) */}
                    <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setAdminModerationSection('properties')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          adminModerationSection === 'properties'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>Rental Properties</span>
                        {(pendingProperties.length > 0 || pendingEditProperties.length > 0) && (
                          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                            {pendingProperties.length + pendingEditProperties.length} pending
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminModerationSection('services')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          adminModerationSection === 'services'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ServicesHouseIcon className="w-4 h-4" />
                        <span>Home Services</span>
                        {(pendingServices.length > 0 || pendingEditServices.length > 0) && (
                          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                            {pendingServices.length + pendingEditServices.length} pending
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Properties Moderation View */}
                    {adminModerationSection === 'properties' && (
                      <div className="space-y-4">
                        {/* Moderation Status Tabs */}
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setAdminModerationFilter('pending')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              adminModerationFilter === 'pending'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>New Submissions</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              adminModerationFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {pendingProperties.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAdminModerationFilter('pending_edits')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              adminModerationFilter === 'pending_edits'
                                ? 'bg-orange-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Pending Edits</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              adminModerationFilter === 'pending_edits' ? 'bg-orange-800 text-white' : pendingEditProperties.length > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {pendingEditProperties.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAdminModerationFilter('approved')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              adminModerationFilter === 'approved'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approved & Public</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              adminModerationFilter === 'approved' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {approvedProperties.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAdminModerationFilter('rejected')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              adminModerationFilter === 'rejected'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejected</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              adminModerationFilter === 'rejected' ? 'bg-rose-800 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {rejectedProperties.length}
                            </span>
                          </button>
                        </div>

                    {(() => {
                      const displayedList = adminModerationFilter === 'pending'
                        ? pendingProperties
                        : adminModerationFilter === 'pending_edits'
                          ? pendingEditProperties
                          : adminModerationFilter === 'approved'
                            ? approvedProperties
                            : rejectedProperties;

                      if (displayedList.length === 0) {
                        return (
                          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-800">
                              {adminModerationFilter === 'pending'
                                ? 'No pending submissions awaiting review.'
                                : adminModerationFilter === 'pending_edits'
                                  ? 'No proposed property edits awaiting reapproval.'
                                  : adminModerationFilter === 'approved'
                                    ? 'No approved listings yet.'
                                    : 'No rejected listings.'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              All listings in Cloud Firestore are synchronized in real-time.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {displayedList.map(prop => {
                            const isOwnListing = Boolean(currentOwner.id && prop.ownerId && prop.ownerId === currentOwner.id);
                            const isEditReview = adminModerationFilter === 'pending_edits';
                            const pEdit = prop.pendingEdit;

                            return (
                              <div key={prop.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                  <div className="flex items-start gap-3.5">
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 mt-0.5">
                                      <img 
                                        src={(pEdit?.photos && pEdit.photos[0]) || prop.photos[0] || '/hero_gondia_stays.jpg'} 
                                        alt={prop.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.src = '/hero_gondia_stays.jpg'; }}
                                      />
                                      {prop.photos && prop.photos.length > 1 && (
                                        <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                                          <Camera className="w-2.5 h-2.5" /> {prop.photos.length}
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                          isApproved(prop.status)
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : isPending(prop.status)
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-rose-100 text-rose-800'
                                        }`}>
                                          {isApproved(prop.status) ? 'Approved • Publicly Live' : isPending(prop.status) ? 'Pending Approval' : 'Rejected'}
                                        </span>
                                        {prop.hasPendingEdit && (
                                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1">
                                            <Pencil className="w-3 h-3 text-orange-700" />
                                            <span>Proposed Edit Awaiting Reapproval</span>
                                          </span>
                                        )}
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                          isOccupied(prop.occupancyStatus)
                                            ? 'bg-rose-700 text-white'
                                            : 'bg-emerald-700 text-white'
                                        }`}>
                                          {isOccupied(prop.occupancyStatus) ? 'Occupied (Hidden)' : 'Available'}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500">{prop.locality}</span>
                                        {isOwnListing && (
                                          <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                            Your Submission
                                          </span>
                                        )}
                                        {prop.isFeatured && (
                                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-amber-600" /> Featured
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-sm font-bold text-slate-900">{prop.title}</h4>
                                      <p className="text-xs text-slate-500">{prop.address}</p>
                                      <div className="text-xs text-slate-600 font-medium pt-0.5">
                                        Owner: <span className="font-bold">{prop.ownerName}</span> ({formatDisplayPhone(prop.ownerPhone)}) • Rent: <span className="font-extrabold text-blue-700">₹{prop.monthlyRent}/mo</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2 shrink-0 flex-wrap self-end md:self-auto">
                                    {isEditReview ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleModeratePropertyEdit(prop.id, true)}
                                          disabled={moderatingPropId === prop.id}
                                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                          title="Approve proposed edits and update live listing"
                                        >
                                          {moderatingPropId === prop.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                          )}
                                          <span>Approve Edits</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleModeratePropertyEdit(prop.id, false)}
                                          disabled={moderatingPropId === prop.id}
                                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                          title="Reject proposed edits and discard without affecting live listing"
                                        >
                                          <XCircle className="w-4 h-4" />
                                          <span>Reject Edits</span>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {adminModerationFilter !== 'approved' && (
                                          <button
                                            type="button"
                                            onClick={() => handleModerate(prop.id, true)}
                                            disabled={moderatingPropId === prop.id}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                            title="Approve property listing and make publicly visible"
                                          >
                                            {moderatingPropId === prop.id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            <span>Approve</span>
                                          </button>
                                        )}

                                        {adminModerationFilter !== 'rejected' && (
                                          <button
                                            type="button"
                                            onClick={() => handleModerate(prop.id, false)}
                                            disabled={moderatingPropId === prop.id}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                            title="Reject property listing (hidden from public)"
                                          >
                                            <XCircle className="w-4 h-4" />
                                            <span>Reject</span>
                                          </button>
                                        )}
                                      </>
                                    )}

                                    {/* Admin Available / Occupied Toggle */}
                                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isOccupied(prop.occupancyStatus)) {
                                            updatePropertyOccupancy(prop.id, 'AVAILABLE');
                                          }
                                        }}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                          !isOccupied(prop.occupancyStatus)
                                            ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                        title="Set Available: visible in public rentals"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Available</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!isOccupied(prop.occupancyStatus)) {
                                            updatePropertyOccupancy(prop.id, 'OCCUPIED');
                                          }
                                        }}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                          isOccupied(prop.occupancyStatus)
                                            ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                        title="Set Occupied: hidden from public rentals"
                                      >
                                        <Home className="w-3.5 h-3.5" />
                                        <span>Occupied</span>
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleEditClick(prop)}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                      title="Admin Direct Edit Listing"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeleteConfirmState({
                                          isOpen: true,
                                          itemType: 'property',
                                          itemTitle: prop.title,
                                          onConfirm: () => {
                                            deleteProperty(prop.id);
                                            setDeleteConfirmState(prev => ({ ...prev, isOpen: false }));
                                          }
                                        });
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                      title="Permanently Delete Listing"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Proposed Changes Diff / Comparison Box */}
                                {pEdit && (
                                  <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-2 text-xs">
                                    <div className="flex items-center justify-between gap-2 border-b border-amber-200/70 pb-1.5">
                                      <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                                        <Pencil className="w-3.5 h-3.5 text-amber-700" />
                                        <span>Proposed Changes by Landlord (Pending Reapproval)</span>
                                      </span>
                                      {!isEditReview && (
                                        <button
                                          type="button"
                                          onClick={() => setAdminModerationFilter('pending_edits')}
                                          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                                        >
                                          Review in Pending Edits tab →
                                        </button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-slate-700 pt-1">
                                      {pEdit.title && pEdit.title !== prop.title && (
                                        <div>
                                          <span className="font-semibold text-slate-500 block">Proposed Title:</span>
                                          <span className="text-emerald-700 font-bold">{pEdit.title}</span>
                                          <span className="text-slate-400 text-[10px] block line-through">Live: {prop.title}</span>
                                        </div>
                                      )}
                                      {pEdit.monthlyRent !== undefined && pEdit.monthlyRent !== prop.monthlyRent && (
                                        <div>
                                          <span className="font-semibold text-slate-500 block">Proposed Rent:</span>
                                          <span className="text-emerald-700 font-extrabold">₹{pEdit.monthlyRent}/month</span>
                                          <span className="text-slate-400 text-[10px] block line-through">Live: ₹{prop.monthlyRent}/month</span>
                                        </div>
                                      )}
                                      {pEdit.securityDeposit !== undefined && pEdit.securityDeposit !== prop.securityDeposit && (
                                        <div>
                                          <span className="font-semibold text-slate-500 block">Proposed Deposit:</span>
                                          <span className="text-emerald-700 font-bold">₹{pEdit.securityDeposit}</span>
                                          <span className="text-slate-400 text-[10px] block line-through">Live: ₹{prop.securityDeposit}</span>
                                        </div>
                                      )}
                                      {pEdit.locality && pEdit.locality !== prop.locality && (
                                        <div>
                                          <span className="font-semibold text-slate-500 block">Proposed Locality:</span>
                                          <span className="text-emerald-700 font-bold">{pEdit.locality}</span>
                                          <span className="text-slate-400 text-[10px] block line-through">Live: {prop.locality}</span>
                                        </div>
                                      )}
                                      {pEdit.address && pEdit.address !== prop.address && (
                                        <div className="sm:col-span-2">
                                          <span className="font-semibold text-slate-500 block">Proposed Address:</span>
                                          <span className="text-emerald-700 font-medium">{pEdit.address}</span>
                                          <span className="text-slate-400 text-[10px] block line-through">Live: {prop.address}</span>
                                        </div>
                                      )}
                                      {pEdit.furnishing && pEdit.furnishing !== prop.furnishing && (
                                        <div>
                                          <span className="font-semibold text-slate-500 block">Proposed Furnishing:</span>
                                          <span className="text-emerald-700 font-medium">{pEdit.furnishing}</span>
                                          <span className="text-slate-400 text-[10px] block line-through">Live: {prop.furnishing}</span>
                                        </div>
                                      )}
                                      {pEdit.photos && pEdit.photos.length > 0 && (
                                        <div className="sm:col-span-2 md:col-span-3">
                                          <span className="font-semibold text-slate-500 block">Proposed Photos ({pEdit.photos.length}):</span>
                                          <div className="flex items-center gap-2 mt-1 overflow-x-auto py-1">
                                            {pEdit.photos.map((pUrl, idx) => (
                                              <img key={idx} src={pUrl} alt="Proposed" className="w-12 h-12 rounded-lg object-cover border border-amber-300 shrink-0" />
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Local Services Moderation View */}
                {adminModerationSection === 'services' && (
                  <div className="space-y-4">
                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setAdminServiceModerationFilter('pending')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminServiceModerationFilter === 'pending'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>New Submissions</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          adminServiceModerationFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {pendingServices.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminServiceModerationFilter('pending_edits')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminServiceModerationFilter === 'pending_edits'
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Pending Edits</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          adminServiceModerationFilter === 'pending_edits' ? 'bg-orange-800 text-white' : pendingEditServices.length > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {pendingEditServices.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminServiceModerationFilter('approved')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminServiceModerationFilter === 'approved'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approved & Public</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          adminServiceModerationFilter === 'approved' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {approvedServices.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminServiceModerationFilter('rejected')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminServiceModerationFilter === 'rejected'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rejected</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          adminServiceModerationFilter === 'rejected' ? 'bg-rose-800 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {rejectedServices.length}
                        </span>
                      </button>
                    </div>

                    {(() => {
                      const displayedServices = adminServiceModerationFilter === 'pending'
                        ? pendingServices
                        : adminServiceModerationFilter === 'pending_edits'
                          ? pendingEditServices
                          : adminServiceModerationFilter === 'approved'
                            ? approvedServices
                            : rejectedServices;

                      if (displayedServices.length === 0) {
                        return (
                          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-800">
                              {adminServiceModerationFilter === 'pending'
                                ? 'No pending services awaiting verification.'
                                : adminServiceModerationFilter === 'pending_edits'
                                  ? 'No proposed service edits awaiting reapproval.'
                                  : adminServiceModerationFilter === 'approved'
                                    ? 'No approved services yet.'
                                    : 'No rejected services.'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              All service listings in Cloud Firestore are synchronized in real-time.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {displayedServices.map(srv => {
                            const catMeta = SERVICE_CATEGORIES.find(c => c.id === srv.category);
                            const isEditReview = adminServiceModerationFilter === 'pending_edits';
                            const sEdit = srv.pendingEdit;

                            return (
                              <div key={srv.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                  <div className="flex items-start gap-3.5">
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 mt-0.5">
                                      <img 
                                        src={(sEdit?.photos && sEdit.photos[0]) || srv.photos[0] || (srv.category === 'MESS_TIFFIN' ? '/hero_tiffin_mess.jpg' : '/hero_gondia_stays.jpg')} 
                                        alt={srv.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.src = '/hero_gondia_stays.jpg'; }}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                          isApproved(srv.status)
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : isPending(srv.status)
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-rose-100 text-rose-800'
                                        }`}>
                                          {isApproved(srv.status) ? 'Approved • Publicly Live' : isPending(srv.status) ? 'Pending Approval' : 'Rejected'}
                                        </span>
                                        {srv.hasPendingEdit && (
                                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1">
                                            <Pencil className="w-3 h-3 text-orange-700" />
                                            <span>Proposed Edit Awaiting Reapproval</span>
                                          </span>
                                        )}
                                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                          {catMeta?.label || srv.category}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500">{srv.locality || 'Gondia'}</span>
                                      </div>
                                      <h4 className="text-sm font-bold text-slate-900">{srv.title}</h4>
                                      <p className="text-xs text-slate-500 line-clamp-1">{srv.description}</p>
                                      <div className="text-xs text-slate-600 font-medium pt-0.5">
                                        Provider: <span className="font-bold text-slate-800">{srv.providerName}</span> ({formatDisplayPhone(srv.phone)}) • Charges: <span className="font-extrabold text-blue-700">{srv.charges}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 flex-wrap self-end md:self-auto">
                                    {isEditReview ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleModerateServiceEdit(srv.id, true)}
                                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                          title="Approve proposed service edits and publish live"
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                          <span>Approve Edits</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleModerateServiceEdit(srv.id, false)}
                                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                          title="Reject proposed edits and discard without affecting live listing"
                                        >
                                          <XCircle className="w-4 h-4" />
                                          <span>Reject Edits</span>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {adminServiceModerationFilter !== 'approved' && (
                                          <button
                                            type="button"
                                            onClick={() => moderateService(srv.id, true)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                            title="Approve service and publish live"
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Approve</span>
                                          </button>
                                        )}

                                        {adminServiceModerationFilter !== 'rejected' && (
                                          <button
                                            type="button"
                                            onClick={() => moderateService(srv.id, false)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                            title="Reject service listing"
                                          >
                                            <XCircle className="w-4 h-4" />
                                            <span>Reject</span>
                                          </button>
                                        )}
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setServiceToEdit(srv);
                                        setIsAddServiceModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                      title="Admin Direct Edit service details"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Permanently delete "${srv.title}" from Cloud Firestore?`)) {
                                          deleteService(srv.id);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                                      title="Delete service"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Proposed Changes Diff / Comparison Box */}
                                {sEdit && (
                                  <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-2 text-xs">
                                    <div className="flex items-center justify-between gap-2 border-b border-amber-200/70 pb-1.5">
                                      <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                                        <Pencil className="w-3.5 h-3.5 text-amber-700" />
                                        <span>Proposed Changes by Service Provider (Pending Reapproval)</span>
                                      </span>
                                      {!isEditReview && (
                                        <button
                                          type="button"
                                          onClick={() => setAdminServiceModerationFilter('pending_edits')}
                                          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                                        >
                                          Review in Pending Edits tab →
                                        </button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-700 pt-1">
                                      {sEdit.title && sEdit.title !== srv.title && (
                                        <div>
                                          <span className="font-semibold text-slate-500 block">Proposed Title:</span>
                                          <span className="text-emerald-700 font-bold">{sEdit.title}</span>
                                          <span className="text-slate-400 text-[10px] block line-through">Live: {srv.title}</span>
                                        </div>
                                      )}
                                      {sEdit.charges && sEdit.charges !== srv.charges && (
                                        <div>
                                          <span className="font-semibold text-slate-500 block">Proposed Charges:</span>
                                          <span className="text-emerald-700 font-extrabold">{sEdit.charges}</span>
                                          <span className="text-slate-400 text-[10px] block line-through">Live: {srv.charges}</span>
                                        </div>
                                      )}
                                      {sEdit.locality && sEdit.locality !== srv.locality && (
                                        <div>
                                          <span className="font-semibold text-slate-500 block">Proposed Locality:</span>
                                          <span className="text-emerald-700 font-bold">{sEdit.locality}</span>
                                          <span className="text-slate-400 text-[10px] block line-through">Live: {srv.locality || 'Gondia'}</span>
                                        </div>
                                      )}
                                      {sEdit.description && sEdit.description !== srv.description && (
                                        <div className="sm:col-span-2">
                                          <span className="font-semibold text-slate-500 block">Proposed Description:</span>
                                          <span className="text-emerald-700 font-medium">{sEdit.description}</span>
                                        </div>
                                      )}
                                      {sEdit.serviceAreas && sEdit.serviceAreas.length > 0 && (
                                        <div className="sm:col-span-2">
                                          <span className="font-semibold text-slate-500 block">Proposed Service Areas:</span>
                                          <span className="text-emerald-700 font-medium">{sEdit.serviceAreas.join(', ')}</span>
                                        </div>
                                      )}
                                      {sEdit.specialties && sEdit.specialties.length > 0 && (
                                        <div className="sm:col-span-2">
                                          <span className="font-semibold text-slate-500 block">Proposed Specialties:</span>
                                          <span className="text-emerald-700 font-medium">{sEdit.specialties.join(' • ')}</span>
                                        </div>
                                      )}
                                      {sEdit.photos && sEdit.photos.length > 0 && (
                                        <div className="sm:col-span-2">
                                          <span className="font-semibold text-slate-500 block">Proposed Photos ({sEdit.photos.length}):</span>
                                          <div className="flex items-center gap-2 mt-1 overflow-x-auto py-1">
                                            {sEdit.photos.map((pUrl, idx) => (
                                              <img key={idx} src={pUrl} alt="Proposed" className="w-12 h-12 rounded-lg object-cover border border-amber-300 shrink-0" />
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
          </div>
        )}

        {/* ===================== DETAIL VIEW TAB ===================== */}
        {activeTab === 'detail' && selectedProperty && (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Header row with Back and Owner/Admin Edit & Delete buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => goBack()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Listings in Gondia
              </button>

              {(isAdminAuthenticated || isPropertyOwner(selectedProperty)) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(selectedProperty, myListingTokens[selectedProperty.id])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-blue-200"
                    title="Edit listing details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Listing</span>
                  </button>

                  <button
                    onClick={() => {
                      setDeleteConfirmState({
                        isOpen: true,
                        itemType: 'property',
                        itemTitle: selectedProperty.title,
                        onConfirm: () => {
                          deleteProperty(selectedProperty.id);
                          setDeleteConfirmState(prev => ({ ...prev, isOpen: false }));
                          navigateTo('explore');
                        }
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-rose-200"
                    title="Delete listing"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Main Detail Card */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md">
              
              {/* Photo Hero with Multi-Photo Gallery Support */}
              <div className="relative h-72 sm:h-96 w-full bg-slate-900 overflow-hidden">
                <img 
                  src={selectedProperty.photos[activeDetailPhotoIndex] || selectedProperty.photos[0] || '/hero_gondia_stays.jpg'} 
                  alt={selectedProperty.title} 
                  className="w-full h-full object-cover transition-all duration-200" 
                  onError={(e) => {
                    e.currentTarget.src = '/hero_gondia_stays.jpg';
                  }}
                />

                {/* Left/Right Navigation arrows for multiple photos */}
                {selectedProperty.photos && selectedProperty.photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveDetailPhotoIndex(prev => (prev > 0 ? prev - 1 : selectedProperty.photos.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-xs transition-colors shadow-lg cursor-pointer"
                      title="Previous Photo"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDetailPhotoIndex(prev => (prev < selectedProperty.photos.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-xs transition-colors shadow-lg cursor-pointer"
                      title="Next Photo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Photo Counter */}
                    <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{activeDetailPhotoIndex + 1} / {selectedProperty.photos.length}</span>
                    </div>
                  </>
                )}
                
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    {selectedProperty.propertyType}
                  </span>
                  <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    0% Brokerage
                  </span>
                  {selectedProperty.isFeatured && (
                    <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Featured
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast('Listing link copied to clipboard!');
                  }}
                  className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md transition-colors cursor-pointer"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Multi-Photo Thumbnails Strip */}
              {selectedProperty.photos && selectedProperty.photos.length > 1 && (
                <div className="bg-slate-100/90 px-4 py-3 flex gap-2.5 overflow-x-auto border-b border-slate-200">
                  {selectedProperty.photos.map((photoUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveDetailPhotoIndex(idx)}
                      className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        activeDetailPhotoIndex === idx 
                          ? 'border-blue-600 ring-2 ring-blue-400/40 scale-105 shadow-sm' 
                          : 'border-slate-300 opacity-60 hover:opacity-100 hover:border-slate-400'
                      }`}
                      title={`View photo ${idx + 1}`}
                    >
                      <img 
                        src={photoUrl} 
                        alt={`Thumbnail ${idx + 1}`} 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.currentTarget.src = '/hero_gondia_stays.jpg'; }}
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-0.5 left-0.5 right-0.5 bg-black/75 text-white text-[9px] font-bold text-center py-0.2 rounded">
                          Cover
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Detail Content */}
              <div className="p-6 sm:p-8 space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedProperty.locality}, Gondia</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      {selectedProperty.title}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">{selectedProperty.address}</p>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-2xl sm:text-3xl font-black text-blue-700">
                      ₹{selectedProperty.monthlyRent.toLocaleString('en-IN')}
                      <span className="text-xs font-medium text-slate-500"> /month</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Security Deposit: ₹{selectedProperty.securityDeposit.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Key Specs Grid (Requirement 3: Accommodation Specs) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <Bed className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="text-[11px] text-slate-500 block">Space</span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {selectedProperty.accommodationType === 'ROOM' 
                        ? `${selectedProperty.bedrooms} Separate Room${selectedProperty.bedrooms > 1 ? 's' : ''}`
                        : selectedProperty.bedrooms === 0 ? 'Single Room' : `${selectedProperty.bedrooms} BHK Flat`}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <Bath className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="text-[11px] text-slate-500 block">Washrooms</span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {selectedProperty.bathrooms} Dedicated
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <Sofa className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="text-[11px] text-slate-500 block">Furnishing</span>
                    <span className="text-xs font-extrabold text-slate-900 truncate block">
                      {selectedProperty.furnishing.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <Utensils className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="text-[11px] text-slate-500 block">Kitchen</span>
                    <span className="text-xs font-extrabold text-slate-900 truncate block">
                      {selectedProperty.kitchenAvailable === 'PRIVATE' 
                        ? 'Private Kitchen' 
                        : selectedProperty.kitchenAvailable === 'SHARED' 
                          ? 'Shared Kitchen' 
                          : 'No Kitchen'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <Building2 className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="text-[11px] text-slate-500 block">Living Hall</span>
                    <span className="text-xs font-extrabold text-slate-900 truncate block">
                      {selectedProperty.hallAvailable !== false ? 'Hall Included' : 'Rooms Only'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <Clock className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="text-[11px] text-slate-500 block">Available From</span>
                    <span className="text-xs font-extrabold text-slate-900 truncate block">
                      {selectedProperty.availableFrom}
                    </span>
                  </div>
                </div>

                {/* Suitable Tenants Badge */}
                {selectedProperty.suitableTenants && selectedProperty.suitableTenants.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs">
                    <span className="font-bold text-blue-900">Suitable For:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProperty.suitableTenants.map(st => (
                        <span key={st} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-800 text-[11px] font-bold rounded-lg shadow-2xs">
                          {st === 'ALL' ? 'All Tenants Welcome' : st === 'STUDENTS' ? 'Students' : st === 'WORKING_PROFESSIONALS' ? 'Working Professionals' : 'Families'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Amenities & Facilities</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedProperty.amenities.map(am => (
                      <div key={am} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{am}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Available / Occupied Toggle Banner for Owner and Admin */}
                {(isAdminAuthenticated || isPropertyOwner(selectedProperty)) && (
                  <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md space-y-3 border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full ${isOccupied(selectedProperty.occupancyStatus) ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                              {isAdminAuthenticated ? 'Admin Occupancy Control' : 'Owner Occupancy Control'}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isOccupied(selectedProperty.occupancyStatus)
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              {isOccupied(selectedProperty.occupancyStatus) ? 'Occupied (Hidden from Rentals)' : 'Available (Live in Rentals)'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-1">
                            {isOccupied(selectedProperty.occupancyStatus)
                              ? 'Property is Occupied & Hidden from Public Rentals'
                              : 'Property is Available & Visible in Public Rentals'}
                          </h4>
                        </div>
                      </div>

                      {/* Segmented Toggle Control */}
                      <div className="flex items-center bg-slate-800 p-1 rounded-2xl border border-slate-700/80 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={async () => {
                            if (isOccupied(selectedProperty.occupancyStatus)) {
                              await updatePropertyOccupancy(selectedProperty.id, 'AVAILABLE', myListingTokens[selectedProperty.id]);
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            !isOccupied(selectedProperty.occupancyStatus)
                              ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Mark Available (visible in public rentals)"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Available</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!isOccupied(selectedProperty.occupancyStatus)) {
                              await updatePropertyOccupancy(selectedProperty.id, 'OCCUPIED', myListingTokens[selectedProperty.id]);
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isOccupied(selectedProperty.occupancyStatus)
                              ? 'bg-rose-600 text-white shadow-md font-extrabold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Mark Occupied (hidden from public rentals)"
                        >
                          <Home className="w-4 h-4" />
                          <span>Occupied</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Toggle between Available and Occupied. Changes take effect instantly without reapproval. Occupied properties are automatically hidden from public Rentals; Available properties reappear immediately.
                    </p>
                  </div>
                )}

                {/* Rental Occupancy Management & Landlord Contact Privacy */}
                {isOccupied(selectedProperty.occupancyStatus) ? (
                  <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 sm:p-7 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                          <Home className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              OCCUPIED / RENTED
                            </span>
                            <span className="text-xs text-rose-800 font-bold">In Gondia</span>
                          </div>
                          <h4 className="text-base font-extrabold text-slate-900 mt-1">
                            This Property Is Currently Rented / Occupied
                          </h4>
                        </div>
                      </div>

                      {/* Owner or Admin Can Mark Available Again */}
                      {(isPropertyOwner(selectedProperty) || isAdminAuthenticated) && (
                        <button
                          type="button"
                          onClick={async () => {
                            await updatePropertyOccupancy(selectedProperty.id, 'AVAILABLE', myListingTokens[selectedProperty.id]);
                          }}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark as Available Again</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-rose-900 leading-relaxed bg-white/70 p-3.5 rounded-xl border border-rose-200/60">
                      <strong>Privacy Protection Active:</strong> As per GondiaStay rental management rules, landlord phone number and direct WhatsApp buttons are hidden while this property is occupied. Rental enquiries are temporarily paused until the landlord marks it available again.
                    </p>

                    <div className="pt-1">
                      <button
                        onClick={() => openGoogleMaps(selectedProperty.latitude, selectedProperty.longitude, selectedProperty.title)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>View Gondia Location on Map</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Available Property: Direct Landlord Contact Section */
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 sm:p-7 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                          {(selectedProperty.ownerName?.trim() || 'L')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Verified Landlord
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-0.5">{selectedProperty.ownerName || 'Landlord'}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                            {selectedProperty.ownerPhone && (
                              <span>Phone: <strong className="text-slate-900">{formatDisplayPhone(selectedProperty.ownerPhone)}</strong></span>
                            )}
                            {(selectedProperty.ownerWhatsappNumber || selectedProperty.ownerPhone) && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-emerald-700 font-bold">WhatsApp: {formatDisplayPhone(selectedProperty.ownerWhatsappNumber || selectedProperty.ownerPhone)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Owner or Admin Can Mark as Occupied */}
                      {(isPropertyOwner(selectedProperty) || isAdminAuthenticated) && (
                        <button
                          type="button"
                          onClick={async () => {
                            await updatePropertyOccupancy(selectedProperty.id, 'OCCUPIED', myListingTokens[selectedProperty.id]);
                          }}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Home className="w-3.5 h-3.5" />
                          <span>Mark as Rented</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Zero Brokerage guaranteed. Chat directly with the landlord on WhatsApp or call to schedule an in-person room visit in Gondia.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <button
                        onClick={() => openWhatsApp(
                          selectedProperty.ownerWhatsappNumber || selectedProperty.ownerPhone, 
                          `Hello ${selectedProperty.ownerName || 'Landlord'}, I am interested in your listing '${selectedProperty.title}' in ${selectedProperty.locality}, Gondia on GondiaStay. Is it available for rent?`
                        )}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 fill-current" />
                        <span>WhatsApp Chat</span>
                      </button>

                      <button
                        onClick={() => dialPhone(selectedProperty.ownerPhone)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Landlord</span>
                      </button>

                      <button
                        onClick={() => openGoogleMaps(selectedProperty.latitude, selectedProperty.longitude, selectedProperty.title)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Get Directions</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Filter Modal */}
      {showFilterModal && (
        <FilterModal onClose={() => setShowFilterModal(false)} />
      )}

      {/* Cloud Firestore Connection & Settings Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        propertiesCount={properties.length}
        initialTab={firebaseModalTab}
      />

      {/* Zero-Login Submission Private Edit Link Modal */}
      {showPrivateLinkModal && newlyCreatedLinkInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Listing Submitted for Review!
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Zero-login submission • Private Edit Key Generated
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivateLinkModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-800">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Save Your Private Edit Link!</span>
              </div>
              <p className="leading-relaxed text-[11px] text-amber-800">
                Because no account, password, or OTP was required to submit, this private link is your <strong>secret key</strong> to update your listing details, photos, and rental occupancy in the future.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Your Unguessable Private Edit Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newlyCreatedLinkInfo.editUrl}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newlyCreatedLinkInfo.editUrl);
                    setLinkCopied(true);
                    showToast('Private edit link copied to clipboard!');
                    setTimeout(() => setLinkCopied(false), 2500);
                  }}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    linkCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newlyCreatedLinkInfo.editUrl);
                  setShowPrivateLinkModal(false);
                  showToast('Private edit link saved. Keep it safe!');
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer font-bold"
              >
                Copy Link & Done
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Add / Edit Property Modal */}
      <AddPropertyModal
        isOpen={isAddPropertyModalOpen}
        onClose={() => {
          setIsAddPropertyModalOpen(false);
          setEditingProperty(null);
        }}
        propertyToEdit={editingProperty}
        onSaveProperty={saveProperty}
        isAdmin={isAdminAuthenticated}
        editToken={currentEditToken}
        currentOwner={currentOwner}
        onSuccessToast={showToast}
      />

      {/* Add / Register Local Service Modal */}
      <AddServiceModal
        isOpen={isAddServiceModalOpen}
        onClose={() => {
          setIsAddServiceModalOpen(false);
          setServiceToEdit(null);
        }}
        isAdmin={isAdminAuthenticated}
        serviceToEdit={serviceToEdit}
        onServiceAdded={(newSrv: ServiceItem) => {
          showToast(`Service "${newSrv.title}" registered successfully!`);
        }}
        onServiceUpdated={(updated: ServiceItem) => {
          showToast(`Service "${updated.title}" successfully updated!`);
        }}
      />

      {/* Delete Confirmation Modal for Properties and Services */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmState.isOpen}
        itemType={deleteConfirmState.itemType}
        itemTitle={deleteConfirmState.itemTitle}
        onConfirm={deleteConfirmState.onConfirm}
        onCancel={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Temporary Property Deletion UNDO Option (5–10 seconds) */}
      {pendingPropertyDeletion && (
        <div
          role="status"
          aria-live="polite"
          data-testid="property-undo-banner"
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 flex items-center justify-between gap-3.5 border border-slate-700 min-w-[280px] max-w-[92vw] sm:max-w-md"
        >
          <div className="flex items-center gap-2.5 truncate">
            <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              Property deleted – UNDO
            </span>
            <span className="text-[11px] text-slate-400 font-normal shrink-0">
              ({pendingPropertyDeletion.secondsRemaining}s)
            </span>
          </div>

          <button
            type="button"
            onClick={undoPropertyDeletion}
            data-testid="undo-delete-btn"
            className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1"
          >
            UNDO
          </button>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-3 flex items-center gap-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
