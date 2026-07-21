export type UserRole = 'admin' | 'auditor' | 'jefe';

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
};

export type Category = {
  id: string;
  name: string;
};

export type Area = {
  id: string;
  name: string;
};

export type Location = {
  id: string;
  name: string;
  address: string | null;
};

export type Product = {
  id: string;
  barcode: string | null;
  name: string;
  quantity: number;
  min_stock: number;
  category_id: string | null;
  area_id: string | null;
  active: boolean;
  cost_price: number | null;
  sale_price: number | null;
  categories?: { name: string } | null;
  areas?: { name: string } | null;
};

export type Audit = {
  id: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  location_id: string;
  started_by: string;
  profiles?: { full_name: string } | null;
};

export type MovementType = 'entrada' | 'salida';

export type StockMovement = {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  note: string | null;
  created_at: string;
  location_id: string;
  products?: { name: string } | null;
  profiles?: { full_name: string } | null;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export type PurchaseOrderStatus = 'pendiente' | 'recibida' | 'cancelada';

export type PurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number | null;
  products?: { name: string } | null;
};

export type PurchaseOrder = {
  id: string;
  supplier_id: string;
  location_id: string;
  status: PurchaseOrderStatus;
  note: string | null;
  created_at: string;
  received_at: string | null;
  suppliers?: { name: string } | null;
  locations?: { name: string } | null;
};
