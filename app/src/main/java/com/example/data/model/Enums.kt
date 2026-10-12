package com.example.data.model

enum class PropertyType(val label: String) {
    ALL("All Types"),
    FLAT("Flat / Apartment"),
    PG("PG / Hostel"),
    ROOM("Independent Room")
}

enum class FurnishingStatus(val label: String) {
    FURNISHED("Furnished"),
    SEMI_FURNISHED("Semi-Furnished"),
    UNFURNISHED("Unfurnished")
}

enum class ContactMethod(val label: String) {
    PHONE("Phone Call"),
    WHATSAPP("WhatsApp"),
    BOTH("Phone & WhatsApp")
}

enum class ListingStatus(val label: String) {
    APPROVED("Approved"),
    PENDING("Pending Review"),
    REJECTED("Rejected")
}

data class GondiaLocality(
    val name: String,
    val description: String,
    val latitude: Double,
    val longitude: Double
)

val GONDIA_LOCALITIES = listOf(
    GondiaLocality("Rail Toly", "Near Gondia Junction & Market", 21.4625, 80.1985),
    GondiaLocality("Civil Lines", "Posh residential area & Govt offices", 21.4550, 80.1920),
    GondiaLocality("Ram Nagar", "Central neighborhood, coaching & families", 21.4670, 80.2030),
    GondiaLocality("Kudwa Naka", "Quiet residential & college student hub", 21.4720, 80.1880),
    GondiaLocality("Ring Road", "New development apartments & highway access", 21.4480, 80.2100),
    GondiaLocality("Bajaj Ward", "Bustling town center & amenities", 21.4590, 80.1940),
    GondiaLocality("Ganesh Nagar", "Family-friendly & green colony", 21.4640, 80.2110),
    GondiaLocality("Srinagar", "Peaceful locality near schools", 21.4510, 80.1860),
    GondiaLocality("Fulchur", "Affordable rooms & spacious independent floors", 21.4800, 80.2150),
    GondiaLocality("Pratap Nagar", "Close to hospital & main road", 21.4580, 80.2050)
)
