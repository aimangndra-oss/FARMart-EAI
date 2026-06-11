const express = require('express');
const { Pool } = require('pg');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = process.env.EXCHANGE_NAME || 'farmart_events';

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pos_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

let channel;

async function connectRabbitMQ() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ Connection Error:', error);
    setTimeout(connectRabbitMQ, 5000); // Retry connection
  }
}

app.get('/sales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/sales', async (req, res) => {
  const { productId, quantity, price } = req.body;
  if (!productId || !quantity || !price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const totalAmount = quantity * price;
    const insertQuery = `
      INSERT INTO sales (product_id, quantity, price, total_amount, created_at)
      VALUES ($1, $2, $3, $4, NOW()) RETURNING id;
    `;
    const result = await pool.query(insertQuery, [productId, quantity, price, totalAmount]);
    const saleId = result.rows[0].id;

    // Publish event
    const eventPayload = {
      eventId: `EVT-${Date.now()}`,
      eventType: 'SaleCompleted',
      timestamp: new Date().toISOString(),
      data: {
        saleId,
        productId,
        quantity,
        totalAmount
      }
    };

    if (channel) {
      channel.publish(
        EXCHANGE_NAME,
        'sale.completed',
        Buffer.from(JSON.stringify(eventPayload))
      );
      console.log('Published event:', eventPayload);
    }

    res.status(201).json({ message: 'Sale recorded successfully', saleId });
  } catch (error) {
    console.error('Error processing sale:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  await connectRabbitMQ();
  app.listen(PORT, () => {
    console.log(`POS Service running on port ${PORT}`);
  });
}

start();
