-- MySQL Database Schema for Bright Future Bookshop
-- Created on 2026-05-27

-- Create database if it doesn't already exist
CREATE DATABASE IF NOT EXISTS bright_future_bookshop;
USE bright_future_bookshop;

-- Create table structure for book inventories
CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  author VARCHAR(100) NOT NULL,
  genre VARCHAR(50) DEFAULT 'General',
  price DECIMAL(10, 2) NOT NULL,
  published_year INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some static dummy data to seed the database initially
INSERT INTO books (title, author, genre, price, published_year) VALUES
('The Alchemist', 'Paulo Coelho', 'Fiction', 12.99, 1988),
('To Kill a Mockingbird', 'Harper Lee', 'Drama', 14.99, 1960),
('1984', 'George Orwell', 'Sci-Fi', 10.50, 1949),
('Pride and Prejudice', 'Jane Austen', 'Classic', 9.99, 1813),
('A Brief History of Time', 'Stephen Hawking', 'Science', 17.95, 1988);
