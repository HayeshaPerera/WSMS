package com.wsscms.controller;

import com.wsscms.dto.GrnDTO;
import com.wsscms.service.GrnService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/grns")
@CrossOrigin(origins = "*")
public class GrnController {

    @Autowired
    private GrnService grnService;

    @GetMapping
    public ResponseEntity<List<GrnDTO>> getAllGrns() {
        return ResponseEntity.ok(grnService.getAllGrns());
    }

    @GetMapping("/warehouse/{id}")
    public ResponseEntity<List<GrnDTO>> getGrnsByWarehouse(@PathVariable Long id) {
        return ResponseEntity.ok(grnService.getGrnsByWarehouse(id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GrnDTO> getGrnById(@PathVariable Long id) {
        return ResponseEntity.ok(grnService.getGrnById(id));
    }

    @PostMapping
    public ResponseEntity<GrnDTO> createGrn(@RequestBody GrnDTO grnDTO) {
        return ResponseEntity.ok(grnService.createGrn(grnDTO));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<GrnDTO> confirmGrn(@PathVariable Long id) {
        return ResponseEntity.ok(grnService.confirmGrn(id));
    }
}
