// Import Angular Injectable decorator and OnDestroy lifecycle hook
import { Injectable, OnDestroy } from '@angular/core';
// Import HttpClient for making HTTP API requests to the backend
import { HttpClient } from '@angular/common/http';
// Import RxJS utilities: BehaviorSubject for state management, Subscription for cleanup, interval for polling
import { BehaviorSubject, Subscription, interval } from 'rxjs';
// Import operators: catchError for error handling, switchMap for flattening observables
import { catchError, switchMap } from 'rxjs/operators';
// Import environment config to get the base API URL
import { environment } from '../../environments/environment';

/**
 * Interface representing a notification object.
 * Used for both backend-fetched and locally generated (toast) notifications.
 */
export interface Notification {
  id: number;                       // Unique identifier for the notification
  message: string;                  // The main notification message text
  title?: string;                   // Optional title for the notification
  type: 'success' | 'error' | 'warning' | 'info'; // Notification severity/type
  timestamp: Date;                  // When the notification was created
  read: boolean;                    // Whether the user has read this notification
  relatedEntityType?: string;       // Optional: type of related entity (e.g., 'DELIVERY', 'STOCK_REQUEST')
  relatedEntityId?: number;         // Optional: ID of the related entity for navigation
  fromBackend?: boolean;            // Flag to distinguish backend notifications from local toasts
  toastHidden?: boolean;            // Flag to hide local toasts after timeout while keeping them in bell
}

/**
 * NotificationService manages both local toast notifications and backend-persisted notifications.
 * It polls the backend every 30 seconds for new notifications and merges them with local toasts.
 * Provides unread count tracking and mark-as-read functionality.
 */
@Injectable({
  providedIn: 'root' // Singleton service available throughout the application
})
export class NotificationService implements OnDestroy {
  // Base URL for the notifications API endpoint
  private apiUrl = `${environment.apiBase}/api/notifications`;

  // BehaviorSubject holding the current list of all notifications (local + backend)
  private notifications = new BehaviorSubject<Notification[]>([]);
  // Public observable that components can subscribe to for notification updates
  public notifications$ = this.notifications.asObservable();

  // Auto-incrementing ID counter for locally created toast notifications
  private nextId = 10000;

  // Reference to the polling subscription so it can be cleaned up on destroy
  private pollSub?: Subscription;

  // BehaviorSubject holding the current unread notification count
  private unreadCount = new BehaviorSubject<number>(0);
  // Public observable for the unread count — used by the navbar bell badge
  public unreadCount$ = this.unreadCount.asObservable();

  // Inject HttpClient for API communication
  constructor(private http: HttpClient) {
    // Start polling for backend notifications immediately on service creation
    this.startPolling();
  }

  /**
   * Lifecycle hook: clean up polling subscription when the service is destroyed
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ========== Backend API Methods ==========

  /**
   * Starts periodic polling of the backend for new notifications.
   * Polls every 30 seconds and also performs an initial fetch immediately.
   */
  startPolling(): void {
    // Set up an interval that fires every 30,000 milliseconds (30 seconds)
    this.pollSub = interval(30000).pipe(
      // On each interval tick, fetch notifications from the backend
      switchMap(() => this.fetchBackendNotifications())
    ).subscribe(); // Subscribe to activate the polling

    // Perform an initial fetch right away (don't wait 30 seconds for the first poll)
    this.fetchBackendNotifications().subscribe();
    // Also fetch the unread count from the backend
    this.fetchUnreadCount();
  }

  /**
   * Stops the polling subscription to prevent memory leaks
   */
  stopPolling(): void {
    this.pollSub?.unsubscribe(); // Unsubscribe if the subscription exists
  }

  /**
   * Fetches all notifications for the current user from the backend API.
   * Merges them with local toast notifications and updates the combined list.
   * @returns Observable that completes after processing
   */
  private fetchBackendNotifications() {
    // Make GET request to /api/notifications
    return this.http.get<any>(this.apiUrl).pipe(
      // If the HTTP request fails, return an empty array instead of crashing
      catchError(() => {
        return [];
      }),
      // Process the response and merge with local notifications
      switchMap((res: any) => {
        // Handle both direct array and wrapped {data: [...]} response formats
        const arr = Array.isArray(res) ? res : (res && res.data ? res.data : []);

        // Map each backend notification to our Notification interface format
        const backendNotifs: Notification[] = arr.map((n: any) => ({
          id: n.id,                                   // Notification ID from backend
          title: n.title || '',                       // Title (default to empty string)
          message: n.message,                         // The notification message
          type: this.mapType(n.type),                 // Map backend type to our enum
          timestamp: new Date(n.createdAt),           // Parse the creation timestamp
          read: n.isRead || n.read || false,          // Handle different field names for read status
          relatedEntityType: n.relatedEntityType,     // Type of related entity
          relatedEntityId: n.relatedEntityId,         // ID of related entity
          fromBackend: true                           // Mark as backend notification
        }));

        // Get only the local (toast) notifications from the current list
        const localNotifs = this.notifications.value.filter(n => !n.fromBackend);

        // Merge local and backend notifications, sort by newest first
        const merged = [...localNotifs, ...backendNotifs].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Update the notifications BehaviorSubject with the merged list
        this.notifications.next(merged);
        // Recalculate the unread count
        this.updateUnreadCount();
        return []; // Return empty array (we've already processed everything)
      })
    );
  }

  /**
   * Fetches the unread notification count from the backend API.
   * Combines backend unread count with local unread toast count.
   */
  fetchUnreadCount(): void {
    // Make GET request to /api/notifications/unread/count
    this.http.get<any>(`${this.apiUrl}/unread/count`).pipe(
      // Return empty array on error (graceful degradation)
      catchError(() => [])
    ).subscribe((res: any) => {
      // Extract count from response — handle different response structures
      const count = res?.data?.count ?? res?.count ?? 0;
      // Add local unread count to backend count for the total
      this.unreadCount.next(count + this.notifications.value.filter(n => !n.read && !n.fromBackend).length);
    });
  }

  /**
   * Marks a single backend notification as read via the API.
   * Also updates the local state immediately for instant UI feedback.
   * @param id - The notification ID to mark as read
   */
  markAsReadBackend(id: number): void {
    // Make POST request to /api/notifications/{id}/read
    this.http.post(`${this.apiUrl}/${id}/read`, {}).subscribe(() => {
      // Update local state to reflect the read status
      this.markAsRead(id);
      // Refresh the unread count from the backend
      this.fetchUnreadCount();
    });
  }

  /**
   * Marks all backend notifications as read via the API.
   * Updates the local state to mark everything as read immediately.
   */
  markAllAsReadBackend(): void {
    // Make POST request to /api/notifications/read-all
    this.http.post(`${this.apiUrl}/read-all`, {}).subscribe(() => {
      // Update all notifications in local state to read=true
      const updated = this.notifications.value.map(n => ({ ...n, read: true }));
      this.notifications.next(updated);
      // Reset unread count to zero
      this.unreadCount.next(0);
    });
  }

  /**
   * Deletes a backend notification via the API.
   * Also removes it from the local notification list.
   * @param id - The notification ID to delete
   */
  deleteBackendNotification(id: number): void {
    // Make DELETE request to /api/notifications/{id}
    this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
      // Remove the notification from the local list
      this.remove(id);
    });
  }

  // ========== Local Toast Methods (Instant Feedback) ==========

  /**
   * Creates and displays a local toast notification.
   * Toast notifications auto-remove after 5 seconds.
   * @param message - The message to display
   * @param type - The notification type (determines icon and color)
   */
  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    // Create a new notification object with a unique ID
    const notification: Notification = {
      id: this.nextId++,        // Assign and increment the ID counter
      message,                  // Set the notification message
      type,                     // Set the notification type
      timestamp: new Date(),    // Set current time as the timestamp
      read: false,              // New notifications start as unread
      fromBackend: false,       // Mark as local toast (not from backend)
      toastHidden: false        // Show toast initially
    };

    // Get the current notification list
    const current = this.notifications.value;
    // Prepend the new notification to the beginning (newest first)
    this.notifications.next([notification, ...current]);
    // Update the unread count to include this new notification
    this.updateUnreadCount();

    // Set a timer to auto-dismiss the toast notification after 5 seconds
    setTimeout(() => {
      this.dismissToast(notification.id);
    }, 5000);
  }

  /**
   * Dismisses a local toast notification while keeping it in the notification list
   * @param id - The notification ID to dismiss
   */
  dismissToast(id: number): void {
    const current = this.notifications.value.map(n =>
      n.id === id ? { ...n, toastHidden: true } : n
    );
    this.notifications.next(current);
  }

  /** Shortcut to show a success toast notification */
  success(message: string): void { this.show(message, 'success'); }
  /** Shortcut to show an error toast notification */
  error(message: string): void { this.show(message, 'error'); }
  /** Shortcut to show a warning toast notification */
  warning(message: string): void { this.show(message, 'warning'); }
  /** Shortcut to show an info toast notification */
  info(message: string): void { this.show(message, 'info'); }

  /**
   * Removes a notification from the local list by its ID.
   * @param id - The notification ID to remove
   */
  remove(id: number): void {
    // Filter out the notification with the matching ID
    const current = this.notifications.value.filter(n => n.id !== id);
    // Update the notification list
    this.notifications.next(current);
    // Recalculate unread count
    this.updateUnreadCount();
  }

  /**
   * Marks a single notification as read in the local state.
   * @param id - The notification ID to mark as read
   */
  markAsRead(id: number): void {
    // Map through all notifications and set read=true for the matching ID
    const current = this.notifications.value.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    // Update the notification list
    this.notifications.next(current);
    // Recalculate unread count
    this.updateUnreadCount();
  }

  /**
   * Clears all notifications from the local state.
   */
  clear(): void {
    this.notifications.next([]);  // Empty the notification list
    this.unreadCount.next(0);     // Reset unread count to zero
  }

  /**
   * Returns the current count of unread notifications.
   * @returns Number of unread notifications
   */
  getUnreadCount(): number {
    return this.notifications.value.filter(n => !n.read).length;
  }

  /**
   * Recalculates and emits the current unread notification count.
   * Called internally whenever the notification list changes.
   */
  private updateUnreadCount(): void {
    this.unreadCount.next(this.getUnreadCount());
  }

  /**
   * Maps a backend notification type string to our local type enum.
   * Uses keyword matching to handle various backend type formats.
   * @param type - The type string from the backend
   * @returns The mapped notification type
   */
  private mapType(type: string): 'success' | 'error' | 'warning' | 'info' {
    // Convert to lowercase for case-insensitive matching
    const t = (type || '').toLowerCase();
    // Check for success-related keywords
    if (t.includes('success') || t.includes('approved')) return 'success';
    // Check for error-related keywords
    if (t.includes('error') || t.includes('fail') || t.includes('reject')) return 'error';
    // Check for warning-related keywords
    if (t.includes('warn') || t.includes('low') || t.includes('alert')) return 'warning';
    // Default to info type
    return 'info';
  }
}
