# FARMART Enterprise Application Integration (EAI)

Ini adalah solusi Enterprise Application Integration (EAI) untuk proyek FARMART menggunakan arsitektur microservices yang dijalankan di dalam container.

## 🏢 Daftar Sistem & Endpoint

### 1. POS Service (Point of Sale)
- **Role**: Sistem Penghasil Transaksi (Producer).
- **Database**: PostgreSQL (`pos_db`)
- **Port**: `3001`
- **Endpoint Utama**: `POST /sales`
  - **Format Data (JSON)**:
    ```json
    {
      "productId": 1,
      "quantity": 2,
      "price": 15000
    }
    ```

### 2. Inventory Service
- **Role**: Sistem Manajemen Stok (Consumer).
- **Database**: MySQL (`inventory_db`)
- **Port**: `3002`
- **Endpoint Utama**: `POST /inventory/update`
  - **Format Data (XML)**:
    ```xml
    <StockUpdate>
       <ProductId>1</ProductId>
       <Quantity>2</Quantity>
    </StockUpdate>
    ```

### 3. Accounting Service
- **Role**: Sistem Finansial / Jurnal Keuangan (Consumer).
- **Database**: PostgreSQL (`accounting_db`)
- **Port**: `3003`
- **Endpoint Utama**: `POST /accounting/journal`
  - **Format Data (JSON Specific Schema)**:
    ```json
    {
      "journalId": "J-EVT-12345",
      "accountType": "Revenue",
      "amount": 30000,
      "description": "Sales from POS"
    }
    ```

### 4. Integration Middleware
- **Message Broker**: RabbitMQ (Port `5672`, Management UI Port `15672`).
- **Integration Service**: Bertindak sebagai Message Router dan Message Translator (Menerima Event dari RabbitMQ `sale.completed`, lalu melakukan HTTP POST secara sinkron ke Inventory dengan payload XML dan Accounting dengan payload JSON spesifik).

## 🧩 Pola Integrasi (EIP)
1. **Publish-Subscribe Channel**: RabbitMQ Topic Exchange `farmart_events`.
2. **Message Translator**: `integration-service` menerjemahkan JSON menjadi XML untuk Inventory.
3. **Message Router**: `integration-service` mengirimkan pesan ke sistem-sistem yang berkepentingan.
4. **Dead Letter Channel**: Diimplementasikan pada RabbitMQ Queue untuk messages yang gagal diproses (Reliable messaging).

## 🚀 Cara Menjalankan

1. Clone repositori ini (atau buka folder tempat proyek ini berada).
2. Pastikan Docker dan Docker Compose telah terinstall.
3. Jalankan perintah berikut di terminal:
   ```bash
   docker-compose up -d --build
   ```
4. Sistem otomatis mem-build image Node.js, melakukan inisialisasi tabel Database PostgreSQL & MySQL, dan menyalakan seluruh layanan.
5. Untuk mencoba alur _end-to-end_:
   Kirim POST request ke `http://localhost:3001/sales` menggunakan Postman/cURL:
   ```bash
   curl -X POST http://localhost:3001/sales \
        -H "Content-Type: application/json" \
        -d '{"productId": 1, "quantity": 2, "price": 10000}'
   ```
   **Hasil**:
   - Di tabel `sales` (POS DB), transaksi baru akan tersimpan.
   - Di tabel `stock` (Inventory DB), stok product ID 1 akan berkurang sebanyak 2.
   - Di tabel `journals` (Accounting DB), pendapatan sebesar 20000 akan otomatis tercatat.