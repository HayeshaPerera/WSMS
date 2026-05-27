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
        @page { margin: 0.6in; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 20px;
          color: #1A1A1A;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 2px solid rgba(45, 122, 79, 0.15);
          margin-bottom: 30px;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .logo-text {
          font-size: 24px;
          font-weight: 800;
          color: #2D7A4F;
          letter-spacing: -0.02em;
        }
        .logo-subtitle {
          font-size: 10px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-weight: 600;
        }
        .date-generated {
          text-align: right;
          color: #6B7280;
          font-size: 11px;
        }
        .date-generated strong {
          color: #1A1A1A;
          display: block;
          margin-bottom: 4px;
        }
        h1 {
          color: #1A1A1A;
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 20px 0;
          letter-spacing: -0.01em;
        }
        .summary {
          background: rgba(45, 122, 79, 0.05);
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 1px solid rgba(45, 122, 79, 0.1);
          font-size: 13px;
        }
        .summary strong {
          color: #1A1A1A;
          font-weight: 600;
          margin-right: 4px;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 10px;
          font-size: 12px;
        }
        th {
          background: rgba(45, 122, 79, 0.08);
          color: #2D7A4F;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.1em;
          border-bottom: 2px solid rgba(45, 122, 79, 0.15);
        }
        th:first-child { border-top-left-radius: 8px; }
        th:last-child { border-top-right-radius: 8px; }
        td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          color: #4B5563;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:nth-child(even) td {
          background: rgba(0, 0, 0, 0.01);
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .status-low { background: rgba(220, 38, 38, 0.1); color: #DC2626; border: 1px solid rgba(220, 38, 38, 0.2); }
        .status-ok { background: rgba(45, 122, 79, 0.1); color: #2D7A4F; border: 1px solid rgba(45, 122, 79, 0.2); }
        .status-pending { background: rgba(217, 119, 6, 0.1); color: #D97706; border: 1px solid rgba(217, 119, 6, 0.2); }
        .status-approved { background: rgba(45, 122, 79, 0.1); color: #2D7A4F; border: 1px solid rgba(45, 122, 79, 0.2); }
        .status-rejected { background: rgba(220, 38, 38, 0.1); color: #DC2626; border: 1px solid rgba(220, 38, 38, 0.2); }
        .status-in-transit { background: rgba(2, 132, 199, 0.1); color: #0284C7; border: 1px solid rgba(2, 132, 199, 0.2); }
        .status-delivered { background: rgba(45, 122, 79, 0.1); color: #2D7A4F; border: 1px solid rgba(45, 122, 79, 0.2); }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          text-align: center;
          color: #9CA3AF;
          font-size: 10px;
        }
        .text-danger { color: #DC2626; font-weight: 600; }
        .text-success { color: #2D7A4F; font-weight: 600; }
        .text-warning { color: #D97706; font-weight: 600; }
        .text-muted { color: #6B7280; }
      </style>
    `;
  }

  generateInventoryReport(inventory: any[]): void {
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

  generateStockRequestsReport(requests: any[]): void {
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

  generateDeliveriesReport(deliveries: any[]): void {
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
          <td><strong>${rec.productName || rec.product?.name || 'N/A'}</strong></td>
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

  generateReconciliationReport(records: any[]): void {
    const matched = records.filter(r => r.status === 'MATCHED').length;
    const discrepancies = records.filter(r => r.status === 'DISCREPANCY').length;
    
    let content = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Stock Reconciliation Report</title>
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
        
        <h1>Stock Reconciliation Report</h1>
        
        <div class="summary">
          <strong>Total Records:</strong> ${records.length} | 
          <strong>Matched:</strong> <span class="text-success">${matched}</span> | 
          <strong>Discrepancies:</strong> <span class="text-danger">${discrepancies}</span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Audit Date</th>
              <th>Product</th>
              <th>Location</th>
              <th>System Qty</th>
              <th>Physical Qty</th>
              <th>Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => {
              const isDiscrepancy = r.status === 'DISCREPANCY';
              return `
                <tr>
                  <td><strong>${new Date(r.auditDate).toLocaleDateString()}</strong></td>
                  <td>${r.productName || 'N/A'}</td>
                  <td>${r.locationName || 'N/A'}</td>
                  <td>${r.systemQty}</td>
                  <td>${r.physicalQty}</td>
                  <td class="${isDiscrepancy ? 'text-danger' : 'text-success'}">${r.variance > 0 ? '+' + r.variance : r.variance}</td>
                  <td>
                    <span class="status-badge ${isDiscrepancy ? 'status-rejected' : 'status-approved'}">
                      ${r.status}
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
    
    this.downloadPdf(content, 'Stock_Reconciliation_Report.pdf');
  }

  private createPdfDocument(): any {
    return {};
  }
}
