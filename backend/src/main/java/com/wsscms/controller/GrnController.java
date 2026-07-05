package com.wsscms.controller;

// Import DTOs for structuring API responses
import com.wsscms.dto.GrnDTO;

// Import Service layer that handles GRN business logic
import com.wsscms.service.GrnService;

// Import Spring Web annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GrnController
 * 
 * Exposes REST endpoints for managing Good Receive Notes (GRNs).
 * A GRN is a standard supply chain document used to acknowledge the receipt of goods 
 * from external suppliers into a warehouse.
 * 
 * Note: This controller returns raw DTOs without the `ApiResponse` wrapper to support
 * specific legacy frontend systems or direct API integrations.
 */
@RestController
@RequestMapping("/api/v1/grns")
@CrossOrigin(origins = "*") // Allow requests from any frontend domain
public class GrnController {

    // Inject the GRN Service layer
    @Autowired
    private GrnService grnService;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/grns
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all Goods Receive Notes in the system across all warehouses.
     */
    @GetMapping
    public ResponseEntity<List<GrnDTO>> getAllGrns() {
        return ResponseEntity.ok(grnService.getAllGrns());
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/grns/warehouse/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all GRNs that belong to a specific warehouse.
     */
    @GetMapping("/warehouse/{id}")
    public ResponseEntity<List<GrnDTO>> getGrnsByWarehouse(@PathVariable Long id) {
        return ResponseEntity.ok(grnService.getGrnsByWarehouse(id));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/grns/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves the details of a single GRN by its database ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<GrnDTO> getGrnById(@PathVariable Long id) {
        return ResponseEntity.ok(grnService.getGrnById(id));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/grns
    // ─────────────────────────────────────────────────────────
    /**
     * Creates a new "Pending" Goods Receive Note.
     * At this stage, the goods are logged as arrived, but have NOT yet been officially 
     * added to the warehouse's active inventory (they might need inspection).
     * 
     * @param grnDTO The JSON payload containing supplier, warehouse, and items received.
     */
    @PostMapping
    public ResponseEntity<GrnDTO> createGrn(@RequestBody GrnDTO grnDTO) {
        return ResponseEntity.ok(grnService.createGrn(grnDTO));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/grns/{id}/confirm
    // ─────────────────────────────────────────────────────────
    /**
     * Confirms a pending GRN.
     * This is a critical action: Confirming a GRN automatically updates the actual
     * physical inventory levels in the warehouse by adding the received quantities.
     * 
     * @param id The ID of the GRN to confirm.
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<GrnDTO> confirmGrn(@PathVariable Long id) {
        return ResponseEntity.ok(grnService.confirmGrn(id));
    }
}
