const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDB() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    // Users table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Sessions table (for persistent login)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            userId INTEGER,
            expiresAt DATETIME,
            FOREIGN KEY(userId) REFERENCES users(id)
        )
    `);

    // Vacancies table (User-published)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS vacancies (
            id TEXT PRIMARY KEY,
            userId INTEGER,
            company TEXT,
            title TEXT,
            location TEXT,
            salary INTEGER,
            description TEXT,
            url TEXT,
            postedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id)
        )
    `);

    // Resumes table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            name TEXT,
            specialty TEXT,
            experience TEXT,
            salary INTEGER,
            skills TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id)
        )
    `);

    // Scraped Jobs cache table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            sourceId TEXT,
            title TEXT,
            company TEXT,
            location TEXT,
            description TEXT,
            salary TEXT,
            url TEXT,
            type TEXT,
            postedAt DATETIME,
            region TEXT,
            tags TEXT, -- JSON string
            specialty TEXT
        )
    `);

    // Applications table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            jobId TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id)
        )
    `);

    console.log('Database initialized and tables created.');
}

module.exports = {
    initDB,
    getDB: () => db
};
