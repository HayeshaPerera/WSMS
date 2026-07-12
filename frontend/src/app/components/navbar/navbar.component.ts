// Import Angular Component, OnInit & OnDestroy lifecycle hooks, HostListener for document click events
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
// Import AuthService for checking login state and user roles
import { AuthService } from '../../services/auth.service';
// Import SharedDataService for real-time stock requests, deliveries, and inventory data
import { SharedDataService } from '../../services/shared-data.service';
// Import ThemeService for toggling dark/light theme
import { ThemeService } from '../../services/theme.service';
// Import NotificationService and Notification interface for notification bell functionality
import { NotificationService, Notification } from '../../services/notification.service';
// Import Subscription for managing observable subscriptions and cleanup
import { Subscription } from 'rxjs';
// Import RequestStatus and DeliveryStatus enums for filtering pending items
import { RequestStatus, DeliveryStatus } from '../../models/models';
// Import Location service for browser back navigation
import { Location } from '@angular/common';

/**
 * NavbarComponent is the top navigation bar and sidebar for the entire application.
 *
 * Features:
 * - Brand logo and navigation links
 * - Notification bell with unread count badge and dropdown panel
 * - User profile section with logout
 * - Collapsible sidebar with role-based menu items
 * - Badge counts for pending stock requests, deliveries, and low stock items
 */
@Component({
  selector: 'app-navbar',                          // HTML tag: <app-navbar>
  templateUrl: './navbar.component.html',          // Path to the HTML template
  styleUrls: ['./navbar.component.css']            // Path to component-specific CSS styles
})
export class NavbarComponent implements OnInit, OnDestroy {

  // ========== Badge Count Properties ==========

  pendingStockRequests = 0;    // Number of stock requests with PENDING status
  pendingDeliveries = 0;       // Number of deliveries with PENDING or IN_TRANSIT status
  lowStockCount = 0;           // Number of inventory items below reorder level

  // ========== UI State Properties ==========

  showManagementDropdown = false;
  sidebarOpen = false;         // Whether the mobile sidebar is currently visible
  showNotifPanel = false;      // Whether the notification dropdown panel is currently visible
  showProfilePanel = false;    // Whether the profile dropdown panel is currently visible
  loadingNotifications = false; // Whether the panel is currently loading data

  // ========== Notification Properties ==========

  unreadNotifCount = 0;        // Number of unread notifications (displayed on bell badge)
  recentNotifications: Notification[] = []; // List of recent notifications for the dropdown

  // ========== Subscription Management ==========

  private subscriptions: Subscription[] = []; // Array to track all subscriptions for cleanup

  /**
   * Constructor: inject all required services
   * @param auth - AuthService for login state and role checks (public for template)
   * @param sharedData - SharedDataService for real-time data streams
   * @param theme - ThemeService for dark/light mode toggle (public for template)
   * @param location - Angular Location service for browser back navigation
   * @param notificationService - NotificationService for notification bell data
   */
  constructor(
    public auth: AuthService,                      // Public: accessed in template for role checks
    private sharedData: SharedDataService,         // Private: used only in component logic
    public theme: ThemeService,                    // Public: accessed in template for theme toggle
    private location: Location,                    // Private: used for goBack() navigation
    private notificationService: NotificationService // Private: used for notification data
  ) { }

  /**
   * Angular lifecycle hook: called once when the component initializes.
   * Sets up subscriptions to real-time data streams for badges and notifications.
   */
  ngOnInit(): void {

    // Subscribe to stock requests stream to count PENDING requests
    this.subscriptions.push(
      this.sharedData.stockRequests$.subscribe(requests => {
        // Count how many stock requests have PENDING status
        this.pendingStockRequests = requests.filter(
          (r: any) => r.status === RequestStatus.PENDING
        ).length;
      })
    );

    // Subscribe to deliveries stream to count active (PENDING + IN_TRANSIT) deliveries
    this.subscriptions.push(
      this.sharedData.deliveries$.subscribe(deliveries => {
        // Count deliveries that are either PENDING or currently IN_TRANSIT
        this.pendingDeliveries = deliveries.filter(
          (d: any) => d.status === DeliveryStatus.PENDING || d.status === DeliveryStatus.IN_TRANSIT
        ).length;
      })
    );

    // Subscribe to inventory stream to count low stock items
    this.subscriptions.push(
      this.sharedData.inventory$.subscribe(inventory => {
        // Count items where current quantity is at or below the reorder level
        this.lowStockCount = inventory.filter(
          (i: any) => i.quantity <= i.reorderLevel
        ).length;
      })
    );

    // Subscribe to the notification unread count from the NotificationService
    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadNotifCount = count; // Update the badge count on the bell icon
      })
    );

    // Subscribe to the notification list for the dropdown panel
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifs => {
        // Show all recent notifications in the dropdown
        this.recentNotifications = notifs;
      })
    );
  }

  /**
   * Angular lifecycle hook: called when the component is destroyed.
   * Cleans up all subscriptions to prevent memory leaks.
   */
  ngOnDestroy(): void {
    // Unsubscribe from every tracked subscription
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Toggles the management dropdown visibility.
   */
  toggleManagement(): void {
    this.showManagementDropdown = !this.showManagementDropdown;
    this.showNotifPanel = false; // Close other dropdowns
    this.showProfilePanel = false;
  }

  /**
   * Toggles the mobile sidebar visibility.
   */
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen; // Flip the sidebar state
    if (this.sidebarOpen) {
      this.showNotifPanel = false; // Close notification panel if sidebar opens
      this.showManagementDropdown = false; // Close management dropdown if sidebar opens
      this.showProfilePanel = false;
    }
  }

  /**
   * Toggles the notification dropdown panel visibility.
   */
  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    this.showManagementDropdown = false;
    this.showProfilePanel = false;

    // If opening, simulate a quick "synchronizing" state for visual clarity
    if (this.showNotifPanel) {
      this.loadingNotifications = true;
      setTimeout(() => {
        this.loadingNotifications = false;
      }, 600);
    }
  }

  /**
   * Toggles the user profile panel visibility.
   */
  toggleProfilePanel(): void {
    this.showProfilePanel = !this.showProfilePanel;
    this.showNotifPanel = false;
    this.showManagementDropdown = false;
  }

  /**
   * Marks a notification as read when the user clicks on it.
   * Uses the appropriate method based on whether it's from the backend or local.
   * @param n - The notification to mark as read
   */
  readNotif(n: Notification): void {
    // Only mark as read if it's currently unread
    if (!n.read) {
      if (n.fromBackend) {
        // For backend notifications, call the API to persist the read status
        this.notificationService.markAsReadBackend(n.id);
      } else {
        // For local toast notifications, just update the local state
        this.notificationService.markAsRead(n.id);
      }
    }
  }

  /**
   * Marks all notifications as read (both backend and local).
   */
  markAllRead(): void {
    this.notificationService.markAllAsReadBackend(); // Call backend to mark all as read
  }

  /**
   * HostListener: listens for click events on the entire document.
   * Closes the notification and profile panels if the user clicks outside of them.
   * @param event - The DOM click event
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement; // Get the clicked element
    // If the click is not inside the notification-bell container, close the panel
    if (!target.closest('.notification-bell')) {
      this.showNotifPanel = false;
    }
    // If the click is not inside the profile-btn container, close the panel
    if (!target.closest('.profile-btn') && !target.closest('.sidebar-profile-panel')) {
      this.showProfilePanel = false;
    }
  }

  /**
   * Toggles between dark and light theme.
   */
  toggleTheme(): void {
    this.theme.toggleTheme(); // Delegate to ThemeService
  }

  /**
   * Navigates back to the previous page in browser history.
   */
  goBack(): void {
    this.location.back(); // Use Angular Location service for navigation
  }

  /**
   * Logs the user out and redirects to the login page.
   */
  logout(): void {
    this.auth.logout(); // Delegate to AuthService (clears token and redirects)
  }
}
