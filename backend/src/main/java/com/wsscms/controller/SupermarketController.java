package com.wsscms.controller;

// Import DTOs for standardizing JSON API responses
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.SupermarketDTO;

// Import the service layer handling business logic
import com.wsscms.service.SupermarketService;

// Import validation to ensure incoming data is correct
import jakarta.validation.Valid;

// Import Spring Web and Security annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * SupermarketController
 * 
 * Manages the "Supermarket" entities (the retail store locations).
 * Provides endpoints for creating stores, updating their details (like address or manager),
 * and listing stores by region or assigned warehouse.
 */
@RestController
@RequestMapping("/api/v1/supermarkets")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SupermarketController {

    // Inject the SupermarketService which interacts with the database
    @Autowired
    private SupermarketService supermarketService;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/supermarkets
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves a list of ALL supermarkets in the system (both active and inactive).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<SupermarketDTO>>> getAllSupermarkets() {
        List<SupermarketDTO> supermarkets = supermarketService.getAllSupermarkets();
        return ResponseEntity.ok(ApiResponse.success(supermarkets));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/supermarkets/active
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves only the supermarkets that are currently open and operating.
     * Used to populate dropdown menus when creating stock requests.
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<SupermarketDTO>>> getActiveSupermarkets() {
        List<SupermarketDTO> supermarkets = supermarketService.getActiveSupermarkets();
        return ResponseEntity.ok(ApiResponse.success(supermarkets));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/supermarkets/warehouse/{warehouseId}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all supermarkets that are geographically assigned to be 
     * supplied by a specific warehouse.
     */
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<SupermarketDTO>>> getSupermarketsByWarehouse(@PathVariable Long warehouseId) {
        List<SupermarketDTO> supermarkets = supermarketService.getSupermarketsByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(supermarkets));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/supermarkets/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves the detailed profile of a single supermarket by its ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupermarketDTO>> getSupermarketById(@PathVariable Long id) {
        SupermarketDTO supermarket = supermarketService.getSupermarketById(id);
        return ResponseEntity.ok(ApiResponse.success(supermarket));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/supermarkets
    // ─────────────────────────────────────────────────────────
    /**
     * Registers a new supermarket location in the system.
     * Security: ONLY system Administrators can add new store locations.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SupermarketDTO>> createSupermarket(@Valid @RequestBody SupermarketDTO supermarketDTO) {
        SupermarketDTO createdSupermarket = supermarketService.createSupermarket(supermarketDTO);
        return ResponseEntity.ok(ApiResponse.success("Supermarket created successfully", createdSupermarket));
    }

    // ─────────────────────────────────────────────────────────
    // PUT /api/v1/supermarkets/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Updates an existing supermarket's information (e.g., changing its name, address, or assigned warehouse).
     * Security: ONLY system Administrators can update store details.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SupermarketDTO>> updateSupermarket(@PathVariable Long id, @Valid @RequestBody SupermarketDTO supermarketDTO) {
        SupermarketDTO updatedSupermarket = supermarketService.updateSupermarket(id, supermarketDTO);
        return ResponseEntity.ok(ApiResponse.success("Supermarket updated successfully", updatedSupermarket));
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /api/v1/supermarkets/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Permanently deletes a supermarket from the database.
     * Note: In a real production system, this is dangerous if there is historical
     * sales/delivery data tied to this supermarket ID. A "soft delete" (setting active=false) 
     * is usually safer, but this endpoint is provided for full CRUD capability.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSupermarket(@PathVariable Long id) {
        supermarketService.deleteSupermarket(id);
        return ResponseEntity.ok(ApiResponse.success("Supermarket deleted successfully", null));
    }
}
