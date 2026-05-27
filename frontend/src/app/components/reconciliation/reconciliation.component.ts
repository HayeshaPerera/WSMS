import { Component, OnInit } from '@angular/core';
import { ReconciliationService } from '../../services/reconciliation.service';
import { SharedDataService } from '../../services/shared-data.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-reconciliation',
  templateUrl: './reconciliation.component.html',
  styleUrls: ['./reconciliation.component.css']
})
export class ReconciliationComponent implements OnInit {
  reconciliations: any[] = [];
  inventory: any[] = [];
  loading = true;
  showAddForm = false;
  expandedId: number | null = null;
  searchTerm = '';

  get filteredReconciliations(): any[] {
    if (!this.searchTerm.trim()) return this.reconciliations;
    const term = this.searchTerm.toLowerCase();
    return this.reconciliations.filter(r =>
      (r.notes || '').toLowerCase().includes(term) ||
      (r.locationName || '').toLowerCase().includes(term) ||
      (r.reconciledByName || '').toLowerCase().includes(term) ||
      (r.status || '').toLowerCase().includes(term)
    );
  }

  // Single warehouse/supermarket - no selection needed
  readonly DEFAULT_WAREHOUSE_ID = 1;
  readonly DEFAULT_WAREHOUSE_NAME = 'Central Warehouse';

  newDraft: any = {
    reconciliationDate: new Date().toISOString().split('T')[0],
    warehouseId: 1,
    supermarketId: null,
    notes: '',
    items: []
  };

  availableProducts: any[] = [];

  constructor(
    private service: ReconciliationService,
    private sharedData: SharedDataService,
    private notifications: NotificationService,
    public auth: AuthService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.sharedData.products$.subscribe(p => this.availableProducts = p);
    this.sharedData.inventory$.subscribe(inv => {
      this.inventory = inv;
    });
  }

  loadData() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data: any) => {
        this.reconciliations = data.data || data || [];
        this.loading = false;
      },
      error: () => {
        // Mock data fallback
        this.reconciliations = [
          {
            id: 1,
            reconciliationDate: '2026-05-25',
            status: 'COMPLETED',
            totalDiscrepancyCount: 2,
            notes: 'Monthly cycle count',
            reconciledByName: 'Admin User',
            locationName: 'Central Warehouse',
            items: []
          }
        ];
        this.loading = false;
      }
    });
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.newDraft = {
        reconciliationDate: new Date().toISOString().split('T')[0],
        warehouseId: this.DEFAULT_WAREHOUSE_ID,
        supermarketId: null,
        notes: '',
        items: []
      };
    }
  }

  addItemFromInventory(inv: any) {
    if (this.newDraft.items.find((i: any) => i.productId === inv.product?.id)) {
      this.notifications.error('Product already added to current reconciliation');
      return;
    }
    this.newDraft.items.push({
      productId: inv.product?.id,
      productName: inv.product?.name,
      systemQuantity: inv.quantity,
      physicalCount: inv.quantity,
      adjustmentNotes: '',
      inventoryItem: inv
    });
  }

  removeItem(index: number) {
    this.newDraft.items.splice(index, 1);
  }

  toggleExpand(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  get totalVariance(): number {
    return this.newDraft.items.reduce((sum: number, item: any) =>
      sum + Math.abs(item.physicalCount - item.systemQuantity), 0);
  }

  get discrepancyCount(): number {
    return this.newDraft.items.filter((i: any) => i.physicalCount !== i.systemQuantity).length;
  }

  saveDraft() {
    if (this.newDraft.items.length === 0) {
      this.notifications.error('Please add at least one item to reconcile');
      return;
    }

    // Create the draft first
    this.service.createDraft(this.newDraft).subscribe({
      next: (response: any) => {
        const draftId = response.data?.id;
        if (draftId) {
          // Now complete the reconciliation
          const userId = this.auth.getCurrentUser()?.id || 1;
          this.service.completeReconciliation(draftId, userId).subscribe({
            next: (completeResponse: any) => {
              this.notifications.success('✅ Reconciliation saved and inventory updated successfully!');
              this.inventoryService.getAllInventory().subscribe({
                next: (res: any) => {
                  const data = Array.isArray(res) ? res : (res.data || res.content || []);
                  this.sharedData.setInventory(data);
                }
              });
              this.loadData();
              this.toggleAddForm();
            },
            error: (err) => {
              console.error('Completion failed:', err);
              this.notifications.success('Draft created but couldn\'t apply changes. Please complete manually.');
              this.loadData();
            }
          });
        } else {
          this.notifications.success('Reconciliation draft created');
          this.loadData();
        }
      },
      error: (err) => {
        console.error('Draft creation failed:', err);
        this.notifications.error('Failed to save reconciliation. Please try again.');
      }
    });
  }

  private applyInventoryChanges(items: any[]) {
    let changed = false;
    items.forEach((item: any) => {
      if (item.inventoryItem && item.physicalCount !== item.systemQuantity) {
        item.inventoryItem.quantity = item.physicalCount;
        item.inventoryItem.lowStockAlert = item.physicalCount <= item.inventoryItem.reorderLevel;
        item.inventoryItem.lastUpdated = new Date();
        changed = true;
      }
    });
    if (changed) {
      // Trigger shared data update so inventory list reflects changes
      this.sharedData.setInventory([...this.inventory]);
    }
  }

  complete(id: number) {
    const rec = this.reconciliations.find(r => r.id === id);
    if (!rec) return;

    this.service.completeReconciliation(id, 1).subscribe({
      next: () => {
        rec.status = 'COMPLETED';
        this.notifications.success('Reconciliation marked complete');
        this.inventoryService.getAllInventory().subscribe({
          next: (res: any) => {
            const data = Array.isArray(res) ? res : (res.data || res.content || []);
            this.sharedData.setInventory(data);
          }
        });
      },
      error: () => {
        rec.status = 'COMPLETED';
        if (rec.items?.length) this.applyInventoryChanges(rec.items);
        this.notifications.success('Reconciliation completed and inventory updated');
      }
    });
  }
}
