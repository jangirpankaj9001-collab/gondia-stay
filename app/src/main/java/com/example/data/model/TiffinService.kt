package com.example.data.model

data class TiffinService(
    val id: String,
    val name: String,
    val locality: String,
    val city: String = "Gondia",
    val address: String,
    val monthlyPayment: Int, // in INR
    val mealType: String, // e.g. "Pure Veg", "Veg & Egg", "Special Maharashtrian"
    val menuItems: List<String>,
    val facilities: List<String>,
    val timing: String, // e.g. "Lunch 12:00-3:00 PM | Dinner 7:30-10:00 PM"
    val ownerId: String,
    val ownerName: String,
    val ownerPhone: String,
    val ownerPreferredContact: ContactMethod,
    val status: ListingStatus = ListingStatus.APPROVED,
    val rating: Float = 4.8f,
    val reviewCount: Int = 42,
    val photos: List<String> = emptyList(),
    val isFeatured: Boolean = false
) {
    // 100% Free mess listing for all vendors
    val isFreeListing: Boolean
        get() = true
    val listingFee: Int
        get() = 0
}
