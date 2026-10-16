export type PropertyType = 
  | 'ALL'
  | 'FLAT'
  | 'PG'
  | 'ROOM'
  | 'INDEPENDENT_HOUSE'
  | 'COMMERCIAL';

export type AccommodationType = 
  | '1_BHK'
  | '2_BHK'
  | '3_BHK'
  | '4_PLUS_BHK'
  | 'ROOM'
  | 'PG'
  | 'INDEPENDENT_HOUSE';

export type FurnishingStatus = 
  | 'FURNISHED'
  | 'SEMI_FURNISHED'
  | 'UNFURNISHED';

export type ListingStatus = 
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'approved'
  | 'pending'
  | 'rejected';

export type OccupancyStatus = 'AVAILABLE' | 'OCCUPIED';

export type KitchenAvailability = 'PRIVATE' | 'SHARED' | 'NOT_AVAILABLE';

export type SuitableTenantType = 'STUDENTS' | 'WORKING_PROFESSIONALS' | 'FAMILIES' | 'ALL';

export const isApproved = (status?: string): boolean => (status || '').toLowerCase() === 'approved';
export const isPending = (status?: string): boolean => (status || '').toLowerCase() === 'pending';
export const isRejected = (status?: string): boolean => (status || '').toLowerCase() === 'rejected';

export const isOccupied = (status?: string): boolean => (status || '').toUpperCase() === 'OCCUPIED';
export const isAvailable = (status?: string): boolean => !status || (status || '').toUpperCase() === 'AVAILABLE';

export type ContactMethod = 
  | 'PHONE'
  | 'WHATSAPP'
  | 'BOTH';

export interface PropertyListing {
  id: string;
  title: string;
  address: string;
  locality: string;
  city: string;
  propertyType: PropertyType;
  accommodationType?: AccommodationType;
  monthlyRent: number;
  securityDeposit: number;
  bedrooms: number; // or number of separate rooms
  bathrooms: number;
  kitchenAvailable?: KitchenAvailability;
  hallAvailable?: boolean;
  furnishing: FurnishingStatus;
  suitableTenants?: SuitableTenantType[];
  availableFrom: string;
  amenities: string[];
  photos: string[];
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerWhatsappNumber?: string;
  ownerPreferredContact: ContactMethod;
  status: ListingStatus;
  occupancyStatus?: OccupancyStatus;
  latitude: number;
  longitude: number;
  isFeatured?: boolean;
  isFavorite?: boolean;
  createdAt?: number;
  updatedAt?: number;
  moderatedAt?: number;
  moderatedBy?: string;
}

export interface TiffinService {
  id: string;
  name: string;
  locality: string;
  city: string;
  address: string;
  monthlyPayment: number;
  mealType: string;
  menuItems: string[];
  facilities: string[];
  timing: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerPreferredContact: ContactMethod;
  status: ListingStatus;
  rating: number;
  reviewCount: number;
  photos: string[];
  isFeatured?: boolean;
}

export type SortOption = 
  | 'RELEVANCE'
  | 'RENT_LOW_TO_HIGH'
  | 'RENT_HIGH_TO_LOW'
  | 'NEWEST';

export interface FilterCriteria {
  minRent: number;
  maxRent: number;
  bedrooms: number; // 0 for any
  furnishing: FurnishingStatus | null;
  propertyType: PropertyType;
  statusOnlyApproved: boolean;
  includeOccupied?: boolean;
}

export const GONDIA_LOCALITIES = [
  "All",
  "Civil Lines",
  "Rail Toly",
  "Ram Nagar",
  "Kudwa Naka",
  "Ring Road",
  "Bajaj Ward",
  "Fulchur",
  "Pratap Nagar",
  "Ganesh Nagar",
  "Station Road"
];

// Approximate real coordinates for Gondia landmarks and localities
export const GONDIA_LOCALITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Civil Lines": { lat: 21.4602, lng: 80.1945 },
  "Rail Toly": { lat: 21.4658, lng: 80.1982 },
  "Ram Nagar": { lat: 21.4485, lng: 80.1912 },
  "Kudwa Naka": { lat: 21.4420, lng: 80.2055 },
  "Ring Road": { lat: 21.4510, lng: 80.1780 },
  "Bajaj Ward": { lat: 21.4575, lng: 80.1925 },
  "Fulchur": { lat: 21.4720, lng: 80.2100 },
  "Pratap Nagar": { lat: 21.4530, lng: 80.2010 },
  "Ganesh Nagar": { lat: 21.4640, lng: 80.1880 },
  "Station Road": { lat: 21.4630, lng: 80.1970 }
};

export const PROPERTY_TYPES: { type: PropertyType; label: string }[] = [
  { type: 'ALL', label: 'All Properties' },
  { type: 'FLAT', label: 'Flats & Apartments' },
  { type: 'PG', label: 'PG / Hostels' },
  { type: 'ROOM', label: 'Single Rooms' },
  { type: 'INDEPENDENT_HOUSE', label: 'Independent House' }
];

export const ACCOMMODATION_TYPES: { type: AccommodationType; label: string; defaultBedrooms: number }[] = [
  { type: '1_BHK', label: '1 BHK', defaultBedrooms: 1 },
  { type: '2_BHK', label: '2 BHK', defaultBedrooms: 2 },
  { type: '3_BHK', label: '3 BHK', defaultBedrooms: 3 },
  { type: '4_PLUS_BHK', label: '4+ BHK', defaultBedrooms: 4 },
  { type: 'ROOM', label: 'Separate Room(s) for Rent', defaultBedrooms: 1 },
  { type: 'PG', label: 'PG / Paying Guest', defaultBedrooms: 1 },
  { type: 'INDEPENDENT_HOUSE', label: 'Independent Bungalow / House', defaultBedrooms: 3 }
];

export interface OwnerProfile {
  id: string;
  name: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
}

export const DEFAULT_OWNER_PROFILE: OwnerProfile = {
  id: 'owner_gondia_primary',
  name: 'Rajesh Sharma',
  phone: '+91 98230 12345',
  whatsappNumber: '+91 98230 12345',
  email: 'rajesh.sharma@gondiastay.com'
};
