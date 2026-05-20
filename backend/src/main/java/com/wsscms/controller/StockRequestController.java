package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.StockRequestDTO;
import com.wsscms.entity.StockRequest;
import com.wsscms.entity.User;
import com.wsscms.repository.UserRepository;
import com.wsscms.service.StockRequestService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stock-requests")
@CrossOrigin(origins = "*", maxAge = 3600)
public class StockRequestController {

    @Autowired
    private StockRequestService stockRequestService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getAllRequests() {
        List<StockRequestDTO> requests = stockRequestService.getAllRequests();
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getRequestsBySupermarket(@PathVariable Long supermarketId) {
        List<StockRequestDTO> requests = stockRequestService.getRequestsBySupermarket(supermarketId);
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getRequestsByWarehouse(@PathVariable Long warehouseId) {
        List<StockRequestDTO> requests = stockRequestService.getRequestsByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getPendingRequests() {
        List<StockRequestDTO> requests = stockRequestService.getPendingRequests();
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    @GetMapping("/pending/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<StockRequestDTO>>> getPendingByWarehouse(@PathVariable Long warehouseId) {
        List<StockRequestDTO> requests = stockRequestService.getPendingByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(requests));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StockRequestDTO>> getRequestById(@PathVariable Long id) {
        StockRequestDTO request = stockRequestService.getRequestById(id);
        return ResponseEntity.ok(ApiResponse.success(request));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<StockRequestDTO>> createRequest(@Valid @RequestBody StockRequestDTO requestDTO) {
        Long userId = getCurrentUserId();
        StockRequestDTO createdRequest = stockRequestService.createRequest(requestDTO, userId);
        return ResponseEntity.ok(ApiResponse.success("Stock request created successfully", createdRequest));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'WAREHOUSE')")
    public ResponseEntity<ApiResponse<StockRequestDTO>> approveRequest(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Long userId = getCurrentUserId();
        Integer approvedQuantity = body.get("approvedQuantity");
        StockRequestDTO approvedRequest = stockRequestService.approveRequest(id, approvedQuantity, userId);
        return ResponseEntity.ok(ApiResponse.success("Stock request approved successfully", approvedRequest));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'WAREHOUSE')")
    public ResponseEntity<ApiResponse<StockRequestDTO>> rejectRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Long userId = getCurrentUserId();
        String reason = body.get("reason");
        StockRequestDTO rejectedRequest = stockRequestService.rejectRequest(id, reason, userId);
        return ResponseEntity.ok(ApiResponse.success("Stock request rejected", rejectedRequest));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'WAREHOUSE')")
    public ResponseEntity<ApiResponse<StockRequestDTO>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        StockRequest.RequestStatus status = StockRequest.RequestStatus.valueOf(body.get("status"));
        StockRequestDTO updatedRequest = stockRequestService.updateRequestStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Status updated successfully", updatedRequest));
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
