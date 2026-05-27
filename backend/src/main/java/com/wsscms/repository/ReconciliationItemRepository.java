package com.wsscms.repository;

import com.wsscms.entity.ReconciliationItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReconciliationItemRepository extends JpaRepository<ReconciliationItem, Long> {
    List<ReconciliationItem> findByReconciliationId(Long reconciliationId);
}
