# Book Library Management System

A book inventory app with a Node.js/Express backend and a MySQL database provided by XAMPP.
The frontend (`index.html`, `css/`, `js/`) and the backend (`server/`) live in the **same
project directory**, and Express serves both the UI and the REST API.

```
booklib-app/
├── index.html            # frontend markup
├── css/style.css         # frontend styles
├── js/app.js             # frontend logic (calls /api)
├── server/               # Express backend
│   ├── index.js          # app entry point (serves UI + API)
│   ├── db.js             # MySQL connection pool
│   ├── middleware/auth.js
│   └── routes/           # auth, dashboard, books, authors, categories, users
├── database/schema.sql   # tables + relationships
├── scripts/init-db.js    # creates the database and seeds demo data
├── scripts/start-db.js   # starts XAMPP MySQL on the port in .env
├── .env                  # local DB credentials (git-ignored)
└── package.json
```

## Requirements

- [XAMPP](https://www.apachefriends.org/) with **MySQL running**
- Node.js 18+ (tested on Node 24)

## Setup

1. Start XAMPP MySQL.
   - Normal install: open the **XAMPP Control Panel** and click **Start** next to **MySQL**.
   - This machine: port 3306 is already taken by an old standalone MySQL 5.0 service, so
     XAMPP's MariaDB is run on **3307** instead:

     ```bash
     npm run db:start
     ```

   Apache is not required — Express serves the frontend.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Check `.env`. The defaults match a standard XAMPP install (`root`, no password):

   ```env
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=3307          # use 3306 on a normal XAMPP install
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=booklib
   SESSION_SECRET=booklib-local-dev-secret-change-me
   ```

4. Create the database, tables, and demo data:

   ```bash
   npm run db:init
   ```

   You can also import `database/schema.sql` manually at
   <http://localhost/phpmyadmin>, but `npm run db:init` also seeds the admin account.

5. Start the app:

   ```bash
   npm start
   ```

6. Open <http://localhost:3000>.

**Default login:** `admin` / `admin123`

> Do not open `index.html` directly from the filesystem (`file://`). The frontend must be
> loaded through Express so that `/api` requests work.
>
> If you use **VS Code Live Server** (port 5500), the included `.vscode/settings.json`
> proxies `/api/*` to `http://localhost:3000/api/*`. Restart Live Server after adding it.
> Otherwise, open <http://localhost:3000> instead — Live Server alone does not have the API.

## How the pieces connect

```
Browser (index.html + js/app.js)
        │  fetch('/api/...')
        ▼
Express server (server/index.js)  ← serves index.html, css/, js/
        │  mysql2 (connection pool)
        ▼
MySQL in XAMPP  ←→  phpMyAdmin (http://localhost/phpmyadmin)
```

The old `localStorage` "database" has been removed. All data now lives in MySQL:

| Table        | Notes                                                        |
| ------------ | ------------------------------------------------------------ |
| `users`      | bcrypt password hashes, `Administrator` / `User` roles       |
| `authors`    |                                                              |
| `categories` | unique name                                                  |
| `books`      | unique ISBN, foreign keys to authors/categories (`RESTRICT`) |

## API

All endpoints require a login session (cookie), except `POST /api/auth/login`.

| Method | Endpoint              | Description                         |
| ------ | --------------------- | ----------------------------------- |
| POST   | `/api/auth/login`     | Log in                              |
| POST   | `/api/auth/logout`    | Log out                             |
| GET    | `/api/auth/me`        | Current session user                |
| GET    | `/api/dashboard`      | Stats + 5 most recent books         |
| GET    | `/api/books`          | List books (with author/category)   |
| GET    | `/api/books/:id`      | One book                            |
| POST   | `/api/books`          | Create book                         |
| PUT    | `/api/books/:id`      | Update book                         |
| DELETE | `/api/books/:id`      | Delete book                         |
| GET/POST/PUT/DELETE | `/api/authors[/:id]`   | Author CRUD         |
| GET/POST/PUT/DELETE | `/api/categories[/:id]`| Category CRUD       |
| GET/POST/PUT/DELETE | `/api/users[/:id]`     | User CRUD (admin only) |

## Notes

- Passwords are hashed with bcrypt; hashes are never returned by the API.
- The server validates all input (required fields, email format, year/quantity ranges,
  availability values, duplicate ISBN/username/category names).
- Deleting an author or category that still has books is blocked by a foreign key.
- `express-session` uses its in-memory store, which is fine for a school project but
  resets when the server restarts. A production deployment should use a persistent
  session store.
- If port 3000 is busy, change `PORT` in `.env`.
- If XAMPP MySQL is not on port 3306, change `DB_PORT` in `.env`.

### Port conflict on this machine

`netstat` shows `mysqld-nt.exe` (standalone **MySQL 5.0**, service name `MySQL`) listening on
3306. That service does not support `utf8mb4`, so this project uses XAMPP's MariaDB 10.4 on
**3307**:

- `DB_PORT=3307` in `.env`
- start it with `npm run db:start`

To go back to the standard XAMPP setup (port 3306):

1. Open `services.msc` as administrator and stop/disable the old `MySQL` service.
2. Set `DB_PORT=3306` in `.env`.
3. Start MySQL from the XAMPP Control Panel (or run `npm run db:start`).
4. Run `npm run db:init` again if the database does not exist on that server.
