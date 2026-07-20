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
  active: boolean;
  cost_price: number | null;
  sale_price: number | null;
  categories?: { name: string } | null;
};

export type Audit = {
  id: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  location_id: string;
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
