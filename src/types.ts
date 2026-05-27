export interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  price: number;
  published_year: number;
  created_at: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'sql' | 'system' | 'http';
  query?: string;
  message: string;
  status: 'success' | 'info' | 'error';
}

export interface PostmanHistoryItem {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  requestBody?: string;
  responseStatus: number;
  responseStatusText: string;
  responseTime: number;
  responseBody: string;
}
