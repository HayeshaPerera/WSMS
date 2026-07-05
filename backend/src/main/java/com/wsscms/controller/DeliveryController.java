package com.wsscms.controller;

// Import required DTOs for standardizing requests/responses
import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.DeliveryDTO;

// Import entities and repositories for database access
import com.wsscms.entity.Delivery;
import com.wsscms.entity.User;
import com.wsscms.repository.UserRepository;

// Import the service layer containing business logic
import com.wsscms.service.DeliveryService;

// Import Spring Web and Security annotations
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

/**
 * DeliveryController
 * 
 * Manages the lifecycle of a Delivery in the supply chain:
 * Creating deliveries from requests -> Dispatching -> Updating tracking -> Receiving.
 * It enforces Role-Based Access Control (RBAC) via @PreAuthorize tags to ensure
 * only the right personnel can update statuses.
 */
@RestController
@RequestMapping("/api/v1/deliveries")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DeliveryController {

    // Inject DeliveryService for business logic operations
    @Autowired
    private DeliveryService deliveryService;

    // Inject UserRepository to fetch the currently authenticated user's details
    @Autowired
    private UserRepository userRepository;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/deliveries
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all deliveries in the entire system.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DeliveryDTO>>> getAllDeliveries() {
        List<DeliveryDTO> deliveries = deliveryService.getAllDeliveries();
        return ResponseEntity.ok(ApiResponse.success(deliveries));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/deliveries/warehouse/{warehouseId}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all deliveries originating from a specific warehouse.
     */
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<DeliveryDTO>>> getDeliveriesByWarehouse(@PathVariable Long warehouseId) {
        List<DeliveryDTO> deliveries = deliveryService.getDeliveriesByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(deliveries));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/deliveries/supermarket/{supermarketId}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all deliveries destined for a specific supermarket.
     */
    @GetMapping("/supermarket/{supermarketId}")
    public ResponseEntity<ApiResponse<List<DeliveryDTO>>> getDeliveriesBySupermarket(@PathVariable Long supermarketId) {
        List<DeliveryDTO> deliveries = deliveryService.getDeliveriesBySupermarket(supermarketId);
        return ResponseEntity.ok(ApiResponse.success(deliveries));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/deliveries/active
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all "active" deliveries (e.g., PENDING, DISPATCHED, IN_TRANSIT).
     * Excludes completed or cancelled deliveries.
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<DeliveryDTO>>> getActiveDeliveries() {
        List<DeliveryDTO> deliveries = deliveryService.getActiveDeliveries();
        return ResponseEntity.ok(ApiResponse.success(deliveries));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/deliveries/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves details for a specific delivery by its internal database ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DeliveryDTO>> getDeliveryById(@PathVariable Long id) {
        DeliveryDTO delivery = deliveryService.getDeliveryById(id);
        return ResponseEntity.ok(ApiResponse.success(delivery));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/deliveries/tracking/{trackingNumber}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves details for a specific delivery by its public tracking number (e.g., TRK-2026-XYZ).
     */
    @GetMapping("/tracking/{trackingNumber}")
    public ResponseEntity<ApiResponse<DeliveryDTO>> getDeliveryByTrackingNumber(@PathVariable String trackingNumber) {
        DeliveryDTO delivery = deliveryService.getDeliveryByTrackingNumber(trackingNumber);
        return ResponseEntity.ok(ApiResponse.success(delivery));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/deliveries/from-request/{stockRequestId}
    // ─────────────────────────────────────────────────────────
    /**
     * Converts an APPROVED Stock Request into a new Delivery record.
     * Only Warehouse or Admin staff can initiate this.
     */
    @PostMapping("/from-request/{stockRequestId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'WAREHOUSE')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> createDeliveryFromRequest(@PathVariable Long stockRequestId) {
        DeliveryDTO createdDelivery = deliveryService.createDeliveryFromRequest(stockRequestId);
        return ResponseEntity.ok(ApiResponse.success("Delivery created successfully", createdDelivery));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/deliveries/{id}/dispatch
    // ─────────────────────────────────────────────────────────
    /**
     * Marks a pending delivery as DISPATCHED (truck has left the warehouse).
     * Only Warehouse staff can dispatch.
     * 
     * @param id Delivery ID
     * @param body JSON map containing driverName, vehicleNumber, and estimatedDelivery date
     */
    @PostMapping("/{id}/dispatch")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> dispatchDelivery(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
                
        // Extract logistics details from the JSON payload
        String driverName = (String) body.get("driverName");
        String vehicleNumber = (String) body.get("vehicleNumber");
        LocalDateTime estimatedDelivery = body.get("estimatedDelivery") != null 
                ? LocalDateTime.parse((String) body.get("estimatedDelivery")) 
                : null;
        
        // Pass data to service layer to update DB
        DeliveryDTO dispatchedDelivery = deliveryService.dispatchDelivery(id, driverName, vehicleNumber, estimatedDelivery);
        return ResponseEntity.ok(ApiResponse.success("Delivery dispatched successfully", dispatchedDelivery));
    }

    // ─────────────────────────────────────────────────────────
    // PATCH /api/v1/deliveries/{id}/status
    // ─────────────────────────────────────────────────────────
    /**
     * Partially updates a delivery's status (e.g., updating location while IN_TRANSIT).
     * Only Warehouse staff can update tracking.
     */
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
            
            // Convert string status to Enum, throw error if invalid
            Delivery.DeliveryStatus status;
            try {
                status = Delivery.DeliveryStatus.valueOf(statusStr);
            } catch (IllegalArgumentException iae) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Invalid delivery status: " + statusStr));
            }

            // Extract optional location tracking note
            String currentLocation = body.get("currentLocation");
            
            // Update in DB
            DeliveryDTO updatedDelivery = deliveryService.updateDeliveryStatus(id, status, currentLocation);
            return ResponseEntity.ok(ApiResponse.success("Delivery status updated", updatedDelivery));
            
        } catch (Exception ex) {
            // Log and return structured JSON error instead of an ugly 500 HTML stacktrace
            ex.printStackTrace();
            String msg = ex.getMessage() != null ? ex.getMessage() : ex.toString();
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to update status: " + msg));
        }
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/deliveries/{id}/receive
    // ─────────────────────────────────────────────────────────
    /**
     * Supermarket confirms they have physically received the delivery.
     * This action will automatically update their local Inventory levels.
     * Only Supermarket staff can receive.
     */
    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> receiveDelivery(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        DeliveryDTO receivedDelivery = deliveryService.receiveDelivery(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Delivery received successfully", receivedDelivery));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/deliveries/{id}/receive/force
    // ─────────────────────────────────────────────────────────
    /**
     * Force receive endpoint: allows supermarket users to confirm receipt
     * even if the delivery isn't in the typical receivable status (e.g., skipping 'IN_TRANSIT').
     * Primarily used for quick testing/demos or manual overrides.
     */
    @PostMapping("/{id}/receive/force")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> forceReceiveDelivery(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        DeliveryDTO receivedDelivery = deliveryService.forceReceiveDelivery(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Delivery force-received successfully", receivedDelivery));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/deliveries/{id}/fail
    // ─────────────────────────────────────────────────────────
    /**
     * Supermarket reports that a delivery failed to arrive or was rejected.
     */
    @PostMapping("/{id}/fail")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERMARKET_MANAGER', 'SUPERMARKET_STAFF')")
    public ResponseEntity<ApiResponse<DeliveryDTO>> failDelivery(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            // Default reason if none provided
            String reason = body.getOrDefault("reason", "Marked as not received by supermarket");
            Long userId = getCurrentUserId();
            
            DeliveryDTO dto = deliveryService.failDelivery(id, reason, userId);
            return ResponseEntity.ok(ApiResponse.success("Delivery marked as FAILED", dto));
            
        } catch (EntityNotFoundException enfe) {
            // Return 404 if delivery ID is invalid
            enfe.printStackTrace();
            return ResponseEntity.status(404).body(ApiResponse.error("Not found: " + enfe.getMessage()));
        } catch (IllegalStateException ise) {
            // Return 409 Conflict if delivery is already completed
            ise.printStackTrace();
            return ResponseEntity.status(409).body(ApiResponse.error("Invalid delivery state: " + ise.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to mark delivery as failed: " + ex.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────
    /**
     * Helper method to extract the database ID of the currently logged-in user
     * by parsing the SecurityContext.
     */
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
