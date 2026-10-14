import { PropertyListing, TiffinService } from '../types';

// Hardcoded demo properties removed.
// All property listings are fetched and managed directly via Cloud Firestore.
export const INITIAL_PROPERTIES: PropertyListing[] = [];

export const INITIAL_TIFFINS: TiffinService[] = [
  {
    id: "tiffin_201",
    name: "Annapurna Maharashtrian Pure Veg Mess",
    locality: "Rail Toly",
    city: "Gondia",
    address: "Opposite Railway Goods Shed, Rail Toly, Gondia",
    monthlyPayment: 2800,
    mealType: "Pure Veg (Desi Ghee Phulka)",
    menuItems: [
      "4 Soft Wheat Phulkas / Chapati",
      "Dal Tadka / Waran",
      "2 Seasonal Sabjis (Dry Bhaji & Rasawali)",
      "Steamed Basmati Tukda Rice",
      "Sunday Special: Shrikhand / Kheer / Paneer Masala",
      "Fresh Salad, Fried Papad & Homemade Achar"
    ],
    facilities: [
      "Free Doorstep Tiffin Delivery across Gondia",
      "Clean Dine-in Hall Available",
      "Double Meal (Lunch + Dinner) Pack",
      "Hot Insulated Stainless Casseroles",
      "FSSAI Food Safety Registered"
    ],
    timing: "Lunch: 11:30 AM - 2:30 PM | Dinner: 7:30 PM - 10:00 PM",
    ownerId: "tiffin_owner_1",
    ownerName: "Sau. Meena Joshi",
    ownerPhone: "+919822456789",
    ownerPreferredContact: "BOTH",
    status: "APPROVED",
    rating: 4.9,
    reviewCount: 88,
    photos: ["/hero_tiffin_mess.jpg"],
    isFeatured: true
  },
  {
    id: "tiffin_202",
    name: "Sai Krupa Homemade Healthy Tiffin Center",
    locality: "Civil Lines",
    city: "Gondia",
    address: "Near Medical College Road, Civil Lines, Gondia",
    monthlyPayment: 3200,
    mealType: "Homestyle Veg & Jain Friendly",
    menuItems: [
      "5 Tava Chapatis with Pure Butter",
      "Special Moong / Toor Dal Fry",
      "Daily Fresh Green Veggies (Methi, Palak, Bhindi)",
      "Jeera Rice / Matar Pulao",
      "Buttermilk (Chaas) included daily",
      "Special Diet / Low Spice option on request"
    ],
    facilities: [
      "Doctor & Officer preferred quality",
      "Prompt Office & Room Delivery",
      "No Soda, Low Oil Preparation",
      "Monthly and 15-day flexible billing"
    ],
    timing: "Lunch: 12:00 PM - 3:00 PM | Dinner: 8:00 PM - 10:30 PM",
    ownerId: "tiffin_owner_2",
    ownerName: "Kishore Tiwari",
    ownerPhone: "+919423789012",
    ownerPreferredContact: "WHATSAPP",
    status: "APPROVED",
    rating: 4.8,
    reviewCount: 54,
    photos: ["/hero_tiffin_mess.jpg"],
    isFeatured: true
  },
  {
    id: "tiffin_203",
    name: "Student Mitra Budget Bhojanalaya & Tiffin",
    locality: "Kudwa Naka",
    city: "Gondia",
    address: "Behind Polytechnic College, Kudwa Naka, Gondia",
    monthlyPayment: 2400,
    mealType: "Veg & Egg Curry (Wed & Sun)",
    menuItems: [
      "Unlimited Chapatis in Dine-in",
      "Dal Fry & Seasonal Sabji",
      "Steamed Rice with Lemon & Pickle",
      "Wednesday & Sunday: Egg Curry or Paneer Thali",
      "Evening Tea included for monthly subscribers"
    ],
    facilities: [
      "Affordable Student Rates",
      "Dine-in with TV & Free Wi-Fi",
      "Hostel & PG Doorstep Delivery",
      "Friendly family-run environment"
    ],
    timing: "Lunch: 11:00 AM - 3:00 PM | Dinner: 7:00 PM - 10:00 PM",
    ownerId: "tiffin_owner_3",
    ownerName: "Vijay Meshram",
    ownerPhone: "+919764512345",
    ownerPreferredContact: "PHONE",
    status: "APPROVED",
    rating: 4.6,
    reviewCount: 112,
    photos: ["/hero_tiffin_mess.jpg"]
  },
  {
    id: "tiffin_204",
    name: "Radhe Krishna Marwadi Desi Ghee Mess",
    locality: "Bajaj Ward",
    city: "Gondia",
    address: "Near Jain Mandir, Main Market, Bajaj Ward, Gondia",
    monthlyPayment: 3000,
    mealType: "Pure Veg (Jain Food available)",
    menuItems: [
      "Pure Wheat Ghee Rotis",
      "Marwadi Gatta Curry / Sev Tamatar",
      "Panchmel Dal Tadka",
      "Jeera Rice & Bikaneri Papad",
      "Sunday Special: Dal Baati Churma"
    ],
    facilities: [
      "No Onion / No Garlic strictly available",
      "Hot delivery across Ram Nagar & Bajaj Ward",
      "Hygienic stainless packing"
    ],
    timing: "Lunch: 11:30 AM - 2:30 PM | Dinner: 7:30 PM - 9:30 PM",
    ownerId: "tiffin_owner_4",
    ownerName: "Govind Agarwal",
    ownerPhone: "+919890678901",
    ownerPreferredContact: "BOTH",
    status: "APPROVED",
    rating: 4.9,
    reviewCount: 67,
    photos: ["/hero_tiffin_mess.jpg"],
    isFeatured: true
  }
];
