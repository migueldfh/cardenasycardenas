# Standalone Inventory Module

A fully self-contained inventory module designed for easy copy-pasting into other projects. This module handles products cataloging, warehouse location maps, rack slot inventory levels, stock adjustments, stock transfers, and audit logs.

## 📁 Directory Structure
```
inventory/
├── api.ts          # Database API integration (Supabase)
├── hooks.ts        # TanStack Query React Hooks
├── types.ts        # TypeScript interfaces
├── schema.sql      # Database definitions (Tables, Views, RLS, Realtime)
├── README.md       # Integration guide (this file)
├── components/
│   └── InventorySidebar.tsx   # Sub-module Sidebar layout navigation
├── layouts/
│   └── InventoryLayout.tsx    # Sub-module layout structure
└── pages/
    ├── InventoryDashboard.tsx # Overview statistics and SKU lists
    ├── ProductDetail.tsx      # Stock distribution for a single SKU
    └── RackExplorer.tsx       # Visual map of physical slots and racks
```

## 🛠️ Requirements & Dependencies

To use this module, your React project must have the following dependencies installed:

```bash
# Core Routing & API State
npm install @tanstack/react-query @supabase/supabase-js react-router-dom lucide-react class-variance-authority tailwind-merge clsx

# UI Components (Shadcn / Radix UI)
npm install @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-slot
```

### Required Shared Utilities
- **Supabase Client**: The module expects a initialized Supabase client exported as `supabase` from `@/lib/supabase` (e.g. `import { supabase } from '@/lib/supabase'`).
- **Tailwind class merging utility**: The module expects a standard class merging utility `cn` from `@/lib/utils` (e.g. `import { cn } from '@/lib/utils'`).

---

## 🚀 Integration Guide

### Step 1: Database Setup
Execute the contents of `schema.sql` inside your Supabase SQL Editor. This will set up the:
- Tables: `products`, `locations`, `inventory`, `inventory_logs`.
- Views: `v_stock_by_location`, `v_total_stock`.
- RLS policies (adjust to your project's authorization roles).
- Supabase Realtime tracking on the `inventory` table.

### Step 2: Copy the Module
Copy the entire `inventory` folder and paste it into your project under `src/modules/inventory` (or any location of your choice).

### Step 3: Register Routes
Open your router configuration (usually `src/App.tsx`) and register the following routes:

```tsx
import { InventoryLayout } from './modules/inventory/layouts/InventoryLayout';
import { InventoryDashboard } from './modules/inventory/pages/InventoryDashboard';
import { RackExplorer } from './modules/inventory/pages/RackExplorer';
import { ProductDetail } from './modules/inventory/pages/ProductDetail';

// Register under your main Router / Routes
<Route path="/admin/inventory" element={<InventoryLayout />}>
  <Route index element={<InventoryDashboard />} />
  <Route path="warehouse/:warehouseId" element={<RackExplorer />} />
  <Route path="product/:productId" element={<ProductDetail />} />
</Route>
```

### Step 4: Link Navigation
Add a navigation link in your Sidebar or Header component:

```tsx
import { Warehouse } from 'lucide-react';

{ name: "Inventario", href: "/admin/inventory", icon: Warehouse }
```
