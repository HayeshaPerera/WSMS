package com.wsscms.service;

import com.wsscms.dto.ReconciliationDTO;
import com.wsscms.dto.ReconciliationItemDTO;
import com.wsscms.entity.*;
import com.wsscms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReconciliationService {

    @Autowired
    private InventoryReconciliationRepository reconciliationRepository;
    
    @Autowired
    private ReconciliationItemRepository itemRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private SupermarketRepository supermarketRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private UserRepository userRepository;

    public List<ReconciliationDTO> getAll() {
        return reconciliationRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public List<ReconciliationDTO> getByWarehouse(Long warehouseId) {
        return reconciliationRepository.findByWarehouseIdOrderByReconciliationDateDesc(warehouseId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public List<ReconciliationDTO> getBySupermarket(Long supermarketId) {
        return reconciliationRepository.findBySupermarketIdOrderByReconciliationDateDesc(supermarketId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public ReconciliationDTO createDraft(ReconciliationDTO dto) {
        InventoryReconciliation rec = new InventoryReconciliation();
        rec.setReconciliationDate(dto.getReconciliationDate());
        rec.setNotes(dto.getNotes());
        rec.setStatus("DRAFT");
        
        if (dto.getWarehouseId() != null) {
            rec.setWarehouse(warehouseRepository.findById(dto.getWarehouseId())
                .orElseThrow(() -> new RuntimeException("Warehouse not found")));
        } else if (dto.getSupermarketId() != null) {
            rec.setSupermarket(supermarketRepository.findById(dto.getSupermarketId())
                .orElseThrow(() -> new RuntimeException("Supermarket not found")));
        } else {
            throw new RuntimeException("Must specify either warehouse or supermarket");
        }

        rec = reconciliationRepository.save(rec);

        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            int discrepancyCount = 0;
            for (ReconciliationItemDTO itemDto : dto.getItems()) {
                ReconciliationItem item = new ReconciliationItem();
                item.setReconciliation(rec);
                item.setProduct(productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found")));
                item.setSystemQuantity(itemDto.getSystemQuantity());
                item.setPhysicalCount(itemDto.getPhysicalCount());
                item.setVariance(itemDto.getPhysicalCount() - itemDto.getSystemQuantity());
                item.setAdjustmentNotes(itemDto.getAdjustmentNotes());
                
                if (item.getVariance() != 0) {
                    discrepancyCount++;
                }
                itemRepository.save(item);
            }
            rec.setTotalDiscrepancyCount(discrepancyCount);
            rec = reconciliationRepository.save(rec);
        }

        return mapToDTO(rec);
    }

    @Transactional
    public ReconciliationDTO completeReconciliation(Long id, Long userId) {
        InventoryReconciliation rec = reconciliationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Reconciliation not found"));
            
        if ("COMPLETED".equals(rec.getStatus())) {
            throw new RuntimeException("Already completed");
        }

        rec.setStatus("COMPLETED");
        rec.setReconciledAt(LocalDateTime.now());
        rec.setReconciledBy(userRepository.findById(userId).orElse(null));

        // Update actual inventory quantities for all items
        List<ReconciliationItem> items = itemRepository.findByReconciliationId(id);
        for (ReconciliationItem item : items) {
            // Find inventory regardless of variance
            Inventory inv;
            if (rec.getWarehouse() != null) {
                List<Inventory> invList = inventoryRepository.findByWarehouseIdAndProductId(rec.getWarehouse().getId(), item.getProduct().getId());
                inv = invList.isEmpty() ? null : invList.get(0);
            } else {
                List<Inventory> invList = inventoryRepository.findBySupermarketIdAndProductId(rec.getSupermarket().getId(), item.getProduct().getId());
                inv = invList.isEmpty() ? null : invList.get(0);
            }

            if (inv != null) {
                // Update existing inventory with physical count
                inv.setQuantity(item.getPhysicalCount());
                inv.setLowStockAlert(item.getPhysicalCount() <= inv.getReorderLevel());
                inventoryRepository.save(inv);
            } else {
                // Create new inventory record if it doesn't exist
                if (item.getPhysicalCount() > 0) {
                    inv = new Inventory();
                    inv.setProduct(item.getProduct());
                    inv.setWarehouse(rec.getWarehouse());
                    inv.setSupermarket(rec.getSupermarket());
                    inv.setQuantity(item.getPhysicalCount());
                    inv.setReorderLevel(item.getProduct().getReorderLevel() != null ? item.getProduct().getReorderLevel() : 50);
                    inv.setLowStockAlert(item.getPhysicalCount() <= inv.getReorderLevel());
                    inventoryRepository.save(inv);
                }
            }
        }

        rec = reconciliationRepository.save(rec);
        return mapToDTO(rec);
    }

    private ReconciliationDTO mapToDTO(InventoryReconciliation rec) {
        ReconciliationDTO dto = new ReconciliationDTO();
        dto.setId(rec.getId());
        dto.setWarehouseId(rec.getWarehouse() != null ? rec.getWarehouse().getId() : null);
        dto.setSupermarketId(rec.getSupermarket() != null ? rec.getSupermarket().getId() : null);
        dto.setReconciliationDate(rec.getReconciliationDate());
        dto.setStatus(rec.getStatus());
        dto.setTotalDiscrepancyCount(rec.getTotalDiscrepancyCount());
        dto.setNotes(rec.getNotes());
        
        if (rec.getReconciledBy() != null) {
            dto.setReconciledById(rec.getReconciledBy().getId());
            dto.setReconciledByName(rec.getReconciledBy().getUsername());
        }
        dto.setReconciledAt(rec.getReconciledAt());

        List<ReconciliationItem> items = itemRepository.findByReconciliationId(rec.getId());
        List<ReconciliationItemDTO> itemDTOs = new ArrayList<>();
        for (ReconciliationItem item : items) {
            ReconciliationItemDTO itemDTO = new ReconciliationItemDTO();
            itemDTO.setId(item.getId());
            itemDTO.setProductId(item.getProduct().getId());
            itemDTO.setProductName(item.getProduct().getName());
            itemDTO.setSystemQuantity(item.getSystemQuantity());
            itemDTO.setPhysicalCount(item.getPhysicalCount());
            itemDTO.setVariance(item.getVariance());
            itemDTO.setAdjustmentNotes(item.getAdjustmentNotes());
            itemDTOs.add(itemDTO);
        }
        dto.setItems(itemDTOs);
        
        return dto;
    }
}
