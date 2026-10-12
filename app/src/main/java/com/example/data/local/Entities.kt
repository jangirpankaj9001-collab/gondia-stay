package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.model.ContactMethod
import com.example.data.model.FurnishingStatus
import com.example.data.model.ListingStatus
import com.example.data.model.PropertyListing
import com.example.data.model.PropertyType

@Entity(tableName = "properties")
data class PropertyEntity(
    @PrimaryKey val id: String,
    val title: String,
    val address: String,
    val locality: String,
    val city: String = "Gondia",
    val propertyType: String,
    val monthlyRent: Int,
    val securityDeposit: Int,
    val bedrooms: Int,
    val bathrooms: Int,
    val furnishing: String,
    val availableFrom: String,
    val amenities: List<String>,
    val photos: List<String>,
    val ownerId: String,
    val ownerName: String,
    val ownerPhone: String,
    val ownerPreferredContact: String,
    val status: String,
    val latitude: Double,
    val longitude: Double,
    val createdAt: Long = System.currentTimeMillis(),
    val isFeatured: Boolean = false
) {
    fun toDomain(isFavorite: Boolean = false): PropertyListing {
        return PropertyListing(
            id = id,
            title = title,
            address = address,
            locality = locality,
            city = city,
            propertyType = runCatching { PropertyType.valueOf(propertyType) }.getOrDefault(PropertyType.FLAT),
            monthlyRent = monthlyRent,
            securityDeposit = securityDeposit,
            bedrooms = bedrooms,
            bathrooms = bathrooms,
            furnishing = runCatching { FurnishingStatus.valueOf(furnishing) }.getOrDefault(FurnishingStatus.SEMI_FURNISHED),
            availableFrom = availableFrom,
            amenities = amenities,
            photos = photos,
            ownerId = ownerId,
            ownerName = ownerName,
            ownerPhone = ownerPhone,
            ownerPreferredContact = runCatching { ContactMethod.valueOf(ownerPreferredContact) }.getOrDefault(ContactMethod.PHONE),
            status = runCatching { ListingStatus.valueOf(status) }.getOrDefault(ListingStatus.APPROVED),
            latitude = latitude,
            longitude = longitude,
            createdAt = createdAt,
            isFavorite = isFavorite,
            isFeatured = isFeatured
        )
    }

    companion object {
        fun fromDomain(model: PropertyListing): PropertyEntity {
            return PropertyEntity(
                id = model.id,
                title = model.title,
                address = model.address,
                locality = model.locality,
                city = model.city,
                propertyType = model.propertyType.name,
                monthlyRent = model.monthlyRent,
                securityDeposit = model.securityDeposit,
                bedrooms = model.bedrooms,
                bathrooms = model.bathrooms,
                furnishing = model.furnishing.name,
                availableFrom = model.availableFrom,
                amenities = model.amenities,
                photos = model.photos,
                ownerId = model.ownerId,
                ownerName = model.ownerName,
                ownerPhone = model.ownerPhone,
                ownerPreferredContact = model.ownerPreferredContact.name,
                status = model.status.name,
                latitude = model.latitude,
                longitude = model.longitude,
                createdAt = model.createdAt,
                isFeatured = model.isFeatured
            )
        }
    }
}

@Entity(tableName = "favorites")
data class FavoriteEntity(
    @PrimaryKey val propertyId: String,
    val savedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "tiffin_services")
data class TiffinEntity(
    @PrimaryKey val id: String,
    val name: String,
    val locality: String,
    val city: String = "Gondia",
    val address: String,
    val monthlyPayment: Int,
    val mealType: String,
    val menuItems: List<String>,
    val facilities: List<String>,
    val timing: String,
    val ownerId: String,
    val ownerName: String,
    val ownerPhone: String,
    val ownerPreferredContact: String,
    val status: String,
    val rating: Float = 4.8f,
    val reviewCount: Int = 30,
    val photos: List<String> = emptyList(),
    val isFeatured: Boolean = false
) {
    fun toDomain(): com.example.data.model.TiffinService {
        return com.example.data.model.TiffinService(
            id = id,
            name = name,
            locality = locality,
            city = city,
            address = address,
            monthlyPayment = monthlyPayment,
            mealType = mealType,
            menuItems = menuItems,
            facilities = facilities,
            timing = timing,
            ownerId = ownerId,
            ownerName = ownerName,
            ownerPhone = ownerPhone,
            ownerPreferredContact = runCatching { ContactMethod.valueOf(ownerPreferredContact) }.getOrDefault(ContactMethod.PHONE),
            status = runCatching { ListingStatus.valueOf(status) }.getOrDefault(ListingStatus.APPROVED),
            rating = rating,
            reviewCount = reviewCount,
            photos = photos,
            isFeatured = isFeatured
        )
    }

    companion object {
        fun fromDomain(model: com.example.data.model.TiffinService): TiffinEntity {
            return TiffinEntity(
                id = model.id,
                name = model.name,
                locality = model.locality,
                city = model.city,
                address = model.address,
                monthlyPayment = model.monthlyPayment,
                mealType = model.mealType,
                menuItems = model.menuItems,
                facilities = model.facilities,
                timing = model.timing,
                ownerId = model.ownerId,
                ownerName = model.ownerName,
                ownerPhone = model.ownerPhone,
                ownerPreferredContact = model.ownerPreferredContact.name,
                status = model.status.name,
                rating = model.rating,
                reviewCount = model.reviewCount,
                photos = model.photos,
                isFeatured = model.isFeatured
            )
        }
    }
}
