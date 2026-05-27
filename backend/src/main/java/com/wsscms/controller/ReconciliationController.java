package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.ReconciliationDTO;
import com.wsscms.service.ReconciliationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reconciliations")
public class ReconciliationController {

    @Autowired
    private ReconciliationService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<List<ReconciliationDTO>>> getAll(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long supermarketId) {
        List<ReconciliationDTO> results;
        if (warehouseId != null) {
            results = service.getByWarehouse(warehouseId);
        } else if (supermarketId != null) {
            results = service.getBySupermarket(supermarketId);
        } else {
            results = service.getAll();
        }
        return ResponseEntity.ok(ApiResponse.success("Reconciliations fetched successfully", results));
    }

    @PostMapping("/draft")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<ReconciliationDTO>> createDraft(@RequestBody ReconciliationDTO dto) {
        ReconciliationDTO created = service.createDraft(dto);
        return ResponseEntity.ok(ApiResponse.success("Draft created", created));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'SUPERMARKET_MANAGER')")
    public ResponseEntity<ApiResponse<ReconciliationDTO>> completeReconciliation(
            @PathVariable Long id,
            @RequestParam Long userId) {
        ReconciliationDTO completed = service.completeReconciliation(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Reconciliation completed", completed));
    }
}
