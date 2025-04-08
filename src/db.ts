import Database from "better-sqlite3";

export const db = new Database("database.db", {
  verbose: console.log,
});

export function initializeDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS appeals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT,
      topic TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cancelledAppealReasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cause TEXT,
      appeal_id INTEGER,
      FOREIGN KEY (appeal_id) REFERENCES appeals(id)
    );

    CREATE TABLE IF NOT EXISTS completedAppealSolutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solution TEXT,
      appeal_id INTEGER,
      FOREIGN KEY (appeal_id) REFERENCES appeals(id)
    );
  `);
}
