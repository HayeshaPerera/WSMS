package com.wsscms.repository;

import com.wsscms.entity.Supermarket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupermarketRepository extends JpaRepository<Supermarket, Long> {
    Optional<Supermarket> findByCode(String code);
    boolean existsByCode(String code);
    List<Supermarket> findByIsActiveTrue();
    
    @Query("SELECT s FROM Supermarket s WHERE s.assignedWarehouse.id = :warehouseId")
    List<Supermarket> findByWarehouseId(@Param("warehouseId") Long warehouseId);
}
