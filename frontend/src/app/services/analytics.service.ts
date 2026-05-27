import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Alert {
  id: number;
  type: 'LOW_STOCK' | 'EXPIRING' | 'DELAYED_DELIVERY' | 'DEMAND_SPIKE' | 'COST_WARNING';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  entity: string;
  entityId: number;
  timestamp: Date;
  acknowledged: boolean;
}

export interface ReorderRecommendation {
  productId: number;
  productName: string;
  currentStock: number;
  reorderLevel: number;
  recommendedQuantity: number;
  estimatedCost: number;
  daysUntilStockout: number;
  confidence: number; // 0-100
  reasoning: string;
}

export interface CostAnalysis {
  totalInventoryValue: number;
  excessInventoryCost: number;
  stockoutCost: number;
  deliveryDelayCost: number;
  totalCostImpact: number;
  monthlyTrend: number; // percentage
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  private reorderRecommendationsSubject = new BehaviorSubject<ReorderRecommendation[]>([]);
  public reorderRecommendations$ = this.reorderRecommendationsSubject.asObservable();

  constructor() {
    this.generateInitialAlerts();
  }

  analyzeInventory(inventory: any[], products: any[]): void {
    const alerts: Alert[] = [];
    let alertId = 1;

    // Check for low stock
    inventory.forEach(item => {
      if (item.quantity <= item.reorderLevel) {
        alerts.push({
          id: alertId++,
          type: 'LOW_STOCK',
          severity: item.quantity === 0 ? 'CRITICAL' : item.quantity < item.reorderLevel / 2 ? 'HIGH' : 'MEDIUM',
          title: 'Low Stock Alert',
          message: `${item.product?.name || 'Product'} stock is at ${item.quantity} units (reorder level: ${item.reorderLevel})`,
          entity: 'inventory',
          entityId: item.id,
          timestamp: new Date(),
          acknowledged: false
        });
      }

      // Check for expiring items
      if (item.expiryDate) {
        const daysUntilExpiry = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          alerts.push({
            id: alertId++,
            type: 'EXPIRING',
            severity: daysUntilExpiry <= 3 ? 'CRITICAL' : 'HIGH',
            title: 'Expiring Inventory',
            message: `${item.product?.name || 'Product'} expires in ${daysUntilExpiry} days (Batch: ${item.batchNumber || 'N/A'})`,
            entity: 'inventory',
            entityId: item.id,
            timestamp: new Date(),
            acknowledged: false
          });
        }
      }
    });

    this.alertsSubject.next(alerts);
  }

  analyzeDeliveries(deliveries: any[]): void {
    const alerts: Alert[] = [];
    let alertId = this.alertsSubject.value.length + 1;

    deliveries.forEach(delivery => {
      if (delivery.status === 'FAILED') {
        alerts.push({
          id: alertId++,
          type: 'DELAYED_DELIVERY',
          severity: 'HIGH',
          title: 'Delivery Failed',
          message: `Delivery ${delivery.trackingNumber} failed: ${delivery.failureReason || 'Unknown reason'}`,
          entity: 'delivery',
          entityId: delivery.id,
          timestamp: new Date(),
          acknowledged: false
        });
      }

      if (delivery.estimatedDelivery && delivery.status !== 'DELIVERED') {
        const daysOverdue = Math.ceil((Date.now() - new Date(delivery.estimatedDelivery).getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue > 0) {
          alerts.push({
            id: alertId++,
            type: 'DELAYED_DELIVERY',
            severity: daysOverdue > 3 ? 'CRITICAL' : 'HIGH',
            title: 'Delayed Delivery',
            message: `Delivery ${delivery.trackingNumber} is ${daysOverdue} days overdue`,
            entity: 'delivery',
            entityId: delivery.id,
            timestamp: new Date(),
            acknowledged: false
          });
        }
      }
    });

    this.alertsSubject.next([...this.alertsSubject.value, ...alerts]);
  }

  generateReorderRecommendations(inventory: any[]): void {
    const recommendations: ReorderRecommendation[] = [];
    
    inventory.forEach(item => {
      if (item.quantity <= item.reorderLevel * 1.5) {
        const recommendedQuantity = item.reorderLevel * 2;
        const unitPrice = item.product?.unitPrice || item.unitPrice || item.product_price || 100;
        const estimatedCost = recommendedQuantity * unitPrice;
        
        const dailyUsage = item.reorderLevel / 30;
        const daysUntilStockout = Math.max(0, Math.floor(item.quantity / dailyUsage));
        
        let confidence = 75;
        if (item.quantity < item.reorderLevel * 0.5) confidence = 95;
        else if (item.quantity < item.reorderLevel) confidence = 90;
        else if (item.quantity < item.reorderLevel * 1.2) confidence = 85;
        
        let reasoning = '';
        if (item.quantity === 0) {
          reasoning = 'URGENT: Out of stock - immediate reorder required';
        } else if (item.quantity < item.reorderLevel * 0.5) {
          reasoning = `Critical stock level - only ${daysUntilStockout} days until stockout`;
        } else if (item.quantity < item.reorderLevel) {
          reasoning = `Below reorder level - ${daysUntilStockout} days remaining`;
        } else {
          reasoning = `Approaching reorder level - proactive reorder recommended`;
        }
        
        const resolvedProductName = item.product?.name || item.productName || item.product_name || item.name || 'Unresolved Item';
        const resolvedProductId = item.product?.id || item.productId || item.product_id || item.id;

        recommendations.push({
          productId: resolvedProductId,
          productName: resolvedProductName,
          currentStock: item.quantity,
          reorderLevel: item.reorderLevel,
          recommendedQuantity,
          estimatedCost,
          daysUntilStockout,
          confidence,
          reasoning
        });
      }
    });
    
    recommendations.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
    this.reorderRecommendationsSubject.next(recommendations);
  }

  calculateCostAnalysis(inventory: any[], deliveries: any[], stockRequests: any[]): CostAnalysis {
    const totalInventoryValue = inventory.reduce((sum, item) => {
      const unitPrice = item.product?.unitPrice || 100;
      return sum + (item.quantity * unitPrice);
    }, 0);

    const excessInventoryCost = inventory.reduce((sum, item) => {
      const optimalStock = item.reorderLevel * 2.5;
      const excess = Math.max(0, item.quantity - optimalStock);
      const unitPrice = item.product?.unitPrice || 100;
      return sum + (excess * unitPrice * 0.15);
    }, 0);

    const stockoutCost = inventory.reduce((sum, item) => {
      if (item.quantity < item.reorderLevel) {
        const shortage = item.reorderLevel - item.quantity;
        const unitPrice = item.product?.unitPrice || 100;
        return sum + (shortage * unitPrice * 0.30);
      }
      return sum;
    }, 0);

    const deliveryDelayCost = deliveries.reduce((sum, delivery) => {
      let delayCost = 0;
      
      if (delivery.status === 'FAILED') {
        const unitPrice = delivery.product?.unitPrice || 100;
        delayCost = (delivery.quantity * unitPrice * 0.25);
      } else if (delivery.estimatedDelivery && delivery.status === 'IN_TRANSIT') {
        const estimatedDate = new Date(delivery.estimatedDelivery);
        const now = new Date();
        const daysOverdue = Math.ceil((now.getTime() - estimatedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          delayCost = delivery.quantity * 50 * daysOverdue;
        }
      }
      
      return sum + delayCost;
    }, 0);

    const totalCostImpact = excessInventoryCost + stockoutCost + deliveryDelayCost;

    const pendingRequests = stockRequests.filter(r => r.status === 'PENDING').length;
    const totalRequests = stockRequests.length || 1;
    const monthlyTrend = ((pendingRequests / totalRequests) * 100) - 50;

    return {
      totalInventoryValue,
      excessInventoryCost,
      stockoutCost,
      deliveryDelayCost,
      totalCostImpact,
      monthlyTrend: Math.round(monthlyTrend * 10) / 10
    };
  }

  acknowledgeAlert(alertId: number): void {
    const alerts = this.alertsSubject.value.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
    this.alertsSubject.next(alerts);
  }

  clearAcknowledgedAlerts(): void {
    const alerts = this.alertsSubject.value.filter(alert => !alert.acknowledged);
    this.alertsSubject.next(alerts);
  }

  private generateInitialAlerts(): void {
    const initialAlerts: Alert[] = [
      {
        id: 1,
        type: 'LOW_STOCK',
        severity: 'CRITICAL',
        title: 'Critical Stock Level',
        message: 'Organic Honey stock at 20 units - Below minimum threshold (50 units)',
        entity: 'inventory',
        entityId: 3,
        timestamp: new Date(),
        acknowledged: false
      },
      {
        id: 2,
        type: 'EXPIRING',
        severity: 'HIGH',
        title: 'Items Expiring Soon',
        message: 'Fresh Milk batch #MB-2024-001 expires in 3 days (60 units)',
        entity: 'inventory',
        entityId: 8,
        timestamp: new Date(),
        acknowledged: false
      },
      {
        id: 3,
        type: 'DEMAND_SPIKE',
        severity: 'MEDIUM',
        title: 'Demand Surge Detected',
        message: 'Artisan Bread demand increased by 45% this week - Consider increasing stock',
        entity: 'product',
        entityId: 4,
        timestamp: new Date(),
        acknowledged: false
      }
    ];

    this.alertsSubject.next(initialAlerts);
  }

  getAlertsByType(type: Alert['type']): Alert[] {
    return this.alertsSubject.value.filter(alert => alert.type === type);
  }

  getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return this.alertsSubject.value.filter(alert => alert.severity === severity);
  }

  getUnacknowledgedAlerts(): Alert[] {
    return this.alertsSubject.value.filter(alert => !alert.acknowledged);
  }
}
