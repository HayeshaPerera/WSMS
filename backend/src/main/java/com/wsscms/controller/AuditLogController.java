package com.wsscms.controller;

// Import standard API response formatting DTO
import com.wsscms.dto.ApiResponse;

// Import AuditLog entity and its corresponding service
import com.wsscms.entity.AuditLog;
import com.wsscms.service.AuditLogService;

// Import Spring annotations and classes
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

// Import Java utility classes for dates and lists
import java.time.LocalDateTime;
import java.util.List;

/**
 * AuditLogController
 * 
 * Provides REST API endpoints for fetching system audit logs.
 * Audit logs track important actions (like creating a user, deleting inventory, approving a request)
 * for accountability and security purposes.
 */
@RestController
// Base URL path for all endpoints in this controller
@RequestMapping("/api/v1/audit-logs")
// Allow cross-origin requests from any domain (CORS configuration)
@CrossOrigin(origins = "*", maxAge = 3600)
// Security check: ONLY users with the 'ADMIN' role can access ANY endpoints in this controller
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    // Inject the AuditLogService which handles the business logic for audit logs
    @Autowired
    private AuditLogService auditLogService;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/audit-logs
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all audit logs in the system, sorted from newest to oldest.
     * 
     * @return A list of all AuditLog entities.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAllLogs() {
        // Fetch all logs using the service layer
        List<AuditLog> logs = auditLogService.getAllLogs();
        // Wrap the list in a standard ApiResponse and return with 200 OK
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/audit-logs/user/{userId}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all audit logs representing actions performed by a specific user.
     * Useful for investigating a specific user's activity.
     * 
     * @param userId The database ID of the user.
     * @return A list of AuditLog entities created by the specified user.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByUser(@PathVariable Long userId) {
        List<AuditLog> logs = auditLogService.getLogsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/audit-logs/entity-type/{entityType}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all audit logs related to a specific type of entity (e.g., all "USER" logs, or all "INVENTORY" logs).
     * 
     * @param entityType The string representing the entity type.
     * @return A list of AuditLog entities matching the type.
     */
    @GetMapping("/entity-type/{entityType}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByEntityType(@PathVariable String entityType) {
        List<AuditLog> logs = auditLogService.getLogsByEntityType(entityType);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/audit-logs/entity/{entityType}/{entityId}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves the audit history for one specific record (e.g., User with ID 5).
     * Useful for seeing the lifecycle of a single object (who created it, who updated it, etc).
     * 
     * @param entityType The string representing the entity type (e.g., "USER").
     * @param entityId The ID of the specific entity record.
     * @return A list of AuditLog entities for that specific record.
     */
    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        List<AuditLog> logs = auditLogService.getLogsByEntity(entityType, entityId);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/audit-logs/action/{action}
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all audit logs for a specific action (e.g., all "CREATE" actions or all "DELETE" actions).
     * 
     * @param action The string representing the action performed.
     * @return A list of AuditLog entities matching the action.
     */
    @GetMapping("/action/{action}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByAction(@PathVariable String action) {
        List<AuditLog> logs = auditLogService.getLogsByAction(action);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/audit-logs/date-range
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves all audit logs that occurred between a start date and an end date.
     * The @DateTimeFormat annotation ensures Spring can parse the URL query parameters 
     * (e.g., ?startDate=2026-01-01T00:00:00&endDate=2026-12-31T23:59:59) into LocalDateTime objects.
     * 
     * @param startDate The beginning of the time window.
     * @param endDate The end of the time window.
     * @return A list of AuditLog entities within the date range.
     */
    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        List<AuditLog> logs = auditLogService.getLogsByDateRange(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }
}
