package com.wsscms.repository;

import com.wsscms.entity.GrnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GrnItemRepository extends JpaRepository<GrnItem, Long> {
    List<GrnItem> findByGrnHeaderId(Long grnHeaderId);
}
