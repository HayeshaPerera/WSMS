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

@Service
@Transactional
public class StockRequestService {

    @Autowired
    private StockRequestRepository stockRequestRepository;

    @Autowired
    private SupermarketRepository supermarketRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private DeliveryService deliveryService;

    private static final Logger logger = LoggerFactory.getLogger(StockRequestService.class);

    public List<StockRequestDTO> getAllRequests() {
        return stockRequestRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<StockRequestDTO> getRequestsBySupermarket(Long supermarketId) {
        return stockRequestRepository.findBySupermarketId(supermarketId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<StockRequestDTO> getRequestsByWarehouse(Long warehouseId) {
        return stockRequestRepository.findByWarehouseId(warehouseId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<StockRequestDTO> getPendingRequests() {
        return stockRequestRepository.findPendingRequests().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<StockRequestDTO> getPendingByWarehouse(Long warehouseId) {
        return stockRequestRepository.findPendingByWarehouseId(warehouseId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public StockRequestDTO getRequestById(Long id) {
        StockRequest request = stockRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock request not found with id: " + id));
        return convertToDTO(request);
    }

    public StockRequestDTO createRequest(StockRequestDTO requestDTO, Long requestedById) {
        StockRequest request = new StockRequest();
        
        request.setRequestNumber("SR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

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

        request.setRequestedQuantity(requestDTO.getRequestedQuantity());
        request.setStatus(StockRequest.RequestStatus.PENDING);
        request.setPriority(requestDTO.getPriority() != null ? requestDTO.getPriority() : StockRequest.Priority.MEDIUM);
        request.setNotes(requestDTO.getNotes());

        StockRequest savedRequest = stockRequestRepository.save(request);
        return convertToDTO(savedRequest);
    }

    public StockRequestDTO approveRequest(Long id, Integer approvedQuantity, Long approvedById) {
        StockRequest request = stockRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock request not found"));

        if (request.getStatus() != StockRequest.RequestStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be approved");
        }

        // Validate request relations are present
        if (request.getWarehouse() == null) {
            throw new EntityNotFoundException("Warehouse information missing for this stock request");
        }
        if (request.getProduct() == null) {
            throw new EntityNotFoundException("Product information missing for this stock request");
        }
        if (approvedQuantity == null) {
            throw new IllegalArgumentException("approvedQuantity must be provided");
        }

        // Check warehouse inventory (handle possible multiple inventory rows for same product)
        List<Inventory> warehouseInventories = inventoryRepository
                .findByWarehouseIdAndProductId(request.getWarehouse().getId(), request.getProduct().getId());
        if (warehouseInventories == null || warehouseInventories.isEmpty()) {
            throw new EntityNotFoundException("Product not in warehouse inventory");
        }
        int totalQty = warehouseInventories.stream().mapToInt(Inventory::getQuantity).sum();
        if (totalQty < approvedQuantity) {
            throw new IllegalStateException("Insufficient inventory in warehouse");
        }

        User approvedBy = userRepository.findById(approvedById)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        request.setStatus(StockRequest.RequestStatus.APPROVED);
        request.setApprovedQuantity(approvedQuantity);
        request.setApprovedBy(approvedBy);
        request.setApprovedAt(LocalDateTime.now());

        StockRequest updatedRequest = stockRequestRepository.save(request);

        // Attempt to create delivery server-side so approve -> delivery is atomic from UI perspective.
        try {
            deliveryService.createDeliveryFromRequest(updatedRequest.getId());
        } catch (Exception e) {
            // Log and continue - approval should succeed even if delivery creation has a transient issue
            logger.warn("Delivery creation after approval failed for request {}: {}", updatedRequest.getId(), e.getMessage());
        }

        return convertToDTO(updatedRequest);
    }

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
        request.setApprovedBy(rejectedBy);
        request.setApprovedAt(LocalDateTime.now());

        StockRequest updatedRequest = stockRequestRepository.save(request);
        return convertToDTO(updatedRequest);
    }

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

    private StockRequestDTO convertToDTO(StockRequest request) {
        StockRequestDTO dto = new StockRequestDTO();
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
