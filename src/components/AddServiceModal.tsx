import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Image as ImageIcon, 
  Trash2, 
  Sparkles, 
  Utensils, 
  CreditCard,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
  Pencil,
  XCircle,
  Info
} from 'lucide-react';
import { 
  ServiceCategory, 
  SERVICE_CATEGORIES, 
  ServiceItem, 
  GONDIA_LOCALITIES 
} from '../types';
import { uploadServicePhoto, uploadMultipleServicePhotos } from '../firebase/storageService';
import { saveServiceToFirestore, updateServiceInFirestore } from '../firebase/servicesService';
import { useApp } from '../context/AppContext';
import { isValidIndianMobileNumber } from '../utils/contact';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceAdded?: (service: ServiceItem) => void;
  onServiceUpdated?: (service: ServiceItem) => void;
  serviceToEdit?: ServiceItem | null;
  isAdmin?: boolean;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  isOpen,
  onClose,
  onServiceAdded,
  onServiceUpdated,
  serviceToEdit = null,
  isAdmin = false
}) => {
  const { saveService, updateService, saveServiceId } = useApp();

  const [category, setCategory] = useState<ServiceCategory>('MESS_TIFFIN');
  const [title, setTitle] = useState('');
  const [providerName, setProviderName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [charges, setCharges] = useState('');
  const [chargeUnit, setChargeUnit] = useState('month');
  const [description, setDescription] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['All Gondia']);
  const [locality, setLocality] = useState('Civil Lines');
  const [address, setAddress] = useState('');
  const [timing, setTiming] = useState('8:00 AM - 8:00 PM');
  const [experienceYears, setExperienceYears] = useState(5);
  const [specialties, setSpecialties] = useState('');
  const [adminStatus, setAdminStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Photos state - declared before useEffect
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [businessCardPhoto, setBusinessCardPhoto] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTarget, setUploadTarget] = useState<'photos' | 'card'>('photos');
  const [previewModalPhoto, setPreviewModalPhoto] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const prevOpenRef = useRef(false);
  const activeServiceIdRef = useRef<string | null>(null);

  // Populate or reset form fields when serviceToEdit changes or modal opens
  useEffect(() => {
    const justOpened = isOpen && !prevOpenRef.current;
    const isDifferentService = (serviceToEdit?.id || null) !== activeServiceIdRef.current;
    prevOpenRef.current = isOpen;

    if (isOpen && (justOpened || isDifferentService)) {
      activeServiceIdRef.current = serviceToEdit?.id || null;
      if (serviceToEdit) {
        // Load pending edit draft if exists and not admin, else current live listing
        const source = (serviceToEdit.hasPendingEdit && serviceToEdit.pendingEdit && !isAdmin)
          ? { ...serviceToEdit, ...serviceToEdit.pendingEdit }
          : serviceToEdit;

        setCategory(source.category || 'MESS_TIFFIN');
        setTitle(source.title || '');
        setProviderName(source.providerName || source.ownerName || '');
        setPhone(source.phone || source.ownerPhone || '');
        setWhatsappNumber(source.whatsappNumber || source.ownerWhatsappNumber || '');
        setCharges(source.charges || '');
        setChargeUnit(source.chargeUnit || 'service');
        setDescription(source.description || '');
        setSelectedAreas(source.serviceAreas && source.serviceAreas.length > 0 ? source.serviceAreas : ['All Gondia']);
        setLocality(source.locality || 'Civil Lines');
        setAddress(source.address || '');
        setTiming(source.timing || '8:00 AM - 8:00 PM');
        setExperienceYears(source.experienceYears ?? 5);
        setSpecialties(Array.isArray(source.specialties) ? source.specialties.join(', ') : '');

        // Preserve all existing photos and visiting card safely
        const rawPhotos: string[] = Array.isArray(source.photos)
          ? source.photos.filter((p: any) => typeof p === 'string' && p.trim().length > 0)
          : [];

        let initialCard = (typeof source.businessCardPhoto === 'string' && source.businessCardPhoto.trim().length > 0)
          ? source.businessCardPhoto.trim()
          : '';

        // If no explicit businessCardPhoto, check if photos array has a secondary photo that served as visiting card
        if (!initialCard && rawPhotos.length > 1) {
          initialCard = rawPhotos[1];
        }

        const setupPhotos = initialCard
          ? rawPhotos.filter(p => p !== initialCard)
          : rawPhotos;

        setUploadedPhotos(setupPhotos);
        setBusinessCardPhoto(initialCard);
        setAdminStatus((source.status as any) || 'approved');
        setFormError(null);
        setSubmissionSuccess(false);
      } else {
        setCategory('MESS_TIFFIN');
        setTitle('');
        setProviderName('');
        setPhone('');
        setWhatsappNumber('');
        setCharges('');
        setChargeUnit('month');
        setDescription('');
        setSelectedAreas(['All Gondia']);
        setLocality('Civil Lines');
        setAddress('');
        setTiming('8:00 AM - 8:00 PM');
        setExperienceYears(5);
        setSpecialties('');
        setUploadedPhotos([]);
        setBusinessCardPhoto('');
        setAdminStatus('pending');
        setFormError(null);
        setSubmissionSuccess(false);
      }
    } else if (!isOpen) {
      activeServiceIdRef.current = null;
    }
  }, [serviceToEdit, isOpen, isAdmin]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentCategoryMeta = SERVICE_CATEGORIES.find(c => c.id === category) || SERVICE_CATEGORIES[0];

  const handleAreaToggle = (area: string) => {
    if (area === 'All Gondia') {
      if (selectedAreas.includes('All Gondia')) {
        setSelectedAreas([]);
      } else {
        setSelectedAreas(['All Gondia']);
      }
      return;
    }

    const withoutAll = selectedAreas.filter(a => a !== 'All Gondia');
    if (withoutAll.includes(area)) {
      setSelectedAreas(withoutAll.filter(a => a !== area));
    } else {
      setSelectedAreas([...withoutAll, area]);
    }
  };

  const handlePhotoUpload = async (file: File, isCard: boolean = false) => {
    try {
      setIsUploadingPhoto(true);
      setUploadTarget(isCard ? 'card' : 'photos');
      setUploadProgress(15);

      const url = await uploadServicePhoto(file, (percent) => {
        setUploadProgress(percent);
      });

      if (isCard) {
        setBusinessCardPhoto(url);
      } else {
        setUploadedPhotos(prev => [...prev, url]);
      }
      setFormError(null);
    } catch (err: any) {
      console.error('[GondiaStay] Photo upload failed:', err);
      setFormError(err?.message || 'Failed to upload photo to Cloudinary. Please check your network connection.');
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  const handleMultiplePhotosUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    try {
      setIsUploadingPhoto(true);
      setUploadTarget('photos');
      setUploadProgress(10);

      const urls = await uploadMultipleServicePhotos(files, (info) => {
        setUploadProgress(info.percent);
      });

      setUploadedPhotos(prev => {
        const combined = [...prev, ...urls];
        return Array.from(new Set(combined));
      });
      setFormError(null);
    } catch (err: any) {
      console.error('[GondiaStay] Multiple photo upload failed:', err);
      setFormError(err?.message || 'Failed to upload photos to Cloudinary.');
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations
    if (!title.trim()) {
      setFormError('Please enter a service or business name.');
      return;
    }
    if (!providerName.trim()) {
      setFormError('Please enter provider/contact person name.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter a calling phone number.');
      return;
    }
    if (!isValidIndianMobileNumber(phone)) {
      setFormError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 for calling phone.');
      return;
    }
    if (whatsappNumber.trim() && !isValidIndianMobileNumber(whatsappNumber)) {
      setFormError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 for WhatsApp number.');
      return;
    }
    if (!charges.trim()) {
      setFormError('Please specify standard charges or rates.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please provide a brief description of the services offered.');
      return;
    }
    if (selectedAreas.length === 0) {
      setFormError('Please select at least one locality or "All Gondia" in service areas.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Split specialties by comma
      const specs = specialties
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Extract numeric price if found
      const match = charges.match(/(\d[\d,]*)/);
      const priceNumeric = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;

      const allPhotos = [...uploadedPhotos];
      if (businessCardPhoto && !allPhotos.includes(businessCardPhoto)) {
        allPhotos.push(businessCardPhoto);
      }

      const formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;
      const formattedWhatsapp = whatsappNumber.trim() ? (
        whatsappNumber.replace(/\D/g, '').startsWith('91') 
          ? `+${whatsappNumber.replace(/\D/g, '')}` 
          : `+91${whatsappNumber.replace(/\D/g, '').slice(-10)}`
      ) : formattedPhone;

      if (serviceToEdit) {
        const updatedServiceData: Partial<ServiceItem> = {
          title: title.trim(),
          category,
          providerName: providerName.trim(),
          ownerName: providerName.trim(),
          phone: formattedPhone,
          ownerPhone: formattedPhone,
          whatsappNumber: formattedWhatsapp,
          ownerWhatsappNumber: formattedWhatsapp,
          charges: charges.trim(),
          chargeUnit,
          priceNumeric,
          description: description.trim(),
          serviceAreas: selectedAreas,
          locality,
          city: 'Gondia',
          address: address.trim() || `${locality}, Gondia`,
          photos: allPhotos,
          businessCardPhoto,
          timing: timing.trim(),
          experienceYears,
          specialties: specs,
          ...(isAdmin ? { status: adminStatus } : {})
        };

        const result = await updateService(serviceToEdit.id, updatedServiceData);
        if (result.success) {
          saveServiceId(serviceToEdit.id);
          const isApprovedLive = serviceToEdit.status === 'approved' && !isAdmin;
          const updatedFull: ServiceItem = {
            ...serviceToEdit,
            ...(isApprovedLive ? {
              hasPendingEdit: true,
              pendingEdit: {
                ...updatedServiceData,
                submittedAt: Date.now()
              }
            } : {
              ...updatedServiceData,
              status: (isAdmin ? adminStatus : serviceToEdit.status) as any,
              hasPendingEdit: false,
              pendingEdit: undefined
            })
          };
          if (onServiceUpdated) {
            onServiceUpdated(updatedFull);
          }
          onClose();
          return;
        } else {
          setFormError(result.error || 'Failed to update service in Firestore.');
          return;
        }
      }

      // Default status MUST be 'pending' for zero-friction submission
      const newService: Partial<ServiceItem> = {
        title: title.trim(),
        category,
        providerName: providerName.trim(),
        ownerName: providerName.trim(),
        phone: formattedPhone,
        ownerPhone: formattedPhone,
        whatsappNumber: formattedWhatsapp,
        ownerWhatsappNumber: formattedWhatsapp,
        charges: charges.trim(),
        chargeUnit,
        priceNumeric,
        description: description.trim(),
        serviceAreas: selectedAreas,
        locality,
        city: 'Gondia',
        address: address.trim() || `${locality}, Gondia`,
        photos: allPhotos,
        businessCardPhoto,
        timing: timing.trim(),
        experienceYears,
        status: isAdmin ? adminStatus : 'pending',
        rating: 5.0,
        reviewCount: 1,
        specialties: specs
      };

      const result = await saveService(newService);

      if (result.success) {
        saveServiceId(result.serviceId);
        setSubmissionSuccess(true);
        if (onServiceAdded) {
          onServiceAdded({
            ...newService,
            id: result.serviceId,
            status: (isAdmin ? adminStatus : 'pending') as any
          } as ServiceItem);
        }
      } else {
        setFormError(result.error || 'Failed to save service. Please try again.');
      }
    } catch (err: any) {
      console.error('[GondiaStay] Service submission error:', err);
      setFormError(err?.message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-8 overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                0% Brokerage • Free Listing
              </span>
              {isAdmin && (
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {serviceToEdit ? 'Admin Edit Console' : 'Admin Direct Add'}
                </span>
              )}
              {serviceToEdit && (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                  serviceToEdit.status === 'approved' 
                    ? 'bg-emerald-500 text-white' 
                    : serviceToEdit.status === 'rejected'
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-400 text-slate-950'
                }`}>
                  Status: {serviceToEdit.status || 'pending'}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              {serviceToEdit ? `Edit: ${serviceToEdit.title}` : 'Register Your Service in Gondia'}
            </h2>
            <p className="text-xs text-blue-100 mt-0.5">
              {serviceToEdit
                ? 'Update all provider, contact, charge, and coverage details in Firestore.'
                : 'Connect directly with students, tenants, and families looking for services across Gondia.'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {submissionSuccess ? (
            /* Success confirmation view */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-xl font-black text-slate-900">
                  {isAdmin ? 'Service Listing Published!' : 'Service Submitted Successfully!'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isAdmin ? (
                    'Your service has been approved and is now live publicly for all visitors in Gondia.'
                  ) : (
                    'Your service listing has been received with status Pending. It will appear publicly on GondiaStay as soon as verified by our administrator.'
                  )}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto text-left space-y-1 text-xs">
                <p className="font-bold text-slate-800">{title}</p>
                <p className="text-slate-600">{currentCategoryMeta.label} • {providerName}</p>
                <p className="text-blue-600 font-semibold">{phone}</p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Close & View Home Services
                </button>
              </div>
            </div>
          ) : (
            /* Form view */
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Provider Reapproval Notice for Approved Listings */}
              {serviceToEdit && !isAdmin && serviceToEdit.status === 'approved' && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold block mb-0.5">Editing Live Approved Listing</strong>
                    <span className="leading-relaxed">
                      Your current live service listing remains fully active and visible to customers in Gondia. Your proposed changes will be submitted for admin verification and will replace the live data once approved.
                    </span>
                  </div>
                </div>
              )}

              {/* Admin Moderation Status Selector */}
              {isAdmin && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Moderation Status in Firestore</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Controls public live visibility
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdminStatus('pending')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        adminStatus === 'pending'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminStatus('approved')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        adminStatus === 'approved'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approved (Live)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminStatus('rejected')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        adminStatus === 'rejected'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-rose-50'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rejected</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Category Picker */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Select Service Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SERVICE_CATEGORIES.map(cat => {
                    const isSelected = category === cat.id;
                    const isHighlighted = cat.isMainHighlighted;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategory(cat.id);
                          if (!charges) {
                            setCharges(cat.exampleCharge);
                          }
                          setChargeUnit(cat.defaultUnit);
                        }}
                        className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer relative ${
                          isSelected
                            ? isHighlighted
                              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400 text-amber-950 font-bold'
                              : 'bg-blue-50 border-blue-600 ring-2 ring-blue-500 text-blue-950 font-bold'
                            : isHighlighted
                              ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400 text-slate-800'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        {isHighlighted && (
                          <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-200/80 px-1 py-0.2 rounded mb-1 self-start">
                            Main Service
                          </span>
                        )}
                        <span className="text-xs font-bold leading-tight mt-0.5">
                          {cat.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Provider Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Business / Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Annapurna Mess & Tiffin"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Provider / Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="e.g. Sau. Meena Joshi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Phone & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Calling Phone Number *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                      phone && !isValidIndianMobileNumber(phone)
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-200'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600'
                    } rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-1 outline-none`}
                  />
                  {phone && !isValidIndianMobileNumber(phone) && (
                    <p className="text-[10px] text-rose-600 font-semibold">
                      Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Number (Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="Leave empty if same as calling phone"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                      whatsappNumber && !isValidIndianMobileNumber(whatsappNumber)
                        ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-200'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600'
                    } rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-1 outline-none`}
                  />
                  {whatsappNumber && !isValidIndianMobileNumber(whatsappNumber) && (
                    <p className="text-[10px] text-rose-600 font-semibold">
                      Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9
                    </p>
                  )}
                </div>
              </div>

              {/* Charges & Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Charges / Price Rate *
                  </label>
                  <input
                    type="text"
                    required
                    value={charges}
                    onChange={(e) => setCharges(e.target.value)}
                    placeholder={`e.g. ${currentCategoryMeta.exampleCharge}`}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Operating Hours / Timing</span>
                  </label>
                  <input
                    type="text"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    placeholder="e.g. 8:00 AM - 8:00 PM or 24x7"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Service Areas in Gondia */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Service Areas in Gondia *</span>
                  <span className="text-[11px] font-normal text-slate-400">Select localities served</span>
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-1.5">
                  {GONDIA_LOCALITIES.map(loc => {
                    const isChecked = selectedAreas.includes(loc) || (selectedAreas.includes('All Gondia') && loc === 'All');
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => handleAreaToggle(loc === 'All' ? 'All Gondia' : loc)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {loc === 'All' ? 'All Gondia' : loc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Base Locality & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Primary Locality / Base *
                  </label>
                  <select
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                  >
                    {GONDIA_LOCALITIES.filter(l => l !== 'All').map(loc => (
                      <option key={loc} value={loc}>{loc}, Gondia</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Shop / Office / Landmark Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near Station Road, Gondia"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Service Description & Details *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Describe your ${currentCategoryMeta.shortLabel} offerings, menu (if mess), experience, packages, and what makes your service trusted...`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
              </div>

              {/* Specialties / Highlights */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Specialties / Key Highlights (Comma separated)
                </label>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  placeholder="e.g. Doorstep Delivery, FSSAI Certified, 24x7 Emergency, Police Verified"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              {/* Uploads: Business / Visiting Card & Photos via Cloudinary */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Upload Business Card & Photos</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Cloudinary CDN Storage</span>
                </div>

                {/* Visiting Card Upload Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {businessCardPhoto ? (
                      <div className="relative w-20 h-14 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-slate-100 shadow-2xs group">
                        <img 
                          src={businessCardPhoto} 
                          alt="Visiting Card" 
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setPreviewModalPhoto(businessCardPhoto)}
                          title="Click to view full photo"
                        />
                        {/* Explicit Delete Button only - does NOT trigger when image is tapped */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBusinessCardPhoto('');
                          }}
                          className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-xs transition-transform active:scale-90 cursor-pointer"
                          title="Remove Visiting Card"
                          aria-label="Remove Visiting Card"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                        <CreditCard className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">Visiting / Business Card Photo</p>
                      <p className="text-[11px] text-slate-500">
                        {businessCardPhoto ? 'Card preserved (tap to inspect, red button to remove)' : 'Upload paper card for higher customer trust'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <input 
                      type="file"
                      ref={cardInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file, true);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => cardInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{businessCardPhoto ? 'Replace Card' : 'Upload Card'}</span>
                    </button>
                    {businessCardPhoto && (
                      <button
                        type="button"
                        onClick={() => setBusinessCardPhoto('')}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        title="Remove Card"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Additional Photos Upload Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Service / Work / Setup Photos</p>
                      <p className="text-[11px] text-slate-500">Add shop, food thali, equipment, or team photos</p>
                    </div>

                    <input 
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const fileList = e.target.files;
                        if (fileList && fileList.length > 0) {
                          const files = Array.from(fileList);
                          if (files.length === 1) {
                            handlePhotoUpload(files[0], false);
                          } else {
                            handleMultiplePhotosUpload(files);
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploadingPhoto || uploadedPhotos.length >= 8}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{uploadedPhotos.length > 0 ? `Add More (${uploadedPhotos.length}/8)` : 'Add Photos'}</span>
                    </button>
                  </div>

                  {/* Upload Progress Indicator */}
                  {isUploadingPhoto && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-blue-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          Uploading {uploadTarget === 'card' ? 'visiting card' : 'photo'} to Cloudinary...
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-200" 
                          style={{ width: `${Math.max(uploadProgress, 10)}%` }} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Photo Thumbnails */}
                  {uploadedPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {uploadedPhotos.map((photoUrl, idx) => (
                        <div key={idx} className="relative w-18 h-18 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs group">
                          <img 
                            src={photoUrl} 
                            alt={`Photo ${idx + 1}`} 
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                            onClick={() => setPreviewModalPhoto(photoUrl)}
                            title="Click to view full photo"
                          />
                          {/* Explicit Delete Button only - does NOT trigger when image is tapped */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedPhotos(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-xs transition-transform active:scale-90 cursor-pointer"
                            title="Remove photo"
                            aria-label="Remove photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Error Notice */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Info Disclaimer */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Zero-Commission & Admin Moderation:</strong> All listings in GondiaStay default to Pending and appear publicly only after verification by our administrator to prevent spam and protect residents.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingPhoto}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving Service...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>
                        {isAdmin
                          ? (serviceToEdit ? 'Publish Changes Directly' : 'Publish Service Listing')
                          : (serviceToEdit && serviceToEdit.status === 'approved'
                              ? 'Submit Changes for Reapproval'
                              : 'Submit for Verification')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Enlarged Photo Preview Lightbox */}
      {previewModalPhoto && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewModalPhoto(null)}
        >
          <div 
            className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl p-2" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewModalPhoto(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors cursor-pointer z-10"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewModalPhoto} 
              alt="Enlarged Preview" 
              className="max-h-[80vh] w-auto object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
