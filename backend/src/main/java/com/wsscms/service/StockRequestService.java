package com.wsscms.service;

import com.wsscms.dto.StockRequestDTO;
import com.wsscms.entity.*;
import com.wsscms.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * StockRequestService
 * 
 * Handles the business logic for supermarkets requesting stock from warehouses.
 * This is the central piece of the supply chain order flow.
 */
@Service
@Transactional // Ensures that if any database operation fails, all changes in that method are rolled back
public class StockRequestService {

    // ─────────────────────────────────────────────────────────
    // Dependency Injections (Repositories to access the DB)
    // ─────────────────────────────────────────────────────────
    @Autowired private StockRequestRepository stockRequestRepository;
    @Autowired private SupermarketRepository supermarketRepository;
    @Autowired private WarehouseRepository warehouseRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private DeliveryService deliveryService; // Needed to auto-create a delivery upon approval

    private static final Logger logger = LoggerFactory.getLogger(StockRequestService.class);

    // ─────────────────────────────────────────────────────────
    // Query Methods
    // ─────────────────────────────────────────────────────────
    
    /** Gets every request in the system and converts them to DTOs for the API */
    public List<StockRequestDTO> getAllRequests() {
        return stockRequestRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /** Gets requests specifically initiated by one supermarket */
    public List<StockRequestDTO> getRequestsBySupermarket(Long supermarketId) {
        return stockRequestRepository.findBySupermarketId(supermarketId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /** Gets requests specifically assigned to one warehouse */
    public List<StockRequestDTO> getRequestsByWarehouse(Long warehouseId) {
        return stockRequestRepository.findByWarehouseId(warehouseId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /** Gets all requests globally that are still waiting for approval */
    public List<StockRequestDTO> getPendingRequests() {
        return stockRequestRepository.findPendingRequests().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /** Gets pending requests assigned to a specific warehouse (their "To-Do" list) */
    public List<StockRequestDTO> getPendingByWarehouse(Long warehouseId) {
        return stockRequestRepository.findPendingByWarehouseId(warehouseId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /** Gets the exact details of one single request */
    public StockRequestDTO getRequestById(Long id) {
        StockRequest request = stockRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock request not found with id: " + id));
        return convertToDTO(request);
    }

    // ─────────────────────────────────────────────────────────
    // Mutation Methods (Creating / Approving)
    // ─────────────────────────────────────────────────────────
    
    /**
     * Creates a brand new stock request from a Supermarket manager.
     */
    public StockRequestDTO createRequest(StockRequestDTO requestDTO, Long requestedById) {
        StockRequest request = new StockRequest();
        
        // Auto-generate a unique Request Number (e.g., SR-A1B2C3D4)
        request.setRequestNumber("SR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

        // Fetch related entities from the database to ensure they actually exist
        Supermarket supermarket = supermarketRepository.findById(requestDTO.getSupermarketId())
                .orElseThrow(() -> new EntityNotFoundException("Supermarket not found"));
        request.setSupermarket(supermarket);

        Warehouse warehouse = warehouseRepository.findById(requestDTO.getWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found"));
        request.setWarehouse(warehouse);

        Product product = productRepository.findById(requestDTO.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        request.setProduct(product);

        User requestedBy = userRepository.findById(requestedById)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        request.setRequestedBy(requestedBy);

        // Set basic data fields
        request.setRequestedQuantity(requestDTO.getRequestedQuantity());
        request.setStatus(StockRequest.RequestStatus.PENDING); // Always starts pending
        request.setPriority(requestDTO.getPriority() != null ? requestDTO.getPriority() : StockRequest.Priority.MEDIUM);
        request.setNotes(requestDTO.getNotes());

        // Save to DB
        StockRequest savedRequest = stockRequestRepository.save(request);
        return convertToDTO(savedRequest);
    }

    /**
     * Warehouse manager approves a pending request.
     * Crucially, this triggers the creation of a Delivery object!
     */
    public StockRequestDTO approveRequest(Long id, Integer approvedQuantity, Long approvedById) {
        // Find the request
        StockRequest request = stockRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock request not found"));

        // Only allow approving requests that are currently PENDING
        if (request.getStatus() != StockRequest.RequestStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be approved");
        }

        // Validate that all relationships are intact
        if (request.getWarehouse() == null) {
            throw new EntityNotFoundException("Warehouse information missing for this stock request");
        }
        if (request.getProduct() == null) {
            throw new EntityNotFoundException("Product information missing for this stock request");
        }
        if (approvedQuantity == null) {
            throw new IllegalArgumentException("approvedQuantity must be provided");
        }

        // Step 1: Verify the warehouse actually has enough stock to fulfill this request
        List<Inventory> warehouseInventories = inventoryRepository
                .findByWarehouseIdAndProductId(request.getWarehouse().getId(), request.getProduct().getId());
        if (warehouseInventories == null || warehouseInventories.isEmpty()) {
            throw new EntityNotFoundException("Product not in warehouse inventory");
        }
        
        // Sum all instances of this product in the warehouse (in case of multiple batches)
        int totalQty = warehouseInventories.stream().mapToInt(Inventory::getQuantity).sum();
        if (totalQty < approvedQuantity) {
            throw new IllegalStateException("Insufficient inventory in warehouse"); // Block approval if insufficient
        }

        // Fetch the user doing the approval
        User approvedBy = userRepository.findById(approvedById)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // Step 2: Update the request status to APPROVED
        request.setStatus(StockRequest.RequestStatus.APPROVED);
        request.setApprovedQuantity(approvedQuantity); // Note: Could be less than what was originally requested!
        request.setApprovedBy(approvedBy);
        request.setApprovedAt(LocalDateTime.now());

        StockRequest updatedRequest = stockRequestRepository.save(request);

        // Step 3: Automatically generate a Delivery record for the logistics team
        try {
            deliveryService.createDeliveryFromRequest(updatedRequest.getId());
        } catch (Exception e) {
            // If delivery fails, we log it but don't crash the approval process
            logger.warn("Delivery creation after approval failed for request {}: {}", updatedRequest.getId(), e.getMessage());
        }

        return convertToDTO(updatedRequest);
    }

    /**
     * Rejects a stock request (e.g. if the warehouse is totally out of stock)
     */
    public StockRequestDTO rejectRequest(Long id, String reason, Long rejectedById) {
        StockRequest request = stockRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock request not found"));

        if (request.getStatus() != StockRequest.RequestStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be rejected");
        }

        User rejectedBy = userRepository.findById(rejectedById)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        request.setStatus(StockRequest.RequestStatus.REJECTED);
        request.setRejectionReason(reason);
        request.setApprovedBy(rejectedBy); // Overloading 'approvedBy' to mean 'processedBy'
        request.setApprovedAt(LocalDateTime.now());

        StockRequest updatedRequest = stockRequestRepository.save(request);
        return convertToDTO(updatedRequest);
    }

    /**
     * Raw status updater, often used by automated background tasks or manual overrides.
     */
    public StockRequestDTO updateRequestStatus(Long id, StockRequest.RequestStatus status) {
        StockRequest request = stockRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock request not found"));

        request.setStatus(status);
        if (status == StockRequest.RequestStatus.COMPLETED) {
            request.setCompletedAt(LocalDateTime.now());
        }

        StockRequest updatedRequest = stockRequestRepository.save(request);
        return convertToDTO(updatedRequest);
    }

    // ─────────────────────────────────────────────────────────
    // DTO Conversion
    // ─────────────────────────────────────────────────────────
    
    /**
     * Converts the deeply nested JPA Entity into a flat JSON DTO for the frontend.
     * Prevents circular references and hides sensitive database structure.
     */
    private StockRequestDTO convertToDTO(StockRequest request) {
        StockRequestDTO dto = new StockRequestDTO();
        
        // Map primitive fields
        dto.setId(request.getId());
        dto.setRequestNumber(request.getRequestNumber());
        dto.setRequestedQuantity(request.getRequestedQuantity());
        dto.setApprovedQuantity(request.getApprovedQuantity());
        dto.setStatus(request.getStatus());
        dto.setPriority(request.getPriority());
        dto.setNotes(request.getNotes());
        dto.setRejectionReason(request.getRejectionReason());
        dto.setRequestedAt(request.getRequestedAt());
        dto.setApprovedAt(request.getApprovedAt());
        dto.setCompletedAt(request.getCompletedAt());

        // Extract nested relationship data safely
        if (request.getSupermarket() != null) {
            dto.setSupermarketId(request.getSupermarket().getId());
            dto.setSupermarketName(request.getSupermarket().getName());
        }

        if (request.getWarehouse() != null) {
            dto.setWarehouseId(request.getWarehouse().getId());
            dto.setWarehouseName(request.getWarehouse().getName());
        }

        if (request.getProduct() != null) {
            dto.setProductId(request.getProduct().getId());
            dto.setProductName(request.getProduct().getName());
            dto.setProductSku(request.getProduct().getSku());
        }

        if (request.getRequestedBy() != null) {
            dto.setRequestedById(request.getRequestedBy().getId());
            dto.setRequestedByName(request.getRequestedBy().getFirstName() + " " + request.getRequestedBy().getLastName());
        }

        if (request.getApprovedBy() != null) {
            dto.setApprovedById(request.getApprovedBy().getId());
            dto.setApprovedByName(request.getApprovedBy().getFirstName() + " " + request.getApprovedBy().getLastName());
        }

        return dto;
    }
}
