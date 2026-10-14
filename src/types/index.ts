export type PropertyType = 
  | 'ALL'
  | 'FLAT'
  | 'PG'
  | 'ROOM'
  | 'INDEPENDENT_HOUSE'
  | 'COMMERCIAL';

export type FurnishingStatus = 
  | 'FURNISHED'
  | 'SEMI_FURNISHED'
  | 'UNFURNISHED';

export type ListingStatus = 
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED';

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
  monthlyRent: number;
  securityDeposit: number;
  bedrooms: number;
  bathrooms: number;
  furnishing: FurnishingStatus;
  availableFrom: string;
  amenities: string[];
  photos: string[];
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerPreferredContact: ContactMethod;
  status: ListingStatus;
  latitude: number;
  longitude: number;
  isFeatured?: boolean;
  isFavorite?: boolean;
  createdAt?: number;
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

export const PROPERTY_TYPES: { type: PropertyType; label: string }[] = [
  { type: 'ALL', label: 'All Properties' },
  { type: 'FLAT', label: 'Flats & Apartments' },
  { type: 'PG', label: 'PG / Hostels' },
  { type: 'ROOM', label: 'Single Rooms' },
  { type: 'INDEPENDENT_HOUSE', label: 'Independent House' }
];

export const OWNER_PROFILES = [
  { id: "owner_ramesh", name: "Ramesh Agrawal", phone: "+919823012345" },
  { id: "owner_sharma", name: "Satish Sharma", phone: "+919422156789" },
  { id: "owner_patel", name: "Prakash Patel", phone: "+919890123456" },
  { id: "owner_meshram", name: "Anil Meshram", phone: "+919403889900" }
];
