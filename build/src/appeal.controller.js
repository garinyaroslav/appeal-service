"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.getAll = getAll;
const db_1 = require("./db");
const types_1 = require("./types");
function create(req, res) {
    const { text, topic, created_at } = req.body;
    if (!text || !topic)
        res.status(400).json({ error: "text and topic are required" });
    let insertAppeal;
    if (created_at) {
        if (isNaN(Date.parse(created_at)))
            res.status(400).json({ error: "Invalid created_at format" });
        insertAppeal = db_1.db.prepare(`
      INSERT INTO appeals (text, topic, status, created_at) 
      VALUES (?, ?, ?, ?)
    `);
        insertAppeal.run(text, topic, types_1.AppealStatus.new, created_at);
    }
    else {
        insertAppeal = db_1.db.prepare(`
      INSERT INTO appeals (text, topic, status) 
      VALUES (?, ?, ?)
    `);
        insertAppeal.run(text, topic, types_1.AppealStatus.new);
    }
    res.status(201).json({ message: "Appeal created" });
}
function getAll(req, res) {
    const { startDate, endDate, date } = req.query;
    const isValidDate = (dateStr) => {
        const regex = /^\d{2}-\d{2}-\d{4}$/;
        if (!regex.test(dateStr))
            return false;
        const [day, month, year] = dateStr.split("-");
        const d = new Date(`${year}-${month}-${day}`);
        return (!isNaN(d.getTime()) &&
            d.getDate() === parseInt(day) &&
            d.getMonth() + 1 === parseInt(month) &&
            d.getFullYear() === parseInt(year));
    };
    if (date && !isValidDate(date))
        res.status(400).json({
            error: "Invalid date format. Use strictly DD-MM-YYYY format",
            example: "05-03-2025",
        });
    if (startDate && !isValidDate(startDate))
        res.status(400).json({
            error: "Invalid startDate format. Use strictly DD-MM-YYYY format",
            example: "01-03-2025",
        });
    if (endDate && !isValidDate(endDate))
        res.status(400).json({
            error: "Invalid endDate format. Use strictly DD-MM-YYYY format",
            example: "10-03-2025",
        });
    let query = "SELECT * FROM appeals";
    const params = [];
    if (date) {
        query += " WHERE created_at = ?";
        params.push(date);
    }
    else if (startDate || endDate) {
        query += " WHERE";
        if (startDate) {
            query += " created_at >= ?";
            params.push(startDate);
        }
        if (endDate) {
            query += params.length ? " AND" : "";
            query += " created_at <= ?";
            params.push(endDate);
        }
    }
    try {
        const rows = db_1.db.prepare(query).all(...params);
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({
            error: "Database error",
            details: err.message,
        });
    }
}
