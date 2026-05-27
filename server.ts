import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getBooks,
  saveBooks,
  serverLogs,
  logHTTP,
  logSQL,
  logSystem,
  runSqlSim
} from './src/dbSim.ts';
import { Book } from './src/types.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // Request logs middleware for all routes
  app.use((req, res, next) => {
    // Skip static/Vite files
    if (!req.url.startsWith('/api')) {
      return next();
    }
    logHTTP(`API Request Received: ${req.method} ${req.url}`);
    next();
  });

  // RESTful API Endpoint 1: ADD A NEW BOOK (POST /api/books)
  app.post('/api/books', (req, res) => {
    const { title, author, genre, price, published_year } = req.body;

    // Validation
    const errors: string[] = [];
    if (!title || typeof title !== 'string' || title.trim() === '') {
      errors.push("Field 'title' must be a non-empty string.");
    }
    if (!author || typeof author !== 'string' || author.trim() === '') {
      errors.push("Field 'author' must be a non-empty string.");
    }
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      errors.push("Field 'price' must be a non-negative number.");
    }
    if (published_year !== undefined && (isNaN(Number(published_year)) || !Number.isInteger(Number(published_year)) || Number(published_year) < 0)) {
      errors.push("Field 'published_year' must be a positive integer.");
    }

    if (errors.length > 0) {
      logHTTP(`POST /api/books - Status 400 (Bad Request) - Validation Errors: ${errors.join(', ')}`, 'error');
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    const books = getBooks();
    const nextId = books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;

    const newBook: Book = {
      id: nextId,
      title: title.trim(),
      author: author.trim(),
      genre: (genre && typeof genre === 'string') ? genre.trim() : 'General',
      price: parseFloat(Number(price).toFixed(2)),
      published_year: published_year ? parseInt(String(published_year), 10) : new Date().getFullYear(),
      created_at: new Date().toISOString()
    };

    // Simulated SQL statement to be logged
    const simulatedSql = `INSERT INTO books (title, author, genre, price, published_year, created_at) \nVALUES ('${newBook.title.replace(/'/g, "''")}', '${newBook.author.replace(/'/g, "''")}', '${newBook.genre.replace(/'/g, "''")}', ${newBook.price}, ${newBook.published_year}, '${newBook.created_at}');`;
    
    books.push(newBook);
    if (saveBooks(books)) {
      logSQL(simulatedSql, `Inserted new book into MySQL database: "${newBook.title}" (ID: ${newBook.id})`);
      logHTTP(`POST /api/books - Status 201 (Created) - Created book ID ${newBook.id}`, 'success');
      return res.status(201).json({
        success: true,
        message: 'Book created successfully in Bright Future database',
        data: newBook
      });
    } else {
      logHTTP(`POST /api/books - Status 500 (Internal Server Error) - Database Save Failed`, 'error');
      return res.status(500).json({
        success: false,
        error: 'Engine error: Unable to write data to store storage.'
      });
    }
  });

  // RESTful API Endpoint 2: VIEW ALL BOOKS (GET /api/books)
  app.get('/api/books', (req, res) => {
    const books = getBooks();
    const simulatedSql = `SELECT * FROM books ORDER BY id ASC;`;
    
    logSQL(simulatedSql, `Fetched all ${books.length} book records.`);
    logHTTP(`GET /api/books - Status 200 (OK) - Returned ${books.length} books`, 'success');
    
    return res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  });

  // RESTful API Endpoint 3: VIEW SINGLE BOOK BY ID (GET /api/books/:id)
  app.get('/api/books/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      logHTTP(`GET /api/books/${req.params.id} - Status 400 (Bad Request) - Invalid ID`, 'error');
      return res.status(400).json({
        success: false,
        error: "Invalid request. Parameter 'id' must be an integer."
      });
    }

    const books = getBooks();
    const book = books.find(b => b.id === id);
    const simulatedSql = `SELECT * FROM books WHERE id = ${id} LIMIT 1;`;

    if (!book) {
      logSQL(simulatedSql, `Requested book record ID ${id} - Record not found.`, 'info');
      logHTTP(`GET /api/books/${id} - Status 404 (Not Found)`, 'error');
      return res.status(404).json({
        success: false,
        error: `Book record with ID ${id} not found in bookstore database.`
      });
    }

    logSQL(simulatedSql, `Fetched book record ID ${id}: "${book.title}"`);
    logHTTP(`GET /api/books/${id} - Status 200 (OK) - Returned "${book.title}"`, 'success');
    
    return res.status(200).json({
      success: true,
      data: book
    });
  });

  // RESTful API Endpoint 4: UPDATE BOOK INFORMATION (PUT /api/books/:id)
  app.put('/api/books/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      logHTTP(`PUT /api/books/${req.params.id} - Status 400 (Bad Request) - Invalid ID`, 'error');
      return res.status(400).json({
        success: false,
        error: "Invalid request. Parameter 'id' must be an integer."
      });
    }

    const books = getBooks();
    const bookIndex = books.findIndex(b => b.id === id);

    if (bookIndex === -1) {
      const simulatedSql = `-- Check record existence\nSELECT * FROM books WHERE id = ${id};`;
      logSQL(simulatedSql, `Update failed - book ID ${id} not found.`, 'error');
      logHTTP(`PUT /api/books/${id} - Status 404 (Not Found)`, 'error');
      return res.status(404).json({
        success: false,
        error: `Book record with ID ${id} does not exist.`
      });
    }

    const { title, author, genre, price, published_year } = req.body;

    // Validation
    const errors: string[] = [];
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      errors.push("Field 'title' must be a non-empty string.");
    }
    if (author !== undefined && (typeof author !== 'string' || author.trim() === '')) {
      errors.push("Field 'author' must be a non-empty string.");
    }
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      errors.push("Field 'price' must be a non-negative number.");
    }
    if (published_year !== undefined && (isNaN(Number(published_year)) || !Number.isInteger(Number(published_year)) || Number(published_year) < 0)) {
      errors.push("Field 'published_year' must be a positive integer.");
    }

    if (errors.length > 0) {
      logHTTP(`PUT /api/books/${id} - Status 400 (Bad Request) - Validation Errors: ${errors.join(', ')}`, 'error');
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    const currentBook = books[bookIndex];
    const updatedBook: Book = {
      ...currentBook,
      title: title !== undefined ? title.trim() : currentBook.title,
      author: author !== undefined ? author.trim() : currentBook.author,
      genre: genre !== undefined ? genre.trim() : currentBook.genre,
      price: price !== undefined ? parseFloat(Number(price).toFixed(2)) : currentBook.price,
      published_year: published_year !== undefined ? parseInt(String(published_year), 10) : currentBook.published_year
    };

    // Build simulated UPDATE SQL
    const setStatements: string[] = [];
    if (title !== undefined) setStatements.push(`title = '${updatedBook.title.replace(/'/g, "''")}'`);
    if (author !== undefined) setStatements.push(`author = '${updatedBook.author.replace(/'/g, "''")}'`);
    if (genre !== undefined) setStatements.push(`genre = '${updatedBook.genre.replace(/'/g, "''")}'`);
    if (price !== undefined) setStatements.push(`price = ${updatedBook.price}`);
    if (published_year !== undefined) setStatements.push(`published_year = ${updatedBook.published_year}`);
    
    const simulatedSql = `UPDATE books \nSET ${setStatements.join(', ')} \nWHERE id = ${id};`;

    books[bookIndex] = updatedBook;
    if (saveBooks(books)) {
      logSQL(simulatedSql, `Updated MySQL record ID ${id} successfully.`);
      logHTTP(`PUT /api/books/${id} - Status 200 (OK) - Updated record`, 'success');
      return res.status(200).json({
        success: true,
        message: 'Book updated successfully',
        data: updatedBook
      });
    } else {
      logHTTP(`PUT /api/books/${id} - Status 500 (Internal Server Error) - Save Failed`, 'error');
      return res.status(500).json({
        success: false,
        error: 'Engine error: Live sync failed to commit update transaction.'
      });
    }
  });

  // RESTful API Endpoint 5: DELETE BOOK (DELETE /api/books/:id)
  app.delete('/api/books/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      logHTTP(`DELETE /api/books/${req.params.id} - Status 400 (Bad Request) - Invalid ID`, 'error');
      return res.status(400).json({
        success: false,
        error: "Invalid request. Parameter 'id' must be an integer."
      });
    }

    const books = getBooks();
    const bookIndex = books.findIndex(b => b.id === id);
    const simulatedSql = `DELETE FROM books WHERE id = ${id};`;

    if (bookIndex === -1) {
      logSQL(simulatedSql, `Deletion target ID ${id} not found. Deletion ignored.`, 'error');
      logHTTP(`DELETE /api/books/${id} - Status 404 (Not Found) - Record empty`, 'error');
      return res.status(404).json({
        success: false,
        error: `Cannot delete. Book record with ID ${id} does not exist.`
      });
    }

    const targetTitle = books[bookIndex].title;
    books.splice(bookIndex, 1);

    if (saveBooks(books)) {
      logSQL(simulatedSql, `Deleted book "${targetTitle}" (ID ${id}) from MySQL DB.`);
      logHTTP(`DELETE /api/books/${id} - Status 200 (OK) - Record removed`, 'success');
      return res.status(200).json({
        success: true,
        message: `Book "${targetTitle}" (ID: ${id}) deleted successfully.`,
        deletedId: id
      });
    } else {
      logHTTP(`DELETE /api/books/${id} - Status 500 (Internal Server Error)`, 'error');
      return res.status(500).json({
        success: false,
        error: 'Engine error: Live sync failed to delete record.'
      });
    }
  });

  // API Log Retrival (Allows React interface to display active log outputs)
  app.get('/api/logs', (req, res) => {
    // Return last 80 log operations
    return res.status(200).json({
      success: true,
      logs: serverLogs.slice().reverse()
    });
  });

  // API Clear Logs
  app.post('/api/logs/clear', (req, res) => {
    serverLogs.length = 0;
    logSystem('Database Console cleared.', 'info');
    return res.status(200).json({ success: true, message: 'Logs cleared' });
  });

  // Interactive SQL terminal execution
  app.post('/api/mysql/query', (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query parameter required.' });
    }
    const result = runSqlSim(query);
    return res.status(200).json(result);
  });

  // Vite Integration for development / static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bright Future Bookshop REST Server successfully started at http://localhost:${PORT}`);
    logSystem(`Bright Future Bookstore REST API Service running at http://0.0.0.0:${PORT}`, 'success');
  });
}

startServer();
