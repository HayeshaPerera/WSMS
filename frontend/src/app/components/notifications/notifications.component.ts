// Import Angular Component, OnInit and OnDestroy lifecycle hooks
import { Component, OnInit, OnDestroy } from '@angular/core';
// Import Angular animation utilities for slide-in/slide-out toast effect
import { trigger, style, animate, transition } from '@angular/animations';
// Import NotificationService for subscribing to notification data, and the Notification interface
import { NotificationService, Notification } from '../../services/notification.service';
// Import Subscription for managing observable cleanup
import { Subscription } from 'rxjs';

/**
 * NotificationsComponent displays toast notifications as a floating stack.
 * Only shows local (non-backend) notifications — backend notifications
 * are handled by the navbar bell dropdown.
 *
 * Toast notifications slide in from the top and auto-remove after 5 seconds.
 */
@Component({
  selector: 'app-notifications',                    // HTML tag: <app-notifications>
  templateUrl: './notifications.component.html',    // Path to the HTML template
  styleUrls: ['./notifications.component.css'],     // Path to component-specific CSS
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  // Array of toast notifications currently displayed on screen
  notifications: Notification[] = [];
  // Reference to the subscription for cleanup in ngOnDestroy
  private subscription?: Subscription;

  // Inject the NotificationService to subscribe to notifications
  constructor(private notificationService: NotificationService) { }

  /**
   * Lifecycle hook: subscribe to the notification stream on init.
   * Filters to only show local (non-backend) notifications as toasts.
   */
  ngOnInit(): void {
    // Subscribe to the notifications observable
    this.subscription = this.notificationService.notifications$.subscribe(
      // Filter out backend notifications — those go to the navbar bell dropdown
      // Also hide notifications that have been dismissed as toasts
      notifications => this.notifications = notifications.filter(n => !n.fromBackend && !n.toastHidden)
    );
  }

  /**
   * Lifecycle hook: unsubscribe when the component is destroyed to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.subscription?.unsubscribe(); // Clean up the subscription
  }

  /**
   * Removes a toast notification from the screen by its ID.
   * Called when the user clicks the close button on a toast.
   * @param id - The unique notification ID to remove
   */
  remove(id: number): void {
    // Dismiss toast but keep in notification list
    this.notificationService.dismissToast(id);
  }

  /**
   * Returns an emoji icon based on the notification type.
   * Used in the toast template to display a visual indicator.
   * @param type - The notification type string
   * @returns An appropriate emoji character
   */
  getIcon(type: string): string {
    switch(type) {
      case 'success': return '\u2713';
      case 'error': return '\u2716';
      case 'warning': return '\u26A0';
      case 'loading': return '\u21BB';
      default: return 'i';
    }
  }
}
