const fs = require('fs');
const http = require('http');

const code = fs.readFileSync('test.js', 'utf8');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/snyk-scan',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(JSON.stringify({ code }));
req.end(); 