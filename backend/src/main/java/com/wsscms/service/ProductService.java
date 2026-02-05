        // ...existing code...
package com.wsscms.service;

import com.wsscms.dto.ProductDTO;
import com.wsscms.entity.Product;
import com.wsscms.repository.ProductRepository;
import com.wsscms.repository.InventoryRepository;
import com.wsscms.repository.SupermarketRepository;
import com.wsscms.repository.UserRepository;
import com.wsscms.repository.WarehouseRepository;
import com.wsscms.entity.User;
import com.wsscms.entity.Warehouse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.wsscms.entity.Inventory;
import com.wsscms.entity.Supermarket;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {
    public List<ProductDTO> getProductsAvailableInWarehouses() {
        // Find all products that have positive stock in any warehouse
        List<Inventory> warehouseInventories = inventoryRepository.findAll();
        return warehouseInventories.stream()
            .filter(inv -> inv.getWarehouse() != null && inv.getQuantity() > 0)
            .map(Inventory::getProduct)
            .distinct()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryRepository inventoryRepository;


    @Autowired
    private SupermarketRepository supermarketRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    public List<ProductDTO> getAllProducts() {
        return productRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ProductDTO> getActiveProducts() {
        return productRepository.findByActiveTrue().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ProductDTO> getProductsByCategory(String category) {
        return productRepository.findByCategory(category).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ProductDTO> searchProducts(String name) {
        return productRepository.findByNameContainingIgnoreCase(name).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found with id: " + id));
        return convertToDTO(product);
    }

    public ProductDTO getProductBySku(String sku) {
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new EntityNotFoundException("Product not found with SKU: " + sku));
        return convertToDTO(product);
    }

    public ProductDTO createProduct(ProductDTO productDTO) {
        if (productRepository.existsBySku(productDTO.getSku())) {
            throw new IllegalArgumentException("Product SKU already exists");
        }

        Product product = new Product();
        product.setSku(productDTO.getSku());
        product.setName(productDTO.getName());
        product.setDescription(productDTO.getDescription());
        product.setCategory(productDTO.getCategory());
        product.setUnitPrice(productDTO.getUnitPrice());
        product.setUnit(productDTO.getUnit());
        product.setReorderLevel(productDTO.getReorderLevel());
        product.setActive(productDTO.getActive() != null ? productDTO.getActive() : true);

        Product savedProduct = productRepository.save(product);

        // Get current user and their warehouse
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Warehouse warehouse = user.getWarehouse();
        if (warehouse == null) {
            throw new IllegalArgumentException("Current user is not assigned to a warehouse");
        }

        // Add product to this warehouse's inventory
        Inventory inventory = new Inventory();
        inventory.setProduct(savedProduct);
        inventory.setWarehouse(warehouse);
        inventory.setQuantity(0); // default quantity
        inventory.setReorderLevel(productDTO.getReorderLevel() != null ? productDTO.getReorderLevel() : 50);
        inventoryRepository.save(inventory);

        return convertToDTO(savedProduct);
    }

    public ProductDTO updateProduct(Long id, ProductDTO productDTO) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found with id: " + id));

        if (!product.getSku().equals(productDTO.getSku()) && 
            productRepository.existsBySku(productDTO.getSku())) {
            throw new IllegalArgumentException("Product SKU already exists");
        }

        product.setSku(productDTO.getSku());
        product.setName(productDTO.getName());
        product.setDescription(productDTO.getDescription());
        product.setCategory(productDTO.getCategory());
        product.setUnitPrice(productDTO.getUnitPrice());
        product.setUnit(productDTO.getUnit());
        product.setReorderLevel(productDTO.getReorderLevel());
        
        if (productDTO.getActive() != null) {
            product.setActive(productDTO.getActive());
        }

        Product updatedProduct = productRepository.save(product);
        return convertToDTO(updatedProduct);
    }

    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new EntityNotFoundException("Product not found with id: " + id);
        }
        productRepository.deleteById(id);
    }

    private ProductDTO convertToDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setSku(product.getSku());
        dto.setName(product.getName());
        dto.setDescription(product.getDescription());
        dto.setCategory(product.getCategory());
        dto.setUnitPrice(product.getUnitPrice());
        dto.setUnit(product.getUnit());
        dto.setReorderLevel(product.getReorderLevel());
        dto.setActive(product.getActive());
        return dto;
    }
}
