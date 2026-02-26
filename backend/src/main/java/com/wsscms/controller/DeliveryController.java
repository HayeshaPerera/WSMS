package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.DeliveryDTO;
import com.wsscms.entity.Delivery;
import com.wsscms.entity.User;
import com.wsscms.repository.UserRepository;
import com.wsscms.service.DeliveryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deliveries")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DeliveryController {

    @Autowired
    private DeliveryService deliveryService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DeliveryDTO>>> getAllDeliveries() {
        List<DeliveryDTO> deliveries = deliveryService.getAllDeliveries();
        return ResponseEntity.ok(ApiResponse.success(deliveries));
    }

    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<DeliveryDTO>>> getDeliveriesByWarehouse(@PathVariable Long warehouseId) {
        List<DeliveryDTO> deliveries = deliveryService.getDeliveriesByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(deliveries));
    }

    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<DeliveryDTO>>> getDeliveriesBySupermarket(@PathVariable Long supermarketId) {
        List<DeliveryDTO> deliveries = deliveryService.getDeliveriesBySupermarket(supermarketId);
        return ResponseEntity.ok(ApiResponse.success(deliveries));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<DeliveryDTO>>> getActiveDeliveries() {
        List<DeliveryDTO> deliveries = deliveryService.getActiveDeliveries();
        return ResponseEntity.ok(ApiResponse.success(deliveries));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DeliveryDTO>> getDeliveryById(@PathVariable Long id) {
        DeliveryDTO delivery = deliveryService.getDeliveryById(id);
        return ResponseEntity.ok(ApiResponse.success(delivery));
    }

    @GetMapping("/tracking/{trackingNumber}")
    public ResponseEntity<ApiResponse<DeliveryDTO>> getDeliveryByTrackingNumber(@PathVariable String trackingNumber) {
        DeliveryDTO delivery = deliveryService.getDeliveryByTrackingNumber(trackingNumber);
        return ResponseEntity.ok(ApiResponse.success(delivery));
    }

    @PostMapping("/from-request/{stockRequestId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'WAREHOUSE')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> createDeliveryFromRequest(@PathVariable Long stockRequestId) {
        DeliveryDTO createdDelivery = deliveryService.createDeliveryFromRequest(stockRequestId);
        return ResponseEntity.ok(ApiResponse.success("Delivery created successfully", createdDelivery));
    }

    @PostMapping("/{id}/dispatch")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> dispatchDelivery(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String driverName = (String) body.get("driverName");
        String vehicleNumber = (String) body.get("vehicleNumber");
        LocalDateTime estimatedDelivery = body.get("estimatedDelivery") != null 
                ? LocalDateTime.parse((String) body.get("estimatedDelivery")) 
                : null;
        
        DeliveryDTO dispatchedDelivery = deliveryService.dispatchDelivery(id, driverName, vehicleNumber, estimatedDelivery);
        return ResponseEntity.ok(ApiResponse.success("Delivery dispatched successfully", dispatchedDelivery));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String statusStr = body.get("status");
            if (statusStr == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Missing 'status' in request body"));
            }
            Delivery.DeliveryStatus status;
            try {
                status = Delivery.DeliveryStatus.valueOf(statusStr);
            } catch (IllegalArgumentException iae) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Invalid delivery status: " + statusStr));
            }

            String currentLocation = body.get("currentLocation");
            DeliveryDTO updatedDelivery = deliveryService.updateDeliveryStatus(id, status, currentLocation);
            return ResponseEntity.ok(ApiResponse.success("Delivery status updated", updatedDelivery));
        } catch (Exception ex) {
            // Log and return structured error instead of 500 stacktrace
            ex.printStackTrace();
            String msg = ex.getMessage() != null ? ex.getMessage() : ex.toString();
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to update status: " + msg));
        }
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> receiveDelivery(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        DeliveryDTO receivedDelivery = deliveryService.receiveDelivery(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Delivery received successfully", receivedDelivery));
    }

    /**
     * Force receive endpoint: allows supermarket users to confirm receipt
     * even if the delivery isn't in the typical receivable status. This is
     * intended for testing/demo or manual overrides — use cautiously.
     */
    @PostMapping("/{id}/receive/force")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> forceReceiveDelivery(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        DeliveryDTO receivedDelivery = deliveryService.forceReceiveDelivery(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Delivery force-received successfully", receivedDelivery));
    }

    @PostMapping("/{id}/fail")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> failDelivery(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String reason = body.getOrDefault("reason", "Marked as not received by supermarket");
            Long userId = getCurrentUserId();
            DeliveryDTO dto = deliveryService.failDelivery(id, reason, userId);
            return ResponseEntity.ok(ApiResponse.success("Delivery marked as FAILED", dto));
        } catch (EntityNotFoundException enfe) {
            // common - return 404 for missing entities
            enfe.printStackTrace();
            return ResponseEntity.status(404).body(ApiResponse.error("Not found: " + enfe.getMessage()));
        } catch (IllegalStateException ise) {
            ise.printStackTrace();
            return ResponseEntity.status(409).body(ApiResponse.error("Invalid delivery state: " + ise.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to mark delivery as failed: " + ex.getMessage()));
        }
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
