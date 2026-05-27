/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Production MySQL Database Connection Blueprint
 * To connect your Express server to a live MySQL Database, install 'mysql2' package:
 * Run: npm install mysql2
 * 
 * Below is the production connection code pattern to swap the simulation with a real server.
 */

// We use dynamic types or require syntax to prevent bundler compilation errors when mysql2 is NOT installed
let pool: any = null;

try {
  // Mock fallback or actual driver reference
  // In a real deployed setup: import mysqlMod from 'mysql2/promise';
  // pool = mysqlMod.createPool({...});
} catch (e) {
  // Silent fallback
}

export default pool;

// Example function showing standard MySQL promise database implementation of GET CRUD inside Node.js/Express
export async function getBooksFromMySQL() {
  if (!pool) {
    throw new Error('MySQL Native Connection not configured. Install mysql2 driver.');
  }
  const [rows] = await pool.query('SELECT * FROM books ORDER BY id ASC');
  return rows as any[];
}

export async function insertBookIntoMySQL(title: string, author: string, genre: string, price: number, publishedYear: number) {
  if (!pool) {
    throw new Error('MySQL Native Connection not configured. Install mysql2 driver.');
  }
  const [result] = await pool.query(
    'INSERT INTO books (title, author, genre, price, published_year) VALUES (?, ?, ?, ?, ?)',
    [title, author, genre, price, publishedYear]
  );
  return result;
}
