package com.example.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.example.data.model.PropertyListing
import com.example.ui.components.GondiaMapCanvas
import com.example.ui.viewmodel.GondiaViewModel

@Composable
fun MapScreen(
    viewModel: GondiaViewModel,
    onViewPropertyDetails: (PropertyListing) -> Unit,
    modifier: Modifier = Modifier
) {
    val properties by viewModel.allProperties.collectAsState()
    val selectedPin by viewModel.selectedMapPin.collectAsState()

    Box(modifier = modifier.fillMaxSize()) {
        GondiaMapCanvas(
            properties = properties,
            selectedProperty = selectedPin,
            onSelectProperty = { viewModel.selectMapPin(it) },
            onViewPropertyDetails = onViewPropertyDetails
        )
    }
}
