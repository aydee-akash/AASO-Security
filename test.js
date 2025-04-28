const express = require('express');
const fs = require('fs');
const path = require('path');
const lodash = require('lodash'); // Known vulnerable version
const moment = require('moment'); // Known vulnerable version

// This is a test file with some potential vulnerabilities
const app = express();

// Potential SQL injection vulnerability
app.get('/users', (req, res) => {
    const userId = req.query.id;
    const query = `SELECT * FROM users WHERE id = ${userId}`;
    // ...
});

// Potential XSS vulnerability
app.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    res.send(`<div>Search results for: ${searchTerm}</div>`);
});

// Hardcoded credentials
const API_KEY = '12345-secret-key-67890';
const DB_PASSWORD = 'admin123';

app.listen(3000); 