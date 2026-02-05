package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.dto.SupermarketDTO;
import com.wsscms.service.SupermarketService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/supermarkets")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SupermarketController {

    @Autowired
    private SupermarketService supermarketService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SupermarketDTO>>> getAllSupermarkets() {
        List<SupermarketDTO> supermarkets = supermarketService.getAllSupermarkets();
        return ResponseEntity.ok(ApiResponse.success(supermarkets));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<SupermarketDTO>>> getActiveSupermarkets() {
        List<SupermarketDTO> supermarkets = supermarketService.getActiveSupermarkets();
        return ResponseEntity.ok(ApiResponse.success(supermarkets));
    }

    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<ApiResponse<List<SupermarketDTO>>> getSupermarketsByWarehouse(@PathVariable Long warehouseId) {
        List<SupermarketDTO> supermarkets = supermarketService.getSupermarketsByWarehouse(warehouseId);
        return ResponseEntity.ok(ApiResponse.success(supermarkets));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupermarketDTO>> getSupermarketById(@PathVariable Long id) {
        SupermarketDTO supermarket = supermarketService.getSupermarketById(id);
        return ResponseEntity.ok(ApiResponse.success(supermarket));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SupermarketDTO>> createSupermarket(@Valid @RequestBody SupermarketDTO supermarketDTO) {
        SupermarketDTO createdSupermarket = supermarketService.createSupermarket(supermarketDTO);
        return ResponseEntity.ok(ApiResponse.success("Supermarket created successfully", createdSupermarket));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SupermarketDTO>> updateSupermarket(@PathVariable Long id, @Valid @RequestBody SupermarketDTO supermarketDTO) {
        SupermarketDTO updatedSupermarket = supermarketService.updateSupermarket(id, supermarketDTO);
        return ResponseEntity.ok(ApiResponse.success("Supermarket updated successfully", updatedSupermarket));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSupermarket(@PathVariable Long id) {
        supermarketService.deleteSupermarket(id);
        return ResponseEntity.ok(ApiResponse.success("Supermarket deleted successfully", null));
    }
}
