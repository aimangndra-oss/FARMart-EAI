const amqp = require('amqplib');
const axios = require('axios');
const xml2js = require('xml2js');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = process.env.EXCHANGE_NAME || 'farmart_events';
const QUEUE_NAME = 'integration_queue';

const INVENTORY_API = process.env.INVENTORY_API || 'http://localhost:3002/inventory/update';
const ACCOUNTING_API = process.env.ACCOUNTING_API || 'http://localhost:3003/accounting/journal';

async function processSaleEvent(eventPayload) {
  const { saleId, productId, quantity, totalAmount } = eventPayload.data;
  
  // 1. Message Translator for Inventory (JSON -> XML)
  const builder = new xml2js.Builder({ headless: true });
  const xmlPayload = builder.buildObject({
    StockUpdate: {
      ProductId: productId,
      Quantity: quantity
    }
  });

  // 2. Message Translator for Accounting (Canonical -> Specific JSON schema)
  const journalPayload = {
    journalId: `J-${eventPayload.eventId}`,
    accountType: 'Revenue',
    amount: totalAmount,
    description: `Sales from POS - Sale ID: ${saleId}`
  };

  // 3. Message Router (Broadcast to both systems)
  try {
    console.log(`[Inventory] Sending XML: ${xmlPayload}`);
    await axios.post(INVENTORY_API, xmlPayload, {
      headers: { 'Content-Type': 'application/xml' }
    });
    console.log('[Inventory] Update successful.');
  } catch (err) {
    console.error('[Inventory] Error updating stock:', err.message);
    throw err; // Trigger requeue / DLQ
  }

  try {
    console.log(`[Accounting] Sending JSON:`, journalPayload);
    await axios.post(ACCOUNTING_API, journalPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('[Accounting] Journal recorded successfully.');
  } catch (err) {
    console.error('[Accounting] Error recording journal:', err.message);
    throw err; // Trigger requeue / DLQ
  }
}

async function start() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    
    // Setup Dead Letter Exchange and Queue for Reliability (Bonus)
    const DLX = 'farmart_dlx';
    const DLQ = 'farmart_dlq';
    await channel.assertExchange(DLX, 'direct', { durable: true });
    await channel.assertQueue(DLQ, { durable: true });
    await channel.bindQueue(DLQ, DLX, 'failed_sales');

    // Setup Main Exchange and Queue
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    await channel.assertQueue(QUEUE_NAME, { 
      durable: true,
      deadLetterExchange: DLX,
      deadLetterRoutingKey: 'failed_sales'
    });
    
    // Bind queue to topic 'sale.completed'
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'sale.completed');

    console.log('Integration Service listening to RabbitMQ...');

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const eventPayload = JSON.parse(msg.content.toString());
          console.log('\n--- Received Event ---');
          console.log(eventPayload);
          
          await processSaleEvent(eventPayload);
          
          channel.ack(msg);
        } catch (error) {
          console.error('Failed to process message, sending to DLQ...');
          // Nack message, don't requeue to main queue, so it goes to DLX/DLQ
          channel.nack(msg, false, false);
        }
      }
    });

  } catch (error) {
    console.error('RabbitMQ Connection Error:', error);
    setTimeout(start, 5000);
  }
}

start();
