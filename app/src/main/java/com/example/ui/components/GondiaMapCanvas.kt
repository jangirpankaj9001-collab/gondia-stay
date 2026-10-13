package com.example.ui.components

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.example.R
import com.example.data.model.GONDIA_LOCALITIES
import com.example.data.model.PropertyListing
import com.example.ui.theme.AccentAmber
import com.example.ui.theme.AccentGreen
import com.example.ui.theme.BlueContainer
import com.example.ui.theme.BluePrimary
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

@Composable
fun GondiaMapCanvas(
    properties: List<PropertyListing>,
    selectedProperty: PropertyListing?,
    onSelectProperty: (PropertyListing?) -> Unit,
    onViewPropertyDetails: (PropertyListing) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    // Gondia Geographic bounds for map projection
    // Center ~ (21.4604, 80.1961)
    val minLat = 21.4400
    val maxLat = 21.4900
    val minLng = 80.1750
    val maxLng = 80.2250

    var zoom by remember { mutableFloatStateOf(1.0f) }
    var panX by remember { mutableFloatStateOf(0f) }
    var panY by remember { mutableFloatStateOf(0f) }

    var activeLocalityFilter by remember { mutableStateOf("All") }

    // Live Tenant GPS Location State
    var tenantLat by remember { mutableStateOf<Double?>(null) }
    var tenantLng by remember { mutableStateOf<Double?>(null) }
    var tenantAccuracy by remember { mutableStateOf<Float?>(null) }
    var isLocatingTenant by remember { mutableStateOf(false) }

    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }

    // Infinite pulse animation for tenant location beacon
    val infiniteTransition = rememberInfiniteTransition(label = "tenant_pulse")
    val pulseSize by infiniteTransition.animateFloat(
        initialValue = 18f,
        targetValue = 46f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "pulse_size"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.55f,
        targetValue = 0.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "pulse_alpha"
    )

    BoxWithConstraints(modifier = modifier.fillMaxSize().background(Color(0xFFE8ECEF))) {
        val widthPx = constraints.maxWidth.toFloat()
        val heightPx = constraints.maxHeight.toFloat()

        fun projectCoordinates(lat: Double, lng: Double): Offset {
            val normalizedX = ((lng - minLng) / (maxLng - minLng)).toFloat()
            // Invert Y because latitude increases northward (up)
            val normalizedY = (1f - ((lat - minLat) / (maxLat - minLat)).toFloat())

            val rawX = normalizedX * widthPx
            val rawY = normalizedY * heightPx

            val centerX = widthPx / 2f
            val centerY = heightPx / 2f

            val transformedX = centerX + (rawX - centerX) * zoom + panX
            val transformedY = centerY + (rawY - centerY) * zoom + panY
            return Offset(transformedX, transformedY)
        }

        // High Accuracy Tenant Recenter Action (Smooth, precise, and handles in/out of Gondia)
        fun recenterToTenantLocation() {
            isLocatingTenant = true
            try {
                val tokenSource = CancellationTokenSource()
                fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, tokenSource.token)
                    .addOnSuccessListener { loc ->
                        isLocatingTenant = false
                        if (loc != null) {
                            tenantLat = loc.latitude
                            tenantLng = loc.longitude
                            tenantAccuracy = loc.accuracy

                            val distToGondia = computeDistanceKm(loc.latitude, loc.longitude, 21.4604, 80.1961)
                            if (distToGondia > 35.0) {
                                // Device GPS is located outside Gondia city limits (e.g. testing in emulator)
                                panX = 0f
                                panY = 0f
                                zoom = 1.35f
                                Toast.makeText(
                                    context,
                                    "GPS active (%.1f km away). Centered on Gondia listings with route directions.".format(distToGondia),
                                    Toast.LENGTH_LONG
                                ).show()
                            } else {
                                // Smoothly center directly on tenant's exact location in Gondia
                                val targetZoom = 2.0f
                                val normX = ((loc.longitude - minLng) / (maxLng - minLng)).toFloat()
                                val normY = (1f - ((loc.latitude - minLat) / (maxLat - minLat)).toFloat())
                                val rawX = normX * widthPx
                                val rawY = normY * heightPx
                                val centerX = widthPx / 2f
                                val centerY = heightPx / 2f

                                panX = - (rawX - centerX) * targetZoom
                                panY = - (rawY - centerY) * targetZoom
                                zoom = targetZoom
                                activeLocalityFilter = "Near Me"

                                Toast.makeText(
                                    context,
                                    "Smoothly centered to your accurate location in Gondia (±${loc.accuracy.toInt()}m)!",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        } else {
                            // Fallback to last known location
                            fusedLocationClient.lastLocation.addOnSuccessListener { lastLoc ->
                                if (lastLoc != null) {
                                    tenantLat = lastLoc.latitude
                                    tenantLng = lastLoc.longitude
                                    tenantAccuracy = lastLoc.accuracy
                                    val distToGondia = computeDistanceKm(lastLoc.latitude, lastLoc.longitude, 21.4604, 80.1961)
                                    if (distToGondia > 35.0) {
                                        panX = 0f
                                        panY = 0f
                                        zoom = 1.35f
                                        Toast.makeText(context, "Location acquired. Centered on Gondia rental stays.", Toast.LENGTH_SHORT).show()
                                    } else {
                                        val targetZoom = 1.85f
                                        val normX = ((lastLoc.longitude - minLng) / (maxLng - minLng)).toFloat()
                                        val normY = (1f - ((lastLoc.latitude - minLat) / (maxLat - minLat)).toFloat())
                                        val rawX = normX * widthPx
                                        val rawY = normY * heightPx
                                        val centerX = widthPx / 2f
                                        val centerY = heightPx / 2f
                                        panX = - (rawX - centerX) * targetZoom
                                        panY = - (rawY - centerY) * targetZoom
                                        zoom = targetZoom
                                        Toast.makeText(context, "Centered to last known location in Gondia", Toast.LENGTH_SHORT).show()
                                    }
                                } else {
                                    panX = 0f
                                    panY = 0f
                                    zoom = 1.35f
                                    Toast.makeText(context, "GPS signal unavailable. Centered on Gondia center.", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    }
                    .addOnFailureListener {
                        isLocatingTenant = false
                        panX = 0f
                        panY = 0f
                        zoom = 1.35f
                        Toast.makeText(context, "Centered on Gondia city center", Toast.LENGTH_SHORT).show()
                    }
            } catch (e: SecurityException) {
                isLocatingTenant = false
                Toast.makeText(context, "Location permission missing", Toast.LENGTH_SHORT).show()
            }
        }

        val tenantPermissionLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.RequestMultiplePermissions()
        ) { perms ->
            val granted = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                    perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
            if (granted) {
                recenterToTenantLocation()
            } else {
                Toast.makeText(context, "Location permission is required to recenter to tenant location", Toast.LENGTH_SHORT).show()
            }
        }

        // Custom Vector Map of Gondia City Canvas
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTransformGestures { _, pan, gestureZoom, _ ->
                        zoom = (zoom * gestureZoom).coerceIn(0.7f, 4.0f)
                        panX += pan.x
                        panY += pan.y
                    }
                }
        ) {
            drawGondiaMapBackground(widthPx, heightPx, zoom, panX, panY)
        }

        // Gondia Landmark Labels
        GONDIA_LOCALITIES.forEach { loc ->
            val pos = projectCoordinates(loc.latitude, loc.longitude)
            if (pos.x in -100f..(widthPx + 100f) && pos.y in -100f..(heightPx + 100f)) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = Color.White.copy(alpha = 0.88f),
                    shadowElevation = 1.dp,
                    modifier = Modifier.offset {
                        IntOffset(pos.x.roundToInt() - 40, pos.y.roundToInt() + 18)
                    }
                ) {
                    Text(
                        text = loc.name,
                        style = MaterialTheme.typography.labelSmall,
                        fontSize = (10 * zoom.coerceIn(0.85f, 1.25f)).sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF455A64),
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                    )
                }
            }
        }

        // Property Pins
        properties.forEach { property ->
            val pos = projectCoordinates(property.latitude, property.longitude)
            val isSelected = selectedProperty?.id == property.id

            if (pos.x in -60f..(widthPx + 60f) && pos.y in -60f..(heightPx + 60f)) {
                Box(
                    modifier = Modifier
                        .offset {
                            IntOffset(pos.x.roundToInt() - 36, pos.y.roundToInt() - 44)
                        }
                        .clickable {
                            onSelectProperty(if (isSelected) null else property)
                        }
                        .testTag("map_pin_${property.id}")
                ) {
                    // Custom Pin with Rent Tag
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) AccentAmber else BluePrimary,
                        shadowElevation = if (isSelected) 8.dp else 4.dp,
                        border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, Color.White) else null
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Home,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "₹${(property.monthlyRent / 1000f).let { if (it % 1 == 0f) "${it.toInt()}k" else "%.1fk".format(it) }}",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }

        // Live Tenant GPS Location Beacon (Pulsing blue radar pin)
        if (tenantLat != null && tenantLng != null) {
            val tenantPos = projectCoordinates(tenantLat!!, tenantLng!!)
            if (tenantPos.x in -50f..(widthPx + 50f) && tenantPos.y in -50f..(heightPx + 50f)) {
                Box(
                    modifier = Modifier
                        .offset {
                            IntOffset(tenantPos.x.roundToInt() - 25, tenantPos.y.roundToInt() - 25)
                        }
                        .size(50.dp),
                    contentAlignment = Alignment.Center
                ) {
                    // Radar animated ripple
                    Box(
                        modifier = Modifier
                            .size(pulseSize.dp)
                            .background(Color(0xFF2563EB).copy(alpha = pulseAlpha), CircleShape)
                    )

                    // Core Tenant Dot with white border
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFF2563EB),
                        border = androidx.compose.foundation.BorderStroke(2.5.dp, Color.White),
                        shadowElevation = 4.dp,
                        modifier = Modifier.size(18.dp)
                    ) {}

                    // "You (Tenant)" Floating Label Pill
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFF1E293B),
                        shadowElevation = 2.dp,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .offset(y = 14.dp)
                    ) {
                        Text(
                            text = "You",
                            style = MaterialTheme.typography.labelSmall,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }
            }
        }

        // Top Locality Quick Filter Chips
        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .padding(top = 12.dp)
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
                shadowElevation = 3.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Gondia:",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = BluePrimary
                    )

                    FilterChip(
                        selected = activeLocalityFilter == "All",
                        onClick = {
                            activeLocalityFilter = "All"
                            panX = 0f
                            panY = 0f
                            zoom = 1f
                            onSelectProperty(null)
                        },
                        label = { Text("All Gondia") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary,
                            selectedLabelColor = Color.White
                        )
                    )

                    if (tenantLat != null && tenantLng != null) {
                        FilterChip(
                            selected = activeLocalityFilter == "Near Me",
                            onClick = {
                                activeLocalityFilter = "Near Me"
                                val target = projectCoordinates(tenantLat!!, tenantLng!!)
                                panX += (widthPx / 2f - target.x)
                                panY += (heightPx / 2f - target.y)
                                zoom = 2.0f
                            },
                            leadingIcon = {
                                Icon(imageVector = Icons.Default.NearMe, contentDescription = null, modifier = Modifier.size(14.dp))
                            },
                            label = { Text("Near Me") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BluePrimary,
                                selectedLabelColor = Color.White
                            )
                        )
                    }

                    GONDIA_LOCALITIES.forEach { loc ->
                        FilterChip(
                            selected = activeLocalityFilter == loc.name,
                            onClick = {
                                activeLocalityFilter = loc.name
                                val target = projectCoordinates(loc.latitude, loc.longitude)
                                panX += (widthPx / 2f - target.x) * 0.7f
                                panY += (heightPx / 2f - target.y) * 0.7f
                                zoom = 1.6f
                                val match = properties.firstOrNull { it.locality.equals(loc.name, ignoreCase = true) }
                                if (match != null) onSelectProperty(match)
                            },
                            label = { Text(loc.name) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BluePrimary,
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }
            }
        }

        // Zoom, Recenter & Google Maps Controls (Right Side)
        Column(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Open Google Maps App Button
            FloatingMapButton(
                icon = Icons.Default.Map,
                tint = Color(0xFF16A34A),
                description = "Open Gondia in Google Maps",
                onClick = {
                    openGoogleMapsOverview(context)
                }
            )

            FloatingMapButton(
                icon = Icons.Default.Add,
                description = "Zoom In",
                onClick = { zoom = (zoom * 1.3f).coerceAtMost(4.0f) }
            )
            FloatingMapButton(
                icon = Icons.Default.Remove,
                description = "Zoom Out",
                onClick = { zoom = (zoom / 1.3f).coerceAtLeast(0.7f) }
            )

            // Recenter Location of Tenant Button (Smooth & Accurate GPS)
            Surface(
                shape = CircleShape,
                color = if (isLocatingTenant) AccentAmber else MaterialTheme.colorScheme.surface,
                shadowElevation = 5.dp,
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .clickable {
                        val hasFine = ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.ACCESS_FINE_LOCATION
                        ) == PackageManager.PERMISSION_GRANTED
                        if (hasFine) {
                            recenterToTenantLocation()
                        } else {
                            tenantPermissionLauncher.launch(
                                arrayOf(
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                )
                            )
                        }
                    }
                    .testTag("recenter_tenant_location_button")
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    if (isLocatingTenant) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(24.dp),
                            strokeWidth = 2.5.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.MyLocation,
                            contentDescription = "Recenter on Tenant Location",
                            tint = if (tenantLat != null) BluePrimary else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }

        // Selected Property Preview Card (Bottom of Map)
        if (selectedProperty != null) {
            val distKm = if (tenantLat != null && tenantLng != null) {
                computeDistanceKm(tenantLat!!, tenantLng!!, selectedProperty.latitude, selectedProperty.longitude)
            } else null

            Card(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .testTag("map_property_preview_card"),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Row(modifier = Modifier.weight(1f)) {
                            // Thumbnail Photo (Loads real uploaded photo or hero fallback)
                            val firstPhoto = selectedProperty.photos.firstOrNull { it.isNotBlank() && it != "hero_gondia_stays" }
                            if (firstPhoto != null) {
                                AsyncImage(
                                    model = firstPhoto,
                                    contentDescription = selectedProperty.title,
                                    contentScale = ContentScale.Crop,
                                    placeholder = painterResource(id = R.drawable.hero_gondia_stays),
                                    error = painterResource(id = R.drawable.hero_gondia_stays),
                                    modifier = Modifier
                                        .size(76.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                )
                            } else {
                                Image(
                                    painter = painterResource(id = R.drawable.hero_gondia_stays),
                                    contentDescription = selectedProperty.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(76.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = BlueContainer,
                                        contentColor = BluePrimary
                                    ) {
                                        Text(
                                            text = selectedProperty.propertyType.label,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }

                                    if (distKm != null) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = AccentGreen.copy(alpha = 0.15f),
                                            contentColor = AccentGreen
                                        ) {
                                            Text(
                                                text = "%.1f km away".format(distKm),
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 10.sp,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = selectedProperty.title,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )

                                Text(
                                    text = "${selectedProperty.locality}, Gondia",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = BluePrimary,
                                    fontWeight = FontWeight.SemiBold
                                )

                                Text(
                                    text = "₹${selectedProperty.monthlyRent}/month • Dep ₹${selectedProperty.securityDeposit}",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFD97706)
                                )
                            }
                        }

                        IconButton(
                            onClick = { onSelectProperty(null) },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Close, contentDescription = "Close preview")
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Action Buttons (Google Maps Route + WhatsApp Chat + View Details)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        // Open Google Maps Directions
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    openGoogleMapsDirections(
                                        context = context,
                                        destLat = selectedProperty.latitude,
                                        destLng = selectedProperty.longitude,
                                        destLabel = selectedProperty.title,
                                        originLat = tenantLat,
                                        originLng = tenantLng
                                    )
                                }
                                .testTag("open_google_maps_directions_button")
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Directions,
                                    contentDescription = null,
                                    tint = BluePrimary,
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Route",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = BluePrimary
                                )
                            }
                        }

                        // Direct WhatsApp Message Button
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF25D366),
                            contentColor = Color.White,
                            modifier = Modifier
                                .weight(1.1f)
                                .clickable {
                                    val msg = "Hello ${selectedProperty.ownerName}, I saw your property '${selectedProperty.title}' in ${selectedProperty.locality} on the Gondia Stay Map. Is it available for rent?"
                                    com.example.util.ContactHelper.openWhatsApp(context, selectedProperty.ownerPhone, msg)
                                }
                                .testTag("whatsapp_from_map_button")
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Chat,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "WhatsApp",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }

                        // View Full Listing details
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = BluePrimary,
                            contentColor = Color.White,
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onViewPropertyDetails(selectedProperty) }
                                .testTag("view_details_from_map_button")
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Details",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(2.dp))
                                Icon(
                                    imageVector = Icons.Default.ArrowForward,
                                    contentDescription = null,
                                    modifier = Modifier.size(13.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FloatingMapButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    description: String = "",
    tint: Color = MaterialTheme.colorScheme.onSurface
) {
    Surface(
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 4.dp,
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .clickable(onClick = onClick)
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            Icon(
                imageVector = icon,
                contentDescription = description,
                tint = tint,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

private fun DrawScope.drawGondiaMapBackground(
    width: Float,
    height: Float,
    zoom: Float,
    panX: Float,
    panY: Float
) {
    // Coordinate Transform Helper
    fun transform(x: Float, y: Float): Offset {
        val cx = width / 2f
        val cy = height / 2f
        return Offset(cx + (x - cx) * zoom + panX, cy + (y - cy) * zoom + panY)
    }

    // Wainganga Canal / Water Feature (Blue stroke)
    val waterPath = Path().apply {
        val p1 = transform(width * 0.05f, height * 0.15f)
        val p2 = transform(width * 0.40f, height * 0.35f)
        val p3 = transform(width * 0.85f, height * 0.85f)
        moveTo(p1.x, p1.y)
        quadraticTo(p2.x, p2.y, p3.x, p3.y)
    }
    drawPath(waterPath, color = Color(0xFF90CAF9), style = Stroke(width = 16f * zoom))

    // Railway Line across Gondia Junction (Howrah-Mumbai line)
    val railwayPath = Path().apply {
        val p1 = transform(width * 0.00f, height * 0.48f)
        val p2 = transform(width * 1.00f, height * 0.52f)
        moveTo(p1.x, p1.y)
        lineTo(p2.x, p2.y)
    }
    drawPath(railwayPath, color = Color(0xFF78909C), style = Stroke(width = 8f * zoom))
    drawPath(
        railwayPath,
        color = Color.White,
        style = Stroke(
            width = 4f * zoom,
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f * zoom, 8f * zoom))
        )
    )

    // Major Arterial Roads: Ring Road, Station Road, Balaghat Road
    val roads = listOf(
        // Outer Ring Road Loop
        listOf(
            transform(width * 0.10f, height * 0.20f),
            transform(width * 0.85f, height * 0.15f),
            transform(width * 0.90f, height * 0.75f),
            transform(width * 0.15f, height * 0.80f),
            transform(width * 0.10f, height * 0.20f)
        ),
        // Central Station Road
        listOf(
            transform(width * 0.50f, height * 0.05f),
            transform(width * 0.50f, height * 0.95f)
        ),
        // Civil Lines to Ram Nagar cross avenue
        listOf(
            transform(width * 0.15f, height * 0.55f),
            transform(width * 0.85f, height * 0.50f)
        ),
        // Kudwa Naka connecting road
        listOf(
            transform(width * 0.25f, height * 0.10f),
            transform(width * 0.75f, height * 0.65f)
        )
    )

    roads.forEach { pts ->
        val path = Path().apply {
            moveTo(pts[0].x, pts[0].y)
            for (i in 1 until pts.size) {
                lineTo(pts[i].x, pts[i].y)
            }
        }
        drawPath(path, color = Color(0xFFFFFFFF), style = Stroke(width = 10f * zoom))
        drawPath(path, color = Color(0xFFCFD8DC), style = Stroke(width = 2f * zoom))
    }
}

// Distance Calculation using Haversine Formula
private fun computeDistanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val earthRadiusKm = 6371.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2) * sin(dLat / 2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
            sin(dLon / 2) * sin(dLon / 2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return earthRadiusKm * c
}

// Direct Turn-by-Turn Navigation via Google Maps App / Web
private fun openGoogleMapsDirections(
    context: Context,
    destLat: Double,
    destLng: Double,
    destLabel: String,
    originLat: Double?,
    originLng: Double?
) {
    try {
        val url = if (originLat != null && originLng != null) {
            "https://www.google.com/maps/dir/?api=1&origin=$originLat,$originLng&destination=$destLat,$destLng&travelmode=driving"
        } else {
            "https://www.google.com/maps/dir/?api=1&destination=$destLat,$destLng&travelmode=driving"
        }
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    } catch (e: Exception) {
        val geoUri = Uri.parse("geo:$destLat,$destLng?q=$destLat,$destLng(${Uri.encode(destLabel)})")
        context.startActivity(Intent(Intent.ACTION_VIEW, geoUri))
    }
}

// Launch Google Maps Centered on Gondia
private fun openGoogleMapsOverview(context: Context) {
    try {
        val mapUri = Uri.parse("https://www.google.com/maps/search/Rental+Stays+in+Gondia+Maharashtra/@21.4604,80.1961,14z")
        val intent = Intent(Intent.ACTION_VIEW, mapUri)
        context.startActivity(intent)
    } catch (e: Exception) {
        val geoUri = Uri.parse("geo:21.4604,80.1961?q=Gondia,Maharashtra")
        context.startActivity(Intent(Intent.ACTION_VIEW, geoUri))
    }
}

// Launch WhatsApp Direct Chat with Owner
private fun openWhatsApp(context: Context, cleanPhone: String, message: String) {
    try {
        val url = "https://wa.me/$cleanPhone?text=${Uri.encode(message)}"
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    } catch (e: Exception) {
        Toast.makeText(context, "Unable to open WhatsApp: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
    }
}
