export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  active: boolean;
  roles: Role[];
  warehouse?: Warehouse;
  supermarket?: Supermarket;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  location: string;
  address?: string;
  capacity: number;
  currentStock: number;
  contactPhone?: string;
  contactEmail?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supermarket {
  id: number;
  code: string;
  name: string;
  location: string;
  address?: string;
  storageCapacity: number;
  currentStock: number;
  contactPhone?: string;
  contactEmail?: string;
  assignedWarehouse?: Warehouse;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unitPrice: number;
  reorderLevel: number;
  minStockLevel: number;
  unit?: string;
  brand?: string;
  perishable: boolean;
  shelfLifeDays?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: number;
  product?: Product;
  warehouse?: Warehouse;
  supermarket?: Supermarket;
  quantity: number;
  reorderLevel: number;
  batchNumber?: string;
  manufactureDate?: Date;
  expiryDate?: Date;
  location?: string;
  lastUpdated: Date;
  lowStockAlert: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockRequest {
  id: number;
  requestNumber: string;
  supermarket?: Supermarket;
  warehouse?: Warehouse;
  product?: Product;
  requestedQuantity: number;
  approvedQuantity?: number;
  status: RequestStatus;
  priority: Priority;
  requestedBy: User;
  approvedBy?: User;
  notes?: string;
  rejectionReason?: string;
  requestedAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface Delivery {
  id: number;
  trackingNumber: string;
  stockRequest?: StockRequest;
  warehouse?: Warehouse;
  supermarket?: Supermarket;
  product?: Product;
  quantity: number;
  status: DeliveryStatus;
  driverName?: string;
  vehicleNumber?: string;
  currentLocation?: string;
  notes?: string;
  createdAt: Date;
  dispatchedAt?: Date;
  inTransitAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  updatedAt: Date;
  estimatedDelivery?: Date;
  receivedBy?: User;
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface SalesHistory {
  id: number;
  product: Product;
  supermarket: Supermarket;
  saleDate: Date;
  quantitySold: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
  createdAt: Date;
}

export interface DemandForecast {
  productId: number;
  productName: string;
  productSku: string;
  predictedWeeklyDemand: number;
  predictedMonthlyDemand: number;
  confidence: number;
  forecastMethod: string;
  historicalAverage: number;
  currentStock: number;
  recommendedOrder: number;
  trend: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface JwtResponse {
  token: string;
  type: string;
  username: string;
  email: string;
  roles: string[];
  userId: number;
  warehouseId?: number;
  supermarketId?: number;
  success?: boolean; // Added for compatibility with backend response
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}
