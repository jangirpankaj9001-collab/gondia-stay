package com.example.ui.components

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
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
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import com.example.R
import com.example.data.model.GONDIA_LOCALITIES
import com.example.data.model.PropertyListing
import com.example.ui.theme.AccentAmber
import com.example.ui.theme.BlueContainer
import com.example.ui.theme.BluePrimary
import kotlin.math.roundToInt

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

    var zoom by remember { mutableFloatStateOf(1f) }
    var panX by remember { mutableFloatStateOf(0f) }
    var panY by remember { mutableFloatStateOf(0f) }

    var activeLocalityFilter by remember { mutableStateOf("All") }

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

        // Custom Vector Map of Gondia City Canvas
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTransformGestures { _, pan, gestureZoom, _ ->
                        zoom = (zoom * gestureZoom).coerceIn(0.7f, 3.5f)
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
                    color = Color.White.copy(alpha = 0.85f),
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

        // Top Locality Quick Chips
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
                        text = "Gondia Localities:",
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

                    GONDIA_LOCALITIES.forEach { loc ->
                        FilterChip(
                            selected = activeLocalityFilter == loc.name,
                            onClick = {
                                activeLocalityFilter = loc.name
                                // Pan toward this locality
                                val target = projectCoordinates(loc.latitude, loc.longitude)
                                panX += (widthPx / 2f - target.x) * 0.7f
                                panY += (heightPx / 2f - target.y) * 0.7f
                                zoom = 1.6f
                                // Select first property in locality if any
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

        // Zoom & Recenter Controls (Right Side)
        Column(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FloatingMapButton(
                icon = Icons.Default.Add,
                onClick = { zoom = (zoom * 1.3f).coerceAtMost(3.5f) }
            )
            FloatingMapButton(
                icon = Icons.Default.Remove,
                onClick = { zoom = (zoom / 1.3f).coerceAtLeast(0.7f) }
            )
            FloatingMapButton(
                icon = Icons.Default.MyLocation,
                onClick = {
                    zoom = 1f
                    panX = 0f
                    panY = 0f
                    activeLocalityFilter = "All"
                }
            )
        }

        // Selected Property Preview Card (Bottom of Map)
        if (selectedProperty != null) {
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
                            // Thumbnail Photo
                            Image(
                                painter = painterResource(id = R.drawable.hero_gondia_stays),
                                contentDescription = selectedProperty.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(76.dp)
                                    .clip(RoundedCornerShape(12.dp))
                            )

                            Spacer(modifier = Modifier.width(12.dp))

                            Column {
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

                    // Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Open in Google Maps navigation
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    openGoogleMaps(
                                        context,
                                        selectedProperty.latitude,
                                        selectedProperty.longitude,
                                        "${selectedProperty.title}, ${selectedProperty.locality}, Gondia"
                                    )
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 10.dp, horizontal = 8.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Navigation,
                                    contentDescription = null,
                                    tint = BluePrimary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Google Maps",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = BluePrimary
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
                                modifier = Modifier.padding(vertical = 10.dp, horizontal = 8.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "View Details",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Icon(
                                    imageVector = Icons.Default.ArrowForward,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
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
    onClick: () -> Unit
) {
    Surface(
        shape = CircleShape,
        color = Color.White,
        shadowElevation = 4.dp,
        modifier = Modifier
            .size(42.dp)
            .clickable(onClick = onClick)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color(0xFF37474F),
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
    // Map Background canvas styling
    val centerX = width / 2f
    val centerY = height / 2f

    fun transform(x: Float, y: Float): Offset {
        return Offset(
            centerX + (x - centerX) * zoom + panX,
            centerY + (y - centerY) * zoom + panY
        )
    }

    // Green Parks & Open Areas in Gondia
    val park1 = Path().apply {
        val p1 = transform(width * 0.15f, height * 0.25f)
        val p2 = transform(width * 0.35f, height * 0.22f)
        val p3 = transform(width * 0.38f, height * 0.40f)
        val p4 = transform(width * 0.18f, height * 0.38f)
        moveTo(p1.x, p1.y)
        lineTo(p2.x, p2.y)
        lineTo(p3.x, p3.y)
        lineTo(p4.x, p4.y)
        close()
    }
    drawPath(park1, color = Color(0xFFDCECC9))

    val park2 = Path().apply {
        val p1 = transform(width * 0.65f, height * 0.55f)
        val p2 = transform(width * 0.88f, height * 0.52f)
        val p3 = transform(width * 0.85f, height * 0.75f)
        val p4 = transform(width * 0.62f, height * 0.70f)
        moveTo(p1.x, p1.y)
        lineTo(p2.x, p2.y)
        lineTo(p3.x, p3.y)
        lineTo(p4.x, p4.y)
        close()
    }
    drawPath(park2, color = Color(0xFFDCECC9))

    // Water Stream / Pond in Gondia (e.g. Pangoli River canal)
    val waterPath = Path().apply {
        val start = transform(width * 0.05f, height * 0.85f)
        moveTo(start.x, start.y)
        val c1 = transform(width * 0.35f, height * 0.80f)
        val c2 = transform(width * 0.55f, height * 0.90f)
        val end = transform(width * 0.95f, height * 0.82f)
        cubicTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y)
    }
    drawPath(waterPath, color = Color(0xFFB3E5FC), style = Stroke(width = 16f * zoom))

    // Railway Line (Gondia Junction Trunk Route: Howrah-Mumbai Mainline)
    val railwayPath = Path().apply {
        val p1 = transform(-width * 0.2f, height * 0.45f)
        val p2 = transform(width * 1.2f, height * 0.42f)
        moveTo(p1.x, p1.y)
        lineTo(p2.x, p2.y)
    }
    // Railway bed
    drawPath(railwayPath, color = Color(0xFF78909C), style = Stroke(width = 8f * zoom))
    // Railway dashed sleepers
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
        drawPath(path, color = Color(0xFFFFFFFF), style = Stroke(width = 12f * zoom))
        drawPath(path, color = Color(0xFFCFD8DC), style = Stroke(width = 2f * zoom))
    }
}

private fun openGoogleMaps(context: Context, lat: Double, lng: Double, label: String) {
    try {
        val uri = Uri.parse("geo:$lat,$lng?q=$lat,$lng(${Uri.encode(label)})")
        val mapIntent = Intent(Intent.ACTION_VIEW, uri)
        mapIntent.setPackage("com.google.android.apps.maps")
        if (mapIntent.resolveActivity(context.packageManager) != null) {
            context.startActivity(mapIntent)
        } else {
            // Fallback to web browser or general map handler
            val fallbackIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=$lat,$lng"))
            context.startActivity(fallbackIntent)
        }
    } catch (e: Exception) {
        val fallbackIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=$lat,$lng"))
        context.startActivity(fallbackIntent)
    }
}
