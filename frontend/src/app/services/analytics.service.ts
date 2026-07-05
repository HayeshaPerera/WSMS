import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// ─────────────────────────────────────────────────────────
// Interfaces defining the data structures used by the Dashboard
// ─────────────────────────────────────────────────────────

// Defines a system alert (e.g., low stock warning, expiring product)
export interface Alert {
  id: number;
  type: 'LOW_STOCK' | 'EXPIRING' | 'DELAYED_DELIVERY' | 'DEMAND_SPIKE' | 'COST_WARNING';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  entity: string; // The type of record this alert relates to (e.g., 'inventory')
  entityId: number; // The database ID of the specific record
  timestamp: Date;
  acknowledged: boolean; // Has a user dismissed/read this alert?
}

// Defines an AI/system recommendation for ordering more stock
export interface ReorderRecommendation {
  productId: number;
  productName: string;
  currentStock: number;
  reorderLevel: number; // The minimum threshold before we should order more
  recommendedQuantity: number; // How much the system thinks we should buy
  estimatedCost: number; // The financial cost of buying the recommended amount
  daysUntilStockout: number; // How soon we will run out of this item
  confidence: number; // 0-100 score on how sure the AI is about this prediction
  reasoning: string; // Text explaining WHY it made this recommendation
}

// Defines the financial impact of current inventory states
export interface CostAnalysis {
  totalInventoryValue: number; // Total money tied up in current stock
  excessInventoryCost: number; // Money wasted by holding too much stock (storage costs)
  stockoutCost: number; // Lost revenue because we ran out of something people wanted to buy
  deliveryDelayCost: number; // Penalties or lost sales due to late trucks
  totalCostImpact: number; // Sum of the above waste/losses
  monthlyTrend: number; // percentage showing if we are doing better or worse than last month
}

@Injectable({
  providedIn: 'root' // This service is a singleton available everywhere in the app
})
export class AnalyticsService {
  
  // BehaviorSubjects act as reactive state holders. 
  // Components subscribe to the corresponding public '$' Observables to instantly 
  // re-render the UI whenever this service updates the data.
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  private reorderRecommendationsSubject = new BehaviorSubject<ReorderRecommendation[]>([]);
  public reorderRecommendations$ = this.reorderRecommendationsSubject.asObservable();

  constructor() {
    // Generate some fake alerts on startup so the dashboard isn't empty during demos
    this.generateInitialAlerts();
  }

  // ─────────────────────────────────────────────────────────
  // Analytics Engine Methods
  // ─────────────────────────────────────────────────────────

  /**
   * Scans the current inventory arrays and generates Alerts if things are bad.
   */
  analyzeInventory(inventory: any[], products: any[]): void {
    const alerts: Alert[] = [];
    let alertId = 1;

    // 1. Check for low stock
    inventory.forEach(item => {
      if (item.quantity <= item.reorderLevel) {
        alerts.push({
          id: alertId++,
          type: 'LOW_STOCK',
          // If 0, CRITICAL. If under half the reorder level, HIGH. Otherwise MEDIUM.
          severity: item.quantity === 0 ? 'CRITICAL' : item.quantity < item.reorderLevel / 2 ? 'HIGH' : 'MEDIUM',
          title: 'Low Stock Alert',
          message: `${item.product?.name || 'Product'} stock is at ${item.quantity} units (reorder level: ${item.reorderLevel})`,
          entity: 'inventory',
          entityId: item.id,
          timestamp: new Date(),
          acknowledged: false
        });
      }

      // 2. Check for expiring items (e.g., dairy products)
      if (item.expiryDate) {
        // Calculate days between today and expiry date
        const daysUntilExpiry = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        // If it expires within a week, trigger an alert
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          alerts.push({
            id: alertId++,
            type: 'EXPIRING',
            severity: daysUntilExpiry <= 3 ? 'CRITICAL' : 'HIGH', // 3 days or less is CRITICAL
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

    // Push the newly generated alerts to the Subject, which updates the UI
    this.alertsSubject.next(alerts);
  }

  /**
   * Scans logistics deliveries and triggers alerts for late or failed trucks.
   */
  analyzeDeliveries(deliveries: any[]): void {
    const alerts: Alert[] = [];
    let alertId = this.alertsSubject.value.length + 1; // Continue ID sequence from existing alerts

    deliveries.forEach(delivery => {
      // 1. Alert if a delivery completely failed
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

      // 2. Alert if a delivery is late (past its ETA but not yet marked 'DELIVERED')
      if (delivery.estimatedDelivery && delivery.status !== 'DELIVERED') {
        const daysOverdue = Math.ceil((Date.now() - new Date(delivery.estimatedDelivery).getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue > 0) {
          alerts.push({
            id: alertId++,
            type: 'DELAYED_DELIVERY',
            severity: daysOverdue > 3 ? 'CRITICAL' : 'HIGH', // More than 3 days late is CRITICAL
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

    // Merge these new delivery alerts with the existing inventory alerts and update the UI
    this.alertsSubject.next([...this.alertsSubject.value, ...alerts]);
  }

  /**
   * Looks at current stock levels and calculates exactly what the manager should order.
   */
  generateReorderRecommendations(inventory: any[]): void {
    const recommendations: ReorderRecommendation[] = [];
    
    inventory.forEach(item => {
      // Only generate a recommendation if stock is getting relatively low (1.5x the reorder level)
      if (item.quantity <= item.reorderLevel * 1.5) {
        
        // Suggest ordering double the minimum threshold to build up a safety buffer
        const recommendedQuantity = item.reorderLevel * 2;
        
        // Attempt to find the price to estimate the cost of the order
        const unitPrice = item.product?.unitPrice || item.unitPrice || item.product_price || 100;
        const estimatedCost = recommendedQuantity * unitPrice;
        
        // Extremely basic math to estimate when we'll run out
        // (Assuming we use 1/30th of the reorder level per day)
        const dailyUsage = item.reorderLevel / 30;
        const daysUntilStockout = Math.max(0, Math.floor(item.quantity / dailyUsage));
        
        // Calculate AI confidence score based on how close we are to 0.
        // The closer we are to 0, the more confident the system is that we MUST reorder.
        let confidence = 75;
        if (item.quantity < item.reorderLevel * 0.5) confidence = 95;
        else if (item.quantity < item.reorderLevel) confidence = 90;
        else if (item.quantity < item.reorderLevel * 1.2) confidence = 85;
        
        // Generate a human-readable explanation for the manager
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
        
        // Safely extract names/IDs dealing with potential missing nested data
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
    
    // Sort recommendations so the most urgent ones (lowest days until stockout) appear at the top of the UI list
    recommendations.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
    
    // Update the UI via the Subject
    this.reorderRecommendationsSubject.next(recommendations);
  }

  /**
   * Calculates the financial health of the supply chain.
   */
  calculateCostAnalysis(inventory: any[], deliveries: any[], stockRequests: any[]): CostAnalysis {
    
    // Total value = sum of (Quantity * Price) for every item in the warehouse
    const totalInventoryValue = inventory.reduce((sum, item) => {
      const unitPrice = item.product?.unitPrice || 100;
      return sum + (item.quantity * unitPrice);
    }, 0);

    // Excess cost: If we hold more than 2.5x our reorder level, we consider that 'excess'.
    // We assume it costs 15% of the item's value to store it (insurance, warehouse space, refrigeration, etc).
    const excessInventoryCost = inventory.reduce((sum, item) => {
      const optimalStock = item.reorderLevel * 2.5;
      const excess = Math.max(0, item.quantity - optimalStock);
      const unitPrice = item.product?.unitPrice || 100;
      return sum + (excess * unitPrice * 0.15); // 15% holding cost penalty
    }, 0);

    // Stockout cost: If we are below reorder level, we estimate lost sales.
    // We assume 30% of the missing inventory translates directly to lost profit margin.
    const stockoutCost = inventory.reduce((sum, item) => {
      if (item.quantity < item.reorderLevel) {
        const shortage = item.reorderLevel - item.quantity;
        const unitPrice = item.product?.unitPrice || 100;
        return sum + (shortage * unitPrice * 0.30); // 30% lost profit penalty
      }
      return sum;
    }, 0);

    // Delivery delay cost: Financial penalties for late logistics
    const deliveryDelayCost = deliveries.reduce((sum, delivery) => {
      let delayCost = 0;
      
      if (delivery.status === 'FAILED') {
        // If a truck fails entirely (e.g. crash, spoiled goods), we assume a 25% write-off cost
        const unitPrice = delivery.product?.unitPrice || 100;
        delayCost = (delivery.quantity * unitPrice * 0.25);
      } else if (delivery.estimatedDelivery && delivery.status === 'IN_TRANSIT') {
        const estimatedDate = new Date(delivery.estimatedDelivery);
        const now = new Date();
        const daysOverdue = Math.ceil((now.getTime() - estimatedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
           // Flat fee of $50 per item per day late
          delayCost = delivery.quantity * 50 * daysOverdue;
        }
      }
      
      return sum + delayCost;
    }, 0);

    // The grand total of all wasted money / lost opportunity
    const totalCostImpact = excessInventoryCost + stockoutCost + deliveryDelayCost;

    // Extremely basic trend calculation based on pending stock requests
    const pendingRequests = stockRequests.filter(r => r.status === 'PENDING').length;
    const totalRequests = stockRequests.length || 1;
    const monthlyTrend = ((pendingRequests / totalRequests) * 100) - 50;

    return {
      totalInventoryValue,
      excessInventoryCost,
      stockoutCost,
      deliveryDelayCost,
      totalCostImpact,
      monthlyTrend: Math.round(monthlyTrend * 10) / 10 // Round to 1 decimal place
    };
  }

  // ─────────────────────────────────────────────────────────
  // Alert Management Methods
  // ─────────────────────────────────────────────────────────

  // Marks a specific alert as "read" by the user
  acknowledgeAlert(alertId: number): void {
    const alerts = this.alertsSubject.value.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
    this.alertsSubject.next(alerts);
  }

  // Removes all read alerts from the screen
  clearAcknowledgedAlerts(): void {
    const alerts = this.alertsSubject.value.filter(alert => !alert.acknowledged);
    this.alertsSubject.next(alerts);
  }

  // Private helper to inject dummy data for presentation purposes
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

  // Getter for filtering alerts by type
  getAlertsByType(type: Alert['type']): Alert[] {
    return this.alertsSubject.value.filter(alert => alert.type === type);
  }

  // Getter for filtering alerts by severity
  getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return this.alertsSubject.value.filter(alert => alert.severity === severity);
  }

  // Getter for retrieving only unread alerts
  getUnacknowledgedAlerts(): Alert[] {
    return this.alertsSubject.value.filter(alert => !alert.acknowledged);
  }
}
