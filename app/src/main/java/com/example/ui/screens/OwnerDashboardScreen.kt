package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HomeWork
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.ListingStatus
import com.example.data.model.PropertyListing
import com.example.ui.components.PropertyCard
import com.example.ui.theme.AccentAmber
import com.example.ui.theme.AccentGreen
import com.example.ui.theme.AccentRed
import com.example.ui.theme.BlueContainer
import com.example.ui.theme.BluePrimary
import com.example.ui.viewmodel.GondiaViewModel

@Composable
fun OwnerDashboardScreen(
    viewModel: GondiaViewModel,
    onAddNewProperty: () -> Unit,
    onEditProperty: (PropertyListing) -> Unit,
    onViewProperty: (PropertyListing) -> Unit,
    modifier: Modifier = Modifier
) {
    val ownerProperties by viewModel.ownerProperties.collectAsState()
    val currentOwnerId by viewModel.currentOwnerId.collectAsState()
    val currentOwnerName by viewModel.currentOwnerName.collectAsState()
    val currentOwnerPhone by viewModel.currentOwnerPhone.collectAsState()

    var showProfileSwitcher by remember { mutableStateOf(false) }
    var propertyToDelete by remember { mutableStateOf<PropertyListing?>(null) }

    val basicCount = ownerProperties.count { !it.isFeatured }
    val featuredCount = ownerProperties.count { it.isFeatured }
    val totalUnits = ownerProperties.size
    val approvedCount = ownerProperties.count { it.status == ListingStatus.APPROVED }
    val pendingCount = ownerProperties.count { it.status == ListingStatus.PENDING }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("owner_dashboard_screen"),
        contentPadding = PaddingValues(bottom = 80.dp)
    ) {
        // Owner Profile & Switcher Header
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Owner Dashboard",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = BluePrimary
                        )
                        Text(
                            text = "100% Absolute Free Listing for All Owners • ₹0 Commission",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Owner Switcher
                    Box {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = BlueContainer,
                            modifier = Modifier.testTag("owner_profile_switcher")
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Person,
                                    contentDescription = null,
                                    tint = BluePrimary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = currentOwnerName.split(" ").first(),
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = BluePrimary
                                )
                                IconButton(
                                    onClick = { showProfileSwitcher = true },
                                    modifier = Modifier.size(20.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ArrowDropDown,
                                        contentDescription = "Switch profile",
                                        tint = BluePrimary
                                    )
                                }
                            }
                        }

                        DropdownMenu(
                            expanded = showProfileSwitcher,
                            onDismissRequest = { showProfileSwitcher = false }
                        ) {
                            listOf(
                                Triple("owner_ramesh", "Ramesh Agrawal", "+919823012345"),
                                Triple("owner_sharma", "Satish Sharma", "+919422156789"),
                                Triple("owner_patel", "Prakash Patel", "+919890123456"),
                                Triple("owner_meshram", "Anil Meshram", "+919403889900")
                            ).forEach { (id, name, phone) ->
                                DropdownMenuItem(
                                    text = {
                                        Column {
                                            Text(text = name, fontWeight = FontWeight.Bold)
                                            Text(text = "ID: $id • $phone", style = MaterialTheme.typography.labelSmall)
                                        }
                                    },
                                    onClick = {
                                        viewModel.switchOwnerProfile(id, name, phone)
                                        showProfileSwitcher = false
                                    }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Security Isolation Badge
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFF1F5F9),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Security,
                            contentDescription = null,
                            tint = AccentGreen,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Security Active: You can only edit or promote listings owned by '$currentOwnerName'. Other owners' listings cannot be modified.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Absolute Free Listing Overview Cards
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = BluePrimary)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "My Properties",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                            Text(
                                text = "100% Free",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White
                            )
                            Text(
                                text = "$totalUnits active units in Gondia",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = AccentGreen,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Platform Charges",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = "₹0 / mo",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.ExtraBold,
                                color = AccentGreen
                            )
                            Text(
                                text = "Zero Commission & Fees",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Plan Explanation Banner
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFE8F5E9),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = AccentGreen,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Gondia Stay Advantage: Absolute Free Listing for All Owners",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF2E7D32)
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "• 100% Free Forever: No listing fee, no renewal charges, and zero platform commission.\n• Free Highlighting: Feature your listing for top search placement at ₹0 cost.\n• Direct Tenant Connect: Direct calls & WhatsApp chats with interested students and families.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF1B5E20),
                            fontSize = 11.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Status Counts
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    StatusChip(
                        icon = Icons.Default.CheckCircle,
                        label = "Approved & Live",
                        count = approvedCount,
                        color = AccentGreen,
                        modifier = Modifier.weight(1f)
                    )
                    StatusChip(
                        icon = Icons.Default.HourglassTop,
                        label = "Pending Review",
                        count = pendingCount,
                        color = AccentAmber,
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Add Property Button
                Button(
                    onClick = onAddNewProperty,
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("add_new_property_cta")
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Add New Listing (Free)",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                Text(
                    text = "My Gondia Properties (${ownerProperties.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Listings or Empty State
        if (ownerProperties.isEmpty()) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Default.HomeWork,
                        contentDescription = null,
                        tint = BluePrimary,
                        modifier = Modifier.size(54.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "No Listings Added Yet",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Tap 'Add New Listing (Free)' above to post your flat, PG or room in Gondia with 0 commission.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            items(ownerProperties, key = { it.id }) { property ->
                PropertyCard(
                    property = property,
                    onClick = { onViewProperty(property) },
                    onToggleFavorite = { viewModel.toggleFavorite(property) },
                    showOwnerStatus = true,
                    onEdit = { onEditProperty(property) },
                    onDelete = { propertyToDelete = property },
                    onToggleFeatured = { viewModel.toggleFeaturedPlan(property) },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        }
    }

    // Delete Confirmation Dialog
    if (propertyToDelete != null) {
        val target = propertyToDelete!!
        AlertDialog(
            onDismissRequest = { propertyToDelete = null },
            title = { Text("Delete Property Listing?") },
            text = { Text("Are you sure you want to remove '${target.title}' in ${target.locality}, Gondia? This cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteProperty(target)
                        propertyToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AccentRed)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { propertyToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun StatusChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    count: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp,
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = color.copy(alpha = 0.15f),
                modifier = Modifier.size(28.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(text = "$count", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
            }
        }
    }
}
