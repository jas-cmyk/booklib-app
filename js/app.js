// Book Library Management System
// Frontend: talks to the Express + MySQL API in /server.

async function apiRequest(path, options = {}) {
    const response = await fetch(`/api${path}`, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
    });

    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (_) {
            // A static file server (e.g. VS Code Live Server) returns HTML for /api.
            data = {
                error: response.status === 404
                    ? 'API server not found. Open the app at http://localhost:3000 (or enable the Live Server proxy).'
                    : `Server returned ${response.status} ${response.statusText || ''}`.trim(),
            };
        }
    }

    if (!response.ok) {
        const error = new Error((data && data.error) || `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }

    return data;
}

const api = {
    get: (path) => apiRequest(path),
    post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
    del: (path) => apiRequest(path, { method: 'DELETE' }),
};

class BookLibrary {
    constructor() {
        this.currentUser = null;
        this.editingBookId = null;
        this.editingAuthorId = null;
        this.editingCategoryId = null;
        this.editingUserId = null;

        this.books = [];
        this.authors = [];
        this.categories = [];
        this.users = [];
        this.lookupsLoaded = false;

        this.setupEventListeners();
        this.init();
    }

    async init() {
        try {
            const user = await api.get('/auth/me');
            await this.enterApp(user);
        } catch (err) {
            this.showSplash();
            if (err.status !== 401) {
                setTimeout(() => {
                    const errorDiv = document.getElementById('loginError');
                    if (errorDiv) errorDiv.textContent = err.message || 'Could not reach the server.';
                }, 2100);
            }
        }
    }

    showSplash() {
        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            if (splash) splash.style.display = 'none';
            document.getElementById('loginScreen').style.display = 'block';
        }, 2000);
    }

    async enterApp(user) {
        this.currentUser = user;
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';

        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        document.getElementById('currentUser').textContent = `${user.fullName} (${user.role})`;
        document.getElementById('usersNavItem').style.display =
            user.role === 'Administrator' ? 'block' : 'none';

        document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
        const dashLink = document.querySelector('.nav-link[data-page="dashboard"]');
        if (dashLink) dashLink.classList.add('active');

        await this.switchPage('dashboard');
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation + mobile drawer
        const navLinks = document.querySelectorAll('.nav-link[data-page]');
        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                const page = link.getAttribute('data-page');
                if (page === 'users' && (!this.currentUser || this.currentUser.role !== 'Administrator')) {
                    return;
                }
                this.closeMobileNav();
                this.switchPage(page);
                navLinks.forEach((l) => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        document.getElementById('navToggle').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('navMenu').classList.add('active');
            document.getElementById('navOverlay').classList.add('active');
        });

        document.getElementById('navMenuClose').addEventListener('click', () => this.closeMobileNav());
        document.getElementById('navOverlay').addEventListener('click', () => this.closeMobileNav());

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.closeMobileNav();
            this.logout();
        });

        // Add buttons
        document.getElementById('addBookBtn').addEventListener('click', () => this.openBookModal());
        document.getElementById('addAuthorBtn').addEventListener('click', () => this.openAuthorModal());
        document.getElementById('addCategoryBtn').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('addUserBtn').addEventListener('click', () => this.openUserModal());

        // Forms
        document.getElementById('bookForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBook();
        });
        document.getElementById('authorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAuthor();
        });
        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategory();
        });
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-actions .btn-secondary').forEach((btn) => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-modal');
                if (modalId) {
                    document.getElementById(modalId).classList.remove('active');
                } else {
                    const modal = btn.closest('.modal');
                    if (modal) modal.classList.remove('active');
                }
            });
        });

        // Close modal when clicking the backdrop
        document.querySelectorAll('.modal').forEach((modal) => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach((m) => m.classList.remove('active'));
                this.closeMobileNav();
            }
        });

        // Scrolling over a focused number input changes its value (Chrome/Firefox),
        // which is how the year field ended up as -1. Blur it so the page scrolls instead.
        document.querySelectorAll('input[type="number"]').forEach((input) => {
            input.addEventListener('wheel', () => input.blur(), { passive: true });
        });
    }

    closeMobileNav() {
        document.getElementById('navMenu').classList.remove('active');
        document.getElementById('navOverlay').classList.remove('active');
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        if (!username || !password) {
            errorDiv.textContent = 'Please enter username and password';
            return;
        }

        try {
            const user = await api.post('/auth/login', { username, password });
            errorDiv.textContent = '';
            document.getElementById('loginForm').reset();
            await this.enterApp(user);
        } catch (err) {
            errorDiv.textContent = err.message || 'Invalid username or password';
        }
    }

    async logout() {
        try {
            await api.post('/auth/logout');
        } catch (_) {
            // The local UI is reset even if the server request fails.
        }
        this.currentUser = null;
        document.getElementById('appScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').textContent = '';
        document.getElementById('usersNavItem').style.display = 'block';
        document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
        this.closeMobileNav();
    }

    async switchPage(pageName) {
        if (pageName === 'users' && (!this.currentUser || this.currentUser.role !== 'Administrator')) {
            pageName = 'dashboard';
            document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
            const dashLink = document.querySelector('.nav-link[data-page="dashboard"]');
            if (dashLink) dashLink.classList.add('active');
        }

        document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${pageName}`);
        if (pageEl) pageEl.classList.add('active');

        try {
            if (pageName === 'dashboard') await this.loadDashboard();
            else if (pageName === 'books') await this.loadBooks();
            else if (pageName === 'authors') await this.loadAuthors();
            else if (pageName === 'categories') await this.loadCategories();
            else if (pageName === 'users') await this.loadUsers();
        } catch (err) {
            this.handleError(err);
        }
    }

    handleError(err) {
        if (err && err.status === 401) {
            this.handleSessionExpired();
            return;
        }
        console.error(err);
        alert((err && err.message) || 'Something went wrong.');
    }

    handleSessionExpired() {
        this.currentUser = null;
        document.getElementById('appScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('loginError').textContent =
            'Your session has expired. Please log in again.';
        document.getElementById('usersNavItem').style.display = 'block';
        this.closeMobileNav();
    }

    async loadDashboard() {
        const data = await api.get('/dashboard');

        document.getElementById('statBooks').textContent = data.stats.books;
        document.getElementById('statAvailable').textContent = data.stats.available;
        document.getElementById('statAuthors').textContent = data.stats.authors;
        document.getElementById('statCategories').textContent = data.stats.categories;

        const tbody = document.getElementById('recentBooksTable');
        tbody.innerHTML = '';

        if (!data.recentBooks.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No books yet.</td></tr>';
            return;
        }

        data.recentBooks.forEach((book) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this.escapeHtml(book.title)}</td>
                <td>${this.escapeHtml(book.authorName)}</td>
                <td>${this.escapeHtml(book.categoryName)}</td>
                <td>${this.escapeHtml(book.isbn)}</td>
                <td><span class="status-badge ${this.statusClass(book.availability)}">${this.escapeHtml(book.availability)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    async loadBooks() {
        const [books, authors, categories] = await Promise.all([
            api.get('/books'),
            api.get('/authors'),
            api.get('/categories'),
        ]);

        this.books = books;
        this.authors = authors;
        this.categories = categories;
        this.lookupsLoaded = true;

        const tbody = document.getElementById('booksTable');
        tbody.innerHTML = '';

        if (!books.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No books yet.</td></tr>';
        }

        books.forEach((book) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${book.id}</td>
                <td>${this.escapeHtml(book.title)}</td>
                <td>${this.escapeHtml(book.authorName)}</td>
                <td>${this.escapeHtml(book.categoryName)}</td>
                <td>${this.escapeHtml(book.isbn)}</td>
                <td>${book.year}</td>
                <td>${book.quantity}</td>
                <td><span class="status-badge ${this.statusClass(book.availability)}">${this.escapeHtml(book.availability)}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="app.viewBook(${book.id})">View</button>
                    <button class="btn btn-sm btn-secondary" onclick="app.editBook(${book.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteBook(${book.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        this.populateBookFormDropdowns();
    }

    populateBookFormDropdowns() {
        const authorSelect = document.getElementById('bookAuthor');
        const categorySelect = document.getElementById('bookCategory');
        if (!authorSelect || !categorySelect) return;

        authorSelect.innerHTML = '<option value="">Select Author</option>';
        this.authors.forEach((author) => {
            const option = document.createElement('option');
            option.value = author.id;
            option.textContent = author.fullName;
            authorSelect.appendChild(option);
        });

        categorySelect.innerHTML = '<option value="">Select Category</option>';
        this.categories.forEach((category) => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    async ensureLookups() {
        if (!this.lookupsLoaded) {
            [this.authors, this.categories] = await Promise.all([
                api.get('/authors'),
                api.get('/categories'),
            ]);
            this.lookupsLoaded = true;
        }
        this.populateBookFormDropdowns();
    }

    async openBookModal() {
        try {
            await this.ensureLookups();
        } catch (err) {
            this.handleError(err);
            return;
        }

        this.editingBookId = null;
        document.getElementById('bookModalTitle').textContent = 'Add Book';
        document.getElementById('bookForm').reset();
        document.getElementById('bookId').value = '';
        document.getElementById('bookYear').value = '';
        document.getElementById('bookQuantity').value = '';
        this.populateBookFormDropdowns();
        document.getElementById('bookModal').classList.add('active');
    }

    async editBook(id) {
        try {
            const book = await api.get(`/books/${id}`);
            await this.ensureLookups();

            this.editingBookId = book.id;
            document.getElementById('bookModalTitle').textContent = 'Edit Book';
            document.getElementById('bookId').value = book.id;
            document.getElementById('bookTitle').value = book.title;
            document.getElementById('bookISBN').value = book.isbn;
            document.getElementById('bookAuthor').value = book.authorId;
            document.getElementById('bookCategory').value = book.categoryId;
            document.getElementById('bookYear').value = book.year;
            document.getElementById('bookQuantity').value = book.quantity;
            document.getElementById('bookAvailability').value = book.availability;
            document.getElementById('bookModal').classList.add('active');
        } catch (err) {
            this.handleError(err);
        }
    }

    async saveBook() {
        const title = document.getElementById('bookTitle').value.trim();
        const isbn = document.getElementById('bookISBN').value.trim();
        const authorIdVal = document.getElementById('bookAuthor').value;
        const categoryIdVal = document.getElementById('bookCategory').value;
        const yearVal = document.getElementById('bookYear').value;
        const quantityVal = document.getElementById('bookQuantity').value;
        const availability = document.getElementById('bookAvailability').value;

        if (!title || !isbn || !authorIdVal || !categoryIdVal || !yearVal || quantityVal === '') {
            alert('Please fill in all required fields');
            return;
        }

        const year = parseInt(yearVal, 10);
        const quantity = parseInt(quantityVal, 10);

        if (!Number.isInteger(year) || year < 1000 || year > 2100) {
            alert('Please enter a valid publication year (1000-2100).');
            document.getElementById('bookYear').focus();
            return;
        }

        if (!Number.isInteger(quantity) || quantity < 0) {
            alert('Quantity must be a whole number of 0 or more.');
            document.getElementById('bookQuantity').focus();
            return;
        }

        const payload = {
            title,
            isbn,
            authorId: parseInt(authorIdVal, 10),
            categoryId: parseInt(categoryIdVal, 10),
            year,
            quantity,
            availability,
        };

        try {
            if (this.editingBookId) {
                await api.put(`/books/${this.editingBookId}`, payload);
            } else {
                await api.post('/books', payload);
            }
            document.getElementById('bookModal').classList.remove('active');
            this.editingBookId = null;
            await Promise.all([this.loadBooks(), this.loadDashboard()]);
        } catch (err) {
            this.handleError(err);
        }
    }

    async viewBook(id) {
        try {
            const book = await api.get(`/books/${id}`);
            document.getElementById('viewBookTitle').textContent = book.title;
            document.getElementById('viewBookISBN').textContent = book.isbn;
            document.getElementById('viewBookAuthor').textContent = book.authorName;
            document.getElementById('viewBookCategory').textContent = book.categoryName;
            document.getElementById('viewBookYear').textContent = book.year;
            document.getElementById('viewBookQuantity').textContent = book.quantity;
            document.getElementById('viewBookAvailability').textContent = book.availability;
            document.getElementById('viewBookModal').classList.add('active');
        } catch (err) {
            this.handleError(err);
        }
    }

    async deleteBook(id) {
        if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
            return;
        }

        try {
            await api.del(`/books/${id}`);
            await Promise.all([this.loadBooks(), this.loadDashboard()]);
        } catch (err) {
            this.handleError(err);
        }
    }

    async loadAuthors() {
        this.authors = await api.get('/authors');
        this.renderAuthors();
    }

    renderAuthors() {
        const tbody = document.getElementById('authorsTable');
        tbody.innerHTML = '';

        if (!this.authors.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No authors yet.</td></tr>';
            return;
        }

        this.authors.forEach((author) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${author.id}</td>
                <td>${this.escapeHtml(author.fullName)}</td>
                <td>${this.escapeHtml(author.email)}</td>
                <td>${this.escapeHtml(author.country)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="app.editAuthor(${author.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteAuthor(${author.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    openAuthorModal() {
        this.editingAuthorId = null;
        document.getElementById('authorModalTitle').textContent = 'Add Author';
        document.getElementById('authorForm').reset();
        document.getElementById('authorId').value = '';
        document.getElementById('authorModal').classList.add('active');
    }

    async editAuthor(id) {
        try {
            if (!this.authors.length) this.authors = await api.get('/authors');
            const author = this.authors.find((a) => a.id === id);
            if (!author) {
                alert('Author not found');
                return;
            }

            this.editingAuthorId = author.id;
            document.getElementById('authorModalTitle').textContent = 'Edit Author';
            document.getElementById('authorId').value = author.id;
            document.getElementById('authorName').value = author.fullName;
            document.getElementById('authorEmail').value = author.email;
            document.getElementById('authorCountry').value = author.country;
            document.getElementById('authorModal').classList.add('active');
        } catch (err) {
            this.handleError(err);
        }
    }

    async saveAuthor() {
        const fullName = document.getElementById('authorName').value.trim();
        const email = document.getElementById('authorEmail').value.trim();
        const country = document.getElementById('authorCountry').value.trim();

        if (!fullName || !email || !country) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            if (this.editingAuthorId) {
                await api.put(`/authors/${this.editingAuthorId}`, { fullName, email, country });
            } else {
                await api.post('/authors', { fullName, email, country });
            }
            document.getElementById('authorModal').classList.remove('active');
            this.editingAuthorId = null;
            this.lookupsLoaded = false;
            await Promise.all([this.loadAuthors(), this.loadDashboard()]);
        } catch (err) {
            this.handleError(err);
        }
    }

    async deleteAuthor(id) {
        if (!confirm('Are you sure you want to delete this author?')) {
            return;
        }

        try {
            await api.del(`/authors/${id}`);
            this.lookupsLoaded = false;
            await Promise.all([this.loadAuthors(), this.loadDashboard()]);
        } catch (err) {
            this.handleError(err);
        }
    }

    async loadCategories() {
        this.categories = await api.get('/categories');
        this.renderCategories();
    }

    renderCategories() {
        const tbody = document.getElementById('categoriesTable');
        tbody.innerHTML = '';

        if (!this.categories.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No categories yet.</td></tr>';
            return;
        }

        this.categories.forEach((category) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${category.id}</td>
                <td>${this.escapeHtml(category.name)}</td>
                <td>${this.escapeHtml(category.description)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="app.editCategory(${category.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteCategory(${category.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    openCategoryModal() {
        this.editingCategoryId = null;
        document.getElementById('categoryModalTitle').textContent = 'Add Category';
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryModal').classList.add('active');
    }

    async editCategory(id) {
        try {
            if (!this.categories.length) this.categories = await api.get('/categories');
            const category = this.categories.find((c) => c.id === id);
            if (!category) {
                alert('Category not found');
                return;
            }

            this.editingCategoryId = category.id;
            document.getElementById('categoryModalTitle').textContent = 'Edit Category';
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryDescription').value = category.description;
            document.getElementById('categoryModal').classList.add('active');
        } catch (err) {
            this.handleError(err);
        }
    }

    async saveCategory() {
        const name = document.getElementById('categoryName').value.trim();
        const description = document.getElementById('categoryDescription').value.trim();

        if (!name || !description) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            if (this.editingCategoryId) {
                await api.put(`/categories/${this.editingCategoryId}`, { name, description });
            } else {
                await api.post('/categories', { name, description });
            }
            document.getElementById('categoryModal').classList.remove('active');
            this.editingCategoryId = null;
            this.lookupsLoaded = false;
            await Promise.all([this.loadCategories(), this.loadDashboard()]);
        } catch (err) {
            this.handleError(err);
        }
    }

    async deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category?')) {
            return;
        }

        try {
            await api.del(`/categories/${id}`);
            this.lookupsLoaded = false;
            await Promise.all([this.loadCategories(), this.loadDashboard()]);
        } catch (err) {
            this.handleError(err);
        }
    }

    async loadUsers() {
        if (!this.currentUser || this.currentUser.role !== 'Administrator') {
            return;
        }

        this.users = await api.get('/users');
        this.renderUsers();
    }

    renderUsers() {
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = '';

        if (!this.users.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No users yet.</td></tr>';
            return;
        }

        this.users.forEach((user) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.fullName)}</td>
                <td><span class="status-badge ${user.role === 'Administrator' ? 'status-admin' : 'status-user'}">${this.escapeHtml(user.role)}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="app.editUser(${user.id})">Edit</button>
                    ${this.currentUser && user.id !== this.currentUser.id
                        ? `<button class="btn btn-sm btn-danger" onclick="app.deleteUser(${user.id})">Delete</button>`
                        : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    openUserModal() {
        this.editingUserId = null;
        document.getElementById('userModalTitle').textContent = 'Add User';
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        const passwordInput = document.getElementById('userPassword');
        passwordInput.required = true;
        passwordInput.placeholder = '';
        document.querySelector('label[for="userPassword"]').textContent = 'Password *';
        document.getElementById('userModal').classList.add('active');
    }

    async editUser(id) {
        if (!this.currentUser || this.currentUser.role !== 'Administrator') {
            return;
        }

        try {
            if (!this.users.length) this.users = await api.get('/users');
            const user = this.users.find((u) => u.id === id);
            if (!user) {
                alert('User not found');
                return;
            }

            this.editingUserId = user.id;
            document.getElementById('userModalTitle').textContent = 'Edit User';
            document.getElementById('userId').value = user.id;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userFullName').value = user.fullName;
            document.getElementById('userRole').value = user.role;

            const passwordInput = document.getElementById('userPassword');
            passwordInput.value = '';
            passwordInput.required = false;
            passwordInput.placeholder = 'Leave blank to keep current password';
            document.querySelector('label[for="userPassword"]').textContent = 'Password';
            document.getElementById('userModal').classList.add('active');
        } catch (err) {
            this.handleError(err);
        }
    }

    async saveUser() {
        if (!this.currentUser || this.currentUser.role !== 'Administrator') {
            alert('Only administrators can manage users');
            return;
        }

        const username = document.getElementById('userUsername').value.trim();
        const fullName = document.getElementById('userFullName').value.trim();
        const role = document.getElementById('userRole').value;
        const password = document.getElementById('userPassword').value;

        if (!username || !fullName || !role || (!this.editingUserId && !password)) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const payload = { username, fullName, role, password };
            const saved = this.editingUserId
                ? await api.put(`/users/${this.editingUserId}`, payload)
                : await api.post('/users', payload);

            document.getElementById('userModal').classList.remove('active');
            this.editingUserId = null;

            // If the admin edited their own account, keep the header/session in sync.
            if (this.currentUser && saved.id === this.currentUser.id) {
                this.currentUser = { ...this.currentUser, ...saved };
                document.getElementById('currentUser').textContent =
                    `${saved.fullName} (${saved.role})`;
                document.getElementById('usersNavItem').style.display =
                    saved.role === 'Administrator' ? 'block' : 'none';

                if (saved.role !== 'Administrator') {
                    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
                    const dashLink = document.querySelector('.nav-link[data-page="dashboard"]');
                    if (dashLink) dashLink.classList.add('active');
                    await this.switchPage('dashboard');
                    return;
                }
            }

            await this.loadUsers();
        } catch (err) {
            this.handleError(err);
        }
    }

    async deleteUser(id) {
        if (!this.currentUser || this.currentUser.role !== 'Administrator') {
            return;
        }

        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            await api.del(`/users/${id}`);
            await this.loadUsers();
        } catch (err) {
            this.handleError(err);
        }
    }

    statusClass(value) {
        const status = String(value || '').toLowerCase();
        return ['available', 'unavailable', 'reserved'].includes(status)
            ? `status-${status}`
            : 'status-available';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }
}

// Initialize the app
const app = new BookLibrary();
