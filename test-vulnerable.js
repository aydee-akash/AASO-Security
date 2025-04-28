// SQL Injection vulnerability
function getUserData(userId) {
    const query = `SELECT * FROM users WHERE id = ${userId}`;
    return db.query(query);
}

// Hardcoded password
const adminPassword = "admin123";

// XSS vulnerability
function displayUserInput(input) {
    document.getElementById('output').innerHTML = input;
}

// Command injection
function executeCommand(command) {
    return require('child_process').exec(command);
}

// Insecure random number generation
function generateToken() {
    return Math.random().toString();
}

// Unencrypted sensitive data
const userData = {
    name: "John Doe",
    ssn: "123-45-6789",
    creditCard: "4111-1111-1111-1111"
}; 