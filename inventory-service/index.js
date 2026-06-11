const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);

const app = express();
app.use(bodyParser.xml());

const PORT = process.env.PORT || 3002;

let pool;

async function connectMySQL() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'inventory_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('Connected to MySQL pool');
  } catch (error) {
    console.error('MySQL Connection Error:', error);
  }
}

app.use(express.json());

app.get('/inventory', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM stock ORDER BY product_id ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/inventory/update', async (req, res) => {
  // Expected XML format: 
  // <StockUpdate>
  //    <ProductId>1</ProductId>
  //    <Quantity>2</Quantity>
  // </StockUpdate>
  
  try {
    const updateData = req.body?.StockUpdate;
    if (!updateData || !updateData.ProductId || !updateData.Quantity) {
      return res.status(400).send('<Error>Invalid XML payload</Error>');
    }

    const productId = parseInt(updateData.ProductId[0], 10);
    const quantity = parseInt(updateData.Quantity[0], 10);

    const [result] = await pool.execute(
      'UPDATE stock SET current_stock = current_stock - ? WHERE product_id = ? AND current_stock >= ?',
      [quantity, productId, quantity]
    );

    if (result.affectedRows === 0) {
      return res.status(400).send('<Error>Product not found or insufficient stock</Error>');
    }

    res.status(200).send('<Success>Stock updated successfully</Success>');
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).send('<Error>Internal server error</Error>');
  }
});

// Add stock (Restocking) - JSON endpoint
app.post('/inventory/add', async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity) {
      return res.status(400).json({ error: 'Missing product_id or quantity' });
    }

    const [result] = await pool.execute(
      'UPDATE stock SET current_stock = current_stock + ? WHERE product_id = ?',
      [quantity, product_id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Stock added successfully' });
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set stock to specific level (Adjustment)
app.put('/inventory/adjust', async (req, res) => {
  try {
    const { product_id, stock_level } = req.body;
    if (product_id === undefined || stock_level === undefined) {
      return res.status(400).json({ error: 'Missing product_id or stock_level' });
    }

    const [result] = await pool.execute(
      'UPDATE stock SET current_stock = ? WHERE product_id = ?',
      [stock_level, product_id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Stock adjusted successfully' });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new product in inventory
app.post('/inventory/create', async (req, res) => {
  try {
    const { product_id, current_stock } = req.body;
    if (!product_id || current_stock === undefined) {
      return res.status(400).json({ error: 'Missing product_id or current_stock' });
    }

    const [result] = await pool.execute(
      'INSERT INTO stock (product_id, current_stock) VALUES (?, ?)',
      [product_id, current_stock]
    );

    res.status(201).json({ message: 'Product created successfully', product_id });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  await connectMySQL();
  app.listen(PORT, () => {
    console.log(`Inventory Service running on port ${PORT}`);
  });
}

start();
