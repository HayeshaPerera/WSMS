package com.wsscms.controller;

// Import DTOs to standardize JSON response wrappers
import com.wsscms.dto.ApiResponse;

// Import database entities
import com.wsscms.entity.Notification;
import com.wsscms.entity.User;

// Import the user repository to fetch the logged-in user's details
import com.wsscms.repository.UserRepository;

// Import the service layer handling notification business logic
import com.wsscms.service.NotificationService;

// Import Spring Web and Security annotations
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

// Utilities for Maps and Lists
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * NotificationController
 * 
 * Manages the in-app notification system (the bell icon in the top right of the frontend).
 * Allows users to fetch their alerts, mark them as read, and delete them.
 * Note: There are no @PreAuthorize role checks here because EVERY logged-in user 
 * has access to their own notifications.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
public class NotificationController {

    // Inject the notification service to perform DB operations
    @Autowired
    private NotificationService notificationService;

    // Inject user repository to identify the current user
    @Autowired
    private UserRepository userRepository;

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/notifications
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves ALL notifications (both read and unread) for the currently logged-in user.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getMyNotifications() {
        // Securely fetch the ID of the user making the request
        Long userId = getCurrentUserId();
        // Fetch their notifications from the database
        List<Notification> notifications = notificationService.getNotificationsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/notifications/unread
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves ONLY the unread notifications for the currently logged-in user.
     */
    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<List<Notification>>> getUnreadNotifications() {
        Long userId = getCurrentUserId();
        List<Notification> notifications = notificationService.getUnreadNotifications(userId);
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/v1/notifications/unread/count
    // ─────────────────────────────────────────────────────────
    /**
     * Retrieves just the numerical count of unread notifications.
     * Useful for displaying the red badge number on the notification bell icon
     * without having to download the full payload of all notifications.
     */
    @GetMapping("/unread/count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        Long userId = getCurrentUserId();
        
        // Execute a fast SQL COUNT() query
        Long count = notificationService.getUnreadCount(userId);
        
        // Wrap the raw number in a JSON object: { "count": 5 }
        Map<String, Long> result = new HashMap<>();
        result.put("count", count);
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/notifications/{id}/read
    // ─────────────────────────────────────────────────────────
    /**
     * Marks a single specific notification as read.
     * Usually triggered when a user clicks on a specific notification in the dropdown.
     */
    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/v1/notifications/read-all
    // ─────────────────────────────────────────────────────────
    /**
     * Marks ALL of the current user's unread notifications as read at once.
     * Usually triggered by a "Mark all as read" button in the UI.
     */
    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        Long userId = getCurrentUserId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /api/v1/notifications/{id}
    // ─────────────────────────────────────────────────────────
    /**
     * Permanently deletes a notification from the database.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(ApiResponse.success("Notification deleted", null));
    }

    // ─────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────
    /**
     * Helper method to securely extract the database ID of the currently logged-in user
     * by parsing the Spring SecurityContext (which was populated by the JWT Interceptor).
     * This ensures users can only access their OWN notifications, not someone else's.
     */
    private Long getCurrentUserId() {
        // Get the authentication token from the current thread
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        // The Principal name is usually the username
        String username = authentication.getName();
        
        // Look up the full User entity from the DB
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        return user.getId();
    }
}
