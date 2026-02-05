import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notifications.asObservable();
  private nextId = 1;

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const notification: Notification = {
      id: this.nextId++,
      message,
      type,
      timestamp: new Date(),
      read: false
    };

    const current = this.notifications.value;
    this.notifications.next([notification, ...current]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.remove(notification.id);
    }, 5000);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  remove(id: number): void {
    const current = this.notifications.value.filter(n => n.id !== id);
    this.notifications.next(current);
  }

  markAsRead(id: number): void {
    const current = this.notifications.value.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    this.notifications.next(current);
  }

  clear(): void {
    this.notifications.next([]);
  }

  getUnreadCount(): number {
    return this.notifications.value.filter(n => !n.read).length;
  }
}
