import { Injectable } from '@angular/core';
import { SharedDataService } from './shared-data.service';

@Injectable({
  providedIn: 'root'
})
export class PdfReportService {
  constructor(private sharedData: SharedDataService) {}

  private getBaseStyle(): string {
    return `
      <style>
        @page { margin: 0.5in; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          padding: 40px;
          color: #2c3e50;
          line-height: 1.6;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 3px solid #3498db;
          margin-bottom: 30px;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .logo-text {
          font-size: 28px;
          font-weight: 700;
          color: #3498db;
          letter-spacing: 1px;
        }
        .logo-subtitle {
          font-size: 11px;
          color: #7f8c8d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .date-generated {
          text-align: right;
          color: #7f8c8d;
          font-size: 12px;
        }
        h1 {
          color: #2c3e50;
          font-size: 24px;
          font-weight: 700;
          margin: 20px 0 15px 0;
          padding-left: 10px;
          border-left: 5px solid #3498db;
        }
        .summary {
          background: #ecf0f1;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        .summary strong {
          color: #2c3e50;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 13px;
        }
        th {
          background: #34495e;
          color: white;
          padding: 14px 12px;
          text-align: left;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #ecf0f1;
        }
        tr:nth-child(even) {
          background: #f8f9fa;
        }
        tr:hover {
          background: #e8f4f8;
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          display: inline-block;
        }
        .status-low { background: #ffe0e0; color: #e74c3c; }
        .status-ok { background: #d4edda; color: #27ae60; }
        .status-pending { background: #fff3cd; color: #f39c12; }
        .status-approved { background: #d4edda; color: #27ae60; }
        .status-rejected { background: #ffe0e0; color: #e74c3c; }
        .status-in-transit { background: #d6eaff; color: #2980b9; }
        .status-delivered { background: #d4edda; color: #27ae60; }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #ecf0f1;
          text-align: center;
          color: #95a5a6;
          font-size: 11px;
        }
        .text-danger { color: #e74c3c; font-weight: 600; }
        .text-success { color: #27ae60; font-weight: 600; }
        .text-warning { color: #f39c12; font-weight: 600; }
        .text-muted { color: #95a5a6; }
      </style>
    `;
  }

  generateInventoryReport(): void {
    const inventory = this.sharedData.getInventory();
    const lowStockCount = inventory.filter(item => item.quantity <= item.reorderLevel).length;
    
    let content = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Inventory Report</title>
        ${this.getBaseStyle()}
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <div>
              <div class="logo-text">WSSCMS</div>
              <div class="logo-subtitle">Supply Chain Management</div>
            </div>
          </div>
          <div class="date-generated">
            <div><strong>Generated:</strong></div>
            <div>${new Date().toLocaleString()}</div>
          </div>
        </div>
        
        <h1>Inventory Report</h1>
        
        <div class="summary">
          <strong>Total Items:</strong> ${inventory.length} | 
          <strong>Low Stock Items:</strong> <span class="text-danger">${lowStockCount}</span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th>Current Qty</th>
              <th>Reorder Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${inventory.map(item => {
              const isLowStock = item.quantity <= item.reorderLevel;
              return `
                <tr>
                  <td><strong>${item.product?.name || 'N/A'}</strong></td>
                  <td class="text-muted">${item.product?.sku || 'N/A'}</td>
                  <td>${item.warehouse?.name || 'N/A'}</td>
                  <td class="${isLowStock ? 'text-danger' : ''}">${item.quantity}</td>
                  <td>${item.reorderLevel}</td>
                  <td>
                    <span class="status-badge ${isLowStock ? 'status-low' : 'status-ok'}">
                      ${isLowStock ? 'Low Stock' : 'OK'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>WSSCMS - Warehouse and Supermarket Supply Chain Management System</p>
          <p>This is a computer-generated document. No signature required.</p>
        </div>
      </body>
      </html>
    `;
    
    this.downloadPdf(content, 'Inventory_Report.pdf');
  }

  generateStockRequestsReport(): void {
    const requests = this.sharedData.getStockRequests();
    const pending = requests.filter(r => r.status === 'PENDING').length;
    const approved = requests.filter(r => r.status === 'APPROVED').length;
    const rejected = requests.filter(r => r.status === 'REJECTED').length;
    
    let content = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Stock Requests Report</title>
        ${this.getBaseStyle()}
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <div>
              <div class="logo-text">WSSCMS</div>
              <div class="logo-subtitle">Supply Chain Management</div>
            </div>
          </div>
          <div class="date-generated">
            <div><strong>Generated:</strong></div>
            <div>${new Date().toLocaleString()}</div>
          </div>
        </div>
        
        <h1>Stock Requests Report</h1>
        
        <div class="summary">
          <strong>Total Requests:</strong> ${requests.length} | 
          <strong>Pending:</strong> <span class="text-warning">${pending}</span> | 
          <strong>Approved:</strong> <span class="text-success">${approved}</span> | 
          <strong>Rejected:</strong> <span class="text-danger">${rejected}</span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Request #</th>
              <th>Product</th>
              <th>Supermarket</th>
              <th>Warehouse</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${requests.map(req => `
              <tr>
                <td><strong>${req.requestNumber || req.id}</strong></td>
                <td>${req.product?.name || 'N/A'}</td>
                <td>${req.supermarket?.name || 'N/A'}</td>
                <td>${req.warehouse?.name || 'N/A'}</td>
                <td>${req.requestedQuantity}</td>
                <td>
                  <span class="status-badge status-${req.status?.toLowerCase()}">
                    ${req.status}
                  </span>
                </td>
                <td class="text-muted">${new Date(req.requestedAt).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>WSSCMS - Warehouse and Supermarket Supply Chain Management System</p>
          <p>This is a computer-generated document. No signature required.</p>
        </div>
      </body>
      </html>
    `;
    
    this.downloadPdf(content, 'Stock_Requests_Report.pdf');
  }

  generateDeliveriesReport(): void {
    const deliveries = this.sharedData.getDeliveries();
    const inTransit = deliveries.filter(d => d.status === 'IN_TRANSIT').length;
    const delivered = deliveries.filter(d => d.status === 'DELIVERED').length;
    
    let content = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Deliveries Report</title>
        ${this.getBaseStyle()}
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <div>
              <div class="logo-text">WSSCMS</div>
              <div class="logo-subtitle">Supply Chain Management</div>
            </div>
          </div>
          <div class="date-generated">
            <div><strong>Generated:</strong></div>
            <div>${new Date().toLocaleString()}</div>
          </div>
        </div>
        
        <h1>Deliveries Report</h1>
        
        <div class="summary">
          <strong>Total Deliveries:</strong> ${deliveries.length} | 
          <strong>In Transit:</strong> <span class="text-warning">${inTransit}</span> | 
          <strong>Delivered:</strong> <span class="text-success">${delivered}</span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Tracking #</th>
              <th>Product</th>
              <th>From Warehouse</th>
              <th>To Supermarket</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Dispatched Date</th>
            </tr>
          </thead>
          <tbody>
            ${deliveries.map(delivery => `
              <tr>
                <td><strong>${delivery.trackingNumber}</strong></td>
                <td>${delivery.product?.name || 'N/A'}</td>
                <td>${delivery.warehouse?.name || 'N/A'}</td>
                <td>${delivery.supermarket?.name || 'N/A'}</td>
                <td>${delivery.quantity}</td>
                <td>
                  <span class="status-badge status-${delivery.status?.toLowerCase().replace('_', '-')}">
                    ${delivery.status?.replace('_', ' ')}
                  </span>
                </td>
                <td class="text-muted">${delivery.dispatchedAt ? new Date(delivery.dispatchedAt).toLocaleDateString() : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>WSSCMS - Warehouse and Supermarket Supply Chain Management System</p>
          <p>This is a computer-generated document. No signature required.</p>
        </div>
      </body>
      </html>
    `;
    
    this.downloadPdf(content, 'Deliveries_Report.pdf');
  }

  private downloadPdf(htmlContent: string, filename: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }

  generateAnalyticsReport(alerts: any[], recommendations: any[], costAnalysis: any): void {
    let alertsSummary = '';
    if (alerts && alerts.length > 0) {
      alertsSummary = alerts.map(alert => `
        <tr>
          <td><strong>${alert.title}</strong></td>
          <td>${alert.description}</td>
          <td>
            <span class="status-badge status-${alert.severity?.toLowerCase()}">
              ${alert.severity}
            </span>
          </td>
          <td class="text-muted">${new Date(alert.timestamp).toLocaleDateString()}</td>
        </tr>
      `).join('');
    }

    let recommendationsSummary = '';
    if (recommendations && recommendations.length > 0) {
      recommendationsSummary = recommendations.slice(0, 10).map(rec => `
        <tr>
          <td><strong>${rec.product?.name || 'N/A'}</strong></td>
          <td>${rec.daysUntilStockout || 'N/A'}</td>
          <td>${rec.recommendedQuantity || 0}</td>
          <td>LKR ${(rec.estimatedCost || 0).toLocaleString()}</td>
          <td class="text-warning">${rec.confidence || 0}%</td>
        </tr>
      `).join('');
    }

    let content = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Analytics Report</title>
        ${this.getBaseStyle()}
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <div>
              <div class="logo-text">WSSCMS</div>
              <div class="logo-subtitle">Supply Chain Management</div>
            </div>
          </div>
          <div class="date-generated">
            <div><strong>Generated:</strong></div>
            <div>${new Date().toLocaleString()}</div>
          </div>
        </div>
        
        <h1>Analytics Report</h1>
        
        <div class="summary">
          <strong>Total Alerts:</strong> ${alerts?.length || 0} | 
          <strong>Reorder Recommendations:</strong> ${recommendations?.length || 0}
        </div>

        ${alerts && alerts.length > 0 ? `
        <h2>System Alerts</h2>
        <table>
          <thead>
            <tr>
              <th>Alert Title</th>
              <th>Description</th>
              <th>Severity</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${alertsSummary}
          </tbody>
        </table>
        ` : ''}

        ${recommendations && recommendations.length > 0 ? `
        <h2>Reorder Recommendations</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Days Until Stockout</th>
              <th>Recommended Qty</th>
              <th>Estimated Cost</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${recommendationsSummary}
          </tbody>
        </table>
        ` : ''}

        <h2>Cost Analysis</h2>
        <div class="summary">
          <strong>Total Inventory Value:</strong> LKR ${(costAnalysis?.totalInventoryValue || 0).toLocaleString()} <br>
          <strong>Total Cost Impact:</strong> LKR ${(costAnalysis?.totalCostImpact || 0).toLocaleString()} <br>
          <strong>Excess Inventory Cost:</strong> LKR ${(costAnalysis?.excessInventoryCost || 0).toLocaleString()} <br>
          <strong>Stockout Cost:</strong> LKR ${(costAnalysis?.stockoutCost || 0).toLocaleString()} <br>
          <strong>Delivery Delay Cost:</strong> LKR ${(costAnalysis?.deliveryDelayCost || 0).toLocaleString()}
        </div>
        
        <div class="footer">
          <p>WSSCMS - Warehouse and Supermarket Supply Chain Management System</p>
          <p>This is a computer-generated document. No signature required.</p>
        </div>
      </body>
      </html>
    `;
    
    this.downloadPdf(content, 'Analytics_Report.pdf');
  }

  private createPdfDocument(): any {
    return {};
  }
}
