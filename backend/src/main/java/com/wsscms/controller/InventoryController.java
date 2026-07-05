package com.wsscms.controller;

// Import DTOs to standardize JSON payloads sent to and received from the frontend
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.InventoryDTO;

// Import Service layer that holds the actual business logic for inventory
import com.wsscms.service.InventoryService;

// Import Swagger/OpenAPI annotations for generating API documentation
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// Import Jakarta Validation to enforce rules (like @NotNull) on incoming JSON bodies
import jakarta.validation.Valid;

// Import Spring Web and Security annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * InventoryController
 * 
 * Manages the core inventory system across both Warehouses and Supermarkets.
 * This includes querying stock levels, checking for low stock, 
 * and performing manual stock adjustments (stock takes / reconciliations).
 */
@RestController
@RequestMapping("/api/v1/inventory")
@CrossOrigin(origins = "*", maxAge = 3600)
@Tag(name = "Inventory", description = "Inventory management endpoints")
public class InventoryController {

    // Inject the service that actually queries the database and performs calculations
    @Autowired
    private InventoryService inventoryService;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/inventory
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves a master list of all inventory records in the entire system.
     * Use cautiously on large datasets.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getAllInventory() {
        List<InventoryDTO> inventory = inventoryService.getAllInventory();
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/inventory/warehouse/{warehouseId}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all inventory currently stored at a specific warehouse location.
     */
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getInventoryByWarehouse(@PathVariable Long warehouseId) {
        List<InventoryDTO> inventory = inventoryService.getInventoryByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/inventory/warehouse/{warehouseId}/product/{productId}/quantity
    // ─────────────────────────────────────────────────────────
    /**
     * Highly specific endpoint to check the exact quantity of ONE product at ONE warehouse.
     * Used by the frontend when trying to determine if a requested amount is fulfillable.
     * 
     * Note: This returns a raw Integer, not wrapped in an ApiResponse, to make quick parsing easier.
     */
    @GetMapping("/warehouse/{warehouseId}/product/{productId}/quantity")
    public ResponseEntity<Integer> getQuantityByWarehouseAndProduct(
            @PathVariable Long warehouseId,
            @PathVariable Long productId) {
        Integer quantity = inventoryService.getQuantityByWarehouseAndProduct(warehouseId, productId);
        return ResponseEntity.ok(quantity);
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/inventory/supermarket/{supermarketId}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all inventory currently on the shelves or in the backroom of a specific supermarket.
     */
    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getInventoryBySupermarket(@PathVariable Long supermarketId) {
        List<InventoryDTO> inventory = inventoryService.getInventoryBySupermarket(supermarketId);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/inventory/low-stock
    // ─────────────────────────────────────────────────────────
    /**
     * Global low stock check. Returns any inventory record anywhere in the system
     * where current quantity <= the defined reorderLevel.
     */
    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getLowStockItems() {
        List<InventoryDTO> inventory = inventoryService.getLowStockItems();
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/inventory/low-stock/warehouse/{warehouseId}
    // ─────────────────────────────────────────────────────────
    /**
     * Checks for low stock items specifically at one warehouse.
     */
    @GetMapping("/low-stock/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getLowStockByWarehouse(@PathVariable Long warehouseId) {
        List<InventoryDTO> inventory = inventoryService.getLowStockByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/inventory/low-stock/supermarket/{supermarketId}
    // ─────────────────────────────────────────────────────────
    /**
     * Checks for low stock items specifically at one supermarket.
     */
    @GetMapping("/low-stock/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<InventoryDTO>>> getLowStockBySupermarket(@PathVariable Long supermarketId) {
        List<InventoryDTO> inventory = inventoryService.getLowStockBySupermarket(supermarketId);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/inventory/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Gets details for a specific inventory record by its database ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryDTO>> getInventoryById(@PathVariable Long id) {
        InventoryDTO inventory = inventoryService.getInventoryById(id);
        return ResponseEntity.ok(ApiResponse.success(inventory));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/inventory
    // ─────────────────────────────────────────────────────────
    /**
     * Creates a brand new inventory record (e.g., when a new product is stocked for the first time).
     * Protected: Only Admins or Warehouse staff can do this.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('WAREHOUSE_MANAGER') or hasRole('WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<InventoryDTO>> createInventory(@Valid @RequestBody InventoryDTO inventoryDTO) {
        InventoryDTO createdInventory = inventoryService.createInventory(inventoryDTO);
        return ResponseEntity.ok(ApiResponse.success("Inventory created successfully", createdInventory));
    }

    // ─────────────────────────────────────────────────────────
    // PUT /api/v1/inventory/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Completely overrides an existing inventory record.
     * Protected: Only Admins or Warehouse staff can do this.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('WAREHOUSE_MANAGER') or hasRole('WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<InventoryDTO>> updateInventory(@PathVariable Long id, @Valid @RequestBody InventoryDTO inventoryDTO) {
        InventoryDTO updatedInventory = inventoryService.updateInventory(id, inventoryDTO);
        return ResponseEntity.ok(ApiResponse.success("Inventory updated successfully", updatedInventory));
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /api/v1/inventory/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Deletes an inventory record entirely.
     * Protected: Only Admins or Warehouse staff can do this.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('WAREHOUSE_MANAGER') or hasRole('WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<Void>> deleteInventory(@PathVariable Long id) {
        inventoryService.deleteInventory(id);
        return ResponseEntity.ok(ApiResponse.success("Inventory deleted successfully", null));
    }

    // ─────────────────────────────────────────────────────────
    // PATCH /api/v1/inventory/{id}/adjust
    // ─────────────────────────────────────────────────────────
    /**
     * Performs a relative adjustment to the stock quantity (e.g., +10 or -5).
     * This is safer than PUT because it prevents race conditions where two users
     * try to update the total quantity at the exact same time.
     * 
     * Accessible by both Warehouse and Supermarket staff for stock reconciliations.
     * 
     * @param id Inventory ID
     * @param adjustment Positive number to add stock, negative to remove stock
     */
    @PatchMapping("/{id}/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<InventoryDTO>> adjustQuantity(@PathVariable Long id, @RequestParam Integer adjustment) {
        InventoryDTO updatedInventory = inventoryService.adjustQuantity(id, adjustment);
        return ResponseEntity.ok(ApiResponse.success("Inventory adjusted successfully", updatedInventory));
    }
}
