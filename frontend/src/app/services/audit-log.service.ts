import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AuditLog {
  id: number;
  timestamp: Date;
  userId: number;
  userName: string;
  action: string;
  entityType: 'STOCK_REQUEST' | 'DELIVERY' | 'INVENTORY' | 'USER' | 'PRODUCT';
  entityId: number;
  entityName: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  details: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private apiUrl = `${environment.apiBase}/audit-logs`;
  private logsSubject = new BehaviorSubject<AuditLog[]>([]);
  public logs$ = this.logsSubject.asObservable();

  private currentLogId = 1;

  constructor(private http: HttpClient) {
    this.logsSubject.next(this.loadLogs());
  }

  fetchBackendLogs(): Observable<AuditLog[]> {
    return this.http.get<{ success: boolean; data: any[] }>(this.apiUrl).pipe(
      map(res => {
        const logs = (res.data || []).map(l => {
          let oldVal = l.oldValue;
          let newVal = l.newValue;
          try {
            if (typeof oldVal === 'string') oldVal = JSON.parse(oldVal);
          } catch(e) {}
          try {
            if (typeof newVal === 'string') newVal = JSON.parse(newVal);
          } catch(e) {}

          return {
            id: l.id,
            timestamp: new Date(l.createdAt || l.timestamp),
            userId: l.userId || (l.user ? l.user.id : 0),
            userName: l.userName || (l.user ? l.user.fullName || l.user.username : 'system'),
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            entityName: l.entityName || `${l.entityType} #${l.entityId}`,
            oldValue: oldVal,
            newValue: newVal,
            ipAddress: l.ipAddress || '127.0.0.1',
            details: l.details || `${l.action} on ${l.entityType}`
          };
        });
        
        // Sort descending by date/id
        logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        this.logsSubject.next(logs);
        this.saveLogs(logs);
        return logs;
      }),
      catchError(err => {
        console.warn('Failed to fetch backend audit logs, using local fallback:', err);
        return of(this.logsSubject.value);
      })
    );
  }

  logAction(
    userId: number,
    userName: string,
    action: string,
    entityType: AuditLog['entityType'],
    entityId: number,
    entityName: string,
    details: string,
    oldValue?: any,
    newValue?: any
  ): void {
    const log: AuditLog = {
      id: this.currentLogId++,
      timestamp: new Date(),
      userId,
      userName,
      action,
      entityType,
      entityId,
      entityName,
      oldValue,
      newValue,
      ipAddress: '127.0.0.1', // Mock IP
      details
    };

    const logs = [log, ...this.logsSubject.value];
    this.logsSubject.next(logs);
    this.saveLogs(logs);

    console.log('📝 Audit Log:', {
      action,
      user: userName,
      entity: `${entityType}:${entityId}`,
      details
    });
  }

  logStockRequestApproval(userId: number, userName: string, requestId: number, productName: string, quantity: number): void {
    this.logAction(
      userId,
      userName,
      'APPROVE_STOCK_REQUEST',
      'STOCK_REQUEST',
      requestId,
      productName,
      `Approved stock request for ${quantity} units of ${productName}`,
      { status: 'PENDING' },
      { status: 'APPROVED', quantity }
    );
  }

  logStockRequestRejection(userId: number, userName: string, requestId: number, productName: string, reason: string): void {
    this.logAction(
      userId,
      userName,
      'REJECT_STOCK_REQUEST',
      'STOCK_REQUEST',
      requestId,
      productName,
      `Rejected stock request: ${reason}`,
      { status: 'PENDING' },
      { status: 'REJECTED', reason }
    );
  }

  logDeliveryStatusChange(userId: number, userName: string, deliveryId: number, trackingNumber: string, oldStatus: string, newStatus: string): void {
    this.logAction(
      userId,
      userName,
      'UPDATE_DELIVERY_STATUS',
      'DELIVERY',
      deliveryId,
      trackingNumber,
      `Changed delivery status from ${oldStatus} to ${newStatus}`,
      { status: oldStatus },
      { status: newStatus }
    );
  }

  logDeliveryReceipt(userId: number, userName: string, deliveryId: number, trackingNumber: string, received: boolean, reason?: string): void {
    this.logAction(
      userId,
      userName,
      received ? 'RECEIVE_DELIVERY' : 'REJECT_DELIVERY',
      'DELIVERY',
      deliveryId,
      trackingNumber,
      received 
        ? `Confirmed receipt of delivery ${trackingNumber}` 
        : `Rejected delivery ${trackingNumber}: ${reason}`,
      { status: 'OUT_FOR_DELIVERY' },
      { status: received ? 'DELIVERED' : 'FAILED', reason }
    );
  }

  logInventoryUpdate(userId: number, userName: string, inventoryId: number, productName: string, oldQty: number, newQty: number): void {
    const change = newQty - oldQty;
    this.logAction(
      userId,
      userName,
      'UPDATE_INVENTORY',
      'INVENTORY',
      inventoryId,
      productName,
      `Updated ${productName} inventory: ${oldQty} → ${newQty} (${change > 0 ? '+' : ''}${change})`,
      { quantity: oldQty },
      { quantity: newQty }
    );
  }

  getLogsByUser(userId: number): AuditLog[] {
    return this.logsSubject.value.filter(log => log.userId === userId);
  }

  getLogsByEntityType(entityType: AuditLog['entityType']): AuditLog[] {
    return this.logsSubject.value.filter(log => log.entityType === entityType);
  }

  getLogsByEntity(entityType: AuditLog['entityType'], entityId: number): AuditLog[] {
    return this.logsSubject.value.filter(log => 
      log.entityType === entityType && log.entityId === entityId
    );
  }

  getRecentLogs(limit: number = 50): AuditLog[] {
    return this.logsSubject.value.slice(0, limit);
  }

  searchLogs(query: string): AuditLog[] {
    const lowerQuery = query.toLowerCase();
    return this.logsSubject.value.filter(log =>
      log.action.toLowerCase().includes(lowerQuery) ||
      log.userName.toLowerCase().includes(lowerQuery) ||
      log.entityName.toLowerCase().includes(lowerQuery) ||
      log.details.toLowerCase().includes(lowerQuery)
    );
  }

  private saveLogs(logs: AuditLog[]): void {
    try {
      // Keep only last 500 logs in storage
      const logsToStore = logs.slice(0, 500);
      localStorage.setItem('wsms_auditLogs', JSON.stringify(logsToStore));
    } catch (error) {
      console.error('Failed to save audit logs:', error);
    }
  }

  private loadLogs(): AuditLog[] {
    try {
      const stored = localStorage.getItem('wsms_auditLogs');
      if (stored) {
        const logs = JSON.parse(stored);
        // Convert date strings back to Date objects
        return logs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
    return this.generateInitialLogs();
  }

  private generateInitialLogs(): AuditLog[] {
    const now = new Date();
    return [
      {
        id: this.currentLogId++,
        timestamp: new Date(now.getTime() - 3600000),
        userId: 1,
        userName: 'warehouse1',
        action: 'APPROVE_STOCK_REQUEST',
        entityType: 'STOCK_REQUEST',
        entityId: 2,
        entityName: 'Organic Honey',
        oldValue: { status: 'PENDING' },
        newValue: { status: 'APPROVED', quantity: 50 },
        ipAddress: '192.168.1.10',
        details: 'Approved stock request for 50 units of Organic Honey'
      },
      {
        id: this.currentLogId++,
        timestamp: new Date(now.getTime() - 7200000),
        userId: 2,
        userName: 'supermarket1',
        action: 'RECEIVE_DELIVERY',
        entityType: 'DELIVERY',
        entityId: 2,
        entityName: 'TRK1706001234789',
        oldValue: { status: 'OUT_FOR_DELIVERY' },
        newValue: { status: 'DELIVERED' },
        ipAddress: '192.168.1.20',
        details: 'Confirmed receipt of delivery TRK1706001234789'
      }
    ];
  }

  clearOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const logs = this.logsSubject.value.filter(log => 
      log.timestamp >= cutoffDate
    );
    
    this.logsSubject.next(logs);
    this.saveLogs(logs);
  }
}
