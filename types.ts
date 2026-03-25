
export enum OrderStatus {
  PENDING = 'Pending',
  PARTIAL = 'Partial Paid',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export enum Category {
  BOOKS = 'Books',
  STATIONERY = 'Stationery',
  BAGS = 'Bags',
  ACCESSORIES = 'Accessories'
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
}

export interface BusinessConfig {
  name: string;
  mailingName?: string; // For invoice headers
  subHeader?: string; // Nature of Business
  address: string;
  phone: string;
  isGstEnabled: boolean;
  gstNumber?: string;
  gstRate?: number; // In percentage
  currentPlanId?: string;
  subscriptionExpiry?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookBypassPreflight?: boolean;
}

export interface Product {
  id: string;
  barcode: string;
  class: string; 
  category: string; 
  name: string;
  author: string;
  stockIn: number;
  totalSold: number;
  closingStock: number;
  costPrice: number; 
  mrp: number;
  discountRate: number; 
  customerPrice: number;
  dateAdded: string;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  dateAdded: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  category: string; 
  quantity: number;
  costPrice: number; 
  mrp: number;
  discountRate: number;
  price: number;
  subtotal: number;
}

export interface CustomerOrder {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  advancePaid: number;
  status: OrderStatus;
  date: string;
}

export interface Bill {
  id: string;
  date: string;
  items: OrderItem[];
  grandTotal: number;
  customerId?: string;
  customerName?: string;
  paymentMethod: string;
  orderId?: string;
  advanceAdjusted?: number;
}

export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}
