package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.FurnishingStatus
import com.example.data.model.ListingStatus
import com.example.data.model.PropertyListing
import com.example.data.model.PropertyType
import com.example.data.model.TiffinService
import com.example.data.repository.GondiaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class SortOption(val label: String) {
    RELEVANCE("Relevance"),
    RENT_LOW_TO_HIGH("Rent: Low to High"),
    RENT_HIGH_TO_LOW("Rent: High to Low"),
    NEWEST("Newest First")
}

data class FilterCriteria(
    val minRent: Int = 0,
    val maxRent: Int = 30000,
    val bedrooms: Int = 0, // 0 means Any
    val furnishing: FurnishingStatus? = null,
    val statusOnlyApproved: Boolean = true
)

data class SearchFilterState(
    val query: String = "",
    val locality: String = "All",
    val type: PropertyType = PropertyType.ALL,
    val sort: SortOption = SortOption.RELEVANCE,
    val criteria: FilterCriteria = FilterCriteria()
)

class GondiaViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = GondiaRepository(application)

    // Raw data flows
    val allProperties: StateFlow<List<PropertyListing>> = repository.getAllProperties()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allTiffinServices: StateFlow<List<TiffinService>> = repository.getAllTiffinServices()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Consolidated filter state
    private val _filterState = MutableStateFlow(SearchFilterState())
    val filterState = _filterState.asStateFlow()

    val searchQuery: StateFlow<String> = _filterState.map { it.query }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")

    val selectedLocality: StateFlow<String> = _filterState.map { it.locality }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "All")

    val selectedType: StateFlow<PropertyType> = _filterState.map { it.type }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), PropertyType.ALL)

    val sortOption: StateFlow<SortOption> = _filterState.map { it.sort }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), SortOption.RELEVANCE)

    val filterCriteria: StateFlow<FilterCriteria> = _filterState.map { it.criteria }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), FilterCriteria())

    // Active Owner ID for Owner Dashboard security
    // Default demo owner: "owner_ramesh" (owns 3 properties)
    private val _currentOwnerId = MutableStateFlow("owner_ramesh")
    val currentOwnerId = _currentOwnerId.asStateFlow()

    private val _currentOwnerName = MutableStateFlow("Ramesh Agrawal")
    val currentOwnerName = _currentOwnerName.asStateFlow()

    private val _currentOwnerPhone = MutableStateFlow("+919823012345")
    val currentOwnerPhone = _currentOwnerPhone.asStateFlow()

    // Selected items for navigation / details
    private val _selectedProperty = MutableStateFlow<PropertyListing?>(null)
    val selectedProperty = _selectedProperty.asStateFlow()

    private val _selectedTiffin = MutableStateFlow<TiffinService?>(null)
    val selectedTiffin = _selectedTiffin.asStateFlow()

    // Map selection
    private val _selectedMapPin = MutableStateFlow<PropertyListing?>(null)
    val selectedMapPin = _selectedMapPin.asStateFlow()

    // Notification / Toast message
    private val _userMessage = MutableStateFlow<String?>(null)
    val userMessage = _userMessage.asStateFlow()

    // Filtered Properties for Tenant explore
    val filteredProperties: StateFlow<List<PropertyListing>> = combine(
        allProperties,
        _filterState
    ) { properties: List<PropertyListing>, filterState: SearchFilterState ->
        val q = filterState.query.trim()
        val filter = filterState.criteria

        properties.filter { item ->
            // Only show approved listings for public tenants
            val matchesStatus = !filter.statusOnlyApproved || item.status == ListingStatus.APPROVED

            // Locality check
            val matchesLocality = filterState.locality == "All" || item.locality.equals(filterState.locality, ignoreCase = true)

            // Property type check
            val matchesType = filterState.type == PropertyType.ALL || item.propertyType == filterState.type

            // Search query matches title, locality, or address
            val matchesSearch = q.isEmpty() ||
                    item.title.contains(q, ignoreCase = true) ||
                    item.locality.contains(q, ignoreCase = true) ||
                    item.address.contains(q, ignoreCase = true)

            // Filter criteria checks
            val matchesRent = item.monthlyRent in filter.minRent..filter.maxRent
            val matchesBedrooms = filter.bedrooms == 0 || item.bedrooms == filter.bedrooms
            val matchesFurnishing = filter.furnishing == null || item.furnishing == filter.furnishing

            matchesStatus && matchesLocality && matchesType && matchesSearch && matchesRent && matchesBedrooms && matchesFurnishing
        }.let { list ->
            when (filterState.sort) {
                SortOption.RELEVANCE -> list.sortedWith(compareByDescending<PropertyListing> { it.isFeatured }.thenByDescending { it.createdAt })
                SortOption.RENT_LOW_TO_HIGH -> list.sortedBy { it.monthlyRent }
                SortOption.RENT_HIGH_TO_LOW -> list.sortedByDescending { it.monthlyRent }
                SortOption.NEWEST -> list.sortedByDescending { it.createdAt }
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Bookmarked / Favorite listings
    val favoriteProperties: StateFlow<List<PropertyListing>> = allProperties.map { list ->
        list.filter { it.isFavorite }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Owner's listings strictly matching currentOwnerId
    val ownerProperties: StateFlow<List<PropertyListing>> = combine(allProperties, currentOwnerId) { properties, ownerId ->
        properties.filter { it.ownerId == ownerId }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Owner's tiffin services matching currentOwnerId
    val ownerTiffinServices: StateFlow<List<TiffinService>> = combine(allTiffinServices, currentOwnerId) { services, ownerId ->
        services.filter { it.ownerId == ownerId }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Search and filter actions
    fun setSearchQuery(query: String) {
        _filterState.value = _filterState.value.copy(query = query)
    }

    fun setSelectedLocality(locality: String) {
        _filterState.value = _filterState.value.copy(locality = locality)
    }

    fun setSelectedType(type: PropertyType) {
        _filterState.value = _filterState.value.copy(type = type)
    }

    fun setSortOption(sort: SortOption) {
        _filterState.value = _filterState.value.copy(sort = sort)
    }

    fun setFilterCriteria(criteria: FilterCriteria) {
        _filterState.value = _filterState.value.copy(criteria = criteria)
    }

    fun resetFilters() {
        _filterState.value = SearchFilterState()
    }

    fun selectProperty(property: PropertyListing?) {
        _selectedProperty.value = property
    }

    fun selectTiffin(tiffin: TiffinService?) {
        _selectedTiffin.value = tiffin
    }

    fun selectMapPin(property: PropertyListing?) {
        _selectedMapPin.value = property
    }

    fun clearMessage() {
        _userMessage.value = null
    }

    fun showMessage(msg: String) {
        _userMessage.value = msg
    }

    // Toggle Favorite
    fun toggleFavorite(property: PropertyListing) {
        viewModelScope.launch {
            repository.toggleFavorite(property.id, property.isFavorite)
            if (_selectedProperty.value?.id == property.id) {
                _selectedProperty.value = _selectedProperty.value?.copy(isFavorite = !property.isFavorite)
            }
        }
    }

    // Switch Owner Profile (allows testing owner permission boundary)
    fun switchOwnerProfile(ownerId: String, name: String, phone: String) {
        _currentOwnerId.value = ownerId
        _currentOwnerName.value = name
        _currentOwnerPhone.value = phone
        _userMessage.value = "Switched to owner: $name"
    }

    // Update Owner Contact / WhatsApp Phone number across listings
    fun updateCurrentOwnerPhone(newPhone: String) {
        val trimmed = newPhone.trim()
        if (trimmed.isNotBlank()) {
            _currentOwnerPhone.value = trimmed
            viewModelScope.launch {
                val myProps = allProperties.value.filter { it.ownerId == _currentOwnerId.value }
                myProps.forEach { prop ->
                    repository.updateProperty(prop.copy(ownerPhone = trimmed))
                }
                _userMessage.value = "Owner contact & WhatsApp number updated across your listings!"
            }
        }
    }

    // Owner actions
    fun saveProperty(property: PropertyListing, isEdit: Boolean) {
        // Enforce owner check: if edit, requester must own it!
        if (isEdit && property.ownerId != _currentOwnerId.value) {
            _userMessage.value = "Permission denied: You cannot edit another owner's property."
            return
        }

        viewModelScope.launch {
            if (isEdit) {
                repository.updateProperty(property)
                _userMessage.value = "Listing updated successfully!"
            } else {
                repository.saveProperty(property)
                _userMessage.value = "New listing added! Status: Pending Approval."
            }
        }
    }

    fun deleteProperty(property: PropertyListing) {
        // Enforce owner check: can only delete their own listing
        if (property.ownerId != _currentOwnerId.value) {
            _userMessage.value = "Permission denied: You cannot delete another owner's property."
            return
        }

        viewModelScope.launch {
            repository.deleteProperty(property.id, _currentOwnerId.value)
            _userMessage.value = "Listing '${property.title}' deleted."
        }
    }

    fun toggleFeaturedPlan(property: PropertyListing) {
        if (property.ownerId != _currentOwnerId.value) {
            _userMessage.value = "Permission denied: You cannot modify another owner's property."
            return
        }

        viewModelScope.launch {
            val willBeFeatured = !property.isFeatured
            repository.toggleFeaturedPlan(property)
            _userMessage.value = if (willBeFeatured) {
                "Marked as Featured / Recommended Stay (Free for all owners)!"
            } else {
                "Listing updated to Standard."
            }
        }
    }

    fun saveTiffinService(service: TiffinService) {
        viewModelScope.launch {
            repository.saveTiffinService(service)
            _userMessage.value = "Tiffin service listed successfully!"
        }
    }

    fun deleteTiffinService(service: TiffinService) {
        if (service.ownerId != _currentOwnerId.value) {
            _userMessage.value = "Permission denied: You cannot remove another vendor's service."
            return
        }
        viewModelScope.launch {
            repository.deleteTiffinService(service.id)
            _userMessage.value = "Tiffin service removed."
        }
    }
}
