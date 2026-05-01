const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pos', {
  // Products
  searchProducts:     (query)  => ipcRenderer.invoke('db:products:search', query),
  getProductByBarcode:(code)   => ipcRenderer.invoke('db:products:getByBarcode', code),
  getProductById:     (id)     => ipcRenderer.invoke('db:products:getById', id),
  getProductsByCategory:(catId)=> ipcRenderer.invoke('db:products:getByCategory', catId),
  getCategories:      ()       => ipcRenderer.invoke('db:categories:getAll'),
  upsertProduct:      (p)     => ipcRenderer.invoke('db:products:upsert', p),
  upsertCategory:     (c)     => ipcRenderer.invoke('db:categories:upsert', c),
  deleteProduct:      (id)     => ipcRenderer.invoke('db:products:delete', id),

  // Specials
  getSpecials:        ()      => ipcRenderer.invoke('db:specials:getAll'),
  upsertSpecial:      (s)     => ipcRenderer.invoke('db:specials:upsert', s),
  deleteSpecial:      (id)    => ipcRenderer.invoke('db:specials:delete', id),

  // Deals
  getDeals:           ()       => ipcRenderer.invoke('db:deals:getAll'),
  getActiveDeals:     ()       => ipcRenderer.invoke('db:deals:getActive'),
  upsertDeal:         (d)     => ipcRenderer.invoke('db:deals:upsert', d),
  deleteDeal:         (id)     => ipcRenderer.invoke('db:deals:delete', id),
  getDealProducts:    (id)     => ipcRenderer.invoke('db:deals:getProducts', id),
  setDealProducts:    (id, p)  => ipcRenderer.invoke('db:deals:setProducts', id, p),

  // Transactions
  saveTransaction:    (txn)   => ipcRenderer.invoke('db:transaction:save', txn),
  voidTransaction:    (id)    => ipcRenderer.invoke('db:transaction:void', id),
  refundTransaction:  (id)    => ipcRenderer.invoke('db:transaction:refund', id),
  getParkedSales:     ()      => ipcRenderer.invoke('db:transaction:getParked'),
  getTransactionItems:(id)    => ipcRenderer.invoke('db:transaction:getItems', id),
  getTransactionPayments:(id) => ipcRenderer.invoke('db:transaction:getPayments', id),
  deleteTransaction:  (id)    => ipcRenderer.invoke('db:transaction:delete', id),
  searchTransactions: (opts)  => ipcRenderer.invoke('db:transaction:search', opts),

  // Staff
  staffLogin:         (pin)   => ipcRenderer.invoke('db:staff:login', pin),
  getStaff:           ()      => ipcRenderer.invoke('db:staff:getAll'),
  getStaffWithPin:    (id)    => ipcRenderer.invoke('db:staff:getWithPin', id),
  upsertStaff:        (s)    => ipcRenderer.invoke('db:staff:upsert', s),

  // Settings
  getSetting:         (key)   => ipcRenderer.invoke('db:settings:get', key),
  getAllSettings:      ()      => ipcRenderer.invoke('db:settings:getAll'),
  setSetting:         (k, v)  => ipcRenderer.invoke('db:settings:set', k, v),

  // Sync
  getSyncPending:     ()      => ipcRenderer.invoke('db:sync:getPending'),
  markSynced:         (ids)   => ipcRenderer.invoke('db:sync:markSynced', ids),

  // Reports
  dailySummary:       (date)  => ipcRenderer.invoke('db:reports:dailySummary', date),
  topProducts:        (date)  => ipcRenderer.invoke('db:reports:topProducts', date),
  salesByHour:        (date)  => ipcRenderer.invoke('db:reports:salesByHour', date),
  salesByMethod:      (date)  => ipcRenderer.invoke('db:reports:salesByMethod', date),
  salesByCategory:    (date)  => ipcRenderer.invoke('db:reports:salesByCategory', date),
  voidRefundCount:    (date)  => ipcRenderer.invoke('db:reports:voidRefundCount', date),
  zReport:            (date)  => ipcRenderer.invoke('db:reports:zReport', date),

  // Keyboard Layout
  getKeyboardButtons: ()      => ipcRenderer.invoke('db:keyboard:getAll'),
  getButtonsByPage:   (page)  => ipcRenderer.invoke('db:keyboard:getByPage', page),
  getPages:           ()      => ipcRenderer.invoke('db:keyboard:getPages'),
  getAllButtons:       ()      => ipcRenderer.invoke('db:keyboard:getAllIncludingInactive'),
  upsertButton:       (btn)   => ipcRenderer.invoke('db:keyboard:upsert', btn),
  deleteButton:       (id)    => ipcRenderer.invoke('db:keyboard:delete', id),
  deletePage:         (page)  => ipcRenderer.invoke('db:keyboard:deletePage', page),

  // Import
  importProducts:     (data)  => ipcRenderer.invoke('db:import:products', data),

  // Hardware
  printReceipt:       (data)  => ipcRenderer.invoke('hardware:printReceipt', data),
  openDrawer:         ()      => ipcRenderer.invoke('hardware:openDrawer'),
  probeDevices:       ()      => ipcRenderer.invoke('hardware:probe'),

  // Cash Drawer
  logCashDrawer:      (entry) => ipcRenderer.invoke('db:cash_drawer:log', entry),
  getCashDrawerLog:   (date)  => ipcRenderer.invoke('db:cash_drawer:getLog', date),
  getCashDrawerSummary:(date) => ipcRenderer.invoke('db:cash_drawer:summary', date),

  // Stock
  getLowStock:        ()      => ipcRenderer.invoke('db:stock:lowStock'),
  adjustStock:        (id, qty, reason) => ipcRenderer.invoke('db:stock:adjust', id, qty, reason),

  // Window
  exitFullscreen:     ()      => ipcRenderer.invoke('window:exitFullscreen'),
  quit:               ()      => ipcRenderer.invoke('window:quit'),

  // LAN Sync
  getLanStatus:       ()           => ipcRenderer.invoke('lan:getStatus'),
  testLanConnection:  (ip, port)   => ipcRenderer.invoke('lan:testConnection', ip, port),
  restartLan:         ()           => ipcRenderer.invoke('lan:restart'),
})
