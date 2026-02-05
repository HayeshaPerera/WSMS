package com.wsscms.repository;

import com.wsscms.entity.SalesHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SalesHistoryRepository extends JpaRepository<SalesHistory, Long> {
    
    @Query("SELECT sh FROM SalesHistory sh WHERE sh.product.id = :productId ORDER BY sh.saleDate DESC")
    List<SalesHistory> findByProductId(@Param("productId") Long productId);
    
    @Query("SELECT sh FROM SalesHistory sh WHERE sh.supermarket.id = :supermarketId ORDER BY sh.saleDate DESC")
    List<SalesHistory> findBySupermarketId(@Param("supermarketId") Long supermarketId);
    
    @Query("SELECT sh FROM SalesHistory sh WHERE sh.saleDate BETWEEN :startDate AND :endDate ORDER BY sh.saleDate DESC")
    List<SalesHistory> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query("SELECT sh FROM SalesHistory sh WHERE sh.product.id = :productId AND sh.supermarket.id = :supermarketId ORDER BY sh.saleDate DESC")
    List<SalesHistory> findByProductAndSupermarket(@Param("productId") Long productId, @Param("supermarketId") Long supermarketId);
    
    @Query("SELECT sh FROM SalesHistory sh WHERE sh.supermarket.id = :supermarketId AND sh.saleDate BETWEEN :startDate AND :endDate ORDER BY sh.saleDate DESC")
    List<SalesHistory> findBySupermarketAndDateRange(@Param("supermarketId") Long supermarketId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
