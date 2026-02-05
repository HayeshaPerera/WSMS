package com.wsscms.repository;

import com.wsscms.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    
    @Query("SELECT i FROM Inventory i WHERE i.warehouse.id = :warehouseId")
    List<Inventory> findByWarehouseId(@Param("warehouseId") Long warehouseId);
    
    @Query("SELECT i FROM Inventory i WHERE i.supermarket.id = :supermarketId")
    List<Inventory> findBySupermarketId(@Param("supermarketId") Long supermarketId);
    
    @Query("SELECT i FROM Inventory i WHERE i.product.id = :productId")
    List<Inventory> findByProductId(@Param("productId") Long productId);
    
    @Query("SELECT i FROM Inventory i WHERE i.warehouse.id = :warehouseId AND i.product.id = :productId")
    List<Inventory> findByWarehouseIdAndProductId(@Param("warehouseId") Long warehouseId, @Param("productId") Long productId);
    
    @Query("SELECT i FROM Inventory i WHERE i.supermarket.id = :supermarketId AND i.product.id = :productId")
    List<Inventory> findBySupermarketIdAndProductId(@Param("supermarketId") Long supermarketId, @Param("productId") Long productId);
    
    @Query("SELECT i FROM Inventory i WHERE i.quantity <= i.reorderLevel")
    List<Inventory> findLowStockItems();
    
    @Query("SELECT i FROM Inventory i WHERE i.warehouse.id = :warehouseId AND i.quantity <= i.reorderLevel")
    List<Inventory> findLowStockByWarehouseId(@Param("warehouseId") Long warehouseId);
    
    @Query("SELECT i FROM Inventory i WHERE i.supermarket.id = :supermarketId AND i.quantity <= i.reorderLevel")
    List<Inventory> findLowStockBySupermarketId(@Param("supermarketId") Long supermarketId);
}
