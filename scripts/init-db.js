// Creates the `booklib` database, tables, and demo data in XAMPP MySQL.
// Usage: npm run db:init

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_NAME = process.env.DB_NAME || 'booklib';

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, (err, hash) => (err ? reject(err) : resolve(hash)));
    });
}

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true,
    });

    try {
        console.log('Running database/schema.sql ...');
        const schema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
        await connection.query(schema);
        await connection.changeUser({ database: DB_NAME });

        // --- Demo authors -------------------------------------------------
        const [[authorCount]] = await connection.query('SELECT COUNT(*) AS n FROM authors');
        if (Number(authorCount.n) === 0) {
            await connection.query(
                'INSERT INTO authors (id, full_name, email, country) VALUES ?',
                [[
                    [1, 'J.K. Rowling', 'jk@example.com', 'United Kingdom'],
                    [2, 'George Orwell', 'orwell@example.com', 'United Kingdom'],
                    [3, 'Harper Lee', 'harper@example.com', 'United States'],
                ]]
            );
            console.log('Seeded 3 authors.');
        }

        // --- Demo categories ----------------------------------------------
        const [[categoryCount]] = await connection.query('SELECT COUNT(*) AS n FROM categories');
        if (Number(categoryCount.n) === 0) {
            await connection.query(
                'INSERT INTO categories (id, name, description) VALUES ?',
                [[
                    [1, 'Fantasy', 'Fantasy and magical stories'],
                    [2, 'Fiction', 'Fictional literature'],
                    [3, 'Classic', 'Classic literature'],
                ]]
            );
            console.log('Seeded 3 categories.');
        }

        // --- Demo books ---------------------------------------------------
        const [[bookCount]] = await connection.query('SELECT COUNT(*) AS n FROM books');
        if (Number(bookCount.n) === 0) {
            const [authors] = await connection.query('SELECT id, full_name FROM authors');
            const [categories] = await connection.query('SELECT id, name FROM categories');
            const authorId = (name) => (authors.find((a) => a.full_name === name) || {}).id;
            const categoryId = (name) => (categories.find((c) => c.name === name) || {}).id;

            const books = [
                [1, 'Harry Potter and the Philosopher\'s Stone', '978-0-7475-3269-9', authorId('J.K. Rowling'), categoryId('Fantasy'), 1997, 5, 'Available'],
                [2, '1984', '978-0-452-28423-4', authorId('George Orwell'), categoryId('Classic'), 1949, 3, 'Available'],
                [3, 'To Kill a Mockingbird', '978-0-06-112008-4', authorId('Harper Lee'), categoryId('Classic'), 1960, 0, 'Unavailable'],
            ].filter((book) => book[3] && book[4]);

            if (books.length) {
                await connection.query(
                    'INSERT INTO books (id, title, isbn, author_id, category_id, year, quantity, availability) VALUES ?',
                    [books]
                );
                console.log(`Seeded ${books.length} books.`);
            }
        }

        // --- Default administrator ---------------------------------------
        const [[userCount]] = await connection.query('SELECT COUNT(*) AS n FROM users');
        if (Number(userCount.n) === 0) {
            const passwordHash = await hashPassword('admin123');
            await connection.query(
                'INSERT INTO users (username, full_name, role, password_hash) VALUES (?, ?, ?, ?)',
                ['admin', 'System Administrator', 'Administrator', passwordHash]
            );
            console.log('Seeded default administrator: admin / admin123');
        }

        const [[stats]] = await connection.query(`
            SELECT
                (SELECT COUNT(*) FROM users) AS users,
                (SELECT COUNT(*) FROM authors) AS authors,
                (SELECT COUNT(*) FROM categories) AS categories,
                (SELECT COUNT(*) FROM books) AS books
        `);

        console.log('\nDatabase ready.');
        console.log(`  users: ${stats.users}, authors: ${stats.authors}, categories: ${stats.categories}, books: ${stats.books}`);
    } finally {
        await connection.end();
    }
}

main().catch((err) => {
    console.error('\nDatabase init failed.');
    console.error(err.message);
    console.error('\nMake sure MySQL is running in the XAMPP Control Panel and that DB_USER/DB_PASSWORD in .env are correct.');
    process.exitCode = 1;
});
