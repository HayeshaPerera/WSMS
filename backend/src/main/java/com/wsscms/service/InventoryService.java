package com.wsscms.service;

import com.wsscms.dto.InventoryDTO;
import com.wsscms.entity.Inventory;
import com.wsscms.entity.Product;
import com.wsscms.entity.Supermarket;
import com.wsscms.entity.Warehouse;
import com.wsscms.repository.InventoryRepository;
import com.wsscms.repository.ProductRepository;
import com.wsscms.repository.SupermarketRepository;
import com.wsscms.repository.WarehouseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private SupermarketRepository supermarketRepository;

    public List<InventoryDTO> getAllInventory() {
        return inventoryRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryDTO> getInventoryByWarehouse(Long warehouseId) {
        return inventoryRepository.findByWarehouseId(warehouseId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryDTO> getInventoryBySupermarket(Long supermarketId) {
        return inventoryRepository.findBySupermarketId(supermarketId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Integer getQuantityByWarehouseAndProduct(Long warehouseId, Long productId) {
        List<Inventory> inventories = inventoryRepository.findByWarehouseIdAndProductId(warehouseId, productId);
        if (inventories == null || inventories.isEmpty()) {
            return 0;
        }
        return inventories.stream().mapToInt(Inventory::getQuantity).sum();
    }

    public List<InventoryDTO> getLowStockItems() {
        return inventoryRepository.findLowStockItems().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryDTO> getLowStockByWarehouse(Long warehouseId) {
        return inventoryRepository.findLowStockByWarehouseId(warehouseId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryDTO> getLowStockBySupermarket(Long supermarketId) {
        return inventoryRepository.findLowStockBySupermarketId(supermarketId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public InventoryDTO getInventoryById(Long id) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found with id: " + id));
        return convertToDTO(inventory);
    }

    public InventoryDTO createInventory(InventoryDTO inventoryDTO) {
        Product product = productRepository.findById(inventoryDTO.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
                
        // Check if inventory already exists for this product and location
        if (inventoryDTO.getWarehouseId() != null) {
            List<Inventory> existing = inventoryRepository.findByWarehouseIdAndProductId(inventoryDTO.getWarehouseId(), inventoryDTO.getProductId());
            if (!existing.isEmpty()) {
                Inventory inv = existing.get(0);
                inv.setQuantity(inv.getQuantity() + inventoryDTO.getQuantity());
                if (inventoryDTO.getReorderLevel() != null) {
                    inv.setReorderLevel(inventoryDTO.getReorderLevel());
                }
                inv.setLowStockAlert(inv.getQuantity() <= inv.getReorderLevel());
                return convertToDTO(inventoryRepository.save(inv));
            }
        } else if (inventoryDTO.getSupermarketId() != null) {
            List<Inventory> existing = inventoryRepository.findBySupermarketIdAndProductId(inventoryDTO.getSupermarketId(), inventoryDTO.getProductId());
            if (!existing.isEmpty()) {
                Inventory inv = existing.get(0);
                inv.setQuantity(inv.getQuantity() + inventoryDTO.getQuantity());
                if (inventoryDTO.getReorderLevel() != null) {
                    inv.setReorderLevel(inventoryDTO.getReorderLevel());
                }
                inv.setLowStockAlert(inv.getQuantity() <= inv.getReorderLevel());
                return convertToDTO(inventoryRepository.save(inv));
            }
        }

        Inventory inventory = new Inventory();
        inventory.setProduct(product);

        if (inventoryDTO.getWarehouseId() != null) {
            Warehouse warehouse = warehouseRepository.findById(inventoryDTO.getWarehouseId())
                    .orElseThrow(() -> new EntityNotFoundException("Warehouse not found"));
            inventory.setWarehouse(warehouse);
        }

        if (inventoryDTO.getSupermarketId() != null) {
            Supermarket supermarket = supermarketRepository.findById(inventoryDTO.getSupermarketId())
                    .orElseThrow(() -> new EntityNotFoundException("Supermarket not found"));
            inventory.setSupermarket(supermarket);
        }

        inventory.setQuantity(inventoryDTO.getQuantity());
        inventory.setReorderLevel(inventoryDTO.getReorderLevel());
        inventory.setLocation(inventoryDTO.getLocation());

        Inventory savedInventory = inventoryRepository.save(inventory);
        return convertToDTO(savedInventory);
    }

    public InventoryDTO updateInventory(Long id, InventoryDTO inventoryDTO) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found with id: " + id));

        inventory.setQuantity(inventoryDTO.getQuantity());
        inventory.setReorderLevel(inventoryDTO.getReorderLevel());
        inventory.setLocation(inventoryDTO.getLocation());

        Inventory updatedInventory = inventoryRepository.save(inventory);
        return convertToDTO(updatedInventory);
    }

    public void deleteInventory(Long id) {
        if (!inventoryRepository.existsById(id)) {
            throw new EntityNotFoundException("Inventory not found with id: " + id);
        }
        inventoryRepository.deleteById(id);
    }

    public InventoryDTO adjustQuantity(Long id, Integer adjustment) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found with id: " + id));
        
        int newQuantity = inventory.getQuantity() + adjustment;
        if (newQuantity < 0) {
            throw new IllegalArgumentException("Cannot reduce inventory below zero");
        }
        
        inventory.setQuantity(newQuantity);
        Inventory updatedInventory = inventoryRepository.save(inventory);
        return convertToDTO(updatedInventory);
    }

    private InventoryDTO convertToDTO(Inventory inventory) {
        InventoryDTO dto = new InventoryDTO();
        dto.setId(inventory.getId());
        dto.setQuantity(inventory.getQuantity());
        dto.setReorderLevel(inventory.getReorderLevel());
        dto.setLocation(inventory.getLocation());

        if (inventory.getProduct() != null) {
            dto.setProductId(inventory.getProduct().getId());
            dto.setProductName(inventory.getProduct().getName());
            dto.setProductSku(inventory.getProduct().getSku());
        }

        if (inventory.getWarehouse() != null) {
            dto.setWarehouseId(inventory.getWarehouse().getId());
            dto.setWarehouseName(inventory.getWarehouse().getName());
        }

        if (inventory.getSupermarket() != null) {
            dto.setSupermarketId(inventory.getSupermarket().getId());
            dto.setSupermarketName(inventory.getSupermarket().getName());
        }

        return dto;
    }
}
