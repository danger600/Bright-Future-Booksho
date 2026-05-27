import fs from 'fs';
import path from 'path';
import { Book, LogEntry } from './types.js';

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'bookstore_db.json');

// Memory buffer for logs (SQL commands, system messages, API calls)
export let serverLogs: LogEntry[] = [
  {
    id: 'log-' + Date.now() + '-1',
    timestamp: new Date().toISOString(),
    type: 'system',
    message: 'Initializing simulated MySQL database engine...',
    status: 'info'
  },
  {
    id: 'log-' + Date.now() + '-2',
    timestamp: new Date().toISOString(),
    type: 'system',
    message: 'Loaded connection settings: mysql://localhost:3306/bright_future_bookshop',
    status: 'info'
  },
  {
    id: 'log-' + Date.now() + '-3',
    timestamp: new Date().toISOString(),
    type: 'sql',
    query: 'CREATE DATABASE IF NOT EXISTS bright_future_bookshop;\nUSE bright_future_bookshop;',
    message: 'Database initialization statement executed.',
    status: 'success'
  },
  {
    id: 'log-' + Date.now() + '-4',
    timestamp: new Date().toISOString(),
    type: 'sql',
    query: 'CREATE TABLE IF NOT EXISTS books (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  title VARCHAR(150) NOT NULL,\n  author VARCHAR(100) NOT NULL,\n  genre VARCHAR(50),\n  price DECIMAL(10, 2) NOT NULL,\n  published_year INT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);',
    message: 'Created table "books" successfully.',
    status: 'success'
  },
  {
    id: 'log-' + Date.now() + '-5',
    timestamp: new Date().toISOString(),
    type: 'system',
    message: 'Database check complete. Connection established on port 3306 (Simulated).',
    status: 'success'
  }
];

export function logSystem(message: string, status: 'success' | 'info' | 'error' = 'info') {
  const newLog: LogEntry = {
    id: 'log-' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    type: 'system',
    message,
    status
  };
  serverLogs.push(newLog);
  // Keep logs to a reasonable limit (last 100 entries)
  if (serverLogs.length > 100) serverLogs.shift();
  return newLog;
}

export function logSQL(query: string, message: string, status: 'success' | 'info' | 'error' = 'success') {
  const newLog: LogEntry = {
    id: 'log-' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    type: 'sql',
    query,
    message,
    status
  };
  serverLogs.push(newLog);
  if (serverLogs.length > 100) serverLogs.shift();
  return newLog;
}

export function logHTTP(message: string, status: 'success' | 'info' | 'error' = 'info') {
  const newLog: LogEntry = {
    id: 'log-' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    type: 'http',
    message,
    status
  };
  serverLogs.push(newLog);
  if (serverLogs.length > 100) serverLogs.shift();
  return newLog;
}

export function getBooks(): Book[] {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Create folders if they don't exist
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    logSystem(`Database read error: ${error.message}`, 'error');
    return [];
  }
}

export function saveBooks(books: Book[]): boolean {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(books, null, 2), 'utf-8');
    return true;
  } catch (error: any) {
    logSystem(`Database write error: ${error.message}`, 'error');
    return false;
  }
}

// Simulated query client (for virtual terminal)
export function runSqlSim(sql: string): { success: boolean; data?: any; error?: string; message: string } {
  const trimmed = sql.trim().replace(/;+$/, '').trim();
  const lower = trimmed.toLowerCase();

  // 1. SELECT ALL
  if (lower === 'select * from books') {
    const books = getBooks();
    logSQL(sql, `Successfully retrieved all ${books.length} books.`);
    return { success: true, data: books, message: `MySQL: ${books.length} rows returned.` };
  }

  // 2. SELECT BY ID
  const selectIdMatch = trimmed.match(/^select\s+\*\s+from\s+books\s+where\s+id\s*=\s*(\d+)$/i);
  if (selectIdMatch) {
    const id = parseInt(selectIdMatch[1], 10);
    const books = getBooks();
    const book = books.find(b => b.id === id);
    if (book) {
      logSQL(sql, `Selected book ID ${id}: "${book.title}"`);
      return { success: true, data: [book], message: 'MySQL: 1 row returned.' };
    } else {
      logSQL(sql, `Attempted select book ID ${id}. Record not found.`, 'info');
      return { success: true, data: [], message: 'MySQL: Empty set (0 rows).' };
    }
  }

  // 3. DELETE
  const deleteMatch = trimmed.match(/^delete\s+from\s+books\s+where\s+id\s*=\s*(\d+)$/i);
  if (deleteMatch) {
    const id = parseInt(deleteMatch[1], 10);
    const books = getBooks();
    const index = books.findIndex(b => b.id === id);
    if (index !== -1) {
      const title = books[index].title;
      books.splice(index, 1);
      saveBooks(books);
      logSQL(sql, `Deleted book "${title}" (ID ${id}) from DB.`);
      return { success: true, message: `MySQL: Query OK, 1 row affected.` };
    } else {
      logSQL(sql, `Attempted delete book ID ${id}. Record not found.`, 'error');
      return { success: false, error: 'Record not found.', message: 'MySQL: Query OK, 0 rows affected.' };
    }
  }

  // 4. INSERT
  const insertMatch = trimmed.match(/^insert\s+into\s+books\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)$/i);
  if (insertMatch) {
    try {
      const cols = insertMatch[1].split(',').map(s => s.trim().replace(/`/g, ''));
      const rawVals = insertMatch[2].split(',');
      
      // Parse values carefully (handling strings inside quotes, floats)
      const vals: any[] = [];
      let temp = '';
      for (let i = 0; i < rawVals.length; i++) {
        let bit = rawVals[i].trim();
        if ((bit.startsWith("'") && !bit.endsWith("'")) || (bit.startsWith('"') && !bit.endsWith('"'))) {
          temp = bit;
          while (i < rawVals.length - 1 && !bit.endsWith("'") && !bit.endsWith('"')) {
            i++;
            bit = rawVals[i];
            temp += ',' + bit;
          }
          vals.push(temp.replace(/^['"]|['"]$/g, ''));
          temp = '';
        } else {
          const rawVal = bit.replace(/^['"]|['"]$/g, '');
          if (!isNaN(Number(rawVal)) && rawVal !== '') {
            vals.push(Number(rawVal));
          } else {
            vals.push(rawVal);
          }
        }
      }

      if (cols.length !== vals.length) {
        throw new Error(`Column count (${cols.length}) does not match value count (${vals.length})`);
      }

      const books = getBooks();
      const nextId = books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;
      
      const newBook: any = {
        id: nextId,
        title: 'Untitled',
        author: 'Unknown',
        genre: 'General',
        price: 0.00,
        published_year: new Date().getFullYear(),
        created_at: new Date().toISOString()
      };

      cols.forEach((col, idx) => {
        const val = vals[idx];
        if (col === 'title') newBook.title = String(val);
        else if (col === 'author') newBook.author = String(val);
        else if (col === 'genre') newBook.genre = String(val);
        else if (col === 'price') newBook.price = parseFloat(String(val)) || 0;
        else if (col === 'published_year') newBook.published_year = parseInt(String(val), 10) || 2026;
      });

      books.push(newBook as Book);
      saveBooks(books);
      logSQL(sql, `Inserted new book "${newBook.title}" successfully with ID ${nextId}.`);
      return { success: true, data: newBook, message: `MySQL: Query OK, 1 row affected (Last inserted ID: ${nextId}).` };
    } catch (err: any) {
      logSQL(sql, `SQL error executing query: ${err.message}`, 'error');
      return { success: false, error: err.message, message: `MySQL Error: ${err.message}` };
    }
  }

  // 5. UPDATE
  const updateMatch = trimmed.match(/^update\s+books\s+set\s+([\s\S]+?)\s+where\s+id\s*=\s*(\d+)$/i);
  if (updateMatch) {
    try {
      const setClause = updateMatch[1];
      const targetId = parseInt(updateMatch[2], 10);
      
      const books = getBooks();
      const bookIdx = books.findIndex(b => b.id === targetId);
      if (bookIdx === -1) {
        logSQL(sql, `Attempted update book ID ${targetId}. Record not found.`, 'error');
        return { success: false, error: 'Book record not found.', message: 'MySQL: Query OK, 0 rows affected.' };
      }

      const targetBook = { ...books[bookIdx] } as any;

      // Parse assignment expressions: title = 'Book', price = 10.99
      const pairs = setClause.split(/,(?=(?:[^']*'[^']*')*[^']*$)/).map(s => s.trim());
      pairs.forEach(pair => {
        const splitIdx = pair.indexOf('=');
        if (splitIdx === -1) return;
        const key = pair.substring(0, splitIdx).trim().replace(/`/g, '');
        const valRaw = pair.substring(splitIdx + 1).trim().replace(/^['"]|['"]$/g, '');

        if (key === 'title') targetBook.title = valRaw;
        else if (key === 'author') targetBook.author = valRaw;
        else if (key === 'genre') targetBook.genre = valRaw;
        else if (key === 'price') targetBook.price = parseFloat(valRaw) || 0;
        else if (key === 'published_year') targetBook.published_year = parseInt(valRaw, 10) || 2026;
      });

      books[bookIdx] = targetBook as Book;
      saveBooks(books);
      logSQL(sql, `Updated book ID ${targetId} matches. Set clauses applied successfully.`);
      return { success: true, data: targetBook, message: 'MySQL: Query OK, 1 row affected.' };
    } catch (err: any) {
      logSQL(sql, `SQL error updating record: ${err.message}`, 'error');
      return { success: false, error: err.message, message: `MySQL Error: ${err.message}` };
    }
  }

  // Unhandled query structure log
  logSQL(sql, `Unrecognized SQL statement or complex query syntax.`, 'error');
  return {
    success: false,
    error: 'Unsupported SQL Syntax. Supported formats are standard SELECT, INSERT, UPDATE, and DELETE scripts targeting the "books" table.',
    message: 'MySQL Error (1064): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version.'
  };
}
