package com.wsscms.controller;

// Import standard API formatting DTOs
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.WarehouseDTO;

// Import the service layer handling warehouse logic
import com.wsscms.service.WarehouseService;

// Validation constraints for API request payloads
import jakarta.validation.Valid;

// Spring Web and Security annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * WarehouseController
 * 
 * Manages the main Distribution Centers (Warehouses).
 * Warehouses are the hubs where Goods Receive Notes (GRNs) happen and where
 * Stock Requests from supermarkets are fulfilled.
 * 
 * This controller handles CRUD operations for the physical warehouse locations themselves,
 * NOT the inventory inside them.
 */
@RestController
@RequestMapping("/api/v1/warehouses")
@CrossOrigin(origins = "*", maxAge = 3600)
public class WarehouseController {

    // Inject the warehouse service for database communication
    @Autowired
    private WarehouseService warehouseService;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/warehouses
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all warehouses in the system.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<WarehouseDTO>>> getAllWarehouses() {
        List<WarehouseDTO> warehouses = warehouseService.getAllWarehouses();
        return ResponseEntity.ok(ApiResponse.success(warehouses));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/warehouses/active
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves only operational/active warehouses.
     * Useful for dropdown menus where a new user or supermarket needs to be assigned to a warehouse.
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<WarehouseDTO>>> getActiveWarehouses() {
        List<WarehouseDTO> warehouses = warehouseService.getActiveWarehouses();
        return ResponseEntity.ok(ApiResponse.success(warehouses));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/warehouses/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves the specific profile of one warehouse (e.g., location, manager contact).
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WarehouseDTO>> getWarehouseById(@PathVariable Long id) {
        WarehouseDTO warehouse = warehouseService.getWarehouseById(id);
        return ResponseEntity.ok(ApiResponse.success(warehouse));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/warehouses
    // ─────────────────────────────────────────────────────────
    /**
     * Registers a new warehouse location into the system network.
     * Security: ONLY system Administrators can add new distribution centers.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WarehouseDTO>> createWarehouse(@Valid @RequestBody WarehouseDTO warehouseDTO) {
        WarehouseDTO createdWarehouse = warehouseService.createWarehouse(warehouseDTO);
        return ResponseEntity.ok(ApiResponse.success("Warehouse created successfully", createdWarehouse));
    }

    // ─────────────────────────────────────────────────────────
    // PUT /api/v1/warehouses/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Updates an existing warehouse's details (e.g., changing its operational capacity or address).
     * Security: ONLY system Administrators can modify warehouse profiles.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WarehouseDTO>> updateWarehouse(@PathVariable Long id, @Valid @RequestBody WarehouseDTO warehouseDTO) {
        WarehouseDTO updatedWarehouse = warehouseService.updateWarehouse(id, warehouseDTO);
        return ResponseEntity.ok(ApiResponse.success("Warehouse updated successfully", updatedWarehouse));
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /api/v1/warehouses/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Permanently deletes a warehouse.
     * Dangerous operation in production if inventory or users are still tied to it.
     * Security: ONLY system Administrators can delete.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteWarehouse(@PathVariable Long id) {
        warehouseService.deleteWarehouse(id);
        return ResponseEntity.ok(ApiResponse.success("Warehouse deleted successfully", null));
    }
}
