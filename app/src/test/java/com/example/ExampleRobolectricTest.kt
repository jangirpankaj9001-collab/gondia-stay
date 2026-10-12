package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.model.ContactMethod
import com.example.data.model.FurnishingStatus
import com.example.data.model.ListingStatus
import com.example.data.model.PropertyListing
import com.example.data.model.PropertyType
import com.example.data.model.TiffinService
import com.example.data.model.calculateFeaturedFee
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("Gondia Stay", appName)
  }

  @Test
  fun `test absolute free listing for all owners in Gondia`() {
    // All fee calculations return ₹0 for absolute free listing
    assertEquals(0, calculateFeaturedFee(3500))
    assertEquals(0, calculateFeaturedFee(8000))
    assertEquals(0, calculateFeaturedFee(15000))

    val property = PropertyListing(
        id = "test_1",
        title = "1 BHK Room Ram Nagar",
        address = "Behind Temple",
        locality = "Ram Nagar",
        city = "Gondia",
        propertyType = PropertyType.ROOM,
        monthlyRent = 4500,
        securityDeposit = 9000,
        bedrooms = 1,
        bathrooms = 1,
        furnishing = FurnishingStatus.UNFURNISHED,
        availableFrom = "Immediate",
        amenities = listOf("Water"),
        photos = emptyList(),
        ownerId = "owner_1",
        ownerName = "Ramesh",
        ownerPhone = "9823012345",
        ownerPreferredContact = ContactMethod.PHONE,
        status = ListingStatus.APPROVED,
        latitude = 21.4670,
        longitude = 80.2030,
        isFeatured = false
    )
    // Listing is 100% Absolute Free for all owners
    assertTrue(property.isFreeListing)
    assertEquals(0, property.listingFee)
    assertEquals(0, property.featuredMonthlyFee)

    val highlightedFlat = property.copy(
        monthlyRent = 12000,
        isFeatured = true
    )
    assertTrue(highlightedFlat.isFeatured)
    assertEquals(0, highlightedFlat.featuredMonthlyFee)
    assertTrue(highlightedFlat.isFreeListing)

    val mess = TiffinService(
        id = "mess_1",
        name = "Annapurna Mess",
        locality = "Rail Toly",
        city = "Gondia",
        address = "Station Road",
        monthlyPayment = 3000,
        mealType = "Pure Veg",
        menuItems = listOf("Roti", "Sabji"),
        facilities = listOf("Delivery"),
        timing = "12 PM - 2 PM",
        ownerId = "mess_owner_1",
        ownerName = "Joshi",
        ownerPhone = "9822456789",
        ownerPreferredContact = ContactMethod.PHONE,
        status = ListingStatus.APPROVED,
        isFeatured = false
    )
    // Mess listing is also 100% Free
    assertTrue(mess.isFreeListing)
    assertEquals(0, mess.listingFee)
  }
}
