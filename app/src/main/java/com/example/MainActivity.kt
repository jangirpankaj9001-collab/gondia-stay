package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.ui.screens.AddEditPropertyScreen
import com.example.ui.screens.ExploreScreen
import com.example.ui.screens.MapScreen
import com.example.ui.screens.OwnerDashboardScreen
import com.example.ui.screens.PropertyDetailScreen
import com.example.ui.screens.SavedScreen
import com.example.ui.screens.TiffinScreen
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.GondiaViewModel

sealed class Screen(val route: String) {
    object Explore : Screen("explore")
    object Map : Screen("map")
    object Tiffin : Screen("tiffin")
    object Saved : Screen("saved")
    object Owner : Screen("owner")
    object PropertyDetail : Screen("property_detail/{propertyId}") {
        fun createRoute(propertyId: String) = "property_detail/$propertyId"
    }
    object AddProperty : Screen("add_property")
    object EditProperty : Screen("edit_property/{propertyId}") {
        fun createRoute(propertyId: String) = "edit_property/$propertyId"
    }
}

enum class NavigationTab(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val testTag: String
) {
    EXPLORE(Screen.Explore.route, "Explore", Icons.Filled.Search, Icons.Outlined.Search, "nav_tab_explore"),
    MAP(Screen.Map.route, "Map", Icons.Filled.Map, Icons.Outlined.Map, "nav_tab_map"),
    TIFFIN(Screen.Tiffin.route, "Tiffin/Mess", Icons.Filled.Restaurant, Icons.Outlined.Restaurant, "nav_tab_tiffin"),
    SAVED(Screen.Saved.route, "Saved", Icons.Filled.Favorite, Icons.Outlined.FavoriteBorder, "nav_tab_saved"),
    OWNER(Screen.Owner.route, "Owner", Icons.Filled.Person, Icons.Outlined.Person, "nav_tab_owner")
}

class MainActivity : ComponentActivity() {
    private val viewModel: GondiaViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                MainAppContent(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun MainAppContent(viewModel: GondiaViewModel) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination?.route

    val userMessage by viewModel.userMessage.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val allProperties by viewModel.allProperties.collectAsState()

    LaunchedEffect(userMessage) {
        userMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearMessage()
        }
    }

    val isTopLevelDestination = NavigationTab.values().any { it.route == currentDestination }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (isTopLevelDestination) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 8.dp,
                    modifier = Modifier.testTag("bottom_nav_bar")
                ) {
                    NavigationTab.values().forEach { tab ->
                        val isSelected = currentDestination == tab.route
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = {
                                if (currentDestination != tab.route) {
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (isSelected) tab.selectedIcon else tab.unselectedIcon,
                                    contentDescription = tab.label
                                )
                            },
                            label = {
                                Text(
                                    text = tab.label,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = BluePrimary,
                                selectedTextColor = BluePrimary,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer
                            ),
                            modifier = Modifier.testTag(tab.testTag)
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Explore.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Home / Explore Screen
            composable(Screen.Explore.route) {
                ExploreScreen(
                    viewModel = viewModel,
                    onPropertyClick = { property ->
                        navController.navigate(Screen.PropertyDetail.createRoute(property.id))
                    }
                )
            }

            // Map View Screen
            composable(Screen.Map.route) {
                MapScreen(
                    viewModel = viewModel,
                    onViewPropertyDetails = { property ->
                        navController.navigate(Screen.PropertyDetail.createRoute(property.id))
                    }
                )
            }

            // Tiffin / Mess Screen
            composable(Screen.Tiffin.route) {
                TiffinScreen(viewModel = viewModel)
            }

            // Saved / Bookmarks Screen
            composable(Screen.Saved.route) {
                SavedScreen(
                    viewModel = viewModel,
                    onPropertyClick = { property ->
                        navController.navigate(Screen.PropertyDetail.createRoute(property.id))
                    }
                )
            }

            // User / Owner Dashboard Screen
            composable(Screen.Owner.route) {
                OwnerDashboardScreen(
                    viewModel = viewModel,
                    onAddNewProperty = {
                        navController.navigate(Screen.AddProperty.route)
                    },
                    onEditProperty = { property ->
                        navController.navigate(Screen.EditProperty.createRoute(property.id))
                    },
                    onViewProperty = { property ->
                        navController.navigate(Screen.PropertyDetail.createRoute(property.id))
                    }
                )
            }

            // Property Details Screen
            composable(
                route = Screen.PropertyDetail.route,
                arguments = listOf(navArgument("propertyId") { type = NavType.StringType })
            ) { backStackEntry ->
                val propertyId = backStackEntry.arguments?.getString("propertyId")
                val property = allProperties.firstOrNull { it.id == propertyId }
                if (property != null) {
                    PropertyDetailScreen(
                        property = property,
                        onBack = { navController.popBackStack() },
                        onToggleFavorite = { viewModel.toggleFavorite(it) }
                    )
                }
            }

            // Add Property Screen
            composable(Screen.AddProperty.route) {
                AddEditPropertyScreen(
                    viewModel = viewModel,
                    existingProperty = null,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Edit Property Screen
            composable(
                route = Screen.EditProperty.route,
                arguments = listOf(navArgument("propertyId") { type = NavType.StringType })
            ) { backStackEntry ->
                val propertyId = backStackEntry.arguments?.getString("propertyId")
                val property = allProperties.firstOrNull { it.id == propertyId }
                AddEditPropertyScreen(
                    viewModel = viewModel,
                    existingProperty = property,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}
