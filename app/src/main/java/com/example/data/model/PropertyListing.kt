package com.example.data.model

data class PropertyListing(
    val id: String,
    val title: String,
    val address: String,
    val locality: String,
    val city: String = "Gondia",
    val propertyType: PropertyType,
    val monthlyRent: Int,
    val securityDeposit: Int,
    val bedrooms: Int,
    val bathrooms: Int,
    val furnishing: FurnishingStatus,
    val availableFrom: String,
    val amenities: List<String>,
    val photos: List<String>,
    val ownerId: String,
    val ownerName: String,
    val ownerPhone: String,
    val ownerPreferredContact: ContactMethod,
    val status: ListingStatus = ListingStatus.APPROVED,
    val latitude: Double,
    val longitude: Double,
    val createdAt: Long = System.currentTimeMillis(),
    val isFavorite: Boolean = false,
    val isFeatured: Boolean = false
) {
    // 100% Absolute Free listing for all owners - Zero Commission & Zero Fees
    val isFreeListing: Boolean
        get() = true
    val listingFee: Int
        get() = 0
    val featuredMonthlyFee: Int
        get() = 0
}

// Absolute free listing for all owners in Gondia
fun calculateFeaturedFee(rent: Int): Int = 0
