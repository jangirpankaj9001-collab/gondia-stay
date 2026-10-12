package com.example.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.model.FurnishingStatus
import com.example.ui.theme.BluePrimary
import com.example.ui.viewmodel.FilterCriteria

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FilterBottomSheet(
    currentFilter: FilterCriteria,
    onApply: (FilterCriteria) -> Unit,
    onReset: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var minRent by remember { mutableFloatStateOf(currentFilter.minRent.toFloat()) }
    var maxRent by remember { mutableFloatStateOf(currentFilter.maxRent.toFloat().coerceAtLeast(5000f)) }
    var selectedBedrooms by remember { mutableIntStateOf(currentFilter.bedrooms) }
    var selectedFurnishing by remember { mutableStateOf(currentFilter.furnishing) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Filter Listings",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "Gondia, MH",
                    style = MaterialTheme.typography.labelMedium,
                    color = BluePrimary,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Rent Range Section
            Text(
                text = "Monthly Rent Range (INR)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Min: ₹${minRent.toInt()}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = BluePrimary
                )
                Text(
                    text = "Max: ₹${maxRent.toInt()}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = BluePrimary
                )
            }

            RangeSlider(
                value = minRent..maxRent,
                onValueChange = { range ->
                    minRent = (range.start / 500).toInt() * 500f
                    maxRent = (range.endInclusive / 500).toInt() * 500f
                },
                valueRange = 1000f..30000f,
                steps = 57,
                colors = SliderDefaults.colors(
                    thumbColor = BluePrimary,
                    activeTrackColor = BluePrimary
                ),
                modifier = Modifier.fillMaxWidth()
            )

            // Quick Rent Preset Chips
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 12.dp)
            ) {
                listOf(
                    "Under ₹4,000" to (0f to 4000f),
                    "₹4,000 - ₹8,000" to (4000f to 8000f),
                    "₹8,000 - ₹15,000" to (8000f to 15000f),
                    "Any Price" to (0f to 30000f)
                ).forEach { (label, range) ->
                    val isSelected = minRent == range.first && maxRent == range.second
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            minRent = range.first
                            maxRent = range.second
                        },
                        label = { Text(label) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Bedrooms Filter
            Text(
                text = "Bedrooms",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(0 to "Any", 1 to "1 BHK", 2 to "2 BHK", 3 to "3+ BHK").forEach { (beds, label) ->
                    FilterChip(
                        selected = selectedBedrooms == beds,
                        onClick = { selectedBedrooms = beds },
                        label = { Text(label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Furnishing Status Filter
            Text(
                text = "Furnishing Status",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = selectedFurnishing == null,
                    onClick = { selectedFurnishing = null },
                    label = { Text("Any") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = BluePrimary,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                    )
                )
                FurnishingStatus.values().forEach { status ->
                    FilterChip(
                        selected = selectedFurnishing == status,
                        onClick = { selectedFurnishing = status },
                        label = { Text(status.label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        onReset()
                        onDismiss()
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Reset")
                }

                Button(
                    onClick = {
                        onApply(
                            FilterCriteria(
                                minRent = minRent.toInt(),
                                maxRent = maxRent.toInt(),
                                bedrooms = selectedBedrooms,
                                furnishing = selectedFurnishing
                            )
                        )
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("apply_filter_button"),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Apply Filters", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
