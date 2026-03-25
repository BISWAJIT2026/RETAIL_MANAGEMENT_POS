
import { Product, Category } from './types';

export const INITIAL_INVENTORY: Product[] = [
  {
    id: '1',
    barcode: '890123456001',
    class: '10',
    category: Category.BOOKS,
    name: 'NCERT Mathematics Class 10',
    author: 'NCERT Panel',
    stockIn: 100,
    totalSold: 20,
    closingStock: 80,
    // Fix: Added missing costPrice to satisfy Product interface
    costPrice: 170,
    mrp: 250,
    discountRate: 10,
    customerPrice: 225,
    dateAdded: '2023-10-01'
  },
  {
    id: '2',
    barcode: '890123456002',
    class: '12',
    category: Category.BOOKS,
    name: 'Concepts of Physics Vol. 1',
    author: 'H.C. Verma',
    stockIn: 50,
    totalSold: 5,
    closingStock: 45,
    // Fix: Added missing costPrice to satisfy Product interface
    costPrice: 420,
    mrp: 650,
    discountRate: 15,
    customerPrice: 552.5,
    dateAdded: '2023-11-15'
  },
  {
    id: '3',
    barcode: '890123456003',
    class: 'N/A',
    category: Category.STATIONERY,
    name: 'Classmate Notebook 200pg',
    author: 'ITC',
    stockIn: 500,
    totalSold: 120,
    closingStock: 380,
    // Fix: Added missing costPrice to satisfy Product interface
    costPrice: 50,
    mrp: 75,
    discountRate: 5,
    customerPrice: 71.25,
    dateAdded: '2023-12-01'
  },
  {
    id: '4',
    barcode: '890123456004',
    class: '8',
    category: Category.BOOKS,
    name: 'Honey Dew English Reader',
    author: 'NCERT',
    stockIn: 60,
    totalSold: 60,
    closingStock: 0,
    // Fix: Added missing costPrice to satisfy Product interface
    costPrice: 120,
    mrp: 180,
    discountRate: 10,
    customerPrice: 162,
    dateAdded: '2023-09-20'
  },
  {
    id: '5',
    barcode: '890123456005',
    class: '10',
    category: Category.BAGS,
    name: 'Skybag Ergo Pro',
    author: 'VIP Industries',
    stockIn: 25,
    totalSold: 22,
    closingStock: 3,
    // Fix: Added missing costPrice to satisfy Product interface
    costPrice: 1500,
    mrp: 2499,
    discountRate: 20,
    customerPrice: 1999.2,
    dateAdded: '2023-08-10'
  }
];