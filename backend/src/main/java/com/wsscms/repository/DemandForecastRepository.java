package com.wsscms.repository;

import com.wsscms.entity.DemandForecast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DemandForecastRepository extends JpaRepository<DemandForecast, Long> {
    
    @Query("SELECT df FROM DemandForecast df WHERE df.product.id = :productId ORDER BY df.forecastDate")
    List<DemandForecast> findByProductId(@Param("productId") Long productId);
    
    @Query("SELECT df FROM DemandForecast df WHERE df.supermarket.id = :supermarketId ORDER BY df.forecastDate")
    List<DemandForecast> findBySupermarketId(@Param("supermarketId") Long supermarketId);
    
    @Query("SELECT df FROM DemandForecast df WHERE df.product.id = :productId AND df.supermarket.id = :supermarketId ORDER BY df.forecastDate")
    List<DemandForecast> findByProductAndSupermarket(@Param("productId") Long productId, @Param("supermarketId") Long supermarketId);
    
    @Query("SELECT df FROM DemandForecast df WHERE df.forecastDate BETWEEN :startDate AND :endDate ORDER BY df.forecastDate")
    List<DemandForecast> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query("SELECT df FROM DemandForecast df WHERE df.supermarket.id = :supermarketId AND df.forecastDate BETWEEN :startDate AND :endDate ORDER BY df.forecastDate")
    List<DemandForecast> findBySupermarketAndDateRange(@Param("supermarketId") Long supermarketId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
