-- Inventory Module Database Schema
-- Run this in your Supabase SQL Editor to initialize the inventory tables and security policies.

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  part_number text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse text NOT NULL,
  aisle text,
  rack text,
  section text,
  level text,
  position text,
  UNIQUE(warehouse, aisle, rack, section, level, position)
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE RESTRICT,
  quantity integer DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  quantity_change integer NOT NULL,
  previous_quantity integer,
  new_quantity integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 2. Create Views
CREATE OR REPLACE VIEW public.v_stock_by_location AS
SELECT 
  p.part_number,
  i.quantity,
  l.warehouse,
  l.aisle,
  l.rack,
  l.section,
  l.level,
  i.updated_at
FROM public.inventory i
JOIN public.products p ON i.product_id = p.id
JOIN public.locations l ON i.location_id = l.id;

CREATE OR REPLACE VIEW public.v_total_stock AS
SELECT 
  p.part_number,
  SUM(i.quantity) AS total_quantity,
  COUNT(i.location_id) AS occupied_slots
FROM public.inventory i
JOIN public.products p ON i.product_id = p.id
GROUP BY p.part_number;

-- 3. Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- Note: These policies assume the existence of a helper function `public.get_user_role()` returning 'admin' or 'operator'.
-- Adapt the policies below if your project handles role check differently.
DO $$
BEGIN
  -- Products Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admin full access inventory') THEN
    CREATE POLICY "Admin full access inventory" ON public.products FOR ALL USING (public.get_user_role() = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Operator read access inventory') THEN
    CREATE POLICY "Operator read access inventory" ON public.products FOR SELECT USING (public.get_user_role() = 'operator');
  END IF;

  -- Locations Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Admin full access locations') THEN
    CREATE POLICY "Admin full access locations" ON public.locations FOR ALL USING (public.get_user_role() = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Operator read access locations') THEN
    CREATE POLICY "Operator read access locations" ON public.locations FOR SELECT USING (public.get_user_role() = 'operator');
  END IF;

  -- Inventory Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Admin full access inventory_qty') THEN
    CREATE POLICY "Admin full access inventory_qty" ON public.inventory FOR ALL USING (public.get_user_role() = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Operator access inventory_qty') THEN
    CREATE POLICY "Operator access inventory_qty" ON public.inventory FOR SELECT USING (public.get_user_role() = 'operator');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Operator update inventory_qty') THEN
    CREATE POLICY "Operator update inventory_qty" ON public.inventory FOR UPDATE USING (public.get_user_role() = 'operator');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Operator insert inventory_qty') THEN
    CREATE POLICY "Operator insert inventory_qty" ON public.inventory FOR INSERT WITH CHECK (public.get_user_role() = 'operator');
  END IF;

  -- Inventory Logs Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_logs' AND policyname = 'Admin full access inventory_logs') THEN
    CREATE POLICY "Admin full access inventory_logs" ON public.inventory_logs FOR ALL USING (public.get_user_role() = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_logs' AND policyname = 'Operator insert inventory_logs') THEN
    CREATE POLICY "Operator insert inventory_logs" ON public.inventory_logs FOR INSERT WITH CHECK (public.get_user_role() = 'operator');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_logs' AND policyname = 'Operator read inventory_logs') THEN
    CREATE POLICY "Operator read inventory_logs" ON public.inventory_logs FOR SELECT USING (public.get_user_role() = 'operator');
  END IF;
END
$$;

-- 4. Enable Realtime updates for inventory table
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
