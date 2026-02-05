package com.wsscms.repository;

import com.wsscms.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    
    Optional<Delivery> findByTrackingNumber(String trackingNumber);
    
    @Query("SELECT d FROM Delivery d WHERE d.stockRequest.id = :stockRequestId")
    Optional<Delivery> findByStockRequestId(@Param("stockRequestId") Long stockRequestId);
    
    @Query("SELECT d FROM Delivery d WHERE d.warehouse.id = :warehouseId ORDER BY d.createdAt DESC")
    List<Delivery> findByWarehouseId(@Param("warehouseId") Long warehouseId);
    
    @Query("SELECT d FROM Delivery d WHERE d.supermarket.id = :supermarketId ORDER BY d.createdAt DESC")
    List<Delivery> findBySupermarketId(@Param("supermarketId") Long supermarketId);
    
    @Query("SELECT d FROM Delivery d WHERE d.status = :status ORDER BY d.createdAt DESC")
    List<Delivery> findByStatus(@Param("status") Delivery.DeliveryStatus status);
    
    @Query("SELECT d FROM Delivery d WHERE d.status IN ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY') ORDER BY d.createdAt DESC")
    List<Delivery> findActiveDeliveries();
    
    @Query("SELECT d FROM Delivery d WHERE d.warehouse.id = :warehouseId AND d.status IN ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY') ORDER BY d.createdAt DESC")
    List<Delivery> findActiveByWarehouseId(@Param("warehouseId") Long warehouseId);
    
    @Query("SELECT d FROM Delivery d WHERE d.supermarket.id = :supermarketId AND d.status IN ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY') ORDER BY d.createdAt DESC")
    List<Delivery> findActiveBySupermarketId(@Param("supermarketId") Long supermarketId);
}
