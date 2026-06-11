CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

CREATE TABLE IF NOT EXISTS stock (
  product_id INT PRIMARY KEY,
  current_stock INT NOT NULL
);

INSERT INTO stock (product_id, current_stock) VALUES
(1, 100),
(2, 50),
(3, 200);
