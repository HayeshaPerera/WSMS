package com.wsscms.service;

import com.wsscms.dto.GrnDTO;
import com.wsscms.dto.GrnItemDTO;
import com.wsscms.entity.*;
import com.wsscms.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class GrnService {

    @Autowired
    private GrnHeaderRepository grnHeaderRepository;
    
    @Autowired
    private WarehouseRepository warehouseRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private InventoryRepository inventoryRepository;

    public List<GrnDTO> getAllGrns() {
        return grnHeaderRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<GrnDTO> getGrnsByWarehouse(Long warehouseId) {
        return grnHeaderRepository.findByWarehouseId(warehouseId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public GrnDTO getGrnById(Long id) {
        GrnHeader header = grnHeaderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("GRN not found"));
        return convertToDTO(header);
    }

    public GrnDTO createGrn(GrnDTO grnDTO) {
        GrnHeader header = new GrnHeader();
        header.setGrnNumber("GRN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        
        Warehouse warehouse = warehouseRepository.findById(grnDTO.getWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found"));
        header.setWarehouse(warehouse);
        
        User receivedBy = userRepository.findById(grnDTO.getReceivedById())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        header.setReceivedBy(receivedBy);
        
        header.setSupplierName(grnDTO.getSupplierName());
        header.setNotes(grnDTO.getNotes());
        header.setStatus("DRAFT");
        
        if (grnDTO.getItems() != null) {
            for (GrnItemDTO itemDTO : grnDTO.getItems()) {
                GrnItem item = new GrnItem();
                item.setGrnHeader(header);
                
                Product product = productRepository.findById(itemDTO.getProductId())
                        .orElseThrow(() -> new EntityNotFoundException("Product not found"));
                item.setProduct(product);
                
                item.setQuantity(itemDTO.getQuantity());
                item.setUnitCost(itemDTO.getUnitCost());
                item.setBatchNumber(itemDTO.getBatchNumber());
                item.setExpiryDate(itemDTO.getExpiryDate());
                
                header.getItems().add(item);
            }
        }
        
        GrnHeader saved = grnHeaderRepository.save(header);
        return convertToDTO(saved);
    }

    public GrnDTO confirmGrn(Long id) {
        GrnHeader header = grnHeaderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("GRN not found"));
                
        if (!"DRAFT".equals(header.getStatus())) {
            throw new IllegalStateException("Only DRAFT GRNs can be confirmed");
        }
        
        header.setStatus("COMPLETED");
        
        // Update Inventory
        for (GrnItem item : header.getItems()) {
            List<Inventory> inventories = inventoryRepository
                .findByWarehouseIdAndProductId(header.getWarehouse().getId(), item.getProduct().getId());
                
            Inventory inventory = (inventories != null && !inventories.isEmpty()) ? inventories.get(0) : null;
            
            if (inventory == null) {
                inventory = new Inventory();
                inventory.setWarehouse(header.getWarehouse());
                inventory.setProduct(item.getProduct());
                inventory.setQuantity(0);
                inventory.setReorderLevel(10);
            }
            
            inventory.setQuantity(inventory.getQuantity() + item.getQuantity());
            // Update batch and expiry info if applicable
            if (item.getBatchNumber() != null) inventory.setBatchNumber(item.getBatchNumber());
            if (item.getExpiryDate() != null) inventory.setExpiryDate(item.getExpiryDate());
            
            inventory.setLastUpdated(LocalDateTime.now());
            inventoryRepository.save(inventory);
        }
        
        GrnHeader saved = grnHeaderRepository.save(header);
        return convertToDTO(saved);
    }

    private GrnDTO convertToDTO(GrnHeader header) {
        GrnDTO dto = new GrnDTO();
        dto.setId(header.getId());
        dto.setGrnNumber(header.getGrnNumber());
        if (header.getWarehouse() != null) {
            dto.setWarehouseId(header.getWarehouse().getId());
            dto.setWarehouseName(header.getWarehouse().getName());
        }
        dto.setSupplierName(header.getSupplierName());
        if (header.getReceivedBy() != null) {
            dto.setReceivedById(header.getReceivedBy().getId());
            dto.setReceivedByName(header.getReceivedBy().getFirstName() + " " + header.getReceivedBy().getLastName());
        }
        dto.setStatus(header.getStatus());
        dto.setNotes(header.getNotes());
        dto.setReceivedDate(header.getReceivedDate());
        dto.setCreatedAt(header.getCreatedAt());
        
        if (header.getItems() != null) {
            List<GrnItemDTO> itemDTOs = header.getItems().stream().map(item -> {
                GrnItemDTO itemDTO = new GrnItemDTO();
                itemDTO.setId(item.getId());
                if (item.getProduct() != null) {
                    itemDTO.setProductId(item.getProduct().getId());
                    itemDTO.setProductName(item.getProduct().getName());
                    itemDTO.setProductSku(item.getProduct().getSku());
                }
                itemDTO.setQuantity(item.getQuantity());
                itemDTO.setUnitCost(item.getUnitCost());
                itemDTO.setBatchNumber(item.getBatchNumber());
                itemDTO.setExpiryDate(item.getExpiryDate());
                return itemDTO;
            }).collect(Collectors.toList());
            dto.setItems(itemDTOs);
        }
        
        return dto;
    }
}
