package com.wsscms.controller;

// Import standard API DTOs
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.StockRequestDTO;

// Import database entities
import com.wsscms.entity.StockRequest;
import com.wsscms.entity.User;

// Import User repository to fetch the currently logged-in user
import com.wsscms.repository.UserRepository;

// Import the service that handles stock request business logic
import com.wsscms.service.StockRequestService;

// Import Validation annotations
import jakarta.validation.Valid;

// Import Spring Web and Security annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * StockRequestController
 * 
 * Manages the first step in the supply chain workflow:
 * Supermarkets asking Warehouses for more inventory.
 * 
 * Flow:
 * 1. Supermarket CREATES a Pending request.
 * 2. Warehouse views it and either APPROVES or REJECTS it.
 * 3. If approved, it moves to the Delivery workflow.
 */
@RestController
@RequestMapping("/api/v1/stock-requests")
@CrossOrigin(origins = "*", maxAge = 3600)
public class StockRequestController {

    // Inject the Stock Request service layer
    @Autowired
    private StockRequestService stockRequestService;

    // Inject User repository
    @Autowired
    private UserRepository userRepository;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/stock-requests
    // ─────────────────────────────────────────────────────────
    /**
     * Fetches every stock request in the system (historical and pending).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getAllRequests() {
        List<StockRequestDTO> requests = stockRequestService.getAllRequests();
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/stock-requests/supermarket/{supermarketId}
    // ─────────────────────────────────────────────────────────
    /**
     * Fetches all requests initiated by a specific supermarket.
     */
    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getRequestsBySupermarket(@PathVariable Long supermarketId) {
        List<StockRequestDTO> requests = stockRequestService.getRequestsBySupermarket(supermarketId);
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/stock-requests/warehouse/{warehouseId}
    // ─────────────────────────────────────────────────────────
    /**
     * Fetches all requests sent to a specific warehouse for fulfillment.
     */
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getRequestsByWarehouse(@PathVariable Long warehouseId) {
        List<StockRequestDTO> requests = stockRequestService.getRequestsByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/stock-requests/pending
    // ─────────────────────────────────────────────────────────
    /**
     * Fetches all unresolved (PENDING) requests globally.
     */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getPendingRequests() {
        List<StockRequestDTO> requests = stockRequestService.getPendingRequests();
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/stock-requests/pending/warehouse/{warehouseId}
    // ─────────────────────────────────────────────────────────
    /**
     * Fetches pending requests assigned to a specific warehouse.
     * Used by Warehouse Managers to see their active queue of tasks.
     */
    @GetMapping("/pending/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getPendingByWarehouse(@PathVariable Long warehouseId) {
        List<StockRequestDTO> requests = stockRequestService.getPendingByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/stock-requests/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Fetches the details of a single request.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StockRequestDTO>> getRequestById(@PathVariable Long id) {
        StockRequestDTO request = stockRequestService.getRequestById(id);
        return ResponseEntity.ok(ApiResponse.success(request));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/stock-requests
    // ─────────────────────────────────────────────────────────
    /**
     * Creates a new Stock Request.
     * Only Supermarket staff can request stock.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<StockRequestDTO>> createRequest(@Valid @RequestBody StockRequestDTO requestDTO) {
        Long userId = getCurrentUserId();
        StockRequestDTO createdRequest = stockRequestService.createRequest(requestDTO, userId);
        return ResponseEntity.ok(ApiResponse.success("Stock request created successfully", createdRequest));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/stock-requests/{id}/approve
    // ─────────────────────────────────────────────────────────
    /**
     * Warehouse manager reviews a pending request and approves it.
     * They can approve the exact quantity requested, or a partial quantity if they are low on stock.
     * Approving a request triggers the creation of a Delivery record.
     */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'WAREHOUSE')")
    public ResponseEntity<ApiResponse<StockRequestDTO>> approveRequest(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) { // Expects JSON: { "approvedQuantity": 50 }
            
        Long userId = getCurrentUserId();
        Integer approvedQuantity = body.get("approvedQuantity");
        
        StockRequestDTO approvedRequest = stockRequestService.approveRequest(id, approvedQuantity, userId);
        return ResponseEntity.ok(ApiResponse.success("Stock request approved successfully", approvedRequest));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/stock-requests/{id}/reject
    // ─────────────────────────────────────────────────────────
    /**
     * Warehouse manager rejects a request (e.g., completely out of stock, invalid request).
     */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'WAREHOUSE')")
    public ResponseEntity<ApiResponse<StockRequestDTO>> rejectRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) { // Expects JSON: { "reason": "Out of stock until next week" }
            
        Long userId = getCurrentUserId();
        String reason = body.get("reason");
        
        StockRequestDTO rejectedRequest = stockRequestService.rejectRequest(id, reason, userId);
        return ResponseEntity.ok(ApiResponse.success("Stock request rejected", rejectedRequest));
    }

    // ─────────────────────────────────────────────────────────
    // PATCH /api/v1/stock-requests/{id}/status
    // ─────────────────────────────────────────────────────────
    /**
     * Generic status updater, usually called internally by other services (like DeliveryService)
     * to transition a request from APPROVED -> IN_TRANSIT -> COMPLETED.
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'WAREHOUSE')")
    public ResponseEntity<ApiResponse<StockRequestDTO>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
            
        StockRequest.RequestStatus status = StockRequest.RequestStatus.valueOf(body.get("status"));
        StockRequestDTO updatedRequest = stockRequestService.updateRequestStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Status updated successfully", updatedRequest));
    }

    // ─────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────
    /**
     * Helper method to securely extract the currently logged-in user's database ID.
     */
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
