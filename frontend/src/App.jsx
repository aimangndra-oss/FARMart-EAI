import { useState, useEffect, useCallback } from 'react'

/* ─── Toast Component ───────────────────────────────── */
function Toast({ message, type, onClose }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(onClose, 250)
    }, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`toast toast-${type} ${exiting ? 'toast-exit' : ''}`}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
    </div>
  )
}

/* ─── Formatting Helpers ────────────────────────────── */
function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID')
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

/* ─── POS Page ──────────────────────────────────────── */
function POSPage() {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const fetchSales = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/sales')
      if (res.ok) {
        const data = await res.json()
        setSales(data)
      }
    } catch (err) {
      console.error('Failed to fetch sales:', err)
    }
  }, [])

  useEffect(() => { fetchSales() }, [fetchSales])

  const totalAmount = (Number(quantity) || 0) * (Number(price) || 0)
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
  const totalItems = sales.reduce((sum, s) => sum + Number(s.quantity || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productId || !quantity || !price) return
    setLoading(true)
    try {
      const res = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(productId),
          quantity: Number(quantity),
          price: Number(price)
        })
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ message: `Transaksi berhasil dicatat — ID #${data.saleId}`, type: 'success' })
        setProductId('')
        setQuantity('')
        setPrice('')
        fetchSales()
      } else {
        setToast({ message: data.error || 'Gagal memproses transaksi', type: 'error' })
      }
    } catch {
      setToast({ message: 'Tidak dapat terhubung ke POS Service', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Point of Sale</h1>
            <p className="page-subtitle">Buat transaksi penjualan dan lihat riwayat</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchSales}>
            <span className="btn-icon">↻</span> Refresh
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Transaksi</div>
            <div className="stat-value">{sales.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Pendapatan</div>
            <div className="stat-value">{formatRupiah(totalRevenue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Item Terjual</div>
            <div className="stat-value">{totalItems}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rata-rata / Transaksi</div>
            <div className="stat-value">{sales.length ? formatRupiah(Math.round(totalRevenue / sales.length)) : 'Rp 0'}</div>
          </div>
        </div>

        <div className="content-grid-wide content-grid">
          {/* Sales History */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Riwayat Penjualan</span>
              <span className="badge badge-neutral">{sales.length} record</span>
            </div>
            <div className="card-body-compact">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Produk</th>
                      <th>Qty</th>
                      <th>Harga</th>
                      <th>Total</th>
                      <th>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="table-empty">
                          <div className="table-empty-icon">📋</div>
                          <div className="table-empty-text">Belum ada transaksi</div>
                          <div className="table-empty-hint">Buat transaksi pertama Anda di panel kanan</div>
                        </td>
                      </tr>
                    ) : (
                      sales.map((s) => (
                        <tr key={s.id}>
                          <td className="table-mono">#{s.id}</td>
                          <td>Produk {s.product_id}</td>
                          <td>{s.quantity} pcs</td>
                          <td>{formatRupiah(s.price)}</td>
                          <td><span className="amount">{formatRupiah(s.total_amount)}</span></td>
                          <td className="text-secondary text-sm">{formatDate(s.created_at)} {formatTime(s.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* New Sale Form */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Transaksi Baru</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-8">
                  <label className="form-label">Product ID</label>
                  <input
                    className="form-input"
                    type="number"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="Contoh: 1"
                    required
                    min="1"
                  />
                  <span className="form-hint">Masukkan nomor ID produk dari inventory</span>
                </div>

                <div className="form-grid mb-8">
                  <div className="form-group">
                    <label className="form-label">Jumlah (Qty)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                      required
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harga Satuan</label>
                    <input
                      className="form-input"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="total-preview mb-8">
                  <span className="total-preview-label">Total Pembayaran</span>
                  <span className="total-preview-value">{formatRupiah(totalAmount)}</span>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{width: '100%'}}>
                  {loading ? <><div className="spinner"></div> Memproses...</> : 'Buat Transaksi'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

/* ─── Inventory Page ────────────────────────────────── */
function InventoryPage() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [adjustingProduct, setAdjustingProduct] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory/inventory')
      if (res.ok) {
        const data = await res.json()
        setInventory(data)
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const totalStock = inventory.reduce((sum, i) => sum + Number(i.current_stock || 0), 0)
  const lowStock = inventory.filter(i => i.current_stock < 20)

  function getStockBadge(stock) {
    if (stock >= 100) return <span className="badge badge-success">Tersedia</span>
    if (stock >= 20) return <span className="badge badge-warning">Menipis</span>
    if (stock > 0) return <span className="badge badge-danger">Kritis</span>
    return <span className="badge badge-danger">Habis</span>
  }

  const handleAdjustStock = async (productId) => {
    if (!adjustQty || isNaN(adjustQty)) {
      setToast({ message: 'Masukkan jumlah stok yang valid', type: 'error' })
      return
    }

    try {
      const res = await fetch('/api/inventory/inventory/adjust', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          stock_level: Number(adjustQty)
        })
      })

      if (res.ok) {
        setToast({ message: 'Stok berhasil diupdate', type: 'success' })
        setAdjustingProduct(null)
        setAdjustQty('')
        fetchInventory()
      } else {
        const data = await res.json()
        setToast({ message: data.error || 'Gagal mengupdate stok', type: 'error' })
      }
    } catch (err) {
      setToast({ message: 'Tidak dapat terhubung ke Inventory Service', type: 'error' })
    }
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-subtitle">Monitor stok barang secara real-time</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchInventory}>
            <span className="btn-icon">↻</span> Refresh
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Jumlah Produk</div>
            <div className="stat-value">{inventory.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Stok</div>
            <div className="stat-value">{totalStock} unit</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Stok Kritis</div>
            <div className="stat-value" style={{color: lowStock.length > 0 ? 'var(--color-danger)' : 'inherit'}}>
              {lowStock.length} produk
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rata-rata Stok</div>
            <div className="stat-value">{inventory.length ? Math.round(totalStock / inventory.length) : 0}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Daftar Stok Produk</span>
            <span className="badge badge-neutral">{inventory.length} produk</span>
          </div>
          <div className="card-body-compact">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Stok Saat Ini</th>
                    <th>Status</th>
                    <th style={{textAlign: 'center'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="table-empty">
                        <div className="spinner spinner-dark" style={{margin: '0 auto'}}></div>
                        <div className="table-empty-text mt-16">Memuat data inventory...</div>
                      </td>
                    </tr>
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="table-empty">
                        <div className="table-empty-icon">📦</div>
                        <div className="table-empty-text">Belum ada data inventaris</div>
                        <div className="table-empty-hint">Data stok akan otomatis ter-update setelah transaksi diproses</div>
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item) => (
                      <tr key={item.product_id}>
                        <td className="table-mono">PRD-{String(item.product_id).padStart(3, '0')}</td>
                        <td><span className="amount">{item.current_stock} unit</span></td>
                        <td>{getStockBadge(item.current_stock)}</td>
                        <td style={{textAlign: 'center'}}>
                          {adjustingProduct === item.product_id ? (
                            <div style={{display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center'}}>
                              <input
                                type="number"
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(e.target.value)}
                                placeholder="Qty"
                                style={{width: '50px', padding: '4px'}}
                              />
                              <button
                                onClick={() => handleAdjustStock(item.product_id)}
                                style={{padding: '4px 8px', fontSize: '12px'}}
                                className="btn btn-primary"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {setAdjustingProduct(null); setAdjustQty('')}}
                                style={{padding: '4px 8px', fontSize: '12px'}}
                                className="btn btn-outline"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAdjustingProduct(item.product_id)}
                              className="btn btn-outline btn-sm"
                              style={{fontSize: '12px', padding: '4px 8px'}}
                            >
                              Ubah
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

/* ─── Accounting Page ───────────────────────────────── */
function AccountingPage() {
  const [journals, setJournals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchJournals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/accounting/accounting/journals')
      if (res.ok) {
        const data = await res.json()
        setJournals(data)
      }
    } catch (err) {
      console.error('Failed to fetch journals:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJournals() }, [fetchJournals])

  const totalAmount = journals.reduce((sum, j) => sum + Number(j.amount || 0), 0)

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Accounting</h1>
            <p className="page-subtitle">Jurnal keuangan dan pencatatan transaksi</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchJournals}>
            <span className="btn-icon">↻</span> Refresh
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Jurnal</div>
            <div className="stat-value">{journals.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">{formatRupiah(totalAmount)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tipe Akun</div>
            <div className="stat-value">{[...new Set(journals.map(j => j.account_type))].length || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Entri Terbaru</div>
            <div className="stat-value">{journals.length > 0 ? formatDate(journals[0].created_at) : '—'}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Jurnal Keuangan</span>
            <span className="badge badge-neutral">{journals.length} entri</span>
          </div>
          <div className="card-body-compact">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Journal ID</th>
                    <th>Tipe Akun</th>
                    <th>Deskripsi</th>
                    <th>Jumlah</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="table-empty">
                        <div className="spinner spinner-dark" style={{margin: '0 auto'}}></div>
                        <div className="table-empty-text mt-16">Memuat data jurnal...</div>
                      </td>
                    </tr>
                  ) : journals.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="table-empty">
                        <div className="table-empty-icon">📒</div>
                        <div className="table-empty-text">Belum ada jurnal tercatat</div>
                        <div className="table-empty-hint">Jurnal otomatis terbuat saat transaksi di POS diproses via RabbitMQ</div>
                      </td>
                    </tr>
                  ) : (
                    journals.map((j) => (
                      <tr key={j.id}>
                        <td className="table-mono">{j.journal_id}</td>
                        <td><span className="badge badge-info">{j.account_type}</span></td>
                        <td className="text-secondary text-sm">{j.description}</td>
                        <td><span className="amount amount-positive">{formatRupiah(j.amount)}</span></td>
                        <td className="text-secondary text-sm">{formatDate(j.created_at)} {formatTime(j.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Integration Monitor Page ──────────────────────── */
function IntegrationPage() {
  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Arsitektur Integrasi</h1>
            <p className="page-subtitle">Diagram alur integrasi antar layanan FARMart-EAI</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="card arch-card">
          <div className="card-header">
            <span className="card-title">Enterprise Application Integration Flow</span>
            <span className="badge badge-success">● Semua Aktif</span>
          </div>
          <div className="card-body">
            <div className="arch-flow">
              <div className="arch-node arch-node-active">
                <div className="arch-node-icon">🛒</div>
                <div className="arch-node-label">POS Service</div>
                <div className="arch-node-sub">PostgreSQL · JSON</div>
              </div>

              <div className="arch-arrow">→</div>

              <div className="arch-node arch-node-active">
                <div className="arch-node-icon">🐇</div>
                <div className="arch-node-label">RabbitMQ</div>
                <div className="arch-node-sub">Message Broker</div>
              </div>

              <div className="arch-arrow">→</div>

              <div className="arch-node arch-node-active">
                <div className="arch-node-icon">🔄</div>
                <div className="arch-node-label">Integration Service</div>
                <div className="arch-node-sub">Message Translator + Router</div>
              </div>

              <div className="arch-arrow">→</div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <div className="arch-node arch-node-active">
                  <div className="arch-node-icon">📦</div>
                  <div className="arch-node-label">Inventory Service</div>
                  <div className="arch-node-sub">MySQL · XML</div>
                </div>
                <div className="arch-node arch-node-active">
                  <div className="arch-node-icon">📒</div>
                  <div className="arch-node-label">Accounting Service</div>
                  <div className="arch-node-sub">PostgreSQL · JSON</div>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '8px'}}>
              <div className="stat-card" style={{border: '1px solid var(--color-border)'}}>
                <div className="stat-label">EAI Pattern</div>
                <div style={{fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginTop: '4px'}}>Message Broker</div>
                <div style={{fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px'}}>
                  RabbitMQ dengan Topic Exchange untuk event routing
                </div>
              </div>
              <div className="stat-card" style={{border: '1px solid var(--color-border)'}}>
                <div className="stat-label">EAI Pattern</div>
                <div style={{fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginTop: '4px'}}>Message Translator</div>
                <div style={{fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px'}}>
                  Konversi JSON ke XML untuk Inventory, dan canonical ke schema spesifik Accounting
                </div>
              </div>
              <div className="stat-card" style={{border: '1px solid var(--color-border)'}}>
                <div className="stat-label">EAI Pattern</div>
                <div style={{fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginTop: '4px'}}>Message Router</div>
                <div style={{fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px'}}>
                  Broadcast event ke Inventory dan Accounting secara bersamaan dengan DLQ
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Swagger Page ──────────────────────────────────── */
function SwaggerPage() {
  return (
    <div className="page-enter" style={{ height: 'calc(100vh - 20px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ paddingBottom: '16px' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Dokumentasi API (Swagger)</h1>
            <p className="page-subtitle">Interactive API explorer untuk seluruh Microservice</p>
          </div>
          <a href="/swagger.html" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
            ↗ Buka Tab Baru
          </a>
        </div>
      </div>
      <div style={{ flex: 1, padding: '0 36px 36px', overflow: 'hidden' }}>
        <iframe
          src="/swagger.html"
          title="Swagger UI"
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            background: 'white',
            boxShadow: 'var(--shadow-sm)'
          }}
        />
      </div>
    </div>
  )
}

/* ─── App Root ──────────────────────────────────────── */
function App() {
  const [activeTab, setActiveTab] = useState('pos')

  const navItems = [
    { key: 'pos', label: 'Point of Sale', icon: '🛒' },
    { key: 'inventory', label: 'Inventory', icon: '📦' },
    { key: 'accounting', label: 'Accounting', icon: '📒' },
    { key: 'integration', label: 'Integrasi', icon: '🔄' },
    { key: 'swagger', label: 'API Docs (Swagger)', icon: '📖' },
  ]

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <div className="sidebar-brand-icon">🌾</div>
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-name">FARMart</div>
              <div className="sidebar-brand-tagline">Enterprise Integration</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">Menu Utama</div>
          {navItems.map(item => (
            <div
              key={item.key}
              className={`sidebar-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className="sidebar-nav-item-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <div className="sidebar-status-dot"></div>
            Semua service aktif
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {activeTab === 'pos' && <POSPage />}
        {activeTab === 'inventory' && <InventoryPage />}
        {activeTab === 'accounting' && <AccountingPage />}
        {activeTab === 'integration' && <IntegrationPage />}
        {activeTab === 'swagger' && <SwaggerPage />}
      </main>
    </div>
  )
}

export default App
