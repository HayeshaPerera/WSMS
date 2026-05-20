package com.wsscms.controller;

import com.wsscms.dto.ApiResponse;
import com.wsscms.entity.AuditLog;
import com.wsscms.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/audit-logs")
@CrossOrigin(origins = "*", maxAge = 3600)
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    @Autowired
    private AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAllLogs() {
        List<AuditLog> logs = auditLogService.getAllLogs();
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByUser(@PathVariable Long userId) {
        List<AuditLog> logs = auditLogService.getLogsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/entity-type/{entityType}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByEntityType(@PathVariable String entityType) {
        List<AuditLog> logs = auditLogService.getLogsByEntityType(entityType);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        List<AuditLog> logs = auditLogService.getLogsByEntity(entityType, entityId);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/action/{action}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByAction(@PathVariable String action) {
        List<AuditLog> logs = auditLogService.getLogsByAction(action);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<AuditLog> logs = auditLogService.getLogsByDateRange(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }
}
