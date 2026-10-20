import React, { useState, useRef } from 'react';
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
  Plus
} from 'lucide-react';
import { 
  ServiceCategory, 
  SERVICE_CATEGORIES, 
  ServiceItem, 
  GONDIA_LOCALITIES 
} from '../types';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { saveServiceToFirestore } from '../firebase/servicesService';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceAdded?: (service: ServiceItem) => void;
  isAdmin?: boolean;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  isOpen,
  onClose,
  onServiceAdded,
  isAdmin = false
}) => {
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

  // Photos state
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [businessCardPhoto, setBusinessCardPhoto] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTarget, setUploadTarget] = useState<'photos' | 'card'>('photos');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

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

      const url = await uploadImageToCloudinary(file, (percent) => {
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
      setFormError(err?.message || 'Failed to upload photo. Please check your network connection.');
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
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit mobile phone number.');
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

      // Default status MUST be 'pending' for zero-friction submission
      const newService: Partial<ServiceItem> = {
        title: title.trim(),
        category,
        providerName: providerName.trim(),
        phone: cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`,
        whatsappNumber: whatsappNumber.trim() ? (
          whatsappNumber.replace(/\D/g, '').startsWith('91') 
            ? `+${whatsappNumber.replace(/\D/g, '')}` 
            : `+91${whatsappNumber.replace(/\D/g, '').slice(-10)}`
        ) : (cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`),
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
        status: isAdmin ? 'approved' : 'pending',
        rating: 5.0,
        reviewCount: 1,
        specialties: specs
      };

      const result = await saveServiceToFirestore(newService, isAdmin);

      if (result.success) {
        setSubmissionSuccess(true);
        if (onServiceAdded) {
          onServiceAdded({
            ...newService,
            id: result.serviceId,
            status: (isAdmin ? 'approved' : 'pending') as any
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
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                0% Brokerage • Free Listing
              </span>
              {isAdmin && (
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Admin Direct Add
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              Register Your Service in Gondia
            </h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Connect directly with students, tenants, and families looking for services across Gondia.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
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
                  Close & View Services
                </button>
              </div>
            </div>
          ) : (
            /* Form view */
            <form onSubmit={handleSubmit} className="space-y-5">
              
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  />
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  />
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
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {businessCardPhoto ? (
                      <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-slate-300 shrink-0">
                        <img 
                          src={businessCardPhoto} 
                          alt="Visiting Card" 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={() => setBusinessCardPhoto('')}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-10 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">Visiting / Business Card Photo</p>
                      <p className="text-[11px] text-slate-500">
                        {businessCardPhoto ? 'Card uploaded successfully' : 'Upload your paper card for higher customer trust'}
                      </p>
                    </div>
                  </div>

                  <div>
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
                      className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{businessCardPhoto ? 'Change Card' : 'Upload Card'}</span>
                    </button>
                  </div>
                </div>

                {/* Additional Photos Upload Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Service / Work / Setup Photos</p>
                      <p className="text-[11px] text-slate-500">Add shop, food thali, equipment, or team photos</p>
                    </div>

                    <input 
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file, false);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploadingPhoto || uploadedPhotos.length >= 6}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Photo</span>
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
                    <div className="flex flex-wrap gap-2 pt-1">
                      {uploadedPhotos.map((photoUrl, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                          <img 
                            src={photoUrl} 
                            alt={`Photo ${idx + 1}`} 
                            className="w-full h-full object-cover" 
                          />
                          <button
                            type="button"
                            onClick={() => setUploadedPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove photo"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
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
                      <span>{isAdmin ? 'Publish Service Listing' : 'Submit for Verification'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
