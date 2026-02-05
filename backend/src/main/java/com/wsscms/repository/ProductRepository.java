package com.wsscms.repository;


import com.wsscms.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    boolean existsBySku(String sku);
    List<Product> findByActiveTrue();
    List<Product> findByCategory(String category);
    List<Product> findByNameContainingIgnoreCase(String name);

    @Query("SELECT DISTINCT i.product FROM Inventory i WHERE i.warehouse IS NOT NULL AND i.quantity > 0")
    List<Product> findProductsAvailableInWarehouses();
}
