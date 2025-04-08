"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const db = new better_sqlite3_1.default("mydatabase.db", { verbose: console.log });
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    age INTEGER
  )
`);
const insert = db.prepare("INSERT INTO users (name, email, age) VALUES (?, ?, ?)");
insert.run("Иван Иванов", "ivan@example.com", 30);
insert.run("Петр Петров", "petr@example.com", 25);
const users = db.prepare("SELECT * FROM users").all();
console.log(users);
db.close();
