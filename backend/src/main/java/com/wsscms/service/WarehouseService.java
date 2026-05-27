package com.wsscms.service;

import com.wsscms.dto.WarehouseDTO;
import com.wsscms.entity.Warehouse;
import com.wsscms.repository.WarehouseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class WarehouseService {

    @Autowired
    private WarehouseRepository warehouseRepository;

    public List<WarehouseDTO> getAllWarehouses() {
        return warehouseRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<WarehouseDTO> getActiveWarehouses() {
        return warehouseRepository.findByIsActiveTrue().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public WarehouseDTO getWarehouseById(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found with id: " + id));
        return convertToDTO(warehouse);
    }

    public WarehouseDTO createWarehouse(WarehouseDTO warehouseDTO) {
        if (warehouseRepository.count() >= 1) {
            throw new IllegalArgumentException("System is configured to allow only one warehouse.");
        }
        if (warehouseRepository.existsByCode(warehouseDTO.getCode())) {
            throw new IllegalArgumentException("Warehouse code already exists");
        }

        Warehouse warehouse = new Warehouse();
        warehouse.setCode(warehouseDTO.getCode());
        warehouse.setName(warehouseDTO.getName());
        warehouse.setLocation(warehouseDTO.getLocation());
        warehouse.setAddress(warehouseDTO.getAddress());
        warehouse.setCapacity(warehouseDTO.getCapacity());
        warehouse.setCurrentStock(warehouseDTO.getCurrentStock() != null ? warehouseDTO.getCurrentStock() : 0);
        warehouse.setContactPhone(warehouseDTO.getContactPhone());
        warehouse.setContactEmail(warehouseDTO.getContactEmail());
        warehouse.setActive(warehouseDTO.getActive() != null ? warehouseDTO.getActive() : true);

        Warehouse savedWarehouse = warehouseRepository.save(warehouse);
        return convertToDTO(savedWarehouse);
    }

    public WarehouseDTO updateWarehouse(Long id, WarehouseDTO warehouseDTO) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found with id: " + id));

        if (!warehouse.getCode().equals(warehouseDTO.getCode()) && 
            warehouseRepository.existsByCode(warehouseDTO.getCode())) {
            throw new IllegalArgumentException("Warehouse code already exists");
        }

        warehouse.setCode(warehouseDTO.getCode());
        warehouse.setName(warehouseDTO.getName());
        warehouse.setLocation(warehouseDTO.getLocation());
        warehouse.setAddress(warehouseDTO.getAddress());
        warehouse.setCapacity(warehouseDTO.getCapacity());
        warehouse.setContactPhone(warehouseDTO.getContactPhone());
        warehouse.setContactEmail(warehouseDTO.getContactEmail());
        
        if (warehouseDTO.getActive() != null) {
            warehouse.setActive(warehouseDTO.getActive());
        }

        Warehouse updatedWarehouse = warehouseRepository.save(warehouse);
        return convertToDTO(updatedWarehouse);
    }

    public void deleteWarehouse(Long id) {
        if (!warehouseRepository.existsById(id)) {
            throw new EntityNotFoundException("Warehouse not found with id: " + id);
        }
        warehouseRepository.deleteById(id);
    }

    private WarehouseDTO convertToDTO(Warehouse warehouse) {
        WarehouseDTO dto = new WarehouseDTO();
        dto.setId(warehouse.getId());
        dto.setCode(warehouse.getCode());
        dto.setName(warehouse.getName());
        dto.setLocation(warehouse.getLocation());
        dto.setAddress(warehouse.getAddress());
        dto.setCapacity(warehouse.getCapacity());
        dto.setCurrentStock(warehouse.getCurrentStock());
        dto.setContactPhone(warehouse.getContactPhone());
        dto.setContactEmail(warehouse.getContactEmail());
        dto.setActive(warehouse.getActive());
        return dto;
    }
}
