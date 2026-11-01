// Book Library Management System
// Using localStorage as relational database with multiple tables

class BookLibrary {
    constructor() {
        this.currentUser = null;
        this.editingBookId = null;
        this.editingAuthorId = null;
        this.editingCategoryId = null;
        this.editingUserId = null;
        
        this.initializeDatabase();
        this.setupEventListeners();
        this.checkSession();
    }
    
    checkSession() {
        const session = localStorage.getItem('booklib_session');
        if (session) {
            try {
                const user = JSON.parse(session);
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const validUser = users.find(u => u.id === user.id && u.username === user.username);
                if (validUser) {
                    this.currentUser = validUser;
                    const splash = document.getElementById('splashScreen');
                    if (splash) splash.style.display = 'none';
                    document.getElementById('loginScreen').style.display = 'none';
                    document.getElementById('appScreen').style.display = 'block';
                    document.getElementById('currentUser').textContent = `${validUser.fullName} (${validUser.role})`;
                    if (validUser.role !== 'Administrator') {
                        document.getElementById('usersNavItem').style.display = 'none';
                    } else {
                        document.getElementById('usersNavItem').style.display = 'block';
                    }
                    this.loadAllData();
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    document.querySelector('.nav-link[data-page="dashboard"]').classList.add('active');
                    this.switchPage('dashboard');
                    return;
                }
            } catch (e) {
                localStorage.removeItem('booklib_session');
            }
        }
        this.showSplash();
    }
    
    showSplash() {
        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            if (splash) {
                splash.style.display = 'none';
            }
            document.getElementById('loginScreen').style.display = 'block';
        }, 2000);
    }
    
    initializeDatabase() {
        // Initialize users table
        if (!localStorage.getItem('users')) {
            const users = [
                {
                    id: 1,
                    username: 'admin',
                    fullName: 'System Administrator',
                    role: 'Administrator',
                    password: 'admin123'
                }
            ];
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        // Initialize authors table
        if (!localStorage.getItem('authors')) {
            const authors = [
                { id: 1, fullName: 'J.K. Rowling', email: 'jk@example.com', country: 'United Kingdom' },
                { id: 2, fullName: 'George Orwell', email: 'orwell@example.com', country: 'United Kingdom' },
                { id: 3, fullName: 'Harper Lee', email: 'harper@example.com', country: 'United States' }
            ];
            localStorage.setItem('authors', JSON.stringify(authors));
        }
        
        // Initialize categories table
        if (!localStorage.getItem('categories')) {
            const categories = [
                { id: 1, name: 'Fantasy', description: 'Fantasy and magical stories' },
                { id: 2, name: 'Fiction', description: 'Fictional literature' },
                { id: 3, name: 'Classic', description: 'Classic literature' }
            ];
            localStorage.setItem('categories', JSON.stringify(categories));
        }
        
        // Initialize books table
        if (!localStorage.getItem('books')) {
            const books = [
                {
                    id: 1,
                    title: 'Harry Potter and the Philosopher\'s Stone',
                    isbn: '978-0-7475-3269-9',
                    authorId: 1,
                    categoryId: 1,
                    year: 1997,
                    quantity: 5,
                    availability: 'Available'
                },
                {
                    id: 2,
                    title: '1984',
                    isbn: '978-0-452-28423-4',
                    authorId: 2,
                    categoryId: 3,
                    year: 1949,
                    quantity: 3,
                    availability: 'Available'
                },
                {
                    id: 3,
                    title: 'To Kill a Mockingbird',
                    isbn: '978-0-06-112008-4',
                    authorId: 3,
                    categoryId: 3,
                    year: 1960,
                    quantity: 0,
                    availability: 'Unavailable'
                }
            ];
            localStorage.setItem('books', JSON.stringify(books));
        }
    }
    
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
        
        // Navigation
        const navLinks = document.querySelectorAll('.nav-link[data-page]');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const page = link.getAttribute('data-page');
                if (page === 'users' && this.currentUser && this.currentUser.role !== 'Administrator') {
                    return;
                }
                this.switchPage(page);
                
                // Update active nav
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
        
        // Mobile nav toggle
        document.getElementById('navToggle').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('navMenu').classList.add('active');
            document.getElementById('navOverlay').classList.add('active');
        });
        
        document.getElementById('navMenuClose').addEventListener('click', () => {
            document.getElementById('navMenu').classList.remove('active');
            document.getElementById('navOverlay').classList.remove('active');
        });
        
        document.getElementById('navOverlay').addEventListener('click', () => {
            document.getElementById('navMenu').classList.remove('active');
            document.getElementById('navOverlay').classList.remove('active');
        });
        
        // Close mobile nav when clicking a nav link
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', () => {
                const page = link.getAttribute('data-page');
                if (page === 'users' && this.currentUser && this.currentUser.role !== 'Administrator') {
                    return;
                }
                document.getElementById('navMenu').classList.remove('active');
                document.getElementById('navOverlay').classList.remove('active');
            });
        });
        document.getElementById('logoutBtn').addEventListener('click', () => {
            document.getElementById('navMenu').classList.remove('active');
            document.getElementById('navOverlay').classList.remove('active');
            this.logout();
        });
        
        // Book buttons
        document.getElementById('addBookBtn').addEventListener('click', () => {
            this.openBookModal();
        });
        
        // Author buttons
        document.getElementById('addAuthorBtn').addEventListener('click', () => {
            this.openAuthorModal();
        });
        
        // Category buttons
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.openCategoryModal();
        });
        
        // User buttons
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.openUserModal();
        });
        
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
        document.querySelectorAll('.modal-close, .modal-actions .btn-secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-modal');
                if (modalId) {
                    document.getElementById(modalId).classList.remove('active');
                } else {
                    btn.closest('.modal').classList.remove('active');
                }
            });
        });
        
        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
    
    handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
        if (!username || !password) {
            errorDiv.textContent = 'Please enter username and password';
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.currentUser = user;
            localStorage.setItem('booklib_session', JSON.stringify({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role
            }));
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            document.getElementById('currentUser').textContent = `${user.fullName} (${user.role})`;
            
            // Hide users nav for non-admin
            if (user.role !== 'Administrator') {
                document.getElementById('usersNavItem').style.display = 'none';
            } else {
                document.getElementById('usersNavItem').style.display = 'block';
            }
            
            errorDiv.textContent = '';
            this.loadAllData();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('.nav-link[data-page="dashboard"]').classList.add('active');
            this.switchPage('dashboard');
        } else {
            errorDiv.textContent = 'Invalid username or password';
        }
    }
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('booklib_session');
        document.getElementById('appScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').textContent = '';
        document.getElementById('usersNavItem').style.display = 'block';
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const navMenu = document.getElementById('navMenu');
        const navOverlay = document.getElementById('navOverlay');
        if (navMenu) navMenu.classList.remove('active');
        if (navOverlay) navOverlay.classList.remove('active');
    }
    
    switchPage(pageName) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${pageName}`);
        if (pageEl) {
            pageEl.classList.add('active');
        }
        
        if (pageName === 'dashboard') {
            this.loadDashboard();
        } else if (pageName === 'books') {
            this.loadBooks();
        } else if (pageName === 'authors') {
            this.loadAuthors();
        } else if (pageName === 'categories') {
            this.loadCategories();
        } else if (pageName === 'users') {
            if (this.currentUser && this.currentUser.role === 'Administrator') {
                this.loadUsers();
            } else {
                this.switchPage('dashboard');
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                document.querySelector('.nav-link[data-page="dashboard"]').classList.add('active');
                return;
            }
        }
    }
    
    loadAllData() {
        this.loadDashboard();
        this.loadBooks();
        this.loadAuthors();
        this.loadCategories();
        if (this.currentUser && this.currentUser.role === 'Administrator') {
            this.loadUsers();
        }
    }
    
    loadDashboard() {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const authors = JSON.parse(localStorage.getItem('authors') || '[]');
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        
        const available = books.filter(b => b.availability === 'Available').length;
        
        document.getElementById('statBooks').textContent = books.length;
        document.getElementById('statAvailable').textContent = available;
        document.getElementById('statAuthors').textContent = authors.length;
        document.getElementById('statCategories').textContent = categories.length;
        
        // Recent books
        const recentBooks = books.slice(-5).reverse();
        const tbody = document.getElementById('recentBooksTable');
        tbody.innerHTML = '';
        
        recentBooks.forEach(book => {
            const author = authors.find(a => a.id === book.authorId);
            const category = categories.find(c => c.id === book.categoryId);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this.escapeHtml(book.title)}</td>
                <td>${author ? this.escapeHtml(author.fullName) : 'N/A'}</td>
                <td>${category ? this.escapeHtml(category.name) : 'N/A'}</td>
                <td>${this.escapeHtml(book.isbn)}</td>
                <td><span class="status-badge status-${book.availability.toLowerCase()}">${book.availability}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    loadBooks() {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const authors = JSON.parse(localStorage.getItem('authors') || '[]');
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        
        const tbody = document.getElementById('booksTable');
        tbody.innerHTML = '';
        
        books.forEach(book => {
            const author = authors.find(a => a.id === book.authorId);
            const category = categories.find(c => c.id === book.categoryId);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${book.id}</td>
                <td>${this.escapeHtml(book.title)}</td>
                <td>${author ? this.escapeHtml(author.fullName) : 'N/A'}</td>
                <td>${category ? this.escapeHtml(category.name) : 'N/A'}</td>
                <td>${this.escapeHtml(book.isbn)}</td>
                <td>${book.year}</td>
                <td>${book.quantity}</td>
                <td><span class="status-badge status-${book.availability.toLowerCase()}">${book.availability}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="app.viewBook(${book.id})">View</button>
                    <button class="btn btn-sm btn-secondary" onclick="app.editBook(${book.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteBook(${book.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Populate author and category dropdowns in modal
        this.populateBookFormDropdowns();
    }
    
    populateBookFormDropdowns() {
        const authors = JSON.parse(localStorage.getItem('authors') || '[]');
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        
        const authorSelect = document.getElementById('bookAuthor');
        const categorySelect = document.getElementById('bookCategory');
        
        authorSelect.innerHTML = '<option value="">Select Author</option>';
        authors.forEach(author => {
            const option = document.createElement('option');
            option.value = author.id;
            option.textContent = author.fullName;
            authorSelect.appendChild(option);
        });
        
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }
    
    openBookModal() {
        this.editingBookId = null;
        document.getElementById('bookModalTitle').textContent = 'Add Book';
        document.getElementById('bookForm').reset();
        document.getElementById('bookId').value = '';
        this.populateBookFormDropdowns();
        document.getElementById('bookModal').classList.add('active');
    }
    
    editBook(id) {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const book = books.find(b => b.id === parseInt(id));
        if (!book) {
            alert('Book not found');
            return;
        }
        
        this.editingBookId = book.id;
        document.getElementById('bookModalTitle').textContent = 'Edit Book';
        document.getElementById('bookId').value = book.id;
        this.populateBookFormDropdowns();
        document.getElementById('bookTitle').value = book.title;
        document.getElementById('bookISBN').value = book.isbn;
        document.getElementById('bookAuthor').value = book.authorId;
        document.getElementById('bookCategory').value = book.categoryId;
        document.getElementById('bookYear').value = book.year;
        document.getElementById('bookQuantity').value = book.quantity;
        document.getElementById('bookAvailability').value = book.availability;
        document.getElementById('bookModal').classList.add('active');
    }
    
    saveBook() {
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
        
        const authorId = parseInt(authorIdVal);
        const categoryId = parseInt(categoryIdVal);
        const year = parseInt(yearVal);
        const quantity = parseInt(quantityVal);
        
        if (isNaN(authorId) || isNaN(categoryId) || isNaN(year) || isNaN(quantity)) {
            alert('Please fill in all required fields correctly');
            return;
        }
        
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        
        if (this.editingBookId) {
            const index = books.findIndex(b => b.id === this.editingBookId);
            if (index > -1) {
                books[index] = {
                    ...books[index],
                    title,
                    isbn,
                    authorId,
                    categoryId,
                    year,
                    quantity,
                    availability
                };
            }
        } else {
            const newId = books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;
            books.push({
                id: newId,
                title,
                isbn,
                authorId,
                categoryId,
                year,
                quantity,
                availability
            });
        }
        
        localStorage.setItem('books', JSON.stringify(books));
        document.getElementById('bookModal').classList.remove('active');
        this.loadBooks();
        this.loadDashboard();
    }
    
    viewBook(id) {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const authors = JSON.parse(localStorage.getItem('authors') || '[]');
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        
        const book = books.find(b => b.id === id);
        if (!book) return;
        
        const author = authors.find(a => a.id === book.authorId);
        const category = categories.find(c => c.id === book.categoryId);
        
        document.getElementById('viewBookTitle').textContent = book.title;
        document.getElementById('viewBookISBN').textContent = book.isbn;
        document.getElementById('viewBookAuthor').textContent = author ? author.fullName : 'N/A';
        document.getElementById('viewBookCategory').textContent = category ? category.name : 'N/A';
        document.getElementById('viewBookYear').textContent = book.year;
        document.getElementById('viewBookQuantity').textContent = book.quantity;
        document.getElementById('viewBookAvailability').textContent = book.availability;
        
        document.getElementById('viewBookModal').classList.add('active');
    }
    
    deleteBook(id) {
        if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
            return;
        }
        
        let books = JSON.parse(localStorage.getItem('books') || '[]');
        books = books.filter(b => b.id !== parseInt(id));
        localStorage.setItem('books', JSON.stringify(books));
        this.loadBooks();
        this.loadDashboard();
    }
    
    loadAuthors() {
        const authors = JSON.parse(localStorage.getItem('authors') || '[]');
        const tbody = document.getElementById('authorsTable');
        tbody.innerHTML = '';
        
        authors.forEach(author => {
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
    
    editAuthor(id) {
        const authors = JSON.parse(localStorage.getItem('authors') || '[]');
        const author = authors.find(a => a.id === id);
        if (!author) return;
        
        this.editingAuthorId = id;
        document.getElementById('authorModalTitle').textContent = 'Edit Author';
        document.getElementById('authorId').value = author.id;
        document.getElementById('authorName').value = author.fullName;
        document.getElementById('authorEmail').value = author.email;
        document.getElementById('authorCountry').value = author.country;
        document.getElementById('authorModal').classList.add('active');
    }
    
    saveAuthor() {
        const fullName = document.getElementById('authorName').value.trim();
        const email = document.getElementById('authorEmail').value.trim();
        const country = document.getElementById('authorCountry').value.trim();
        
        if (!fullName || !email || !country) {
            alert('Please fill in all required fields');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        const authors = JSON.parse(localStorage.getItem('authors') || '[]');
        
        if (this.editingAuthorId) {
            const index = authors.findIndex(a => a.id === this.editingAuthorId);
            if (index > -1) {
                authors[index] = {
                    ...authors[index],
                    fullName,
                    email,
                    country
                };
            }
        } else {
            const newId = authors.length > 0 ? Math.max(...authors.map(a => a.id)) + 1 : 1;
            authors.push({
                id: newId,
                fullName,
                email,
                country
            });
        }
        
        localStorage.setItem('authors', JSON.stringify(authors));
        document.getElementById('authorModal').classList.remove('active');
        this.loadAuthors();
        this.loadDashboard();
        this.populateBookFormDropdowns();
    }
    
    deleteAuthor(id) {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const hasBooks = books.some(b => b.authorId === id);
        
        if (hasBooks) {
            alert('Cannot delete this author because there are books associated with them.');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this author?')) {
            return;
        }
        
        let authors = JSON.parse(localStorage.getItem('authors') || '[]');
        authors = authors.filter(a => a.id !== id);
        localStorage.setItem('authors', JSON.stringify(authors));
        this.loadAuthors();
        this.loadDashboard();
    }
    
    loadCategories() {
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        const tbody = document.getElementById('categoriesTable');
        tbody.innerHTML = '';
        
        categories.forEach(category => {
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
    
    editCategory(id) {
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        const category = categories.find(c => c.id === id);
        if (!category) return;
        
        this.editingCategoryId = id;
        document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryDescription').value = category.description;
        document.getElementById('categoryModal').classList.add('active');
    }
    
    saveCategory() {
        const name = document.getElementById('categoryName').value.trim();
        const description = document.getElementById('categoryDescription').value.trim();
        
        if (!name || !description) {
            alert('Please fill in all required fields');
            return;
        }
        
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        
        if (this.editingCategoryId) {
            const index = categories.findIndex(c => c.id === this.editingCategoryId);
            if (index > -1) {
                categories[index] = {
                    ...categories[index],
                    name,
                    description
                };
            }
        } else {
            const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
            categories.push({
                id: newId,
                name,
                description
            });
        }
        
        localStorage.setItem('categories', JSON.stringify(categories));
        document.getElementById('categoryModal').classList.remove('active');
        this.loadCategories();
        this.loadDashboard();
        this.populateBookFormDropdowns();
    }
    
    deleteCategory(id) {
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const hasBooks = books.some(b => b.categoryId === id);
        
        if (hasBooks) {
            alert('Cannot delete this category because there are books associated with it.');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this category?')) {
            return;
        }
        
        let categories = JSON.parse(localStorage.getItem('categories') || '[]');
        categories = categories.filter(c => c.id !== id);
        localStorage.setItem('categories', JSON.stringify(categories));
        this.loadCategories();
        this.loadDashboard();
    }
    
    loadUsers() {
        if (this.currentUser && this.currentUser.role !== 'Administrator') {
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.fullName)}</td>
                <td><span class="status-badge status-${user.role === 'Administrator' ? 'admin' : 'user'}">${user.role}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="app.editUser(${user.id})">Edit</button>
                    ${user.id !== this.currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="app.deleteUser(${user.id})">Delete</button>` : ''}
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
        document.getElementById('userModal').classList.add('active');
    }
    
    editUser(id) {
        if (this.currentUser && this.currentUser.role !== 'Administrator') {
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.id === id);
        if (!user) return;
        
        this.editingUserId = id;
        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('userId').value = user.id;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userFullName').value = user.fullName;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userPassword').value = user.password;
        document.getElementById('userModal').classList.add('active');
    }
    
    saveUser() {
        if (this.currentUser && this.currentUser.role !== 'Administrator') {
            alert('Only administrators can manage users');
            return;
        }
        
        const username = document.getElementById('userUsername').value.trim();
        const fullName = document.getElementById('userFullName').value.trim();
        const role = document.getElementById('userRole').value;
        const password = document.getElementById('userPassword').value;
        
        if (!username || !fullName || !role || !password) {
            alert('Please fill in all required fields');
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Check for duplicate username
        if (!this.editingUserId) {
            if (users.some(u => u.username === username)) {
                alert('Username already exists');
                return;
            }
        } else {
            if (users.some(u => u.username === username && u.id !== this.editingUserId)) {
                alert('Username already exists');
                return;
            }
        }
        
        if (this.editingUserId) {
            const index = users.findIndex(u => u.id === this.editingUserId);
            if (index > -1) {
                users[index] = {
                    ...users[index],
                    username,
                    fullName,
                    role,
                    password
                };
            }
        } else {
            const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
            users.push({
                id: newId,
                username,
                fullName,
                role,
                password
            });
        }
        
        localStorage.setItem('users', JSON.stringify(users));
        document.getElementById('userModal').classList.remove('active');
        this.loadUsers();
    }
    
    deleteUser(id) {
        if (this.currentUser && this.currentUser.role !== 'Administrator') {
            return;
        }
        
        if (id === this.currentUser.id) {
            alert('Cannot delete your own account');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }
        
        let users = JSON.parse(localStorage.getItem('users') || '[]');
        users = users.filter(u => u.id !== id);
        localStorage.setItem('users', JSON.stringify(users));
        this.loadUsers();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
const app = new BookLibrary();
