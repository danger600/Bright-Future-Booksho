import { useState, useEffect, FormEvent } from 'react';
import {
  Book as BookIcon,
  Plus,
  Edit2,
  Trash2,
  Terminal,
  Send,
  Database,
  RefreshCw,
  Play,
  CheckCircle,
  Server,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  Check,
  Code,
  X,
  Layers,
  Search,
  BookOpen,
  Info
} from 'lucide-react';
import { Book, LogEntry, PostmanHistoryItem } from './types';

export default function App() {
  // Bookstore state
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookDetails, setBookDetails] = useState<Book | null>(null);
  
  // UI Tabs & Modes
  const [activeRightTab, setActiveRightTab] = useState<'postman' | 'terminal' | 'schema'>('postman');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Form states
  const [formId, setFormId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formGenre, setFormGenre] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formYear, setFormYear] = useState('');

  // Live Console Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoPollLogs, setAutoPollLogs] = useState(true);

  // SQL Terminal
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM books WHERE id = 1;');
  const [sqlResult, setSqlResult] = useState<{ success: boolean; data?: any; error?: string; message: string } | null>(null);

  // Postman Sandbox State
  const [pmMethod, setPmMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [pmUrl, setPmUrl] = useState('/api/books');
  const [pmHeaders, setPmHeaders] = useState<string>('{\n  "Content-Type": "application/json"\n}');
  const [pmBody, setPmBody] = useState<string>('{\n  "title": "New Magical Book",\n  "author": "F. Scott Fitzgerald",\n  "genre": "Fiction",\n  "price": 14.99,\n  "published_year": 1925\n}');
  const [pmResponse, setPmResponse] = useState<{
    status: number;
    statusText: string;
    responseTime: number;
    body: string;
  } | null>(null);
  const [pmSending, setPmSending] = useState(false);
  const [pmHistory, setPmHistory] = useState<PostmanHistoryItem[]>([]);

  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all books
  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const json = await res.json();
        setBooks(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Logs from Server
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      }
    } catch (err) {
      console.error('Error fetching server logs:', err);
    }
  };

  // Poll server state initially and continually
  useEffect(() => {
    fetchBooks();
    fetchLogs();
  }, []);

  // Set up background log polling to keep simulated "MySQL Engine" UI alive
  useEffect(() => {
    if (!autoPollLogs) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 2000);
    return () => clearInterval(interval);
  }, [autoPollLogs]);

  const showFeedback = (text: string, error = false) => {
    setFeedbackMsg({ text, error });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // Pre-load data in Postman Client when template/endpoints selected
  const loadPostmanTemplate = (type: 'GET_ALL' | 'GET_SINGLE' | 'POST_NEW' | 'PUT_CHG' | 'DEL_BK', customId?: number) => {
    const id = customId || (books.length > 0 ? books[0].id : 1);
    
    switch (type) {
      case 'GET_ALL':
        setPmMethod('GET');
        setPmUrl('/api/books');
        break;
      case 'GET_SINGLE':
        setPmMethod('GET');
        setPmUrl(`/api/books/${id}`);
        break;
      case 'POST_NEW':
        setPmMethod('POST');
        setPmUrl('/api/books');
        setPmBody(JSON.stringify({
          title: "The Great Gatsby",
          author: "F. Scott Fitzgerald",
          genre: "Fiction",
          price: 15.99,
          published_year: 1925
        }, null, 2));
        break;
      case 'PUT_CHG':
        setPmMethod('PUT');
        setPmUrl(`/api/books/${id}`);
        const bookToEdit = books.find(b => b.id === id) || (books.length > 0 ? books[0] : null);
        setPmBody(JSON.stringify({
          title: bookToEdit ? bookToEdit.title + " (Special Anniversary Edition)" : "The Great Gatsby Special Edition",
          author: bookToEdit ? bookToEdit.author : "F. Scott Fitzgerald",
          genre: bookToEdit ? bookToEdit.genre : "Classic",
          price: bookToEdit ? parseFloat((bookToEdit.price * 1.1).toFixed(2)) : 16.99,
          published_year: bookToEdit ? bookToEdit.published_year : 1925
        }, null, 2));
        break;
      case 'DEL_BK':
        setPmMethod('DELETE');
        setPmUrl(`/api/books/${id}`);
        break;
    }
    setActiveRightTab('postman');
    showFeedback(`Loaded template for ${type} in API Client!`, false);
  };

  // API Call: Create Book Form Handler
  const handleAddOrEditBookSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAuthor.trim()) {
      showFeedback('Title and Author are required fields!', true);
      return;
    }

    const payload = {
      title: formTitle.trim(),
      author: formAuthor.trim(),
      genre: formGenre.trim() || 'General',
      price: parseFloat(formPrice) || 0.00,
      published_year: parseInt(formYear, 10) || new Date().getFullYear()
    };

    try {
      if (modalMode === 'add') {
        const res = await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showFeedback('Book created successfully! Saved to simulated MySQL database.', false);
          setIsModalOpen(false);
          fetchBooks();
          fetchLogs();
        } else {
          showFeedback(data.error || 'Failed to create book', true);
        }
      } else {
        // Edit Mode
        const res = await fetch(`/api/books/${formId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showFeedback(`Book ID ${formId} updated successfully.`, false);
          setIsModalOpen(false);
          fetchBooks();
          fetchLogs();
          if (bookDetails?.id === formId) {
            setBookDetails(data.data);
          }
        } else {
          showFeedback(data.error || 'Failed to update book', true);
        }
      }
    } catch (err: any) {
      showFeedback(`Network error: ${err.message}`, true);
    }
  };

  // Launch modal for add
  const openAddModal = () => {
    setModalMode('add');
    setFormId(null);
    setFormTitle('');
    setFormAuthor('');
    setFormGenre('');
    setFormPrice('14.99');
    setFormYear('2026');
    setIsModalOpen(true);
  };

  // Launch modal for edit
  const openEditModal = (book: Book) => {
    setModalMode('edit');
    setFormId(book.id);
    setFormTitle(book.title);
    setFormAuthor(book.author);
    setFormGenre(book.genre);
    setFormPrice(book.price.toString());
    setFormYear(book.published_year.toString());
    setIsModalOpen(true);
  };

  // Execute Direct REST API Client Call (Visual Postman simulation)
  const sendPostmanRequest = async () => {
    setPmSending(true);
    const startTime = Date.now();
    let parsedHeaders = {};
    try {
      parsedHeaders = JSON.parse(pmHeaders);
    } catch (err) {
      setPmResponse({
        status: 400,
        statusText: 'Bad Request (Headers Parsing Error)',
        responseTime: 0,
        body: 'JSON error in Headers Input. Check your syntax.'
      });
      setPmSending(false);
      return;
    }

    try {
      const options: RequestInit = {
        method: pmMethod,
        headers: parsedHeaders
      };

      if (pmMethod !== 'GET' && pmMethod !== 'DELETE') {
        options.body = pmBody;
      }

      const res = await fetch(pmUrl, options);
      const timeTaken = Date.now() - startTime;
      const text = await res.text();

      let formattedBody = text;
      try {
        const parsed = JSON.parse(text);
        formattedBody = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Not a JSON response
      }

      setPmResponse({
        status: res.status,
        statusText: res.statusText || getHttpStatusText(res.status),
        responseTime: timeTaken,
        body: formattedBody
      });

      // Append to local Postman History
      const historyItem: PostmanHistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        method: pmMethod,
        url: pmUrl,
        headers: parsedHeaders,
        requestBody: pmMethod !== 'GET' ? pmBody : undefined,
        responseStatus: res.status,
        responseStatusText: res.statusText || getHttpStatusText(res.status),
        responseTime: timeTaken,
        responseBody: formattedBody
      };
      setPmHistory(prev => [historyItem, ...prev].slice(0, 15));

      // Refresh data tables
      fetchBooks();
      fetchLogs();
    } catch (error: any) {
      setPmResponse({
        status: 0,
        statusText: 'Network Error',
        responseTime: Date.now() - startTime,
        body: `Failed to contact target server:\n${error.message}`
      });
    } finally {
      setPmSending(false);
    }
  };

  // Execute terminal SQL simulation query
  const runDirectSqlQuery = async () => {
    try {
      const res = await fetch('/api/mysql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery })
      });
      if (res.ok) {
        const json = await res.json();
        setSqlResult(json);
        fetchBooks();
        fetchLogs();
      } else {
        setSqlResult({
          success: false,
          message: 'Error executing query on simulated database',
          error: 'Http request returned non-ok status.'
        });
      }
    } catch (err: any) {
      setSqlResult({
        success: false,
        message: 'Network execution failed',
        error: err.message
      });
    }
  };

  // Quick Action Delete
  const handleDeleteBook = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete book "${title}" (ID: ${id})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showFeedback(`Book "${title}" deleted successfully!`, false);
        fetchBooks();
        fetchLogs();
        if (bookDetails?.id === id) {
          setBookDetails(null);
        }
      } else {
        const data = await res.json();
        showFeedback(data.error || 'Failed to delete book', true);
      }
    } catch (err: any) {
      showFeedback(`Network error: ${err.message}`, true);
    }
  };

  // Quick Action Detail view
  const handleViewBookDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/books/${id}`);
      const data = await res.json();
      if (res.ok) {
        setBookDetails(data.data);
      } else {
        showFeedback(data.error || 'Failed to fetch book detail', true);
      }
    } catch (err: any) {
      showFeedback(`Network error: ${err.message}`, true);
    }
  };

  // Manual Clear logs
  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs/clear', { method: 'POST' });
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  // Fallback status explanation helper
  const getHttpStatusText = (status: number) => {
    switch (status) {
      case 200: return 'OK';
      case 201: return 'Created';
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 500: return 'Internal Server Error';
      default: return 'Response Code';
    }
  };

  // Filter books by search term
  const filteredBooks = books.filter(b => {
    const term = searchTerm.toLowerCase();
    return (
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.genre.toLowerCase().includes(term) ||
      b.id.toString() === term
    );
  });

  return (
    <div id="full-app-container" className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex flex-col font-sans selection:bg-[#38bdf8] selection:text-[#0f172a]">
      {/* Dynamic Header */}
      <header id="main-header" className="border-b border-[#1e293b] bg-[#0f172a]/95 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#38bdf8] to-[#0284c7] p-2 rounded-xl shadow-lg ring-1 ring-white/10">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#cbd5e1] bg-clip-text text-transparent">
              Bright Future Bookshop
            </h1>
            <p className="text-xs text-[#94a3b8] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              RESTful CRUD Backend Playground &bull; MySQL Simulated Engine
            </p>
          </div>
        </div>

        {/* Action Header bar */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          <button
            id="btn-add-book-header"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0284c7] to-[#0369a1] hover:from-[#0369a1] hover:to-[#075985] text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg hover:shadow-[#0284c7]/10 transition duration-150 border border-white/10 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Book Record (POST API)
          </button>
          
          <button
            id="btn-manual-sync-header"
            onClick={fetchBooks}
            className="p-2.5 bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white rounded-lg transition border border-[#334155]"
            title="Reload Books Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 grid-rows-none">
        
        {/* LEFT COLUMN: Bookstore Inventory View & SQLite Tables */}
        <section id="inventory-section" className="col-span-1 lg:col-span-7 flex flex-col gap-6">
          
          {/* Main Book Store Manager Card */}
          <div className="bg-[#1e293b]/60 rounded-2xl border border-[#334155] overflow-hidden backdrop-blur-sm flex flex-col h-full">
            <div className="px-5 py-4 border-b border-[#334155] bg-[#1e293b]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#38bdf8]" />
                <h2 className="font-bold text-sm tracking-wide text-white uppercase">
                  Local Bookstore Inventory Catalog
                </h2>
                <span className="px-2 py-0.5 text-[10px] bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 rounded-full font-mono font-bold">
                  MySQL Table: `books`
                </span>
              </div>
              
              {/* Search Inside Local Inventory */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#64748b]" />
                <input
                  type="text"
                  placeholder="Quick Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-48 pl-9 pr-3 py-1.5 text-xs bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8] transition-colors"
                />
              </div>
            </div>

            {/* Books Table Container */}
            <div className="overflow-x-auto flex-1 min-h-[350px]">
              {isLoading && books.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#64748b]">
                  <RefreshCw className="w-8 h-8 animate-spin mb-3 text-[#38bdf8]" />
                  <p className="text-xs font-mono">Loading records from simulated host...</p>
                </div>
              ) : filteredBooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                  <BookIcon className="w-12 h-12 text-[#475569] mb-3" />
                  <p className="text-sm font-semibold text-[#94a3b8]">No book records located.</p>
                  <p className="text-xs text-[#64748b] mt-1 max-w-sm">
                    {searchTerm ? 'No items matched your search query. Try another term.' : 'Your store DB is empty! Click "Add Book Record" or send a custom HTTP POST to create one.'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-3 text-xs text-[#38bdf8] hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0f172a]/40 text-[#94a3b8] text-[11px] uppercase font-mono border-b border-[#334155] select-none">
                      <th className="py-3 px-4 text-center font-bold w-12">ID</th>
                      <th className="py-3 px-4">Book Title & Author</th>
                      <th className="py-3 px-4">Genre</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4 text-center w-20">Year</th>
                      <th className="py-3 px-4 text-right w-32">REST Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/50 text-xs">
                    {filteredBooks.map((book) => (
                      <tr
                        key={book.id}
                        className="hover:bg-[#1e293b]/85 transition-colors group"
                      >
                        <td className="py-3 px-4 text-center text-[#38bdf8] font-mono font-bold">
                          {book.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white group-hover:text-[#38bdf8] transition-colors">
                            {book.title}
                          </div>
                          <div className="text-[#94a3b8] text-xs">by {book.author}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 border border-slate-700 font-semibold text-[#cbd5e1]">
                            {book.genre}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium">
                          ${book.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-[#94a3b8]">
                          {book.published_year}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-90 sm:opacity-50 group-hover:opacity-100 transition-opacity">
                            {/* View Action - triggers client/details template */}
                            <button
                              onClick={() => handleViewBookDetails(book.id)}
                              className="p-1.5 bg-[#1e293b] hover:bg-[#38bdf8]/10 text-[#94a3b8] hover:text-[#38bdf8] rounded border border-[#334155] transition"
                              title="GET /api/books/:id"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            {/* Postman Shortcut button */}
                            <button
                              onClick={() => loadPostmanTemplate('PUT_CHG', book.id)}
                              className="p-1.5 bg-[#1e293b] hover:bg-amber-500/10 text-[#94a3b8] hover:text-amber-400 rounded border border-[#334155] transition"
                              title="Load in REST Client"
                            >
                              <Code className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Direct UI Edit Action */}
                            <button
                              onClick={() => openEditModal(book)}
                              className="p-1.5 bg-[#1e293b] hover:bg-[#38bdf8]/10 text-[#94a3b8] hover:text-[#38bdf8] rounded border border-[#334155] transition"
                              title="Update Book Details (PUT UI)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Direct UI Delete Action */}
                            <button
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              className="p-1.5 bg-[#1e293b] hover:bg-rose-500/15 text-[#94a3b8] hover:text-rose-400 rounded border border-[#334155] transition"
                              title="Delete Book Record (DELETE UI)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Catalog Footer Stats */}
            <div className="px-5 py-3 bg-[#0f172a]/50 text-[#64748b] text-[11px] flex items-center justify-between border-t border-[#334155] font-mono">
              <span className="flex items-center gap-1">
                <span>Total Catalog: <strong>{books.length} records</strong></span>
                {searchTerm && <span>(Filtered to: <strong>{filteredBooks.length}</strong>)</span>}
              </span>
              <span>Host IP: 127.0.0.1:3306</span>
            </div>
          </div>

          {/* Single Selection Details View Panel */}
          {bookDetails ? (
            <div className="bg-[#1e293b]/40 rounded-2xl border border-[#334155] p-5 relative overflow-hidden transition-all duration-200">
              <button
                onClick={() => setBookDetails(null)}
                className="absolute top-4 right-4 text-[#64748b] hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-start gap-4">
                <div className="bg-[#38bdf8]/10 text-[#38bdf8] p-3 rounded-xl border border-[#38bdf8]/20">
                  <BookOpen className="w-6 h-6" />
                </div>
                
                <div className="space-y-1 select-text flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 uppercase font-bold">
                      ID: {bookDetails.id}
                    </span>
                    <span className="text-[10px] text-[#64748b] font-mono">
                      Endpoint: <code className="text-[#38bdf8]">GET /api/books/{bookDetails.id}</code>
                    </span>
                  </div>
                  
                  <h3 className="text-base font-bold text-white mt-1">{bookDetails.title}</h3>
                  <p className="text-xs text-[#94a3b8]">Author: <strong className="text-white">{bookDetails.author}</strong></p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#334155]/50 text-xs">
                    <div>
                      <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-mono">Genre Class</span>
                      <span className="font-semibold text-[#cbd5e1]">{bookDetails.genre}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-mono">Market Price</span>
                      <span className="font-semibold text-emerald-400 font-mono">${bookDetails.price.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-mono">Year Published</span>
                      <span className="font-semibold text-[#cbd5e1]">{bookDetails.published_year}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-mono">Database Timestamp</span>
                      <span className="font-semibold text-[#cbd5e1] text-[10px] font-mono truncate block" title={bookDetails.created_at}>
                        {new Date(bookDetails.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <button
                      onClick={() => loadPostmanTemplate('GET_SINGLE', bookDetails.id)}
                      className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[#94a3b8] hover:text-white rounded text-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Open GET Request in Postman UI
                    </button>
                    <button
                      onClick={() => loadPostmanTemplate('DEL_BK', bookDetails.id)}
                      className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-rose-400 hover:text-rose-300 rounded text-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      Delete Request mapping
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1e293b]/25 rounded-2xl border border-[#334155]/50 p-6 flex items-center justify-center text-[#64748b] border-dashed">
              <span className="italic text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-[#475569]" />
                Tip: Click the details icon ⓘ on any bookstore item to fetch & analyze live single records and schema outputs.
              </span>
            </div>
          )}
        </section>


        {/* RIGHT COLUMN: Developers Sandbox Client & Simulated Live SQL Output Terminal */}
        <section id="developer-and-tester-sandbox" className="col-span-1 lg:col-span-5 flex flex-col gap-6">
          
          {/* Diagnostic Console Panel Terminal Selector Tabs */}
          <div className="bg-[#1e293b]/60 rounded-2xl border border-[#334155] p-2 flex gap-1 bg-[#1e293b]/80">
            <button
              id="tab-btn-postman"
              onClick={() => setActiveRightTab('postman')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold uppercase font-mono tracking-wider transition duration-150 cursor-pointer ${
                activeRightTab === 'postman'
                  ? 'bg-gradient-to-r from-sky-500/10 to-blue-500/10 text-[#38bdf8] border border-sky-500/20'
                  : 'text-[#94a3b8] hover:bg-[#1e293b]/50 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              REST API Client (Postman)
            </button>
            <button
              id="tab-btn-terminal"
              onClick={() => setActiveRightTab('terminal')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold uppercase font-mono tracking-wider transition duration-150 cursor-pointer ${
                activeRightTab === 'terminal'
                  ? 'bg-gradient-to-r from-sky-500/10 to-blue-500/10 text-[#38bdf8] border border-sky-500/20'
                  : 'text-[#94a3b8] hover:bg-[#1e293b]/50 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              MySQL Terminal CLI
            </button>
            <button
              id="tab-btn-schema"
              onClick={() => setActiveRightTab('schema')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold uppercase font-mono tracking-wider transition duration-150 cursor-pointer ${
                activeRightTab === 'schema'
                  ? 'bg-gradient-to-r from-sky-500/10 to-blue-500/10 text-[#38bdf8] border border-sky-500/20'
                  : 'text-[#94a3b8] hover:bg-[#1e293b]/50 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              SQL Schema
            </button>
          </div>

          {/* TAB CONTENT 1: POSTMAN REST CLIENT */}
          {activeRightTab === 'postman' && (
            <div className="bg-[#1e293b]/60 rounded-2xl border border-[#334155] border-t-0 p-5 pt-0 -mt-6 backdrop-blur-sm space-y-4">
              
              <div className="border-b border-[#334155]/60 pb-3 pt-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Visual API Request Sandbox
                </h3>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">
                  Simulate external client requests (like Postman or cURL) to verify status codes and JSON payloads.
                </p>
              </div>

              {/* REST Client Quick Templates */}
              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#64748b] block mb-2 uppercase">
                  Select Predefined API Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <button
                    onClick={() => loadPostmanTemplate('GET_ALL')}
                    className="py-1 px-1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded text-[10px] text-sky-400 font-mono truncate"
                    title="Retrieve All Books inventory catalog"
                  >
                    GET All
                  </button>
                  <button
                    onClick={() => loadPostmanTemplate('GET_SINGLE')}
                    className="py-1 px-1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded text-[10px] text-sky-400 font-mono truncate"
                    title="Retrieve single entity by ID input"
                  >
                    GET Item
                  </button>
                  <button
                    onClick={() => loadPostmanTemplate('POST_NEW')}
                    className="py-1 px-1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded text-[10px] text-emerald-400 font-mono truncate"
                    title="Insert new book record (POST)"
                  >
                    POST Book
                  </button>
                  <button
                    onClick={() => loadPostmanTemplate('PUT_CHG')}
                    className="py-1 px-1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded text-[10px] text-amber-400 font-mono truncate"
                    title="Modify existing records (PUT)"
                  >
                    PUT Update
                  </button>
                  <button
                    onClick={() => loadPostmanTemplate('DEL_BK')}
                    className="py-1 px-1 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded text-[10px] text-rose-400 font-mono truncate"
                    title="Delete book entry"
                  >
                    DELETE
                  </button>
                </div>
              </div>

              {/* Address bar request input */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-wider text-[#64748b] block uppercase">
                  Request URL Endpoint
                </label>
                <div className="flex gap-1.5">
                  <select
                    id="select-pm-method"
                    value={pmMethod}
                    onChange={(e) => setPmMethod(e.target.value as any)}
                    className="px-3 py-2 bg-[#0d1527] border border-[#334155] rounded-lg text-xs font-bold font-mono tracking-wide text-white focus:outline-none focus:border-[#38bdf8] cursor-pointer"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  
                  <div className="relative flex-1">
                    <input
                      id="input-pm-url"
                      type="text"
                      value={pmUrl}
                      onChange={(e) => setPmUrl(e.target.value)}
                      placeholder="/api/books"
                      className="w-full pl-3 pr-20 py-2 bg-[#0d1527] border border-[#334155] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#38bdf8]"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-[#475569] font-mono">
                      localhost
                    </span>
                  </div>

                  <button
                    id="btn-pm-send"
                    onClick={sendPostmanRequest}
                    disabled={pmSending}
                    className="px-4 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/50 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    {pmSending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send</span>
                  </button>
                </div>
              </div>

              {/* HTTP Headers Configuration Input */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-wider text-[#64748b] block uppercase">
                  Headers Configuration (JSON)
                </span>
                <textarea
                  value={pmHeaders}
                  onChange={(e) => setPmHeaders(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-[#0d1527] border border-[#334155] rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-[#38bdf8]"
                />
              </div>

              {/* POST/PUT Payload Editor input */}
              {(pmMethod === 'POST' || pmMethod === 'PUT') && (
                <div id="pm-payload-section" className="space-y-1">
                  <div className="flex justify-between items-center bg-[#0d1527] hover:bg-[#0f172a] px-3 py-1 border border-[#334155] border-b-0 rounded-t-lg">
                    <span className="text-[10px] font-mono tracking-wider text-[#64748b] block uppercase">
                      Request Raw JSON Body Playload
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono">application/json</span>
                  </div>
                  <textarea
                    id="textarea-pm-body"
                    value={pmBody}
                    onChange={(e) => setPmBody(e.target.value)}
                    rows={6}
                    className="w-full p-2.5 bg-[#0d1527] border border-[#334155] rounded-b-lg text-xs font-mono text-emerald-300 focus:outline-none focus:border-[#38bdf8] whitespace-pre"
                  />
                </div>
              )}

              {/* Response Client Terminal Display */}
              {pmResponse && (
                <div id="pm-response-block" className="space-y-2 border border-[#334155] rounded-lg p-3 bg-[#0b0f19] transition-all duration-300">
                  <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[#64748b]">STATUS:</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        pmResponse.status >= 200 && pmResponse.status < 300
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : pmResponse.status >= 400
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {pmResponse.status} {pmResponse.statusText}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#64748b]" />
                      <span className="text-slate-400 font-bold">{pmResponse.responseTime} ms</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-[#64748b] font-mono tracking-wider block uppercase mb-1">
                      Response Data Payload (JSON Body)
                    </span>
                    <pre className="max-h-52 overflow-y-auto overflow-x-auto text-[11px] font-mono text-[#38bdf8] bg-[#0c1222] p-2.5 rounded border border-[#1e293b]/70 select-text whitespace-pre scrollbar-thin">
                      {pmResponse.body}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 2: DIRECT SQL COMMAND CLI */}
          {activeRightTab === 'terminal' && (
            <div className="bg-[#1e293b]/60 rounded-2xl border border-[#334155] border-t-0 p-5 pt-0 -mt-6 backdrop-blur-sm space-y-4">
              
              <div className="border-b border-[#334155]/60 pb-3 pt-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  MySQL Database Terminal Console
                </h3>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">
                  Direct live access to the mock MySQL engine. Query, insert, or delete using standard SQL syntax lines.
                </p>
              </div>

              {/* Preloaded interactive SQL helpers */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono tracking-wider text-[#64748b] block uppercase">
                  Common SQL Sandbox Query Presets
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSqlQuery('SELECT * FROM books;')}
                    className="py-1 px-2 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] rounded text-[10px] text-slate-300 font-mono"
                  >
                    SELECT *
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT * FROM books WHERE id = 1;')}
                    className="py-1 px-2 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] rounded text-[10px] text-slate-300 font-mono"
                  >
                    SELECT 1
                  </button>
                  <button
                    onClick={() => setSqlQuery("INSERT INTO books (title, author, genre, price, published_year) VALUES ('The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', 15.99, 1925);")}
                    className="py-1 px-2 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] rounded text-[10px] text-slate-300 font-mono max-w-[150px] truncate"
                  >
                    INSERT
                  </button>
                  <button
                    onClick={() => setSqlQuery("UPDATE books SET price = 10.99 WHERE id = 1;")}
                    className="py-1 px-2 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] rounded text-[10px] text-slate-300 font-mono"
                  >
                    UPDATE
                  </button>
                  <button
                    onClick={() => setSqlQuery('DELETE FROM books WHERE id = 4;')}
                    className="py-1 px-2 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] rounded text-[10px] text-slate-300 font-mono"
                  >
                    DELETE
                  </button>
                </div>
              </div>

              {/* Command text editor prompt */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono tracking-wider text-[#64748b] block uppercase">
                    SQL Statement Query Input
                  </label>
                  <span className="text-[9px] text-[#38bdf8] font-mono font-bold">engine: InnoDB / MySQL 8.0</span>
                </div>
                
                <div className="relative">
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-[#0d1527] border border-[#334155] rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-[#38bdf8] whitespace-pre"
                  />
                  <button
                    onClick={runDirectSqlQuery}
                    className="absolute right-3 bottom-3 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-[#0d1527] font-extrabold rounded-lg text-[10px] uppercase tracking-wider font-mono flex items-center gap-1 transition shadow cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Query</span>
                  </button>
                </div>
              </div>

              {/* Direct SQL execution output schema */}
              {sqlResult && (
                <div className="border border-[#334155] rounded-lg p-3.5 bg-[#0b0f19] space-y-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between border-b border-[#334155]/60 pb-1.5">
                    <span className="text-[#64748b] text-[10px] uppercase">Database Response</span>
                    <span className={`text-[10px] font-bold ${sqlResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {sqlResult.success ? '✓ SUCCESS' : '✗ SYNTAX EXCEPTION'}
                    </span>
                  </div>

                  <p className="text-[#94a3b8] text-xs">{sqlResult.message}</p>
                  
                  {sqlResult.error && (
                    <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-xs">
                      {sqlResult.error}
                    </div>
                  )}

                  {sqlResult.data && (
                    <div className="mt-2">
                      <span className="text-[9px] text-[#64748b] uppercase block mb-1">Row dataset Output:</span>
                      <pre className="max-h-48 overflow-y-auto text-[10px] text-[#cbd5e1] bg-[#0c1222] p-2 rounded border border-[#1e293b] whitespace-pre-wrap select-text scrollbar-thin">
                        {JSON.stringify(sqlResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 3: SQL SCHEMA VIEW (Assessment Criterion helper) */}
          {activeRightTab === 'schema' && (
            <div className="bg-[#1e293b]/60 rounded-2xl border border-[#334155] border-t-0 p-5 pt-0 -mt-6 backdrop-blur-sm space-y-4">
              
              <div className="border-b border-[#334155]/60 pb-3 pt-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  MySQL Database Schema Model Design
                </h3>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">
                  Review the exact database & table schema blueprints configured on the back-end MySQL environment.
                </p>
              </div>

              <div className="rounded-lg bg-[#0b0f19] border border-[#334155] p-3 text-[11px] font-mono space-y-3">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 text-[#64748b]">
                  <span>FILE: src/schema.sql</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">DDL Script</span>
                </div>

                <pre className="text-[10px] text-slate-300 overflow-x-auto whitespace-pre bg-[#0c1222] p-2 rounded max-h-72 scrollbar-thin">
{`-- MySQL Books Table Definitions
CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  author VARCHAR(100) NOT NULL,
  genre VARCHAR(50) DEFAULT 'General',
  price DECIMAL(10, 2) NOT NULL,
  published_year INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;`}
                </pre>

                <div className="text-xs text-[#94a3b8] italic">
                  Note: The simulated database is synced in-memory and persisted into a local JSON store module to maintain integrity across dev environments, and we provide concrete MySQL-Ready connectors (`mysql2` code pattern) for production transitions.
                </div>
              </div>
            </div>
          )}

          {/* SERVER LOGS & ACTIVE OPERATIONS CONSOLE OUTLET */}
          <div className="bg-[#1e293b]/60 rounded-2xl border border-[#334155] overflow-hidden backdrop-blur-sm flex-1 flex flex-col h-full">
            <div className="px-5 py-3 border-b border-[#334155] bg-[#1e293b]/85 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#38bdf8]" />
                <h3 className="font-bold text-xs tracking-wide text-white font-mono uppercase">
                  Simulated MySQL Host & HTTP Activity logs
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoPollLogs(!autoPollLogs)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition ${
                    autoPollLogs 
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/25' 
                      : 'bg-[#1e293b] text-[#64748b] border border-[#334155]'
                  }`}
                  title="Toggle automatic log polling"
                >
                  {autoPollLogs ? '● LIVE' : '○ PAUSED'}
                </button>
                <button
                  onClick={handleClearLogs}
                  className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/15 text-[#94a3b8] hover:text-rose-400 rounded border border-[#334155] transition"
                >
                  Clear Console Clear
                </button>
              </div>
            </div>

            {/* Logs Body Streams Console */}
            <div className="p-4 flex-1 bg-[#0b0f19] overflow-y-auto max-h-[350px] font-mono text-[11px] space-y-2 select-text scrollbar-thin">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-[#475569] italic">
                  Database console idling. Try hitting the API or database above.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border-b border-[#1e293b]/70 pb-2 flex flex-col gap-1.5 last:border-0">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded font-extrabold ${
                          log.type === 'sql' 
                            ? 'bg-cyan-500/10 text-cyan-400' 
                            : log.type === 'http' 
                            ? 'bg-amber-500/10 text-amber-400' 
                            : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {log.type.toUpperCase()}
                        </span>
                        <span className="text-[#475569]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        log.status === 'success' ? 'bg-emerald-400' : log.status === 'error' ? 'bg-rose-400' : 'bg-[#38bdf8]'
                      }`}></span>
                    </div>

                    <p className={`text-xs ${log.status === 'error' ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                      {log.message}
                    </p>

                    {log.query && (
                      <pre className="p-2 bg-[#0c1222] text-[#38bdf8] border border-[#1e293b] rounded whitespace-pre overflow-x-auto text-[10px] scrollbar-thin">
                        {log.query}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </main>

      {/* MODAL DIALOG: BOOK CREATE / EDIT */}
      {isModalOpen && (
        <div id="book-modal-backdrop" className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div
            id="book-modal-box"
            className="bg-[#1e293b] border border-[#334155] rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-4"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[#94a3b8] hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <BookIcon className="w-5 h-5 text-[#38bdf8]" />
                {modalMode === 'add' ? 'Add New Bookstore Record' : `Modify Bookstore Book ID: ${formId}`}
              </h3>
              <p className="text-xs text-[#94a3b8]">
                {modalMode === 'add' 
                  ? 'This action triggers server post API maps and runs raw simulated MySQL queries.'
                  : 'This updates current inventory state with validation logic.'}
              </p>
            </div>

            <form onSubmit={handleAddOrEditBookSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Book Title <span className="text-rose-400">*</span></label>
                <input
                  id="input-form-title"
                  type="text"
                  required
                  placeholder="e.g. In Search of Lost Time"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#0d1527] border border-[#334155] rounded-lg text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Author Name <span className="text-rose-400">*</span></label>
                <input
                  id="input-form-author"
                  type="text"
                  required
                  placeholder="e.g. Marcel Proust"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  className="w-full p-2.5 bg-[#0d1527] border border-[#334155] rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">Genre Class</label>
                  <input
                    id="input-form-genre"
                    type="text"
                    placeholder="e.g. Classic / Science"
                    value={formGenre}
                    onChange={(e) => setFormGenre(e.target.value)}
                    className="w-full p-2.5 bg-[#0d1527] border border-[#334155] rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">Published Year</label>
                  <input
                    id="input-form-year"
                    type="number"
                    placeholder="2026"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full p-2.5 bg-[#0d1527] border border-[#334155] rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Market Catalog Price ($USD) <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-mono text-emerald-400 font-bold">$</span>
                  <input
                    id="input-form-price"
                    type="text"
                    required
                    placeholder="14.99"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-[#0d1527] border border-[#334155] rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  id="btn-form-submit"
                  type="submit"
                  className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold rounded-lg shadow-md flex items-center gap-1.5"
                >
                  {modalMode === 'add' ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  <span>{modalMode === 'add' ? 'Insert Record' : 'Save Updates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Application Toast Alerts */}
      {feedbackMsg && (
        <div
          id="system-toast-alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 border rounded-xl text-xs font-semibold shadow-2xl transition duration-300 ${
            feedbackMsg.error
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {feedbackMsg.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}
    </div>
  );
}
