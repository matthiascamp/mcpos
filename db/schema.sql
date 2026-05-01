-- Crisp POS — Local SQLite Schema
-- This is the offline-first database that lives on each register.
-- All reads/writes hit this DB. A sync queue pushes changes to Supabase.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─── Products ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  colour      TEXT DEFAULT '#10b981',
  active      INTEGER DEFAULT 1,
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  barcode     TEXT,
  plu         TEXT,
  name        TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  price       REAL NOT NULL DEFAULT 0,
  cost_price  REAL DEFAULT 0,
  unit        TEXT DEFAULT 'each',  -- each | kg | 100g | litre
  tax_rate    REAL DEFAULT 0.10,    -- GST 10%
  track_stock INTEGER DEFAULT 0,
  stock_qty   REAL DEFAULT 0,
  active      INTEGER DEFAULT 1,
  image_url   TEXT,
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_plu ON products(plu);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- ─── Specials & Deals ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS specials (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id),
  special_price REAL NOT NULL,
  start_date  TEXT,
  end_date    TEXT,
  active      INTEGER DEFAULT 1,
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deals (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,  -- mix_match | buy_x_get_y | combo | discount_pct | discount_amt
  config      TEXT NOT NULL,  -- JSON: trigger conditions and reward
  start_date  TEXT,
  end_date    TEXT,
  active      INTEGER DEFAULT 1,
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deal_products (
  deal_id     TEXT NOT NULL REFERENCES deals(id),
  product_id  TEXT NOT NULL REFERENCES products(id),
  role        TEXT DEFAULT 'trigger',  -- trigger | reward
  PRIMARY KEY (deal_id, product_id)
);

-- ─── Staff ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  pin         TEXT NOT NULL,
  role        TEXT DEFAULT 'cashier',  -- cashier | manager | admin
  active      INTEGER DEFAULT 1,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─── Transactions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id            TEXT PRIMARY KEY,
  register_id   TEXT NOT NULL,
  staff_id      TEXT REFERENCES staff(id),
  customer_name TEXT,
  subtotal      REAL NOT NULL DEFAULT 0,
  tax           REAL NOT NULL DEFAULT 0,
  discount      REAL NOT NULL DEFAULT 0,
  total         REAL NOT NULL DEFAULT 0,
  status        TEXT DEFAULT 'completed',  -- completed | voided | refunded | parked
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id              TEXT PRIMARY KEY,
  transaction_id  TEXT NOT NULL REFERENCES transactions(id),
  product_id      TEXT REFERENCES products(id),
  name            TEXT NOT NULL,
  qty             REAL NOT NULL DEFAULT 1,
  unit_price      REAL NOT NULL,
  discount        REAL DEFAULT 0,
  line_total      REAL NOT NULL,
  tax             REAL DEFAULT 0,
  deal_id         TEXT REFERENCES deals(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY,
  transaction_id  TEXT NOT NULL REFERENCES transactions(id),
  method          TEXT NOT NULL,  -- cash | card | eftpos | account
  amount          REAL NOT NULL,
  reference       TEXT,           -- Tyro transaction ref / card last 4
  created_at      TEXT DEFAULT (datetime('now'))
);

-- ─── Cash Management ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_drawer (
  id          TEXT PRIMARY KEY,
  register_id TEXT NOT NULL,
  staff_id    TEXT REFERENCES staff(id),
  action      TEXT NOT NULL,  -- open | close | float | pickup | drop
  amount      REAL,
  note        TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── Sync Queue ─────────────────────────────────────────────────────────────
-- Every local write appends here. The sync engine reads and pushes to Supabase.

CREATE TABLE IF NOT EXISTS sync_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  action      TEXT NOT NULL,  -- insert | update | delete
  payload     TEXT NOT NULL,  -- JSON of the row
  synced      INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_pending ON sync_queue(synced) WHERE synced = 0;

-- ─── Settings ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('store_name', 'Crisp on Creek'),
  ('store_address', '1832 Logan Rd, Mt Gravatt QLD 4122'),
  ('store_phone', ''),
  ('store_abn', ''),
  ('receipt_header', 'Crisp on Creek\n1832 Logan Rd, Mt Gravatt\nFresh Fruit & Veg'),
  ('receipt_footer', 'Thank you for shopping local!\nOpen 6am - 7pm every day'),
  ('register_id', 'LANE01'),
  ('tax_name', 'GST'),
  ('tax_rate', '0.10'),
  ('layout_v3_shifted', '1'),
  ('nav_buttons_fixed', '1');

-- ─── Sample Categories & Products ─────────────────────────────────────────

INSERT OR IGNORE INTO categories (id, name, sort_order, colour) VALUES
  ('cat-fruit',    'Fruit',              1, '#e8a020'),
  ('cat-veg',      'Vegetables',         2, '#409850'),
  ('cat-meat',     'Meat',               3, '#d87868'),
  ('cat-dairy',    'Dairy',              4, '#78b8d0'),
  ('cat-bread',    'Bread & Croissants', 5, '#98c030'),
  ('cat-deli',     'Deli',               6, '#a868b8'),
  ('cat-flowers',  'Flowers',            7, '#4880c0'),
  ('cat-cheese',   'Cheese',             8, '#c8c4bc'),
  ('cat-coffee',   'Coffee',             9, '#6b4226'),
  ('cat-nuts',     'Nuts',              10, '#b0a060'),
  ('cat-grocery',  'Grocery',           11, '#484848'),
  ('cat-gas',      'Gas',               12, '#b0b0b0');

INSERT OR IGNORE INTO products (id, barcode, plu, name, category_id, price, cost_price, unit, tax_rate, track_stock, image_url) VALUES
  ('p-banana',      '4011',     '4011',  'Bananas',            'cat-fruit', 3.99, 1.50, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banana-Single.jpg/150px-Banana-Single.jpg'),
  ('p-apple-rg',    '4015',     '4015',  'Royal Gala Apples',  'cat-fruit', 5.99, 2.80, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/150px-Red_Apple.jpg'),
  ('p-apple-gsmith','4017',     '4017',  'Granny Smith Apples','cat-fruit', 5.49, 2.50, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Granny_smith_apple.jpg/150px-Granny_smith_apple.jpg'),
  ('p-orange-navel','4012',     '4012',  'Navel Oranges',      'cat-fruit', 4.99, 2.00, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Orange_%28Fruit%29.jpg/150px-Orange_%28Fruit%29.jpg'),
  ('p-strawberry',  '4505',     '4505',  'Strawberries Punnet','cat-fruit', 4.50, 2.00, 'each', 0.00, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/PerfectStrawberry.jpg/150px-PerfectStrawberry.jpg'),
  ('p-avocado',     '4046',     '4046',  'Avocado Hass',       'cat-fruit', 2.50, 1.20, 'each', 0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Avocado_with_cross_section_edit.jpg/150px-Avocado_with_cross_section_edit.jpg'),
  ('p-mango',       '4051',     '4051',  'Mangoes',            'cat-fruit', 3.50, 1.50, 'each', 0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Hapus_Mango.jpg/150px-Hapus_Mango.jpg'),
  ('p-watermelon',  '4032',     '4032',  'Watermelon',         'cat-fruit', 1.99, 0.80, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Watermelon-garden.jpg/150px-Watermelon-garden.jpg'),
  ('p-tomato',      '4087',     '4087',  'Tomatoes',           'cat-veg',   5.99, 2.50, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/150px-Tomato_je.jpg'),
  ('p-potato',      '4072',     '4072',  'Potatoes Washed',    'cat-veg',   3.99, 1.50, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Patates.jpg/150px-Patates.jpg'),
  ('p-onion-brown', '4082',     '4082',  'Brown Onions',       'cat-veg',   2.99, 1.00, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Onion_on_White.JPG/150px-Onion_on_White.JPG'),
  ('p-carrot',      '4562',     '4562',  'Carrots',            'cat-veg',   2.49, 0.80, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Vegetable-Carrot-Bundle-Small.jpg/150px-Vegetable-Carrot-Bundle-Small.jpg'),
  ('p-broccoli',    '4060',     '4060',  'Broccoli',           'cat-veg',   5.99, 2.50, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Broccoli_and_cross_section_edit.jpg/150px-Broccoli_and_cross_section_edit.jpg'),
  ('p-lettuce',     '4061',     '4061',  'Iceberg Lettuce',    'cat-veg',   2.99, 1.20, 'each', 0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Iceberg_lettuce_in_SB.jpg/150px-Iceberg_lettuce_in_SB.jpg'),
  ('p-capsicum-r',  '4088',     '4088',  'Red Capsicum',       'cat-veg',  12.99, 5.00, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Red_bell_pepper.jpg/150px-Red_bell_pepper.jpg'),
  ('p-mushroom',    '4065',     '4065',  'Cup Mushrooms',      'cat-veg',  12.99, 6.00, 'kg',   0.00, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Agaricus_campestris.jpg/150px-Agaricus_campestris.jpg'),
  ('p-chicken-breast','2001001','20010', 'Chicken Breast',     'cat-meat', 12.99, 7.00, 'kg',   0.00, 0, NULL),
  ('p-mince-beef',  '2001002',  '20011', 'Beef Mince 500g',   'cat-meat',  8.99, 5.00, 'each', 0.00, 1, NULL),
  ('p-sausages',    '2001003',  '20012', 'Beef Sausages 500g', 'cat-meat',  7.99, 4.00, 'each', 0.00, 1, NULL),
  ('p-milk-2l',     '9310036071037',NULL,'Full Cream Milk 2L', 'cat-dairy', 3.60, 2.20, 'each', 0.00, 1, NULL),
  ('p-eggs-12',     '9332022008001',NULL,'Free Range Eggs 12pk','cat-dairy',6.50, 3.50, 'each', 0.00, 1, NULL),
  ('p-butter',      '9300617003205',NULL,'Butter 250g',        'cat-dairy', 4.50, 2.80, 'each', 0.00, 1, NULL),
  ('p-sourdough',   NULL,        NULL,   'Sourdough Loaf',     'cat-bread', 7.50, 3.50, 'each', 0.00, 1, NULL),
  ('p-croissant',   NULL,        NULL,   'Croissant',          'cat-bread', 4.50, 1.80, 'each', 0.00, 1, NULL),
  ('p-baguette',    NULL,        NULL,   'Baguette',           'cat-bread', 5.00, 2.00, 'each', 0.00, 1, NULL),
  ('p-coffee-reg',  NULL,        NULL,   'Regular Coffee',     'cat-coffee',4.50, 1.50, 'each', 0.00, 0, NULL),
  ('p-coffee-lg',   NULL,        NULL,   'Large Coffee',       'cat-coffee',5.50, 1.80, 'each', 0.00, 0, NULL),
  ('p-flat-white',  NULL,        NULL,   'Flat White',         'cat-coffee',5.00, 1.60, 'each', 0.00, 0, NULL),
  ('p-cheddar',     NULL,        NULL,   'Cheddar Cheese',     'cat-cheese',12.99, 7.00,'kg',   0.00, 0, NULL),
  ('p-brie',        NULL,        NULL,   'Brie Wheel',         'cat-cheese', 8.99, 4.50,'each', 0.00, 1, NULL),
  ('p-roses',       NULL,        NULL,   'Rose Bunch',         'cat-flowers',15.00, 8.00,'each',0.00, 1, NULL),
  ('p-mixed-bunch', NULL,        NULL,   'Mixed Flower Bunch', 'cat-flowers',12.00, 6.00,'each',0.00, 1, NULL),
  ('p-mixed-nuts',  NULL,        NULL,   'Mixed Nuts 250g',    'cat-nuts',   8.99, 4.50, 'each',0.10, 1, NULL),
  ('p-cashews',     NULL,        NULL,   'Cashews 200g',       'cat-nuts',  10.99, 6.00, 'each',0.10, 1, NULL),
  ('p-bag-reusable',NULL,        NULL,   'Reusable Bag',       'cat-grocery',0.15, 0.05, 'each',0.10, 0, NULL);

-- ─── Keyboard Layout ───────────────────────────────────────────────────────
-- Configurable POS buttons. Rendered dynamically on the register screen.

CREATE TABLE IF NOT EXISTS keyboard_buttons (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  type            TEXT NOT NULL,  -- product: open_price|fixed_price|section|nav  function: void|return|hold|nosale|supervisor|lock|reprint|pricecheck|errcorrect|recall|pctdiscount|pctone|movedrawer|ubereats  numpad: digit|clear|qtyx|codeenter  payment: subtotal|pay_cash|pay_card|park  nav: page_link|back_home
  price           REAL DEFAULT 0,
  image           TEXT,
  color           TEXT DEFAULT '#fff',
  bg_color        TEXT DEFAULT '#1B4332',
  parent_id       TEXT,
  category_filter TEXT,
  alpha_range     TEXT,
  sort_order      INTEGER DEFAULT 0,
  position        TEXT DEFAULT 'main',  -- main | bottom (legacy)
  page            INTEGER DEFAULT 1,
  grid_row        INTEGER DEFAULT 0,
  grid_col        INTEGER DEFAULT 0,
  col_span        INTEGER DEFAULT 1,
  row_span        INTEGER DEFAULT 1,
  active          INTEGER DEFAULT 1,
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- Default Page 1 layout — matches Profit Track register
-- Row 0-1: Function buttons (10 cols)
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter) VALUES
  ('fn-lock',       '🔒',             'lock',        '#000', '#dddddd', 1,  'grid', 1, 0, 0, 1, 1, NULL),
  ('fn-supervisor', 'SUPERVISOR ONLY', 'supervisor',  '#000', '#dddddd', 2,  'grid', 1, 0, 1, 1, 1, NULL),
  ('fn-return',     'RETURN',          'return',      '#000', '#dddddd', 3,  'grid', 1, 0, 2, 1, 1, NULL),
  ('fn-void',       'VOID',           'void',        '#fff', '#4466aa', 4,  'grid', 1, 0, 3, 2, 1, NULL),
  ('fn-hold',       'Hold Sale',      'hold',        '#000', '#dddddd', 5,  'grid', 1, 0, 5, 1, 1, NULL),
  ('fn-nosale',     'NO SALE',        'nosale',      '#000', '#dddddd', 6,  'grid', 1, 0, 6, 1, 1, NULL),
  ('fn-viewor',     'VIEW OR...',     'viewor',      '#000', '#dddddd', 7,  'grid', 1, 0, 7, 1, 1, NULL),
  ('fn-pricecheck', 'PRICE CHECK',    'pricecheck',  '#000', '#dddddd', 8,  'grid', 1, 0, 8, 2, 2, NULL),
  ('fn-reprint',    'REPRINT',        'reprint',     '#000', '#dddddd', 9,  'grid', 1, 1, 0, 1, 1, NULL),
  ('fn-pctdisc',    '% DISCOUNT',     'pctdiscount', '#000', '#d8a820', 10, 'grid', 1, 1, 1, 1, 1, NULL),
  ('fn-pctone',     '% ONE ITEM',     'pctone',      '#fff', '#d8a820', 11, 'grid', 1, 1, 2, 1, 1, NULL),
  ('fn-movedrawer', 'MOVE DRAWER',    'movedrawer',  '#fff', '#e07020', 12, 'grid', 1, 1, 3, 1, 1, NULL),
  ('fn-errcorrect', 'ERROR CORRECT',  'errcorrect',  '#000', '#dddddd', 13, 'grid', 1, 1, 4, 1, 1, NULL),
  ('fn-recall',     'Recall Sale',    'recall',      '#000', '#dddddd', 14, 'grid', 1, 1, 5, 1, 1, NULL),
  ('fn-ubereats',   'UBER EATS ADJ',  'ubereats',    '#000', '#dddddd', 15, 'grid', 1, 1, 6, 1, 1, NULL);

-- Row 2-5: Department buttons (cols 3-5, cart occupies 0-2) + Numpad (cols 6-9)
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, price, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter) VALUES
  ('btn-meat',    'MEAT',              'section',     0,    '#fff', '#d87868', 20, 'grid', 1, 2, 3, 1, 1, 'Meat'),
  ('btn-coffee',  'COFFEE',            'section',     0,    '#000', '#78b8d0', 21, 'grid', 1, 2, 4, 1, 1, 'Coffee'),
  ('btn-fv',      'FRUIT & VEG',       'open_price',  0,    '#fff', '#409850', 22, 'grid', 1, 2, 5, 1, 1, NULL),
  ('btn-cheese',  'CHEESE',            'section',     0,    '#000', '#c8c4bc', 23, 'grid', 1, 3, 3, 1, 1, 'Cheese'),
  ('btn-flowers', 'FLOWERS',           'section',     0,    '#fff', '#4880c0', 24, 'grid', 1, 3, 4, 1, 1, 'Flowers'),
  ('btn-fvsect',  'FRUIT & VEG',       'section',     0,    '#fff', '#409850', 29, 'grid', 1, 3, 5, 1, 1, 'Fruit'),
  ('btn-bread',   'BREAD &\nCROISSAN', 'section',     0,    '#000', '#98c030', 25, 'grid', 1, 4, 4, 1, 1, 'Bread & Croissants'),
  ('btn-fvkg',    'FRUIT & VEG\n/KG',  'open_price',  0,    '#fff', '#2d6a4f', 26, 'grid', 1, 4, 5, 1, 1, NULL),
  ('btn-bags',    'BAG',               'fixed_price', 0.15, '#fff', '#222222', 27, 'grid', 1, 5, 3, 1, 1, NULL),
  ('btn-gas',     'GAS',               'section',     0,    '#000', '#b0b0b0', 28, 'grid', 1, 5, 4, 1, 1, 'Gas'),
  ('btn-deli',    'DELI',              'section',     0,    '#fff', '#c8a828', 30, 'grid', 1, 5, 5, 1, 1, 'Deli');

-- Numpad buttons (rows 2-5, cols 6-9)
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter) VALUES
  ('np-7',     '7',          'digit',     '#000', '#ffffff', 31, 'grid', 1, 2, 6, 1, 1, '7'),
  ('np-8',     '8',          'digit',     '#000', '#ffffff', 32, 'grid', 1, 2, 7, 1, 1, '8'),
  ('np-9',     '9',          'digit',     '#000', '#ffffff', 33, 'grid', 1, 2, 8, 1, 1, '9'),
  ('np-qtyx',  'QTY X',      'qtyx',      '#fff', '#e07020', 34, 'grid', 1, 2, 9, 1, 1, NULL),
  ('np-4',     '4',          'digit',     '#000', '#ffffff', 35, 'grid', 1, 3, 6, 1, 1, '4'),
  ('np-5',     '5',          'digit',     '#000', '#ffffff', 36, 'grid', 1, 3, 7, 1, 1, '5'),
  ('np-6',     '6',          'digit',     '#000', '#ffffff', 37, 'grid', 1, 3, 8, 1, 1, '6'),
  ('np-clear', 'CLEAR',      'clear',     '#000', '#eeeeee', 38, 'grid', 1, 3, 9, 1, 1, NULL),
  ('np-1',     '1',          'digit',     '#000', '#ffffff', 39, 'grid', 1, 4, 6, 1, 1, '1'),
  ('np-2',     '2',          'digit',     '#000', '#ffffff', 40, 'grid', 1, 4, 7, 1, 1, '2'),
  ('np-3',     '3',          'digit',     '#000', '#ffffff', 41, 'grid', 1, 4, 8, 1, 1, '3'),
  ('np-0',     '0',          'digit',     '#000', '#ffffff', 42, 'grid', 1, 5, 6, 1, 1, '0'),
  ('np-00',    '00',         'digit',     '#000', '#ffffff', 43, 'grid', 1, 5, 7, 1, 1, '00'),
  ('np-enter', 'CODE\nENTER','codeenter', '#000', '#eeeeee', 45, 'grid', 1, 5, 9, 1, 1, NULL);

-- Row 6: Bottom navigation
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, category_filter, alpha_range) VALUES
  ('btn-grocery',  'GROCERY',   'page_link','#fff', '#6699cc', 50, 'grid', 1, 6, 0, 2, 1, '6',  NULL, NULL),
  ('btn-nuts',     'NUTS',      'nav',      '#000', '#c8b880', 51, 'grid', 1, 6, 2, 1, 1, NULL, 'Nuts', NULL),
  ('btn-fruit-am', 'FRUIT A-M', 'page_link','#000', '#c8a828', 53, 'grid', 1, 6, 4, 1, 1, '2',  NULL, NULL),
  ('btn-fruit-nz', 'FRUIT N-Z', 'page_link','#000', '#c8a828', 54, 'grid', 1, 6, 5, 1, 1, '3',  NULL, NULL),
  ('btn-veg-ag',   'VEGE A-G',  'page_link','#fff', '#409850', 55, 'grid', 1, 6, 6, 1, 1, '4',  NULL, NULL),
  ('btn-veg-hz',   'VEGE H-Z',  'page_link','#fff', '#409850', 56, 'grid', 1, 6, 7, 1, 1, '5',  NULL, NULL),
  ('btn-subtotal', 'SUB TOTAL', 'subtotal', '#fff', '#cc1818', 57, 'grid', 1, 6, 8, 2, 1, NULL, NULL, NULL);

-- ═══ Page 2: Fruit A-M ══════════════════════════════════════════════
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id) VALUES
  ('pg2-apples',       'APPLES\n$5.99/kg',          'open_price', 5.99,  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/150px-Red_Apple.jpg', '#000', '#ffffff', 1,  'grid', 2, 0, 0, 1, 1, NULL),
  ('pg2-apricots',     'APRICOTS\n$12.99/kg',       'open_price', 12.99, NULL, '#000', '#ffffff', 2,  'grid', 2, 0, 1, 1, 1, NULL),
  ('pg2-avocados',     'AVOCADOS\n$2.50 ea',        'open_price', 2.50,  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Avocado_with_cross_section_edit.jpg/150px-Avocado_with_cross_section_edit.jpg', '#000', '#ffffff', 3,  'grid', 2, 0, 2, 1, 1, NULL),
  ('pg2-bananas',      'BANANAS\n$3.99/kg',         'open_price', 3.99,  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banana-Single.jpg/150px-Banana-Single.jpg', '#000', '#ffffff', 4,  'grid', 2, 0, 3, 1, 1, NULL),
  ('pg2-cherries',     'CHERRIES KG\n$14.99/kg',    'open_price', 14.99, NULL, '#000', '#ffffff', 5,  'grid', 2, 0, 4, 1, 1, NULL),
  ('pg2-coconut',      'COCONUT EA\n$4.99 ea',      'open_price', 4.99,  NULL, '#000', '#ffffff', 6,  'grid', 2, 0, 5, 1, 1, NULL),
  ('pg2-custard-apple','CUSTARD APPLE KG\n$6.99/kg','open_price', 6.99,  NULL, '#000', '#ffffff', 7,  'grid', 2, 1, 0, 1, 1, NULL),
  ('pg2-dragon-fruit', 'DRAGON FRUIT KG\n$14.99/kg','open_price', 14.99, NULL, '#000', '#ffffff', 8,  'grid', 2, 1, 1, 1, 1, NULL),
  ('pg2-figs',         'FIGS KG\n$19.99/kg',        'open_price', 19.99, NULL, '#000', '#ffffff', 9,  'grid', 2, 1, 2, 1, 1, NULL),
  ('pg2-grapes',       'GRAPES\n$7.99/kg',          'open_price', 7.99,  NULL, '#000', '#ffffff', 10, 'grid', 2, 1, 3, 1, 1, NULL),
  ('pg2-grapefruit',   'GRAPEFRUIT KG\n$4.99/kg',   'open_price', 4.99,  NULL, '#000', '#ffffff', 11, 'grid', 2, 1, 4, 1, 1, NULL),
  ('pg2-guava',        'GUAVA KG\n$8.99/kg',        'open_price', 8.99,  NULL, '#000', '#ffffff', 12, 'grid', 2, 2, 0, 1, 1, NULL),
  ('pg2-kiwi',         'KIWI FRUITS\n$2.00 ea',     'open_price', 2.00,  NULL, '#000', '#ffffff', 13, 'grid', 2, 2, 1, 1, 1, NULL),
  ('pg2-lemons',       'LEMONS\n$8.99/kg',          'open_price', 8.99,  NULL, '#000', '#ffffff', 14, 'grid', 2, 2, 2, 1, 1, NULL),
  ('pg2-limes',        'LIMES\n$1.50 ea',           'open_price', 1.50,  NULL, '#000', '#ffffff', 15, 'grid', 2, 2, 3, 1, 1, NULL),
  ('pg2-longan',       'LONGAN KG\n$12.99/kg',      'open_price', 12.99, NULL, '#000', '#ffffff', 16, 'grid', 2, 2, 4, 1, 1, NULL),
  ('pg2-lychee',       'LYCHEE KG\n$14.99/kg',      'open_price', 14.99, NULL, '#000', '#ffffff', 17, 'grid', 2, 2, 5, 1, 1, NULL),
  ('pg2-mandarins',    'MANDARINS\n$5.99/kg',       'open_price', 5.99,  NULL, '#000', '#ffffff', 18, 'grid', 2, 3, 0, 1, 1, NULL),
  ('pg2-mangoes',      'MANGOES\n$3.50 ea',         'open_price', 3.50,  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Hapus_Mango.jpg/150px-Hapus_Mango.jpg', '#000', '#ffffff', 19, 'grid', 2, 3, 1, 1, 1, NULL),
  ('pg2-melons',       'MELONS\n$3.99/kg',          'open_price', 3.99,  NULL, '#000', '#ffffff', 20, 'grid', 2, 3, 2, 1, 1, NULL),
  ('pg2-back',         'BACK',                      'back_home',  0,     NULL, '#000', '#22c55e', 90, 'grid', 2, 0, 7, 3, 1, NULL),
  ('pg2-veg-menu',     'Vegetable\nMenu',           'page_link',  0,     NULL, '#000', '#86efac', 91, 'grid', 2, 1, 7, 3, 1, '4'),
  ('pg2-next-fruit',   'NEXT\nKEYBOARD\nFRUIT>',    'page_link',  0,     NULL, '#000', '#86efac', 92, 'grid', 2, 2, 7, 3, 2, '3');

-- ═══ Page 3: Fruit N-Z ══════════════════════════════════════════════
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id) VALUES
  ('pg3-nectarines',   'NECTARINES\n$7.99/kg',      'open_price', 7.99,  NULL, '#000', '#ffffff', 1,  'grid', 3, 0, 0, 1, 1, NULL),
  ('pg3-oranges',      'ORANGES\n$4.99/kg',         'open_price', 4.99,  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Orange_%28Fruit%29.jpg/150px-Orange_%28Fruit%29.jpg', '#000', '#ffffff', 2,  'grid', 3, 0, 1, 1, 1, NULL),
  ('pg3-passion-fruit','PASSION FRUIT EA\n$1.50 ea','open_price', 1.50,  NULL, '#000', '#ffffff', 3,  'grid', 3, 0, 2, 1, 1, NULL),
  ('pg3-papaya',       'PAPAYA RED KG\n$5.99/kg',   'open_price', 5.99,  NULL, '#000', '#ffffff', 4,  'grid', 3, 0, 3, 1, 1, NULL),
  ('pg3-pawpaw',       'PAW PAW GREEN KG\n$4.99/kg','open_price', 4.99,  NULL, '#000', '#ffffff', 5,  'grid', 3, 0, 4, 1, 1, NULL),
  ('pg3-peaches',      'PEACHES\n$7.99/kg',         'open_price', 7.99,  NULL, '#000', '#ffffff', 6,  'grid', 3, 0, 5, 1, 1, NULL),
  ('pg3-pears',        'PEARS\n$5.99/kg',           'open_price', 5.99,  NULL, '#000', '#ffffff', 7,  'grid', 3, 1, 0, 1, 1, NULL),
  ('pg3-persimmons',   'PERSIMMONS KG\n$9.99/kg',   'open_price', 9.99,  NULL, '#000', '#ffffff', 8,  'grid', 3, 1, 1, 1, 1, NULL),
  ('pg3-pineapple-sm', 'SM PINEAPPLE EA\n$3.99 ea', 'open_price', 3.99,  NULL, '#000', '#ffffff', 9,  'grid', 3, 1, 2, 1, 1, NULL),
  ('pg3-pineapple-md', 'MED PINEAPPLE EA\n$4.99 ea','open_price', 4.99,  NULL, '#000', '#ffffff', 10, 'grid', 3, 1, 3, 1, 1, NULL),
  ('pg3-pineapple-xl', 'XL PINEAPPLE EA\n$6.99 ea', 'open_price', 6.99,  NULL, '#000', '#ffffff', 11, 'grid', 3, 1, 4, 1, 1, NULL),
  ('pg3-plums',        'PLUMS\n$9.99/kg',           'open_price', 9.99,  NULL, '#000', '#ffffff', 12, 'grid', 3, 1, 5, 1, 1, NULL),
  ('pg3-pomegranate',  'POMEGRANATE EA\n$3.99 ea',  'open_price', 3.99,  NULL, '#000', '#ffffff', 13, 'grid', 3, 2, 0, 1, 1, NULL),
  ('pg3-pommelo',      'POMMELO KG\n$6.99/kg',      'open_price', 6.99,  NULL, '#000', '#ffffff', 14, 'grid', 3, 2, 1, 1, 1, NULL),
  ('pg3-quince',       'QUINCE KG\n$7.99/kg',       'open_price', 7.99,  NULL, '#000', '#ffffff', 15, 'grid', 3, 2, 2, 1, 1, NULL),
  ('pg3-tangello',     'TANGELLO KG\n$4.99/kg',     'open_price', 4.99,  NULL, '#000', '#ffffff', 16, 'grid', 3, 2, 3, 1, 1, NULL),
  ('pg3-back',         'BACK',                      'back_home',  0,     NULL, '#000', '#22c55e', 90, 'grid', 3, 0, 7, 3, 1, NULL),
  ('pg3-prev-fruit',   '<BACK\nKEYBOARD\nFRUIT',    'page_link',  0,     NULL, '#000', '#86efac', 91, 'grid', 3, 2, 7, 3, 1, '2');

-- ═══ Page 4: Vegetables A-G ═════════════════════════════════════════
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id) VALUES
  ('pg4-asian-vege',   'ASIAN VEGE EA\n$3.99 ea',   'open_price', 3.99,  NULL, '#000', '#ffffff', 1,  'grid', 4, 0, 0, 1, 1, NULL),
  ('pg4-asparagus',    'ASPARAGUS EA\n$4.99 ea',    'open_price', 4.99,  NULL, '#000', '#ffffff', 2,  'grid', 4, 0, 1, 1, 1, NULL),
  ('pg4-beans',        'BEANS KG\n$9.99/kg',        'open_price', 9.99,  NULL, '#000', '#ffffff', 3,  'grid', 4, 0, 2, 1, 1, NULL),
  ('pg4-beetroot',     'BEETROOT\n$4.99/kg',         'open_price', 4.99,  NULL, '#000', '#ffffff', 4,  'grid', 4, 0, 3, 1, 1, NULL),
  ('pg4-bottle-gourd', 'BOTTLE GOURD\n$5.99/kg',    'open_price', 5.99,  NULL, '#000', '#ffffff', 5,  'grid', 4, 0, 4, 1, 1, NULL),
  ('pg4-broccoli',     'BROCCOLI\n$5.99/kg',        'open_price', 5.99,  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Broccoli_and_cross_section_edit.jpg/150px-Broccoli_and_cross_section_edit.jpg', '#000', '#ffffff', 6,  'grid', 4, 0, 5, 1, 1, NULL),
  ('pg4-brussels',     'BRUSSEL SPROUTS KG\n$12.99/kg','open_price',12.99,NULL,'#000', '#ffffff', 7,  'grid', 4, 1, 0, 1, 1, NULL),
  ('pg4-cabbage',      'CABBAGE\n$3.99 ea',         'open_price', 3.99,  NULL, '#000', '#ffffff', 8,  'grid', 4, 1, 1, 1, 1, NULL),
  ('pg4-capsicum',     'CAPSICUM\n$12.99/kg',       'open_price', 12.99, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Red_bell_pepper.jpg/150px-Red_bell_pepper.jpg', '#000', '#ffffff', 9,  'grid', 4, 1, 2, 1, 1, NULL),
  ('pg4-carrots',      'CARROTS LOOSE KG\n$2.49/kg','open_price', 2.49,  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Vegetable-Carrot-Bundle-Small.jpg/150px-Vegetable-Carrot-Bundle-Small.jpg', '#000', '#ffffff', 10, 'grid', 4, 1, 3, 1, 1, NULL),
  ('pg4-carrot-bag',   'CARROT BAG EA\n$2.99 ea',   'open_price', 2.99,  NULL, '#000', '#ffffff', 11, 'grid', 4, 1, 4, 1, 1, NULL),
  ('pg4-cauliflower',  'CAULIFLOWER EA\n$4.99 ea',  'open_price', 4.99,  NULL, '#000', '#ffffff', 12, 'grid', 4, 1, 5, 1, 1, NULL),
  ('pg4-celery',       'WHOLE CELERY EA\n$3.99 ea', 'open_price', 3.99,  NULL, '#000', '#ffffff', 13, 'grid', 4, 2, 0, 1, 1, NULL),
  ('pg4-celeriac',     'CELERIAC EA\n$5.99 ea',     'open_price', 5.99,  NULL, '#000', '#ffffff', 14, 'grid', 4, 2, 1, 1, 1, NULL),
  ('pg4-chillies',     'CHILLIES\n$29.99/kg',       'open_price', 29.99, NULL, '#000', '#ffffff', 15, 'grid', 4, 2, 2, 1, 1, NULL),
  ('pg4-chokos',       'CHOKOS KG\n$4.99/kg',       'open_price', 4.99,  NULL, '#000', '#ffffff', 16, 'grid', 4, 2, 3, 1, 1, NULL),
  ('pg4-corn',         'CORN EA\n$1.99 ea',         'open_price', 1.99,  NULL, '#000', '#ffffff', 17, 'grid', 4, 2, 4, 1, 1, NULL),
  ('pg4-cucumbers',    'CUCUMBERS\n$2.99 ea',       'open_price', 2.99,  NULL, '#000', '#ffffff', 18, 'grid', 4, 2, 5, 1, 1, NULL),
  ('pg4-eggplant',     'EGGPLANT KG\n$5.99/kg',     'open_price', 5.99,  NULL, '#000', '#ffffff', 19, 'grid', 4, 3, 0, 1, 1, NULL),
  ('pg4-leb-eggplant', 'LEB EGGPLANT KG\n$7.99/kg', 'open_price', 7.99,  NULL, '#000', '#ffffff', 20, 'grid', 4, 3, 1, 1, 1, NULL),
  ('pg4-fennel',       'FENNEL EA\n$4.99 ea',       'open_price', 4.99,  NULL, '#000', '#ffffff', 21, 'grid', 4, 3, 2, 1, 1, NULL),
  ('pg4-garlic',       'GARLIC\n$19.99/kg',         'open_price', 19.99, NULL, '#000', '#ffffff', 22, 'grid', 4, 3, 3, 1, 1, NULL),
  ('pg4-ginger',       'GINGER KG\n$24.99/kg',      'open_price', 24.99, NULL, '#000', '#ffffff', 23, 'grid', 4, 3, 4, 1, 1, NULL),
  ('pg4-back',         'BACK',                      'back_home',  0,     NULL, '#000', '#22c55e', 90, 'grid', 4, 0, 7, 3, 1, NULL),
  ('pg4-fruit-menu',   'FRUIT\nMENU',               'page_link',  0,     NULL, '#000', '#86efac', 91, 'grid', 4, 1, 7, 3, 1, '2'),
  ('pg4-next-veg',     'NEXT\nKEYBOARD\nVEGE>',     'page_link',  0,     NULL, '#000', '#86efac', 92, 'grid', 4, 2, 7, 3, 2, '5');

-- ═══ Page 5: Vegetables H-Z ═════════════════════════════════════════
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id) VALUES
  ('pg5-herbs',        'HERBS\n$2.99 ea',           'open_price', 2.99,  NULL, '#000', '#ffffff', 1,  'grid', 5, 0, 0, 1, 1, NULL),
  ('pg5-kale',         'KALE EA\n$3.99 ea',         'open_price', 3.99,  NULL, '#000', '#ffffff', 2,  'grid', 5, 0, 1, 1, 1, NULL),
  ('pg5-leeks',        'LEEKS EA\n$3.99 ea',        'open_price', 3.99,  NULL, '#000', '#ffffff', 3,  'grid', 5, 0, 2, 1, 1, NULL),
  ('pg5-lettuces',     'LETTUCES\n$2.99 ea',        'open_price', 2.99,  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Iceberg_lettuce_in_SB.jpg/150px-Iceberg_lettuce_in_SB.jpg', '#000', '#ffffff', 4,  'grid', 5, 0, 3, 1, 1, NULL),
  ('pg5-lettuce-bags', 'LETTUCE BAGS EA\n$3.99 ea', 'open_price', 3.99,  NULL, '#000', '#ffffff', 5,  'grid', 5, 0, 4, 1, 1, NULL),
  ('pg5-lobok',        'LOBOK KG\n$4.99/kg',        'open_price', 4.99,  NULL, '#000', '#ffffff', 6,  'grid', 5, 0, 5, 1, 1, NULL),
  ('pg5-mushrooms',    'MUSHROOMS\n$12.99/kg',      'open_price', 12.99, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Agaricus_campestris.jpg/150px-Agaricus_campestris.jpg', '#000', '#ffffff', 7,  'grid', 5, 1, 0, 1, 1, NULL),
  ('pg5-olives',       'OLIVES KG\n$14.99/kg',      'open_price', 14.99, NULL, '#000', '#ffffff', 8,  'grid', 5, 1, 1, 1, 1, NULL),
  ('pg5-onions',       'ONIONS\n$2.99/kg',          'open_price', 2.99,  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Onion_on_White.JPG/150px-Onion_on_White.JPG', '#000', '#ffffff', 9,  'grid', 5, 1, 2, 1, 1, NULL),
  ('pg5-parsnip',      'PARSNIP KG\n$7.99/kg',      'open_price', 7.99,  NULL, '#000', '#ffffff', 10, 'grid', 5, 1, 3, 1, 1, NULL),
  ('pg5-peas',         'PEAS KG\n$9.99/kg',         'open_price', 9.99,  NULL, '#000', '#ffffff', 11, 'grid', 5, 1, 4, 1, 1, NULL),
  ('pg5-potatoes',     'POTATOES\n$3.99/kg',        'open_price', 3.99,  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Patates.jpg/150px-Patates.jpg', '#000', '#ffffff', 12, 'grid', 5, 1, 5, 1, 1, NULL),
  ('pg5-pumpkins',     'PUMPKINS\n$2.99/kg',        'open_price', 2.99,  NULL, '#000', '#ffffff', 13, 'grid', 5, 2, 0, 1, 1, NULL),
  ('pg5-radish',       'RADISH BUNCH EA\n$2.99 ea', 'open_price', 2.99,  NULL, '#000', '#ffffff', 14, 'grid', 5, 2, 1, 1, 1, NULL),
  ('pg5-rhubarb',      'RHUBARB EA\n$4.99 ea',      'open_price', 4.99,  NULL, '#000', '#ffffff', 15, 'grid', 5, 2, 2, 1, 1, NULL),
  ('pg5-shallots',     'SHALLOTS EA\n$2.99 ea',     'open_price', 2.99,  NULL, '#000', '#ffffff', 16, 'grid', 5, 2, 3, 1, 1, NULL),
  ('pg5-silverbeet',   'SILVERBEET EA\n$3.99 ea',   'open_price', 3.99,  NULL, '#000', '#ffffff', 17, 'grid', 5, 2, 4, 1, 1, NULL),
  ('pg5-snow-peas',    'SNOW PEAS KG\n$14.99/kg',   'open_price', 14.99, NULL, '#000', '#ffffff', 18, 'grid', 5, 2, 5, 1, 1, NULL),
  ('pg5-sugar-snap',   'SUGAR SNAP PEAS KG\n$14.99/kg','open_price',14.99,NULL,'#000', '#ffffff', 19, 'grid', 5, 3, 0, 1, 1, NULL),
  ('pg5-swedes',       'SWEDES KG\n$4.99/kg',       'open_price', 4.99,  NULL, '#000', '#ffffff', 20, 'grid', 5, 3, 1, 1, 1, NULL),
  ('pg5-sweet-potato', 'SWEET POTATOES\n$4.99/kg',  'open_price', 4.99,  NULL, '#000', '#ffffff', 21, 'grid', 5, 3, 2, 1, 1, NULL),
  ('pg5-tomatoes',     'TOMATOES\n$5.99/kg',        'open_price', 5.99,  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/150px-Tomato_je.jpg', '#000', '#ffffff', 22, 'grid', 5, 3, 3, 1, 1, NULL),
  ('pg5-turnip',       'TURNIP KG\n$3.99/kg',       'open_price', 3.99,  NULL, '#000', '#ffffff', 23, 'grid', 5, 3, 4, 1, 1, NULL),
  ('pg5-zucchini',     'ZUCCHINI\n$5.99/kg',        'open_price', 5.99,  NULL, '#000', '#ffffff', 24, 'grid', 5, 3, 5, 1, 1, NULL),
  ('pg5-back',         'BACK',                      'back_home',  0,     NULL, '#000', '#22c55e', 90, 'grid', 5, 0, 7, 3, 1, NULL),
  ('pg5-fruit-menu',   'FRUIT\nMENU',               'page_link',  0,     NULL, '#000', '#86efac', 91, 'grid', 5, 1, 7, 3, 1, '2'),
  ('pg5-prev-veg',     '<BACK\nKEYBOARD\nVEG',      'page_link',  0,     NULL, '#000', '#86efac', 92, 'grid', 5, 2, 7, 3, 1, '4');

-- ═══ Page 6: Grocery ════════════════════════════════════════════════
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, category_filter) VALUES
  ('pg6-grocery',      'GROCERY',                   'section',    0,     NULL, '#fff', '#6699cc', 1,  'grid', 6, 0, 0, 2, 1, NULL, 'Grocery');
INSERT OR IGNORE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id) VALUES
  ('pg6-confectionary','CONFECTIONARY\n$0.00',       'open_price', 0,     NULL, '#000', '#ffffff', 2,  'grid', 6, 0, 2, 1, 1, NULL),
  ('pg6-chips',        'CHIPS\n$3.99 ea',           'open_price', 3.99,  NULL, '#000', '#ffffff', 3,  'grid', 6, 0, 3, 1, 1, NULL),
  ('pg6-pies',         'SIMPLY PIES\n$5.99 ea',     'open_price', 5.99,  NULL, '#000', '#ffffff', 4,  'grid', 6, 0, 4, 1, 1, NULL),
  ('pg6-water',        'WATER 12PK\n$6.99 ea',      'open_price', 6.99,  NULL, '#000', '#ffffff', 5,  'grid', 6, 0, 5, 1, 1, NULL),
  ('pg6-salmon',       'SALMON PIECES\n$7.99 ea',   'open_price', 7.99,  NULL, '#000', '#ffffff', 6,  'grid', 6, 1, 0, 1, 1, NULL),
  ('pg6-salmon-fillet','SALMON FILLET\n$12.99 ea',  'open_price', 12.99, NULL, '#000', '#ffffff', 7,  'grid', 6, 1, 1, 1, 1, NULL),
  ('pg6-fresh-juice',  'FRESH JUICE 500ML\n$4.99 ea','open_price',4.99,  NULL, '#000', '#ffffff', 8,  'grid', 6, 1, 2, 1, 1, NULL),
  ('pg6-juice-1l',     'JUICE 1L\n$6.99 ea',        'open_price', 6.99,  NULL, '#000', '#ffffff', 9,  'grid', 6, 1, 3, 1, 1, NULL),
  ('pg6-lemon-juice',  'LEMON JUICE 500ML\n$3.99 ea','open_price',3.99,  NULL, '#000', '#ffffff', 10, 'grid', 6, 1, 4, 1, 1, NULL),
  ('pg6-spices',       'ASSORTED SPICES\n$5.99 ea', 'open_price', 5.99,  NULL, '#000', '#ffffff', 11, 'grid', 6, 2, 0, 1, 1, NULL),
  ('pg6-pickles',      'MIXED PICKLES\n$6.99 ea',   'open_price', 6.99,  NULL, '#000', '#ffffff', 12, 'grid', 6, 2, 1, 1, 1, NULL),
  ('pg6-alt-milk',     'ALTERNATIVE MILK\n$4.99 ea','open_price', 4.99,  NULL, '#000', '#ffffff', 13, 'grid', 6, 2, 2, 1, 1, NULL),
  ('pg6-back',         'BACK',                      'back_home',  0,     NULL, '#000', '#22c55e', 90, 'grid', 6, 0, 7, 3, 1, NULL);
