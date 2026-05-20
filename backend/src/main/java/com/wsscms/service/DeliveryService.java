package com.wsscms.service;

import com.wsscms.dto.DeliveryDTO;
import com.wsscms.entity.*;
import com.wsscms.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class DeliveryService {

    @Autowired
    private DeliveryRepository deliveryRepository;

    @Autowired
    private StockRequestRepository stockRequestRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private UserRepository userRepository;

    public List<DeliveryDTO> getAllDeliveries() {
        return deliveryRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<DeliveryDTO> getDeliveriesByWarehouse(Long warehouseId) {
        return deliveryRepository.findByWarehouseId(warehouseId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<DeliveryDTO> getDeliveriesBySupermarket(Long supermarketId) {
        return deliveryRepository.findBySupermarketId(supermarketId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<DeliveryDTO> getActiveDeliveries() {
        return deliveryRepository.findActiveDeliveries().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public DeliveryDTO getDeliveryById(Long id) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Delivery not found with id: " + id));
        return convertToDTO(delivery);
    }

    public DeliveryDTO getDeliveryByTrackingNumber(String trackingNumber) {
        Delivery delivery = deliveryRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new EntityNotFoundException("Delivery not found with tracking number: " + trackingNumber));
        return convertToDTO(delivery);
    }

    public DeliveryDTO createDeliveryFromRequest(Long stockRequestId) {
        StockRequest stockRequest = stockRequestRepository.findById(stockRequestId)
                .orElseThrow(() -> new EntityNotFoundException("Stock request not found"));

        if (stockRequest.getStatus() != StockRequest.RequestStatus.APPROVED) {
            throw new IllegalStateException("Can only create delivery for approved requests");
        }

        Delivery delivery = new Delivery();
        delivery.setTrackingNumber("DEL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        delivery.setStockRequest(stockRequest);
        delivery.setWarehouse(stockRequest.getWarehouse());
        delivery.setSupermarket(stockRequest.getSupermarket());
        delivery.setStatus(Delivery.DeliveryStatus.PENDING);
        
        DeliveryItem item = new DeliveryItem();
        item.setDelivery(delivery);
        item.setProduct(stockRequest.getProduct());
        item.setExpectedQuantity(stockRequest.getApprovedQuantity());
        item.setStatus("PENDING");
        delivery.getDeliveryItems().add(item);

        // Update stock request status
        stockRequest.setStatus(StockRequest.RequestStatus.IN_TRANSIT);
        stockRequestRepository.save(stockRequest);

        Delivery savedDelivery = deliveryRepository.save(delivery);
        return convertToDTO(savedDelivery);
    }

    public DeliveryDTO dispatchDelivery(Long id, String driverName, String vehicleNumber, LocalDateTime estimatedDelivery) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Delivery not found"));

        if (delivery.getStatus() != Delivery.DeliveryStatus.PENDING) {
            throw new IllegalStateException("Only pending deliveries can be dispatched");
        }

        // Deduct from warehouse inventory for all items
        for (DeliveryItem item : delivery.getDeliveryItems()) {
            List<Inventory> warehouseInventories = inventoryRepository
                    .findByWarehouseIdAndProductId(delivery.getWarehouse().getId(), item.getProduct().getId());
            if (warehouseInventories == null || warehouseInventories.isEmpty()) {
                throw new EntityNotFoundException("Product not in warehouse inventory");
            }
            int totalInventory = warehouseInventories.stream().mapToInt(Inventory::getQuantity).sum();
            if (totalInventory < item.getExpectedQuantity()) {
                throw new IllegalStateException("Insufficient inventory in warehouse for product: " + item.getProduct().getName());
            }
            int remainingToDeduct = item.getExpectedQuantity();
            for (Inventory warehouseInventory : warehouseInventories) {
                if (remainingToDeduct <= 0) break;
                int canDeduct = Math.min(warehouseInventory.getQuantity(), remainingToDeduct);
                warehouseInventory.setQuantity(warehouseInventory.getQuantity() - canDeduct);
                remainingToDeduct -= canDeduct;
                inventoryRepository.save(warehouseInventory);
            }
        }

        delivery.setStatus(Delivery.DeliveryStatus.DISPATCHED);
        delivery.setDriverName(driverName);
        delivery.setVehicleNumber(vehicleNumber);
        delivery.setEstimatedDelivery(estimatedDelivery);
        delivery.setDispatchedAt(LocalDateTime.now());

        Delivery updatedDelivery = deliveryRepository.save(delivery);
        return convertToDTO(updatedDelivery);
    }

    public DeliveryDTO updateDeliveryStatus(Long id, Delivery.DeliveryStatus status, String currentLocation) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Delivery not found"));

        delivery.setStatus(status);
        delivery.setCurrentLocation(currentLocation);

        switch (status) {
            case IN_TRANSIT:
                delivery.setInTransitAt(LocalDateTime.now());
                break;
            case DELIVERED:
                delivery.setDeliveredAt(LocalDateTime.now());
                break;
            case CANCELLED:
                delivery.setCancelledAt(LocalDateTime.now());
                break;
            default:
                break;
        }

        Delivery updatedDelivery = deliveryRepository.save(delivery);
        return convertToDTO(updatedDelivery);
    }

    public DeliveryDTO receiveDelivery(Long id, Long receivedById) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Delivery not found"));

        if (delivery.getStatus() != Delivery.DeliveryStatus.OUT_FOR_DELIVERY && 
            delivery.getStatus() != Delivery.DeliveryStatus.IN_TRANSIT) {
            throw new IllegalStateException("Delivery cannot be received in current status");
        }

        User receivedBy = userRepository.findById(receivedById)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // Add to supermarket inventory
        for (DeliveryItem item : delivery.getDeliveryItems()) {
            List<Inventory> supermarketInventories = inventoryRepository
                .findBySupermarketIdAndProductId(delivery.getSupermarket().getId(), item.getProduct().getId());
            Inventory supermarketInventory = (supermarketInventories != null && !supermarketInventories.isEmpty()) ? supermarketInventories.get(0) : null;

            if (supermarketInventory == null) {
                supermarketInventory = new Inventory();
                supermarketInventory.setSupermarket(delivery.getSupermarket());
                supermarketInventory.setProduct(item.getProduct());
                supermarketInventory.setQuantity(0);
                supermarketInventory.setReorderLevel(10);
            }

            supermarketInventory.setQuantity(supermarketInventory.getQuantity() + item.getExpectedQuantity());
            inventoryRepository.save(supermarketInventory);
            
            item.setActualQuantity(item.getExpectedQuantity());
            item.setStatus("DELIVERED");
        }

        delivery.setStatus(Delivery.DeliveryStatus.DELIVERED);
        delivery.setDeliveredAt(LocalDateTime.now());
        delivery.setReceivedBy(receivedBy);

        // Update stock request status
        StockRequest stockRequest = delivery.getStockRequest();
        stockRequest.setStatus(StockRequest.RequestStatus.COMPLETED);
        stockRequest.setCompletedAt(LocalDateTime.now());
        stockRequestRepository.save(stockRequest);

        Delivery updatedDelivery = deliveryRepository.save(delivery);
        return convertToDTO(updatedDelivery);
    }

    /**
     * Force receive: used for edge cases where supermarket confirms receipt
     * but delivery is not in the expected status. This bypasses the strict
     * status check but still updates supermarket inventory and marks
     * the delivery as DELIVERED. Use with caution.
     */
    public DeliveryDTO forceReceiveDelivery(Long id, Long receivedById) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Delivery not found"));

        User receivedBy = userRepository.findById(receivedById)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // Add to supermarket inventory (create row if none)
        for (DeliveryItem item : delivery.getDeliveryItems()) {
            List<Inventory> supermarketInventories = inventoryRepository
                    .findBySupermarketIdAndProductId(delivery.getSupermarket().getId(), item.getProduct().getId());
            Inventory supermarketInventory = (supermarketInventories != null && !supermarketInventories.isEmpty()) ? supermarketInventories.get(0) : null;

            if (supermarketInventory == null) {
                supermarketInventory = new Inventory();
                supermarketInventory.setSupermarket(delivery.getSupermarket());
                supermarketInventory.setProduct(item.getProduct());
                supermarketInventory.setQuantity(0);
                supermarketInventory.setReorderLevel(10);
            }

            supermarketInventory.setQuantity(supermarketInventory.getQuantity() + item.getExpectedQuantity());
            inventoryRepository.save(supermarketInventory);
            
            item.setActualQuantity(item.getExpectedQuantity());
            item.setStatus("DELIVERED");
        }

        delivery.setStatus(Delivery.DeliveryStatus.DELIVERED);
        delivery.setDeliveredAt(LocalDateTime.now());
        delivery.setReceivedBy(receivedBy);

        if (delivery.getStockRequest() != null) {
            StockRequest stockRequest = delivery.getStockRequest();
            stockRequest.setStatus(StockRequest.RequestStatus.COMPLETED);
            stockRequest.setCompletedAt(LocalDateTime.now());
            stockRequestRepository.save(stockRequest);
        }

        Delivery updatedDelivery = deliveryRepository.save(delivery);
        return convertToDTO(updatedDelivery);
    }

    /**
     * Mark delivery as failed (rejected by supermarket).
     */
    public DeliveryDTO failDelivery(Long id, String reason, Long reportedById) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Delivery not found"));

        User reportedBy = userRepository.findById(reportedById)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        delivery.setStatus(Delivery.DeliveryStatus.FAILED);
        delivery.setFailureReason(reason);
        delivery.setFailedAt(LocalDateTime.now());

        deliveryRepository.save(delivery);
        return convertToDTO(delivery);
    }

    private DeliveryDTO convertToDTO(Delivery delivery) {
        DeliveryDTO dto = new DeliveryDTO();
        dto.setId(delivery.getId());
        dto.setTrackingNumber(delivery.getTrackingNumber());
        dto.setStatus(delivery.getStatus());
        dto.setDriverName(delivery.getDriverName());
        dto.setVehicleNumber(delivery.getVehicleNumber());
        dto.setCurrentLocation(delivery.getCurrentLocation());
        dto.setNotes(delivery.getNotes());
        dto.setCreatedAt(delivery.getCreatedAt());
        dto.setDispatchedAt(delivery.getDispatchedAt());
        dto.setInTransitAt(delivery.getInTransitAt());
        dto.setDeliveredAt(delivery.getDeliveredAt());
        dto.setEstimatedDelivery(delivery.getEstimatedDelivery());

        if (delivery.getStockRequest() != null) {
            dto.setStockRequestId(delivery.getStockRequest().getId());
            dto.setStockRequestNumber(delivery.getStockRequest().getRequestNumber());
        }

        if (delivery.getWarehouse() != null) {
            dto.setWarehouseId(delivery.getWarehouse().getId());
            dto.setWarehouseName(delivery.getWarehouse().getName());
        }

        if (delivery.getSupermarket() != null) {
            dto.setSupermarketId(delivery.getSupermarket().getId());
            dto.setSupermarketName(delivery.getSupermarket().getName());
        }

        if (delivery.getDeliveryItems() != null) {
            List<com.wsscms.dto.DeliveryItemDTO> itemDTOs = delivery.getDeliveryItems().stream().map(item -> {
                com.wsscms.dto.DeliveryItemDTO itemDTO = new com.wsscms.dto.DeliveryItemDTO();
                itemDTO.setId(item.getId());
                if (item.getProduct() != null) {
                    itemDTO.setProductId(item.getProduct().getId());
                    itemDTO.setProductName(item.getProduct().getName());
                    itemDTO.setProductSku(item.getProduct().getSku());
                }
                itemDTO.setExpectedQuantity(item.getExpectedQuantity());
                itemDTO.setActualQuantity(item.getActualQuantity());
                itemDTO.setStatus(item.getStatus());
                itemDTO.setNotes(item.getNotes());
                return itemDTO;
            }).collect(Collectors.toList());
            dto.setItems(itemDTOs);
        }

        if (delivery.getReceivedBy() != null) {
            dto.setReceivedById(delivery.getReceivedBy().getId());
            dto.setReceivedByName(delivery.getReceivedBy().getFirstName() + " " + delivery.getReceivedBy().getLastName());
        }

        // failure info
        if (delivery.getFailureReason() != null) {
            dto.setFailureReason(delivery.getFailureReason());
        }
        if (delivery.getFailedAt() != null) {
            dto.setFailedAt(delivery.getFailedAt());
        }

        return dto;
    }
}
