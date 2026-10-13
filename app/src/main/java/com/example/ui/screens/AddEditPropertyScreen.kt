package com.example.ui.screens

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.PhotoCamera
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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.example.R
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
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import java.io.File
import java.io.FileOutputStream
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
    val context = LocalContext.current

    val currentOwnerId by viewModel.currentOwnerId.collectAsState()
    val currentOwnerName by viewModel.currentOwnerName.collectAsState()
    val currentOwnerPhone by viewModel.currentOwnerPhone.collectAsState()

    var ownerName by remember { mutableStateOf(existingProperty?.ownerName ?: currentOwnerName) }
    var ownerPhone by remember { mutableStateOf(existingProperty?.ownerPhone ?: currentOwnerPhone) }

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

    // Accurate GPS Location state
    var latitude by remember { mutableDoubleStateOf(existingProperty?.latitude ?: 21.4604) }
    var longitude by remember { mutableDoubleStateOf(existingProperty?.longitude ?: 80.1961) }
    var locationAccuracyInfo by remember { mutableStateOf<String?>(null) }
    var isDetectingLocation by remember { mutableStateOf(false) }

    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }

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

    // Camera capture launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap: Bitmap? ->
        if (bitmap != null) {
            try {
                val imagesDir = File(context.filesDir, "property_photos").apply { mkdirs() }
                val photoFile = File(imagesDir, "prop_${System.currentTimeMillis()}.jpg")
                FileOutputStream(photoFile).use { out ->
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
                }
                photos.removeAll { it == "hero_gondia_stays" }
                photos.add(photoFile.absolutePath)
                Toast.makeText(context, "Property photo captured and attached!", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(context, "Failed to save photo: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Camera permission request launcher
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            cameraLauncher.launch(null)
        } else {
            Toast.makeText(context, "Camera permission needed to take property photos", Toast.LENGTH_SHORT).show()
        }
    }

    // Gallery / local file picker launcher
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                val imagesDir = File(context.filesDir, "property_photos").apply { mkdirs() }
                val photoFile = File(imagesDir, "prop_${System.currentTimeMillis()}.jpg")
                context.contentResolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(photoFile).use { output ->
                        input.copyTo(output)
                    }
                }
                photos.removeAll { it == "hero_gondia_stays" }
                photos.add(photoFile.absolutePath)
                Toast.makeText(context, "Photo uploaded from device!", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(context, "Failed to load photo: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Function to acquire high-accuracy GPS location
    fun acquireHighAccuracyLocation() {
        isDetectingLocation = true
        try {
            val tokenSource = CancellationTokenSource()
            fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, tokenSource.token)
                .addOnSuccessListener { loc ->
                    isDetectingLocation = false
                    if (loc != null) {
                        latitude = loc.latitude
                        longitude = loc.longitude
                        locationAccuracyInfo = "GPS Locked: ±${loc.accuracy.toInt()}m accuracy"

                        // Automatically map to nearest Gondia locality
                        val closest = GONDIA_LOCALITIES.minByOrNull {
                            val dLat = it.latitude - loc.latitude
                            val dLng = it.longitude - loc.longitude
                            dLat * dLat + dLng * dLng
                        }
                        if (closest != null) {
                            locality = closest.name
                        }
                        Toast.makeText(context, "Exact property location pinned via GPS!", Toast.LENGTH_SHORT).show()
                    } else {
                        // Fallback to last known location
                        fusedLocationClient.lastLocation.addOnSuccessListener { lastLoc ->
                            if (lastLoc != null) {
                                latitude = lastLoc.latitude
                                longitude = lastLoc.longitude
                                locationAccuracyInfo = "GPS Last Known: ±${lastLoc.accuracy.toInt()}m"
                                Toast.makeText(context, "Location pinned using last known GPS", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(context, "GPS signal not available. Please ensure Location is ON.", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                }
                .addOnFailureListener {
                    isDetectingLocation = false
                    Toast.makeText(context, "GPS acquisition failed: ${it.message}", Toast.LENGTH_SHORT).show()
                }
        } catch (e: SecurityException) {
            isDetectingLocation = false
            Toast.makeText(context, "Location permission missing", Toast.LENGTH_SHORT).show()
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        val granted = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            acquireHighAccuracyLocation()
        } else {
            Toast.makeText(context, "Location permission required to pinpoint property on map", Toast.LENGTH_SHORT).show()
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
            // Photos Management Section with Camera & Device Upload
            Text(
                text = "Property Photos (Camera & Gallery)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Snap or upload photos of room, parking, balcony, view, washrooms, entrance, etc.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(10.dp))

            // Camera Access and Gallery Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = {
                        val hasCamera = ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED
                        if (hasCamera) {
                            cameraLauncher.launch(null)
                        } else {
                            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .testTag("camera_access_button")
                ) {
                    Icon(imageVector = Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Take Photo", fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = { galleryLauncher.launch("image/*") },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .testTag("gallery_photo_button")
                ) {
                    Icon(imageVector = Icons.Default.AddPhotoAlternate, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Device Gallery", color = BluePrimary, fontWeight = FontWeight.SemiBold)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Photos Horizontal Scroll List
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                photos.forEachIndexed { index, photoPath ->
                    Box(modifier = Modifier.size(96.dp)) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxSize(),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            if (photoPath.isNotBlank() && photoPath != "hero_gondia_stays") {
                                AsyncImage(
                                    model = photoPath,
                                    contentDescription = "Property photo ${index + 1}",
                                    contentScale = ContentScale.Crop,
                                    placeholder = painterResource(id = R.drawable.hero_gondia_stays),
                                    error = painterResource(id = R.drawable.hero_gondia_stays),
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                Image(
                                    painter = painterResource(id = R.drawable.hero_gondia_stays),
                                    contentDescription = "Default cover",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }

                        // Remove photo button
                        IconButton(
                            onClick = {
                                photos.removeAt(index)
                                if (photos.isEmpty()) {
                                    photos.add("hero_gondia_stays")
                                }
                            },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .size(24.dp)
                                .background(Color.Black.copy(alpha = 0.65f), CircleShape)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Remove photo",
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                        }

                        // Index badge
                        Surface(
                            shape = RoundedCornerShape(bottomStart = 8.dp, topEnd = 6.dp),
                            color = if (index == 0) AccentAmber else Color.Black.copy(alpha = 0.65f),
                            contentColor = Color.White,
                            modifier = Modifier.align(Alignment.BottomStart)
                        ) {
                            Text(
                                text = if (index == 0) "Cover" else "#${index + 1}",
                                style = MaterialTheme.typography.labelSmall,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
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

            Spacer(modifier = Modifier.height(14.dp))

            // Precise Location on Gondia Map Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "Accurate Location on Gondia Map*",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = BluePrimary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Pinpoint your property accurately so tenants can locate it on Google Maps.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // GPS Pinpoint Button
                    Button(
                        onClick = {
                            val fineGranted = ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.ACCESS_FINE_LOCATION
                            ) == PackageManager.PERMISSION_GRANTED
                            if (fineGranted) {
                                acquireHighAccuracyLocation()
                            } else {
                                locationPermissionLauncher.launch(
                                    arrayOf(
                                        Manifest.permission.ACCESS_FINE_LOCATION,
                                        Manifest.permission.ACCESS_COARSE_LOCATION
                                    )
                                )
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                        shape = RoundedCornerShape(10.dp),
                        enabled = !isDetectingLocation,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp)
                            .testTag("detect_gps_location_button")
                    ) {
                        Icon(imageVector = Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isDetectingLocation) "Acquiring GPS Signal..." else "Pinpoint via Device GPS",
                            fontWeight = FontWeight.Bold
                        )
                    }

                    if (locationAccuracyInfo != null) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, tint = AccentGreen, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = locationAccuracyInfo!!,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = AccentGreen
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Coordinates & Google Maps Test Preview
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Exact Pin Coordinates",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "%.5f° N, %.5f° E".format(latitude, longitude),
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = BluePrimary
                            )
                        }

                        OutlinedButton(
                            onClick = {
                                val uri = Uri.parse("https://www.google.com/maps/search/?api=1&query=$latitude,$longitude")
                                context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                            },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Icon(imageVector = Icons.Default.OpenInNew, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Test on Google Maps", fontSize = 11.sp, color = BluePrimary)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Fine-Tune Pin Position (±30m steps for exact building accuracy)
                    Text(
                        text = "Fine-Tune Pin (Exact building location):",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        OutlinedButton(
                            onClick = { latitude += 0.0003 },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f).height(34.dp),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.KeyboardArrowUp, contentDescription = null, modifier = Modifier.size(16.dp))
                            Text("North", fontSize = 10.sp)
                        }
                        OutlinedButton(
                            onClick = { latitude -= 0.0003 },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f).height(34.dp),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.KeyboardArrowDown, contentDescription = null, modifier = Modifier.size(16.dp))
                            Text("South", fontSize = 10.sp)
                        }
                        OutlinedButton(
                            onClick = { longitude -= 0.0003 },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f).height(34.dp),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.KeyboardArrowLeft, contentDescription = null, modifier = Modifier.size(16.dp))
                            Text("West", fontSize = 10.sp)
                        }
                        OutlinedButton(
                            onClick = { longitude += 0.0003 },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f).height(34.dp),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(16.dp))
                            Text("East", fontSize = 10.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

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
                        onClick = {
                            locality = loc.name
                            if (locationAccuracyInfo == null) {
                                latitude = loc.latitude
                                longitude = loc.longitude
                            }
                        },
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

            // Absolute Free Listing Notice
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
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "100% Free Listing Policy (₹0 Commission)",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Absolute free listing for all owners in Gondia. No platform charges, zero commission fees.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Featured Promotion Option (Optional)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isFeaturedPlan) AccentAmber.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant
                ),
                border = if (isFeaturedPlan) androidx.compose.foundation.BorderStroke(1.5.dp, AccentAmber) else null
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = if (isFeaturedPlan) AccentAmber else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Highlight as Featured Listing",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        FilterChip(
                            selected = isFeaturedPlan,
                            onClick = { isFeaturedPlan = !isFeaturedPlan },
                            label = { Text(if (isFeaturedPlan) "Featured Active" else "Standard (Free)") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = AccentAmber,
                                selectedLabelColor = Color.White
                            )
                        )
                    }

                    if (isFeaturedPlan) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Free promotional boost included: Appears at the top of tenant search results and marked with golden badge.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

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
                        listOf(1, 2, 3, 4).forEach { num ->
                            FilterChip(
                                selected = bedrooms == num,
                                onClick = { bedrooms = num },
                                label = { Text("$num BHK") },
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
                        listOf(1, 2, 3).forEach { num ->
                            FilterChip(
                                selected = bathrooms == num,
                                onClick = { bathrooms = num },
                                label = { Text("$num") },
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

            // Owner Contact Information (Phone & WhatsApp) Section
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = null,
                            tint = BluePrimary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Owner Contact & WhatsApp Details*",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = BluePrimary
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Add your contact number so tenants can call you and message you on WhatsApp about this listing.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = ownerName,
                        onValueChange = { ownerName = it },
                        label = { Text("Owner / Host Name*") },
                        placeholder = { Text("e.g. Ramesh Agrawal") },
                        leadingIcon = {
                            Icon(imageVector = Icons.Default.Person, contentDescription = null, tint = BluePrimary)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_owner_name"),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = ownerPhone,
                        onValueChange = { input ->
                            // Allow digits, plus, hyphens, spaces
                            ownerPhone = input.filter { it.isDigit() || it == '+' || it == ' ' || it == '-' }
                        },
                        label = { Text("Owner Contact Number (WhatsApp / Calling)*") },
                        placeholder = { Text("e.g. 9823012345 / +91 9823012345") },
                        leadingIcon = {
                            Icon(imageVector = Icons.Default.Phone, contentDescription = null, tint = BluePrimary)
                        },
                        trailingIcon = {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFF25D366).copy(alpha = 0.15f),
                                modifier = Modifier.padding(end = 8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Chat,
                                        contentDescription = null,
                                        tint = Color(0xFF25D366),
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        text = "WhatsApp",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF25D366)
                                    )
                                }
                            }
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_owner_phone"),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )

                    if (ownerPhone.isNotBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Preview: ${com.example.util.ContactHelper.formatDisplayPhone(ownerPhone)}",
                                style = MaterialTheme.typography.labelSmall,
                                color = BluePrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "WhatsApp Ready",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF16A34A),
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedButton(
                            onClick = {
                                val testMsg = "Hello $ownerName, testing WhatsApp contact for my listing on Gondia Stay app."
                                com.example.util.ContactHelper.openWhatsApp(context, ownerPhone, testMsg)
                            },
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(40.dp)
                                .testTag("preview_whatsapp_button")
                        ) {
                            Icon(imageVector = Icons.Default.Chat, contentDescription = null, tint = Color(0xFF25D366), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Test WhatsApp Message Link", fontSize = 12.sp, color = Color(0xFF16A34A), fontWeight = FontWeight.Bold)
                        }
                    }
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
                    if (title.isBlank() || address.isBlank() || monthlyRentText.isBlank() || securityDepositText.isBlank() || ownerPhone.isBlank() || ownerName.isBlank()) {
                        validationError = "Please fill in all mandatory fields (Title, Address, Rent, Deposit, Owner Name & Contact Number)."
                        return@Button
                    }
                    val rent = monthlyRentText.toIntOrNull() ?: 0
                    val deposit = securityDepositText.toIntOrNull() ?: 0

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
                        ownerName = ownerName.trim(),
                        ownerPhone = ownerPhone.trim(),
                        ownerPreferredContact = contactMethod,
                        status = existingProperty?.status ?: ListingStatus.APPROVED,
                        latitude = latitude,
                        longitude = longitude,
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
