const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'accounting_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

app.get('/accounting/journals', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM journals ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching journals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/accounting/journal', async (req, res) => {
  // Expected JSON schema for Accounting:
  // {
  //   "journalId": "J-1234",
  //   "accountType": "Revenue",
  //   "amount": 50000,
  //   "description": "Sales from POS"
  // }
  
  try {
    const { journalId, accountType, amount, description } = req.body;
    
    if (!journalId || !accountType || amount === undefined) {
      return res.status(400).json({ error: 'Missing required journal fields' });
    }

    const insertQuery = `
      INSERT INTO journals (journal_id, account_type, amount, description, created_at)
      VALUES ($1, $2, $3, $4, NOW()) RETURNING id;
    `;
    const result = await pool.query(insertQuery, [journalId, accountType, amount, description]);
    
    res.status(201).json({ message: 'Journal entry recorded', id: result.rows[0].id });
  } catch (error) {
    console.error('Error recording journal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  app.listen(PORT, () => {
    console.log(`Accounting Service running on port ${PORT}`);
  });
}

start();
