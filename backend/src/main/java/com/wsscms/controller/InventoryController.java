package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.InventoryDTO;
import com.wsscms.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory")
@CrossOrigin(origins = "*", maxAge = 3600)
@Tag(name = "Inventory", description = "Inventory management endpoints")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getAllInventory() {
        List<InventoryDTO> inventory = inventoryService.getAllInventory();
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getInventoryByWarehouse(@PathVariable Long warehouseId) {
        List<InventoryDTO> inventory = inventoryService.getInventoryByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    @GetMapping("/warehouse/{warehouseId}/product/{productId}/quantity")
    public ResponseEntity<Integer> getQuantityByWarehouseAndProduct(
            @PathVariable Long warehouseId,
            @PathVariable Long productId) {
        Integer quantity = inventoryService.getQuantityByWarehouseAndProduct(warehouseId, productId);
        return ResponseEntity.ok(quantity);
    }

    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getInventoryBySupermarket(@PathVariable Long supermarketId) {
        List<InventoryDTO> inventory = inventoryService.getInventoryBySupermarket(supermarketId);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getLowStockItems() {
        List<InventoryDTO> inventory = inventoryService.getLowStockItems();
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    @GetMapping("/low-stock/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getLowStockByWarehouse(@PathVariable Long warehouseId) {
        List<InventoryDTO> inventory = inventoryService.getLowStockByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    @GetMapping("/low-stock/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getLowStockBySupermarket(@PathVariable Long supermarketId) {
        List<InventoryDTO> inventory = inventoryService.getLowStockBySupermarket(supermarketId);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryDTO>> getInventoryById(@PathVariable Long id) {
        InventoryDTO inventory = inventoryService.getInventoryById(id);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('WAREHOUSE_MANAGER') or hasRole('WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<InventoryDTO>> createInventory(@Valid @RequestBody InventoryDTO inventoryDTO) {
        InventoryDTO createdInventory = inventoryService.createInventory(inventoryDTO);
        return ResponseEntity.ok(ApiResponse.success("Inventory created successfully", createdInventory));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('WAREHOUSE_MANAGER') or hasRole('WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<InventoryDTO>> updateInventory(@PathVariable Long id, @Valid @RequestBody InventoryDTO inventoryDTO) {
        InventoryDTO updatedInventory = inventoryService.updateInventory(id, inventoryDTO);
        return ResponseEntity.ok(ApiResponse.success("Inventory updated successfully", updatedInventory));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('WAREHOUSE_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteInventory(@PathVariable Long id) {
        inventoryService.deleteInventory(id);
        return ResponseEntity.ok(ApiResponse.success("Inventory deleted successfully", null));
    }

    @PatchMapping("/{id}/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<InventoryDTO>> adjustQuantity(@PathVariable Long id, @RequestParam Integer adjustment) {
        InventoryDTO updatedInventory = inventoryService.adjustQuantity(id, adjustment);
        return ResponseEntity.ok(ApiResponse.success("Inventory adjusted successfully", updatedInventory));
    }
}
