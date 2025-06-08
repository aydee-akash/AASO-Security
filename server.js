const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.json());

// Add CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Vulnerability detection patterns
const vulnerabilityPatterns = [
    {
        name: "SQL Injection",
        pattern: /(SELECT|INSERT|UPDATE|DELETE).*['"]\s*\+\s*[^;]+;?/i,
        description: "Potential SQL injection vulnerability detected"
    },
    {
        name: "Hardcoded Password",
        pattern: /password\s*=\s*['"][^'"]+['"]/i,
        description: "Hardcoded password detected"
    },
    {
        name: "Eval Usage",
        pattern: /\beval\s*\(/i,
        description: "Use of eval() detected - potential security risk"
    },
    {
        name: "Unsafe HTML",
        pattern: /innerHTML\s*=\s*['"][^'"]*['"]/i,
        description: "Direct HTML injection detected - potential XSS vulnerability"
    },
    {
        name: "Sensitive Data Exposure",
        pattern: /(apiKey|secret|token)\s*=\s*['"][^'"]+['"]/i,
        description: "Potential sensitive data exposure"
    }
];

// Function to detect vulnerabilities in code
function detectVulnerabilities(code) {
    const vulnerabilities = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        vulnerabilityPatterns.forEach(pattern => {
            if (pattern.pattern.test(line)) {
                // Find the column where the pattern match starts
                const match = line.match(pattern.pattern);
                const column = match ? match.index + 1 : 1;

                vulnerabilities.push({
                    line: index + 1,
                    column: column,
                    description: pattern.description,
                    type: pattern.name
                });
            }
        });
    });

    return vulnerabilities;
}

// Function to check if Snyk is installed and authenticated
function checkSnykInstallation() {
    return new Promise((resolve, reject) => {
        console.log('Checking Snyk installation...');
        
        exec('snyk --version', (error, stdout, stderr) => {
            if (error) {
                console.error('Snyk version check failed:', error);
                reject(new Error('Snyk CLI is not installed. Please run: npm install -g snyk'));
                return;
            }
            
            console.log('Snyk version:', stdout.trim());
            console.log('Checking Snyk authentication...');
            
            // Check if token is configured
            exec('snyk config get api', (configError, configStdout, configStderr) => {
                if (configError || !configStdout.trim()) {
                    console.log('No Snyk token found. Please set your token using: snyk config set api=<your-token>');
                    reject(new Error('Snyk token not configured. Please set your token using: snyk config set api=<your-token>'));
                    return;
                }
                
                console.log('Snyk API token found');
                resolve(stdout.trim());
            });
        });
    });
}

// Function to run Snyk scan
function runSnykScan(projectPath) {
    return new Promise((resolve, reject) => {
        console.log(`Running Snyk scan in directory: ${projectPath}`);
        
        // Change to project directory
        const currentDir = process.cwd();
        process.chdir(projectPath);

        console.log('Installing dependencies...');
        exec('npm install', { timeout: 60000 }, (npmError, npmStdout, npmStderr) => {
            if (npmError) {
                process.chdir(currentDir);
                console.error('npm install failed:', npmError);
                reject(new Error('Failed to install dependencies: ' + npmError.message));
                return;
            }

            console.log('Dependencies installed, running Snyk test...');
            const scanProcess = exec('snyk test --json', { timeout: 30000 }, (error, stdout, stderr) => {
                // Change back to original directory
                process.chdir(currentDir);

                console.log('Snyk scan stdout:', stdout);
                console.log('Snyk scan stderr:', stderr);
                
                if (error) {
                    if (error.code === 1) {
                        // Snyk returns code 1 when vulnerabilities are found
                        try {
                            const results = JSON.parse(stdout);
                            resolve(results);
                        } catch (parseError) {
                            console.error('Failed to parse Snyk output:', parseError);
                            reject(new Error('Failed to parse Snyk output: ' + parseError.message));
                        }
                    } else if (stderr.includes('Not authenticated')) {
                        reject(new Error('Snyk authentication required. Please run: snyk auth'));
                    } else if (error.code === 'ETIMEDOUT') {
                        reject(new Error('Snyk scan timed out. Please try again.'));
                    } else {
                        console.error('Snyk scan error:', error);
                        reject(new Error(`Snyk scan failed: ${stderr || error.message}`));
                    }
                    return;
                }

                try {
                    const results = JSON.parse(stdout);
                    resolve(results);
                } catch (parseError) {
                    console.error('Failed to parse Snyk output:', parseError);
                    reject(new Error('Failed to parse Snyk output: ' + parseError.message));
                }
            });

            // Handle process timeout
            scanProcess.on('error', (err) => {
                // Change back to original directory in case of error
                process.chdir(currentDir);
                console.error('Snyk scan process error:', err);
                reject(new Error('Snyk scan process failed. Please check your Snyk installation.'));
            });
        });
    });
}

// Function to convert Snyk results to our format
function convertSnykResults(snykResults) {
    const vulnerabilities = [];
    
    if (snykResults.vulnerabilities) {
        snykResults.vulnerabilities.forEach(vuln => {
            vulnerabilities.push({
                file: vuln.file,
                line: vuln.line || 1,
                description: `${vuln.title}: ${vuln.description}`,
                type: 'Snyk'
            });
        });
    }

    return vulnerabilities;
}

// Original scan endpoint
app.post('/scan', (req, res) => {
    console.log('Received scan request');
    const code = req.body.code;
    console.log('Code length:', code ? code.length : 0);
    
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    const vulnerabilities = detectVulnerabilities(code);
    console.log('Detected vulnerabilities:', vulnerabilities);

    res.json(vulnerabilities);
});

// New endpoint for scanning individual files
app.post('/scan-file', (req, res) => {
    console.log('Received file scan request');
    const code = req.body.code;
    console.log('Code length:', code ? code.length : 0);
    
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    const vulnerabilities = detectVulnerabilities(code);
    console.log('Detected vulnerabilities:', vulnerabilities);

    res.json(vulnerabilities);
});

// Modified Snyk scan endpoint
app.post('/snyk-scan', async (req, res) => {
    try {
        // Check if Snyk is installed
        try {
            const snykVersion = await checkSnykInstallation();
            console.log('Snyk version:', snykVersion);
        } catch (error) {
            console.error('Snyk check failed:', error);
            return res.status(500).json({ 
                error: 'Snyk setup error',
                details: error.message,
                fix: 'Please run: npm install -g snyk && snyk auth'
            });
        }

        const code = req.body.code;
        if (!code) {
            return res.status(400).json({ error: 'No code provided' });
        }

        // Create temporary directory
        const tempDir = path.join(__dirname, 'temp');
        if (fs.existsSync(tempDir)) {
            // Clean up any existing files
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });

        // Create package.json only if the code contains require/import statements
        const hasDependencies = /require\s*\(|import\s+/.test(code);
        if (hasDependencies) {
            const packageJson = {
                name: "temp-project",
                version: "1.0.0",
                description: "Temporary project for Snyk scan",
                main: "index.js",
                dependencies: {}
            };

            // Extract dependencies from the code
            const requireMatches = code.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
            const importMatches = code.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);

            for (const match of requireMatches) {
                const dep = match[1];
                if (!dep.startsWith('.')) { // Skip local imports
                    packageJson.dependencies[dep] = "*";
                }
            }

            for (const match of importMatches) {
                const dep = match[1];
                if (!dep.startsWith('.')) { // Skip local imports
                    packageJson.dependencies[dep] = "*";
                }
            }

            const packageJsonPath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
        }

        const tempFilePath = path.join(tempDir, 'index.js');
        fs.writeFileSync(tempFilePath, code, 'utf8');
        console.log('Temporary files created successfully');

        try {
            // Run Snyk scan only if package.json exists
            if (fs.existsSync(path.join(tempDir, 'package.json'))) {
                console.log('Running Snyk scan in directory:', tempDir);
                const snykResults = await runSnykScan(tempDir);
                const vulnerabilities = convertSnykResults(snykResults);
                res.json(vulnerabilities);
            } else {
                // If no package.json, just return code-level vulnerabilities
                const vulnerabilities = detectVulnerabilities(code);
                res.json(vulnerabilities);
            }
        } finally {
            // Clean up temporary directory
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log('Temporary directory cleaned up');
            }
        }
    } catch (error) {
        console.error('Snyk scan error:', error);
        res.status(500).json({ 
            error: 'Snyk scan failed',
            details: error.message,
            fix: 'Please ensure Snyk is installed and authenticated'
        });
    }
});

// SonarQube configuration
const SONARQUBE_CONFIG = {
    host: 'http://localhost:9000',
    token: 'sqa_c298bb8796173aa8256de1b020291fe878e470a8'
};

// Function to create sonar-project.properties file
function createSonarPropertiesFile(projectPath) {
    // Use a fixed path for the scanner work directory
    const scannerWorkPath = path.join(projectPath, '.scannerwork');
    const metadataFilePath = path.join(scannerWorkPath, 'report-task.txt');
    
    // Ensure the scanner work directory exists
    if (!fs.existsSync(scannerWorkPath)) {
        fs.mkdirSync(scannerWorkPath, { recursive: true });
    }
    
    // Use forward slashes and no quotes for paths
    const normalizedProjectPath = projectPath.replace(/\\/g, '/');
    const normalizedMetadataPath = metadataFilePath.replace(/\\/g, '/');
    
    const propertiesContent = `sonar.projectKey=temp-project
sonar.sources=.
sonar.host.url=http://localhost:9000
sonar.token=${SONARQUBE_CONFIG.token}
sonar.scm.disabled=true
sonar.sourceEncoding=UTF-8
sonar.projectBaseDir=${normalizedProjectPath}
sonar.scanner.metadataFilePath=${normalizedMetadataPath}`;

    fs.writeFileSync(path.join(projectPath, 'sonar-project.properties'), propertiesContent);
}

// Function to run SonarScanner
function runSonarScanner(projectPath) {
    return new Promise((resolve, reject) => {
        console.log(`Running SonarScanner in directory: ${projectPath}`);
        
        const currentDir = process.cwd();
        process.chdir(projectPath);

        // Use the full path to sonar-scanner
        const sonarScannerPath = 'C:\\sonar-scanner-7.1.0.4889-windows-x64\\bin\\sonar-scanner.bat';
        
        // Create the scanner work directory
        const scannerWorkPath = path.join(projectPath, '.scannerwork');
        if (!fs.existsSync(scannerWorkPath)) {
            fs.mkdirSync(scannerWorkPath, { recursive: true });
        }
        
        // Use forward slashes and no quotes for the project path
        const normalizedProjectPath = projectPath.replace(/\\/g, '/');
        const command = `"${sonarScannerPath}" -Dsonar.projectBaseDir=${normalizedProjectPath}`;
        
        console.log('Running command:', command);
        
        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
            process.chdir(currentDir);

            if (error) {
                console.error('SonarScanner error:', error);
                reject(new Error(`SonarScanner failed: ${stderr || error.message}`));
                return;
            }

            console.log('SonarScanner output:', stdout);
            resolve(stdout);
        });
    });
}

// Function to fetch SonarQube analysis results
async function fetchSonarQubeResults() {
    try {
        const response = await axios.get(`${SONARQUBE_CONFIG.host}/api/issues/search`, {
            params: {
                componentKeys: 'temp-project',
                resolved: 'false'
            },
            auth: {
                username: SONARQUBE_CONFIG.token,
                password: ''
            }
        });

        return response.data.issues.map(issue => ({
            file: issue.component.split(':')[1],
            line: issue.line,
            description: issue.message,
            severity: issue.severity
        }));
    } catch (error) {
        console.error('Failed to fetch SonarQube results:', error);
        throw new Error('Failed to fetch SonarQube analysis results');
    }
}

// SonarQube scan endpoint
app.post('/sonarqube-scan', async (req, res) => {
    try {
        // First check if SonarQube server is accessible
        try {
            await axios.get(`${SONARQUBE_CONFIG.host}/api/system/status`, {
                auth: {
                    username: SONARQUBE_CONFIG.token,
                    password: ''
                }
            });
        } catch (error) {
            console.error('SonarQube server check failed:', error);
            return res.status(500).json({ 
                error: 'SonarQube server not accessible',
                details: 'Please make sure SonarQube is running at http://localhost:9000',
                fix: '1. Start SonarQube server\n2. Verify it\'s accessible at http://localhost:9000'
            });
        }

        const code = req.body.code;
        if (!code) {
            return res.status(400).json({ error: 'No code provided' });
        }

        // Create temporary directory in a fixed location without spaces
        const tempDir = path.join('C:', 'temp', 'sonar-scan');
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });

        try {
            // Save the code as app.js
            const codeString = typeof code === 'string' ? code : JSON.stringify(code);
            fs.writeFileSync(path.join(tempDir, 'app.js'), codeString);

            // Create sonar-project.properties file
            createSonarPropertiesFile(tempDir);

            // Run SonarScanner
            await runSonarScanner(tempDir);

            // Fetch and return results
            const results = await fetchSonarQubeResults();

            res.json(results);
        } finally {
            // Clean up temporary directory
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        }
    } catch (error) {
        console.error('SonarQube scan error:', error);
        let errorMessage = 'SonarQube scan failed';
        let details = error.message;
        let fix = '';

        if (error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Could not connect to SonarQube server';
            details = 'Please make sure SonarQube is running at http://localhost:9000';
            fix = '1. Start SonarQube server\n2. Verify it\'s accessible at http://localhost:9000';
        } else if (error.message.includes('sonar-scanner')) {
            errorMessage = 'SonarScanner not found';
            details = 'Please make sure SonarScanner is installed and in your PATH';
            fix = '1. Download SonarScanner from https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/\n2. Add it to your PATH';
        }

        res.status(500).json({ 
            error: errorMessage,
            details: details,
            fix: fix
        });
    }
});

app.listen(port, () => {
    console.log(`AASO Security backend server running at http://localhost:${port}`);
    console.log('Server is ready to accept requests');
}); 