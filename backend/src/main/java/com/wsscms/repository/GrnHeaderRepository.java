package com.wsscms.repository;

import com.wsscms.entity.GrnHeader;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrnHeaderRepository extends JpaRepository<GrnHeader, Long> {
    Optional<GrnHeader> findByGrnNumber(String grnNumber);
    List<GrnHeader> findByWarehouseId(Long warehouseId);
}
