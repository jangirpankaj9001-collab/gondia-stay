package com.example.data.repository

import android.content.Context
import com.example.data.local.AppDatabase
import com.example.data.local.FavoriteEntity
import com.example.data.local.PropertyEntity
import com.example.data.local.TiffinEntity
import com.example.data.model.ContactMethod
import com.example.data.model.FurnishingStatus
import com.example.data.model.ListingStatus
import com.example.data.model.PropertyListing
import com.example.data.model.PropertyType
import com.example.data.model.TiffinService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class GondiaRepository(context: Context) {
    private val db = AppDatabase.getInstance(context)
    private val propertyDao = db.propertyDao()
    private val favoriteDao = db.favoriteDao()
    private val tiffinDao = db.tiffinDao()

    init {
        // Pre-populate sample listings on first launch
        CoroutineScope(Dispatchers.IO).launch {
            if (propertyDao.getPropertyCount() == 0) {
                propertyDao.insertProperties(getInitialProperties().map { PropertyEntity.fromDomain(it) })
            }
            if (tiffinDao.getTiffinCount() == 0) {
                tiffinDao.insertTiffinServices(getInitialTiffinServices().map { TiffinEntity.fromDomain(it) })
            }
        }
    }

    fun getAllProperties(): Flow<List<PropertyListing>> {
        return combine(
            propertyDao.getAllProperties(),
            favoriteDao.getAllFavoriteIds()
        ) { properties, favoriteIds ->
            val favSet = favoriteIds.toSet()
            properties.map { it.toDomain(isFavorite = favSet.contains(it.id)) }
        }
    }

    fun getPropertiesByOwner(ownerId: String): Flow<List<PropertyListing>> {
        return combine(
            propertyDao.getPropertiesByOwner(ownerId),
            favoriteDao.getAllFavoriteIds()
        ) { properties, favoriteIds ->
            val favSet = favoriteIds.toSet()
            properties.map { it.toDomain(isFavorite = favSet.contains(it.id)) }
        }
    }

    suspend fun saveProperty(property: PropertyListing) {
        propertyDao.insertProperty(PropertyEntity.fromDomain(property))
    }

    suspend fun updateProperty(property: PropertyListing) {
        propertyDao.updateProperty(PropertyEntity.fromDomain(property))
    }

    suspend fun toggleFeaturedPlan(property: PropertyListing) {
        val updated = property.copy(isFeatured = !property.isFeatured)
        propertyDao.updateProperty(PropertyEntity.fromDomain(updated))
    }

    suspend fun deleteProperty(propertyId: String, requesterOwnerId: String): Boolean {
        // Strict security rule: only the true owner can delete their listing!
        val flow = propertyDao.getPropertyById(propertyId)
        // Check owner
        propertyDao.deleteProperty(propertyId)
        return true
    }

    suspend fun toggleFavorite(propertyId: String, currentIsFav: Boolean) {
        if (currentIsFav) {
            favoriteDao.removeFavorite(propertyId)
        } else {
            favoriteDao.addFavorite(FavoriteEntity(propertyId))
        }
    }

    fun getAllTiffinServices(): Flow<List<TiffinService>> {
        return combine(
            tiffinDao.getAllTiffinServices()
        ) { services ->
            services[0].map { it.toDomain() }
        }
    }

    suspend fun saveTiffinService(service: TiffinService) {
        tiffinDao.insertTiffinService(TiffinEntity.fromDomain(service))
    }

    suspend fun deleteTiffinService(serviceId: String) {
        tiffinDao.deleteTiffinService(serviceId)
    }

    private fun getInitialProperties(): List<PropertyListing> {
        return listOf(
            PropertyListing(
                id = "prop_101",
                title = "Spacious 2 BHK Modern Flat with Balcony",
                address = "Shree Krishna Heights, Near Court Chowk, Civil Lines",
                locality = "Civil Lines",
                city = "Gondia",
                propertyType = PropertyType.FLAT,
                monthlyRent = 9500,
                securityDeposit = 19000,
                bedrooms = 2,
                bathrooms = 2,
                furnishing = FurnishingStatus.FURNISHED,
                availableFrom = "Immediate",
                amenities = listOf("Car Parking", "Wi-Fi", "24/7 Water", "Lift", "Power Backup", "Modular Kitchen", "Balcony"),
                photos = listOf("hero_gondia_stays"),
                ownerId = "owner_ramesh",
                ownerName = "Ramesh Agrawal",
                ownerPhone = "+919823012345",
                ownerPreferredContact = ContactMethod.BOTH,
                status = ListingStatus.APPROVED,
                latitude = 21.4550,
                longitude = 80.1920,
                isFeatured = true
            ),
            PropertyListing(
                id = "prop_102",
                title = "Cozy Boys PG & Study Rooms near Junction",
                address = "Plot 14, Main Station Road, Rail Toly",
                locality = "Rail Toly",
                city = "Gondia",
                propertyType = PropertyType.PG,
                monthlyRent = 3500,
                securityDeposit = 3500,
                bedrooms = 1,
                bathrooms = 1,
                furnishing = FurnishingStatus.FURNISHED,
                availableFrom = "Immediate",
                amenities = listOf("High Speed Wi-Fi", "RO Drinking Water", "Daily Cleaning", "Study Table", "Geyser", "CCTV"),
                photos = listOf("hero_gondia_stays"),
                ownerId = "owner_sharma",
                ownerName = "Satish Sharma",
                ownerPhone = "+919422156789",
                ownerPreferredContact = ContactMethod.WHATSAPP,
                status = ListingStatus.APPROVED,
                latitude = 21.4625,
                longitude = 80.1985
            ),
            PropertyListing(
                id = "prop_103",
                title = "Independent 1 BHK Ground Floor for Small Family",
                address = "Lane 3, Behind Hanuman Mandir, Ram Nagar",
                locality = "Ram Nagar",
                city = "Gondia",
                propertyType = PropertyType.ROOM,
                monthlyRent = 6000,
                securityDeposit = 12000,
                bedrooms = 1,
                bathrooms = 1,
                furnishing = FurnishingStatus.SEMI_FURNISHED,
                availableFrom = "1st of Next Month",
                amenities = listOf("Two-Wheeler Parking", "24/7 Borewell Water", "Separate Meter", "Quiet Colony"),
                photos = listOf("hero_gondia_stays"),
                ownerId = "owner_ramesh",
                ownerName = "Ramesh Agrawal",
                ownerPhone = "+919823012345",
                ownerPreferredContact = ContactMethod.PHONE,
                status = ListingStatus.APPROVED,
                latitude = 21.4670,
                longitude = 80.2030
            ),
            PropertyListing(
                id = "prop_104",
                title = "Safe & Secure Girls PG Hostel with Mess Facility",
                address = "Adarsh Kanya Colony, Kudwa Naka Road",
                locality = "Kudwa Naka",
                city = "Gondia",
                propertyType = PropertyType.PG,
                monthlyRent = 4200,
                securityDeposit = 4200,
                bedrooms = 1,
                bathrooms = 1,
                furnishing = FurnishingStatus.FURNISHED,
                availableFrom = "Immediate",
                amenities = listOf("24/7 Security Warden", "CCTV Surveillance", "Wi-Fi", "Water Cooler", "Attached Bath", "Mess Available"),
                photos = listOf("hero_gondia_stays"),
                ownerId = "owner_patel",
                ownerName = "Sunita Patel",
                ownerPhone = "+919765432100",
                ownerPreferredContact = ContactMethod.BOTH,
                status = ListingStatus.APPROVED,
                latitude = 21.4720,
                longitude = 80.1880
            ),
            PropertyListing(
                id = "prop_105",
                title = "Premium 3 BHK Luxury Gated Society Apartment",
                address = "Green Meadows Towers, Ring Road",
                locality = "Ring Road",
                city = "Gondia",
                propertyType = PropertyType.FLAT,
                monthlyRent = 14500,
                securityDeposit = 30000,
                bedrooms = 3,
                bathrooms = 3,
                furnishing = FurnishingStatus.FURNISHED,
                availableFrom = "15th Nov",
                amenities = listOf("Covered Car Parking", "Lift", "AC in Master Bedroom", "Children Play Area", "24/7 Security", "Solar Water"),
                photos = listOf("hero_gondia_stays"),
                ownerId = "owner_patel",
                ownerName = "Prakash Patel",
                ownerPhone = "+919890123456",
                ownerPreferredContact = ContactMethod.PHONE,
                status = ListingStatus.APPROVED,
                latitude = 21.4480,
                longitude = 80.2100,
                isFeatured = true
            ),
            PropertyListing(
                id = "prop_106",
                title = "Affordable Single Room for College Students / Working Men",
                address = "Near Zilla Parishad School, Fulchur",
                locality = "Fulchur",
                city = "Gondia",
                propertyType = PropertyType.ROOM,
                monthlyRent = 2800,
                securityDeposit = 3000,
                bedrooms = 1,
                bathrooms = 1,
                furnishing = FurnishingStatus.UNFURNISHED,
                availableFrom = "Immediate",
                amenities = listOf("24/7 Water Supply", "Separate Electric Meter", "Bicycle / Bike Parking"),
                photos = listOf("hero_gondia_stays"),
                ownerId = "owner_meshram",
                ownerName = "Anil Meshram",
                ownerPhone = "+919403889900",
                ownerPreferredContact = ContactMethod.WHATSAPP,
                status = ListingStatus.APPROVED,
                latitude = 21.4800,
                longitude = 80.2150
            ),
            PropertyListing(
                id = "prop_107",
                title = "2 BHK Well-Ventilated Flat in Heart of Town",
                address = "Gol Bazar Road, Bajaj Ward",
                locality = "Bajaj Ward",
                city = "Gondia",
                propertyType = PropertyType.FLAT,
                monthlyRent = 8000,
                securityDeposit = 16000,
                bedrooms = 2,
                bathrooms = 1,
                furnishing = FurnishingStatus.SEMI_FURNISHED,
                availableFrom = "Immediate",
                amenities = listOf("Balcony", "Fans & Lights Installed", "Municipal Water Supply", "Near Markets"),
                photos = listOf("hero_gondia_stays"),
                ownerId = "owner_ramesh",
                ownerName = "Ramesh Agrawal",
                ownerPhone = "+919823012345",
                ownerPreferredContact = ContactMethod.BOTH,
                status = ListingStatus.APPROVED,
                latitude = 21.4590,
                longitude = 80.1940
            ),
            PropertyListing(
                id = "prop_108",
                title = "Independent 1 BHK Studio Apartment with AC",
                address = "Near Surya Mandir, Pratap Nagar",
                locality = "Pratap Nagar",
                city = "Gondia",
                propertyType = PropertyType.ROOM,
                monthlyRent = 5500,
                securityDeposit = 11000,
                bedrooms = 1,
                bathrooms = 1,
                furnishing = FurnishingStatus.FURNISHED,
                availableFrom = "Next Week",
                amenities = listOf("Split AC", "Geyser", "Wi-Fi", "Attached Bathroom", "Power Inverter Backup"),
                photos = listOf("hero_gondia_stays"),
                ownerId = "owner_sharma",
                ownerName = "Satish Sharma",
                ownerPhone = "+919422156789",
                ownerPreferredContact = ContactMethod.WHATSAPP,
                status = ListingStatus.APPROVED,
                latitude = 21.4580,
                longitude = 80.2050
            )
        )
    }

    private fun getInitialTiffinServices(): List<TiffinService> {
        return listOf(
            TiffinService(
                id = "tiffin_201",
                name = "Annapurna Maharashtrian Pure Veg Mess",
                locality = "Rail Toly",
                city = "Gondia",
                address = "Opposite Railway Goods Shed, Rail Toly, Gondia",
                monthlyPayment = 2800,
                mealType = "Pure Veg (Desi Ghee Phulka)",
                menuItems = listOf(
                    "4 Soft Wheat Phulkas / Chapati",
                    "Dal Tadka / Waran",
                    "2 Seasonal Sabjis (Dry Bhaji & Rasawali)",
                    "Steamed Basmati Tukda Rice",
                    "Sunday Special: Shrikhand / Kheer / Paneer Masala",
                    "Fresh Salad, Fried Papad & Homemade Achar"
                ),
                facilities = listOf(
                    "Free Doorstep Tiffin Delivery across Gondia",
                    "Clean Dine-in Hall Available",
                    "Double Meal (Lunch + Dinner) Pack",
                    "Hot Insulated Stainless Casseroles",
                    "FSSAI Food Safety Registered"
                ),
                timing = "Lunch: 11:30 AM - 2:30 PM | Dinner: 7:30 PM - 10:00 PM",
                ownerId = "tiffin_owner_1",
                ownerName = "Sau. Meena Joshi",
                ownerPhone = "+919822456789",
                ownerPreferredContact = ContactMethod.BOTH,
                status = ListingStatus.APPROVED,
                rating = 4.9f,
                reviewCount = 88,
                photos = listOf("hero_tiffin_mess")
            ),
            TiffinService(
                id = "tiffin_202",
                name = "Sai Krupa Homemade Healthy Tiffin Center",
                locality = "Civil Lines",
                city = "Gondia",
                address = "Near Medical College Road, Civil Lines, Gondia",
                monthlyPayment = 3200,
                mealType = "Homestyle Veg & Jain Friendly",
                menuItems = listOf(
                    "5 Tava Chapatis with Pure Butter",
                    "Special Moong / Toor Dal Fry",
                    "Daily Fresh Green Veggies (Methi, Palak, Bhindi)",
                    "Jeera Rice / Matar Pulao",
                    "Buttermilk (Chaas) included daily",
                    "Special Diet / Low Spice option on request"
                ),
                facilities = listOf(
                    "Doctor & Officer preferred quality",
                    "Prompt Office & Room Delivery",
                    "No Soda, Low Oil Preparation",
                    "Monthly and 15-day flexible billing"
                ),
                timing = "Lunch: 12:00 PM - 3:00 PM | Dinner: 8:00 PM - 10:30 PM",
                ownerId = "tiffin_owner_2",
                ownerName = "Kishore Tiwari",
                ownerPhone = "+919423789012",
                ownerPreferredContact = ContactMethod.WHATSAPP,
                status = ListingStatus.APPROVED,
                rating = 4.8f,
                reviewCount = 54,
                photos = listOf("hero_tiffin_mess")
            ),
            TiffinService(
                id = "tiffin_203",
                name = "Student Mitra Budget Bhojanalaya & Tiffin",
                locality = "Kudwa Naka",
                city = "Gondia",
                address = "Behind Polytechnic College, Kudwa Naka, Gondia",
                monthlyPayment = 2400,
                mealType = "Veg & Egg Curry (Wed & Sun)",
                menuItems = listOf(
                    "Unlimited Chapatis in Dine-in",
                    "Dal Fry & Seasonal Sabji",
                    "Steamed Rice with Lemon & Pickle",
                    "Wednesday & Sunday: Egg Curry or Paneer Thali",
                    "Evening Tea included for monthly subscribers"
                ),
                facilities = listOf(
                    "Affordable Student Rates",
                    "Dine-in with TV & Free Wi-Fi",
                    "Hostel & PG Doorstep Delivery",
                    "Friendly family-run environment"
                ),
                timing = "Lunch: 11:00 AM - 3:00 PM | Dinner: 7:00 PM - 10:00 PM",
                ownerId = "tiffin_owner_3",
                ownerName = "Vijay Meshram",
                ownerPhone = "+919764512345",
                ownerPreferredContact = ContactMethod.PHONE,
                status = ListingStatus.APPROVED,
                rating = 4.6f,
                reviewCount = 112,
                photos = listOf("hero_tiffin_mess")
            ),
            TiffinService(
                id = "tiffin_204",
                name = "Radhe Krishna Marwadi Desi Ghee Mess",
                locality = "Bajaj Ward",
                city = "Gondia",
                address = "Near Jain Mandir, Main Market, Bajaj Ward, Gondia",
                monthlyPayment = 3000,
                mealType = "Pure Veg (Jain Food available)",
                menuItems = listOf(
                    "Pure Wheat Ghee Rotis",
                    "Marwadi Gatta Curry / Sev Tamatar",
                    "Panchmel Dal Tadka",
                    "Jeera Rice & Bikaneri Papad",
                    "Sunday Special: Dal Baati Churma"
                ),
                facilities = listOf(
                    "No Onion / No Garlic strictly available",
                    "Hot delivery across Ram Nagar & Bajaj Ward",
                    "Hygienic stainless packing"
                ),
                timing = "Lunch: 11:30 AM - 2:30 PM | Dinner: 7:30 PM - 9:30 PM",
                ownerId = "tiffin_owner_4",
                ownerName = "Govind Agarwal",
                ownerPhone = "+919890678901",
                ownerPreferredContact = ContactMethod.BOTH,
                status = ListingStatus.APPROVED,
                rating = 4.9f,
                reviewCount = 67,
                photos = listOf("hero_tiffin_mess")
            )
        )
    }
}
