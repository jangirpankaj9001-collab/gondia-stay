package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface PropertyDao {
    @Query("SELECT * FROM properties ORDER BY createdAt DESC")
    fun getAllProperties(): Flow<List<PropertyEntity>>

    @Query("SELECT * FROM properties WHERE id = :id LIMIT 1")
    fun getPropertyById(id: String): Flow<PropertyEntity?>

    @Query("SELECT * FROM properties WHERE ownerId = :ownerId ORDER BY createdAt DESC")
    fun getPropertiesByOwner(ownerId: String): Flow<List<PropertyEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProperty(property: PropertyEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProperties(properties: List<PropertyEntity>)

    @Update
    suspend fun updateProperty(property: PropertyEntity)

    @Query("DELETE FROM properties WHERE id = :id")
    suspend fun deleteProperty(id: String)

    @Query("SELECT COUNT(*) FROM properties")
    suspend fun getPropertyCount(): Int
}

@Dao
interface FavoriteDao {
    @Query("SELECT propertyId FROM favorites")
    fun getAllFavoriteIds(): Flow<List<String>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun addFavorite(fav: FavoriteEntity)

    @Query("DELETE FROM favorites WHERE propertyId = :propertyId")
    suspend fun removeFavorite(propertyId: String)

    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE propertyId = :propertyId)")
    suspend fun isFavorite(propertyId: String): Boolean
}

@Dao
interface TiffinDao {
    @Query("SELECT * FROM tiffin_services ORDER BY rating DESC")
    fun getAllTiffinServices(): Flow<List<TiffinEntity>>

    @Query("SELECT * FROM tiffin_services WHERE ownerId = :ownerId")
    fun getTiffinByOwner(ownerId: String): Flow<List<TiffinEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTiffinServices(services: List<TiffinEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTiffinService(service: TiffinEntity)

    @Query("DELETE FROM tiffin_services WHERE id = :id")
    suspend fun deleteTiffinService(id: String)

    @Query("SELECT COUNT(*) FROM tiffin_services")
    suspend fun getTiffinCount(): Int
}
