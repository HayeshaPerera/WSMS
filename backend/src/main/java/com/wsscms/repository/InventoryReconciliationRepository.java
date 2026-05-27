package com.wsscms.repository;

import com.wsscms.entity.InventoryReconciliation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryReconciliationRepository extends JpaRepository<InventoryReconciliation, Long> {
    List<InventoryReconciliation> findByWarehouseIdOrderByReconciliationDateDesc(Long warehouseId);
    List<InventoryReconciliation> findBySupermarketIdOrderByReconciliationDateDesc(Long supermarketId);
}
