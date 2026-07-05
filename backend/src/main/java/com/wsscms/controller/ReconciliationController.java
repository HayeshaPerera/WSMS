package com.wsscms.controller;

// Import DTOs for structured JSON payloads
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.ReconciliationDTO;

// Import the service layer for business logic
import com.wsscms.service.ReconciliationService;

// Import Spring Web and Security annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ReconciliationController
 * 
 * Manages the "Stock Take" or "Reconciliation" process.
 * This is used when physical warehouse/supermarket staff count their actual items
 * and realize it differs from what the computer system says.
 * 
 * The flow is:
 * 1. Create a DRAFT reconciliation (recording the discrepancies).
 * 2. Review it.
 * 3. COMPLETE it (which actually adjusts the database inventory quantities).
 */
@RestController
@RequestMapping("/api/v1/reconciliations")
public class ReconciliationController {

    // Inject the ReconciliationService which handles the DB operations and math
    @Autowired
    private ReconciliationService service;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/reconciliations
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all reconciliations. Can be filtered by warehouse ID or supermarket ID
     * using URL query parameters (e.g., ?warehouseId=1).
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<List<ReconciliationDTO>>> getAll(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long supermarketId) {
        
        List<ReconciliationDTO> results;
        
        // Check which filter parameter was provided (if any)
        if (warehouseId != null) {
            results = service.getByWarehouse(warehouseId);
        } else if (supermarketId != null) {
            results = service.getBySupermarket(supermarketId);
        } else {
            // No filters provided, return everything system-wide
            results = service.getAll();
        }
        
        return ResponseEntity.ok(ApiResponse.success("Reconciliations fetched successfully", results));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/reconciliations/draft
    // ─────────────────────────────────────────────────────────
    /**
     * Creates a new Reconciliation in "DRAFT" status.
     * This logs the proposed discrepancy but does NOT alter actual inventory yet.
     * 
     * @param dto The JSON payload detailing the expected vs actual quantities.
     */
    @PostMapping("/draft")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<ReconciliationDTO>> createDraft(@RequestBody ReconciliationDTO dto) {
        ReconciliationDTO created = service.createDraft(dto);
        return ResponseEntity.ok(ApiResponse.success("Draft created", created));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/reconciliations/{id}/complete
    // ─────────────────────────────────────────────────────────
    /**
     * Approves and completes a DRAFT reconciliation.
     * CRITICAL ACTION: This calculates the exact difference (actual - expected)
     * and forces an update to the physical Inventory records in the database.
     * 
     * @param id The ID of the draft reconciliation to finalize.
     * @param userId The ID of the user confirming the action (for audit trails).
     */
    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<ReconciliationDTO>> completeReconciliation(
            @PathVariable Long id,
            @RequestParam Long userId) {
        
        ReconciliationDTO completed = service.completeReconciliation(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Reconciliation completed", completed));
    }
}
