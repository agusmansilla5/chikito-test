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
  location_breakdown?: { name: string; quantity: number }[];
};

export type Audit = {
  id: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  responsible_name: string | null;
  location_id: string;
  started_by: string;
  profiles?: { full_name: string } | null;
};

export type MovementType = 'entrada' | 'salida';

export type Unit = 'u' | 'kg' | 'gr' | 'L' | 'mL';

export const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: 'u', label: 'u' },
  { value: 'kg', label: 'kg' },
  { value: 'gr', label: 'gr' },
  { value: 'L', label: 'L' },
  { value: 'mL', label: 'mL' },
];

export type StockMovement = {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  unit: Unit;
  note: string | null;
  created_at: string;
  location_id: string;
  products?: { name: string } | null;
  profiles?: { full_name: string } | null;
};

export type SupplierFulfillmentMode = 'envio' | 'retiro';

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  fulfillment_mode: SupplierFulfillmentMode | null;
  cbu_cvu: string | null;
  alias: string | null;
  bank_name: string | null;
  account_holder: string | null;
};

export type SupplierProduct = {
  id: string;
  supplier_id: string;
  product_id: string;
  default_quantity: number | null;
  default_unit_cost: number | null;
  products?: { name: string } | null;
};

// 'pendiente' es un valor legado (órdenes creadas antes de este campo) - las
// órdenes nuevas arrancan en 'pendiente_envio'. Ambos se tratan igual en la
// UI (mismo color, mismos botones disponibles).
export type PurchaseOrderStatus = 'pendiente' | 'pendiente_envio' | 'recibida' | 'cancelada';

export type PurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number | null;
  received_quantity: number | null;
  products?: { name: string } | null;
};

export type PurchaseOrder = {
  id: string;
  supplier_id: string;
  location_id: string;
  status: PurchaseOrderStatus;
  note: string | null;
  order_date: string;
  amount: number | null;
  shipping_detail: string | null;
  created_at: string;
  received_at: string | null;
  suppliers?:
    | (Pick<Supplier, 'name' | 'phone' | 'email' | 'cbu_cvu' | 'alias' | 'bank_name' | 'account_holder'> & {
        name: string;
      })
    | null;
  locations?: { name: string } | null;
};

export type PurchaseOrderPayment = {
  id: string;
  purchase_order_id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  receipt_path: string | null;
  created_by: string;
  created_at: string;
};

export type PaymentStatus = 'pendiente' | 'parcial' | 'pagado';
