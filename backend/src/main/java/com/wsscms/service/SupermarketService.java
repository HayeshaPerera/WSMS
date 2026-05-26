package com.wsscms.service;

import com.wsscms.dto.SupermarketDTO;
import com.wsscms.entity.Supermarket;
import com.wsscms.entity.Warehouse;
import com.wsscms.repository.SupermarketRepository;
import com.wsscms.repository.WarehouseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class SupermarketService {

    @Autowired
    private SupermarketRepository supermarketRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    public List<SupermarketDTO> getAllSupermarkets() {
        return supermarketRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<SupermarketDTO> getActiveSupermarkets() {
        return supermarketRepository.findByIsActiveTrue().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<SupermarketDTO> getSupermarketsByWarehouse(Long warehouseId) {
        return supermarketRepository.findByWarehouseId(warehouseId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public SupermarketDTO getSupermarketById(Long id) {
        Supermarket supermarket = supermarketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supermarket not found with id: " + id));
        return convertToDTO(supermarket);
    }

    public SupermarketDTO createSupermarket(SupermarketDTO supermarketDTO) {
        if (supermarketRepository.existsByCode(supermarketDTO.getCode())) {
            throw new IllegalArgumentException("Supermarket code already exists");
        }

        Supermarket supermarket = new Supermarket();
        supermarket.setCode(supermarketDTO.getCode());
        supermarket.setName(supermarketDTO.getName());
        supermarket.setLocation(supermarketDTO.getLocation());
        supermarket.setAddress(supermarketDTO.getAddress());
        supermarket.setStorageCapacity(supermarketDTO.getStorageCapacity());
        supermarket.setCurrentStock(supermarketDTO.getCurrentStock() != null ? supermarketDTO.getCurrentStock() : 0);
        supermarket.setContactPhone(supermarketDTO.getContactPhone());
        supermarket.setContactEmail(supermarketDTO.getContactEmail());
        supermarket.setActive(supermarketDTO.getActive() != null ? supermarketDTO.getActive() : true);

        if (supermarketDTO.getAssignedWarehouseId() != null) {
            Warehouse warehouse = warehouseRepository.findById(supermarketDTO.getAssignedWarehouseId())
                    .orElseThrow(() -> new EntityNotFoundException("Warehouse not found"));
            supermarket.setAssignedWarehouse(warehouse);
        }

        Supermarket savedSupermarket = supermarketRepository.save(supermarket);
        return convertToDTO(savedSupermarket);
    }

    public SupermarketDTO updateSupermarket(Long id, SupermarketDTO supermarketDTO) {
        Supermarket supermarket = supermarketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Supermarket not found with id: " + id));

        if (!supermarket.getCode().equals(supermarketDTO.getCode()) && 
            supermarketRepository.existsByCode(supermarketDTO.getCode())) {
            throw new IllegalArgumentException("Supermarket code already exists");
        }

        supermarket.setCode(supermarketDTO.getCode());
        supermarket.setName(supermarketDTO.getName());
        supermarket.setLocation(supermarketDTO.getLocation());
        supermarket.setAddress(supermarketDTO.getAddress());
        supermarket.setStorageCapacity(supermarketDTO.getStorageCapacity());
        supermarket.setContactPhone(supermarketDTO.getContactPhone());
        supermarket.setContactEmail(supermarketDTO.getContactEmail());
        
        if (supermarketDTO.getActive() != null) {
            supermarket.setActive(supermarketDTO.getActive());
        }

        if (supermarketDTO.getAssignedWarehouseId() != null) {
            Warehouse warehouse = warehouseRepository.findById(supermarketDTO.getAssignedWarehouseId())
                    .orElseThrow(() -> new EntityNotFoundException("Warehouse not found"));
            supermarket.setAssignedWarehouse(warehouse);
        } else {
            supermarket.setAssignedWarehouse(null);
        }

        Supermarket updatedSupermarket = supermarketRepository.save(supermarket);
        return convertToDTO(updatedSupermarket);
    }

    public void deleteSupermarket(Long id) {
        if (!supermarketRepository.existsById(id)) {
            throw new EntityNotFoundException("Supermarket not found with id: " + id);
        }
        supermarketRepository.deleteById(id);
    }

    private SupermarketDTO convertToDTO(Supermarket supermarket) {
        SupermarketDTO dto = new SupermarketDTO();
        dto.setId(supermarket.getId());
        dto.setCode(supermarket.getCode());
        dto.setName(supermarket.getName());
        dto.setLocation(supermarket.getLocation());
        dto.setAddress(supermarket.getAddress());
        dto.setStorageCapacity(supermarket.getStorageCapacity());
        dto.setCurrentStock(supermarket.getCurrentStock());
        dto.setContactPhone(supermarket.getContactPhone());
        dto.setContactEmail(supermarket.getContactEmail());
        dto.setActive(supermarket.getActive());
        
        if (supermarket.getAssignedWarehouse() != null) {
            dto.setAssignedWarehouseId(supermarket.getAssignedWarehouse().getId());
            dto.setAssignedWarehouseName(supermarket.getAssignedWarehouse().getName());
        }
        
        return dto;
    }
}
