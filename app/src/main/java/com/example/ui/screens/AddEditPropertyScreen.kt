package com.example.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.ContactMethod
import com.example.data.model.FurnishingStatus
import com.example.data.model.GONDIA_LOCALITIES
import com.example.data.model.ListingStatus
import com.example.data.model.PropertyListing
import com.example.data.model.PropertyType
import com.example.data.model.calculateFeaturedFee
import com.example.ui.theme.AccentAmber
import com.example.ui.theme.AccentGreen
import com.example.ui.theme.BlueContainer
import com.example.ui.theme.BluePrimary
import com.example.ui.viewmodel.GondiaViewModel
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AddEditPropertyScreen(
    viewModel: GondiaViewModel,
    existingProperty: PropertyListing? = null,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    BackHandler { onNavigateBack() }

    val currentOwnerId by viewModel.currentOwnerId.collectAsState()
    val currentOwnerName by viewModel.currentOwnerName.collectAsState()
    val currentOwnerPhone by viewModel.currentOwnerPhone.collectAsState()

    var title by remember { mutableStateOf(existingProperty?.title ?: "") }
    var address by remember { mutableStateOf(existingProperty?.address ?: "") }
    var locality by remember { mutableStateOf(existingProperty?.locality ?: "Civil Lines") }
    var propertyType by remember { mutableStateOf(existingProperty?.propertyType ?: PropertyType.FLAT) }
    var monthlyRentText by remember { mutableStateOf(existingProperty?.monthlyRent?.toString() ?: "") }
    var securityDepositText by remember { mutableStateOf(existingProperty?.securityDeposit?.toString() ?: "") }
    var bedrooms by remember { mutableIntStateOf(existingProperty?.bedrooms ?: 2) }
    var bathrooms by remember { mutableIntStateOf(existingProperty?.bathrooms ?: 1) }
    var furnishing by remember { mutableStateOf(existingProperty?.furnishing ?: FurnishingStatus.SEMI_FURNISHED) }
    var availableFrom by remember { mutableStateOf(existingProperty?.availableFrom ?: "Immediate") }
    var contactMethod by remember { mutableStateOf(existingProperty?.ownerPreferredContact ?: ContactMethod.BOTH) }

    val defaultAmenities = listOf("24/7 Water", "Parking", "Wi-Fi", "Lift", "Power Backup", "AC", "Security / CCTV", "Balcony")
    val selectedAmenities = remember {
        mutableStateListOf<String>().apply {
            if (existingProperty != null) {
                addAll(existingProperty.amenities)
            } else {
                addAll(listOf("24/7 Water", "Parking", "Wi-Fi"))
            }
        }
    }

    val photos = remember {
        mutableStateListOf<String>().apply {
            if (existingProperty != null && existingProperty.photos.isNotEmpty()) {
                addAll(existingProperty.photos)
            } else {
                add("hero_gondia_stays") // Default photo representation
            }
        }
    }

    val rentInt = monthlyRentText.toIntOrNull() ?: 0
    var isFeaturedPlan by remember { mutableStateOf(existingProperty?.isFeatured ?: false) }
    val featuredFee = calculateFeaturedFee(rentInt)

    var validationError by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (existingProperty == null) "Add Property in Gondia" else "Edit My Property",
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = BluePrimary
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
                .testTag("add_edit_property_screen")
        ) {
            // Photos Management Section
            Text(
                text = "Property Photos",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                photos.forEachIndexed { index, _ ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = BlueContainer,
                        modifier = Modifier.size(90.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.AddPhotoAlternate,
                                    contentDescription = null,
                                    tint = BluePrimary
                                )
                                Text(
                                    text = "Photo ${index + 1}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = BluePrimary
                                )
                            }
                        }
                    }
                }

                // Add photo button
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier
                        .size(90.dp)
                        .clickable {
                            if (photos.size < 5) {
                                photos.add("hero_gondia_stays")
                            }
                        }
                        .testTag("add_photo_button")
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(imageVector = Icons.Default.Add, contentDescription = "Add Photo", tint = BluePrimary)
                            Text("Add Photo", style = MaterialTheme.typography.labelSmall, color = BluePrimary)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Property Title
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Property Title*") },
                placeholder = { Text("e.g. Spacious 2 BHK Flat near Court Chowk") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("input_property_title"),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Locality Picker in Gondia
            Text(
                text = "Locality in Gondia City*",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                GONDIA_LOCALITIES.forEach { loc ->
                    FilterChip(
                        selected = locality == loc.name,
                        onClick = { locality = loc.name },
                        label = { Text(loc.name) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Full Address
            OutlinedTextField(
                value = address,
                onValueChange = { address = it },
                label = { Text("Full Address*") },
                placeholder = { Text("House/Flat No., Building name, Landmark...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("input_property_address"),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Property Type
            Text(
                text = "Property Type*",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(PropertyType.FLAT, PropertyType.PG, PropertyType.ROOM).forEach { type ->
                    FilterChip(
                        selected = propertyType == type,
                        onClick = { propertyType = type },
                        label = { Text(type.label, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Rent and Deposit
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = monthlyRentText,
                    onValueChange = { monthlyRentText = it.filter { char -> char.isDigit() } },
                    label = { Text("Rent (₹/mo)*") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("input_rent"),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = securityDepositText,
                    onValueChange = { securityDepositText = it.filter { char -> char.isDigit() } },
                    label = { Text("Deposit (₹)*") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("input_deposit"),
                    shape = RoundedCornerShape(12.dp)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Absolute Free Listing Notice & Plan Options
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = AccentGreen.copy(alpha = 0.12f),
                border = androidx.compose.foundation.BorderStroke(1.dp, AccentGreen.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = AccentGreen,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "100% Absolute Free Listing for All Owners",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = AccentGreen
                        )
                        Text(
                            text = "Zero commission, ₹0 listing fee, and ₹0 platform charges. Post your flat, PG or room in Gondia completely free!",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "Listing Visibility Style (Both 100% Free)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Standard Free Plan Card
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { isFeaturedPlan = false },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (!isFeaturedPlan) Color(0xFFE8F5E9) else MaterialTheme.colorScheme.surface
                    ),
                    border = if (!isFeaturedPlan) androidx.compose.foundation.BorderStroke(2.dp, AccentGreen) else androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Standard Listing",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = "₹0 Free",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = AccentGreen
                        )
                        Text(
                            text = "Full search & map visibility",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 10.sp
                        )
                    }
                }

                // Highlighted Plan Card (also 100% Free)
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { isFeaturedPlan = true },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isFeaturedPlan) AccentAmber.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surface
                    ),
                    border = if (isFeaturedPlan) androidx.compose.foundation.BorderStroke(2.dp, AccentAmber) else androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = Icons.Default.Star, contentDescription = null, tint = AccentAmber, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = "Highlighted Tag",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFB45309)
                            )
                        }
                        Text(
                            text = "₹0 Free",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = AccentAmber
                        )
                        Text(
                            text = "Top placement & golden badge",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 10.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "No hidden charges: All Gondia owners get unlimited free listings with instant direct tenant inquiries.",
                style = MaterialTheme.typography.labelSmall,
                color = AccentGreen,
                fontWeight = FontWeight.SemiBold,
                fontSize = 11.sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Bedrooms & Bathrooms
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Bedrooms", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(1, 2, 3, 4).forEach { b ->
                            FilterChip(
                                selected = bedrooms == b,
                                onClick = { bedrooms = b },
                                label = { Text("$b") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = BluePrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text("Bathrooms", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(1, 2, 3).forEach { bath ->
                            FilterChip(
                                selected = bathrooms == bath,
                                onClick = { bathrooms = bath },
                                label = { Text("$bath") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = BluePrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Furnishing
            Text("Furnishing Status*", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FurnishingStatus.values().forEach { st ->
                    FilterChip(
                        selected = furnishing == st,
                        onClick = { furnishing = st },
                        label = { Text(st.label, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Available From
            OutlinedTextField(
                value = availableFrom,
                onValueChange = { availableFrom = it },
                label = { Text("Available From") },
                placeholder = { Text("e.g. Immediate / 1st of next month") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Amenities Multi-Select
            Text("Select Amenities", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(6.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                defaultAmenities.forEach { amenity ->
                    val isChecked = selectedAmenities.contains(amenity)
                    FilterChip(
                        selected = isChecked,
                        onClick = {
                            if (isChecked) selectedAmenities.remove(amenity) else selectedAmenities.add(amenity)
                        },
                        label = { Text(amenity) },
                        leadingIcon = if (isChecked) {
                            { Icon(imageVector = Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                        } else null,
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Preferred Contact Method
            Text("Preferred Contact Method*", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ContactMethod.values().forEach { method ->
                    FilterChip(
                        selected = contactMethod == method,
                        onClick = { contactMethod = method },
                        label = { Text(method.label, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            // Error display
            if (validationError != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = validationError!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Submit Button
            Button(
                onClick = {
                    if (title.isBlank() || address.isBlank() || monthlyRentText.isBlank() || securityDepositText.isBlank()) {
                        validationError = "Please fill in all mandatory fields (Title, Address, Rent, Deposit)."
                        return@Button
                    }
                    val rent = monthlyRentText.toIntOrNull() ?: 0
                    val deposit = securityDepositText.toIntOrNull() ?: 0

                    val targetLoc = GONDIA_LOCALITIES.firstOrNull { it.name.equals(locality, ignoreCase = true) }
                    val lat = targetLoc?.latitude ?: 21.4604
                    val lng = targetLoc?.longitude ?: 80.1961

                    val itemToSave = PropertyListing(
                        id = existingProperty?.id ?: "prop_${UUID.randomUUID().toString().take(8)}",
                        title = title.trim(),
                        address = address.trim(),
                        locality = locality,
                        city = "Gondia",
                        propertyType = propertyType,
                        monthlyRent = rent,
                        securityDeposit = deposit,
                        bedrooms = bedrooms,
                        bathrooms = bathrooms,
                        furnishing = furnishing,
                        availableFrom = availableFrom.trim(),
                        amenities = selectedAmenities.toList(),
                        photos = photos.toList(),
                        ownerId = existingProperty?.ownerId ?: currentOwnerId,
                        ownerName = existingProperty?.ownerName ?: currentOwnerName,
                        ownerPhone = existingProperty?.ownerPhone ?: currentOwnerPhone,
                        ownerPreferredContact = contactMethod,
                        status = existingProperty?.status ?: ListingStatus.PENDING,
                        latitude = lat,
                        longitude = lng,
                        createdAt = existingProperty?.createdAt ?: System.currentTimeMillis(),
                        isFeatured = isFeaturedPlan
                    )

                    viewModel.saveProperty(itemToSave, isEdit = existingProperty != null)
                    onNavigateBack()
                },
                colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("submit_property_button")
            ) {
                Text(
                    text = if (existingProperty == null) "Publish Listing to Gondia" else "Save Changes",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
