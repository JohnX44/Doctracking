const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app); // Use http server to work with socket.io
const io = socketIo(server); // Initialize socket.io on this server
const PORT = 3000;

// Mock accounts and documents
const accounts = [
    { username: "user1", password: "userpass", role: "user" },
    { username: "user2", password: "userpass", role: "user" },
    { username: "admin1", password: "adminpass", role: "admin" }
];

const documents = [
    {
        ctrlNo: "001",
        received: { date: "2024-11-05", time: "10:00 AM" },
        sender: "John Doe",
        subject: "Budget Approval",
        remarks: "Awaiting approval",
        notation: "Initial Review",
        folderVoucher: "Folder 001",
        dateApprovedNoted: "2024-11-07",
        endorsed: { forwardedTo: "Manager", receivedBy: "Jane Smith" },
        dueDate: "2024-11-15",
        attachments: ["attachment1.pdf", "attachment2.pdf"],
        approvalStatus: {
            received: false,
            sender: false,
            subject: false,
            remarks: false,
            notation: false,
            folderVoucher: false,
            dateApprovedNoted: false,
            endorsed: false,
            dueDate: false,
            attachments: false,
        },
        status: "Pending",
        user: "user1"
    },
    // Additional documents
];

// Set up session
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 * 60 } // Set session expiration to 1 hour (in milliseconds)
}));

// Set up view engine and express layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Redirect root route to the login page
app.get('/', (req, res) => res.redirect('/login'));

// Route to render the login page
app.get('/login', (req, res) => res.render('login'));

// Route to handle login submissions
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const account = accounts.find(acc => acc.username === username && acc.password === password);

    if (account) {
        req.session.user = { username: account.username, role: account.role };
        return res.redirect('/dashboard');
    } else {
        return res.send("Invalid username or password. <a href='/login'>Try again</a>");
    }
});

// General Dashboard Route with Role-Based Access Control
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    if (req.session.user.role === "admin") {
        return res.redirect('/admin/dashboard'); // Redirect admin users to the specific admin dashboard route
    } else if (req.session.user.role === "user") {
        const userDocuments = documents.filter(doc => doc.user === req.session.user.username);
        res.render('user_dashboard', { documents: userDocuments, user: req.session.user });
    }
});

// Specific Admin Dashboard Route
app.get('/admin/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") return res.redirect('/login');

    res.render('admin_dashboard', { documents, user: req.session.user });
});

// Route for adding new documents by admin
app.post('/documents/add', (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") return res.redirect('/login');

    const { ctrlNo, sender, subject, status, remarks, dueDate, user } = req.body;
    documents.push({ ctrlNo, sender, subject, status, remarks, dueDate, user });
    io.emit('documentUpdate', documents); // Emit event to all clients
    res.redirect('/admin/dashboard');
});

// Route for updating document status by admin
app.post('/documents/update', (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") return res.redirect('/login');

    const { ctrlNo, status, remarks } = req.body;
    const doc = documents.find(d => d.ctrlNo === ctrlNo);
    if (doc) {
        doc.status = status;
        doc.remarks = remarks;
        io.emit('documentUpdate', documents); // Emit event to all clients
    }
    res.redirect('/admin/dashboard');
});

// Route for approving sections
app.post('/documents/approveSection', (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") return res.redirect('/login');

    const { ctrlNo, section } = req.body;
    const doc = documents.find(d => d.ctrlNo === ctrlNo);

    if (doc && doc.approvalStatus) {
        doc.approvalStatus[section] = true;

        const allApproved = Object.values(doc.approvalStatus).every(status => status === true);
        if (allApproved) {
            doc.status = "Approved";
        }
        io.emit('documentUpdate', documents); // Emit event to all clients
    }

    res.redirect('/admin/dashboard');
});

// Route for updating document remarks
app.post('/documents/updateRemarks', (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") return res.redirect('/login');

    const { ctrlNo, remarks } = req.body;
    const doc = documents.find(d => d.ctrlNo === ctrlNo);

    if (doc) {
        doc.remarks = remarks;
        io.emit('documentUpdate', documents); // Emit event to all clients
    }

    res.redirect('/admin/dashboard');
});

// Route for updating the document's overall status
app.post('/documents/updateStatus', (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") return res.redirect('/login');

    const { ctrlNo } = req.body;
    const doc = documents.find(d => d.ctrlNo === ctrlNo);

    if (doc) {
        doc.status = "Approved";
        io.emit('documentUpdate', documents); // Emit event to all clients
    }

    res.redirect('/admin/dashboard');
});

// Route for logging out
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Listen with http server for Socket.IO compatibility
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
