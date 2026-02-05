package com.wsscms.repository;

import com.wsscms.entity.StockRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRequestRepository extends JpaRepository<StockRequest, Long> {
    
    Optional<StockRequest> findByRequestNumber(String requestNumber);
    
    @Query("SELECT sr FROM StockRequest sr WHERE sr.supermarket.id = :supermarketId ORDER BY sr.requestedAt DESC")
    List<StockRequest> findBySupermarketId(@Param("supermarketId") Long supermarketId);
    
    @Query("SELECT sr FROM StockRequest sr WHERE sr.warehouse.id = :warehouseId ORDER BY sr.requestedAt DESC")
    List<StockRequest> findByWarehouseId(@Param("warehouseId") Long warehouseId);
    
    @Query("SELECT sr FROM StockRequest sr WHERE sr.status = :status ORDER BY sr.requestedAt DESC")
    List<StockRequest> findByStatus(@Param("status") StockRequest.RequestStatus status);
    
    @Query("SELECT sr FROM StockRequest sr WHERE sr.status = 'PENDING' ORDER BY sr.priority DESC, sr.requestedAt ASC")
    List<StockRequest> findPendingRequests();
    
    @Query("SELECT sr FROM StockRequest sr WHERE sr.warehouse.id = :warehouseId AND sr.status = 'PENDING' ORDER BY sr.priority DESC, sr.requestedAt ASC")
    List<StockRequest> findPendingByWarehouseId(@Param("warehouseId") Long warehouseId);
    
    @Query("SELECT sr FROM StockRequest sr WHERE sr.requestedBy.id = :userId ORDER BY sr.requestedAt DESC")
    List<StockRequest> findByRequestedById(@Param("userId") Long userId);
    
    @Query("SELECT sr FROM StockRequest sr WHERE sr.product.id = :productId ORDER BY sr.requestedAt DESC")
    List<StockRequest> findByProductId(@Param("productId") Long productId);
}
