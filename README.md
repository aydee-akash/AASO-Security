# AASO Security Extension

A Visual Studio Code extension that helps developers identify and fix security vulnerabilities in their code using multiple scanning tools including Snyk, SonarQube, and AI-powered analysis with Gemini.

## Features

- Scan code for vulnerabilities using Snyk
- Perform code quality analysis with SonarQube
- AI-powered vulnerability analysis using Gemini
- Real-time vulnerability detection
- Detailed vulnerability reports
- Integration with VS Code's native UI

## Prerequisites

Before you begin, ensure you have the following installed:
- Visual Studio Code (latest version)
- Node.js (v14 or later)
- npm (v6 or later)
- Docker and Docker Compose (for SonarQube)
- Snyk CLI (for Snyk integration)

## Installation

### 1. Install the Extension
1. Clone this repository:
   ```bash
   git clone [repository-url]
   cd aaso-security
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Start debugging in VS Code (F5)

### 2. Install and Configure Snyk

#### Install Snyk CLI
1. Install Snyk CLI globally using npm:
   ```bash
   npm install -g snyk
   ```

2. Authenticate with Snyk:
   ```bash
   snyk auth
   ```
   This will open your browser to complete the authentication process.

3. Generate a Snyk API token:
   - Go to [Snyk Account Settings](https://app.snyk.io/account)
   - Navigate to "API Tokens"
   - Click "Generate Token"
   - Copy the generated token

4. Configure Snyk in the extension:
   - Open VS Code settings (Ctrl+,)
   - Search for "AASO Security"
   - Enter your Snyk API token in the "Snyk API Token" field

#### Using Snyk with the Extension
1. Open a project in VS Code
2. Run a Snyk scan:
   - Click the "AASO Security" icon in the activity bar
   - Click the "Run Snyk Scan" button
   - Or use the command palette (Ctrl+Shift+P) and type "AASO Security: Run Snyk Scan"

3. View results:
   - Vulnerabilities will appear in the "Vulnerabilities" view
   - Click on any vulnerability to see detailed information
   - The extension will show:
     - Vulnerability type and severity
     - Affected package and version
     - Description and impact
     - Recommended fixes
     - AI-powered analysis (if enabled)

#### Additional Snyk Features
1. Monitor your project:
   ```bash
   snyk monitor
   ```
   This will create a snapshot of your project on Snyk's servers for continuous monitoring.

2. Test specific dependencies:
   ```bash
   snyk test [package-name]
   ```

3. Fix vulnerabilities:
   ```bash
   snyk wizard
   ```
   This interactive wizard helps you fix vulnerabilities by updating packages.

4. Integrate with CI/CD:
   - Add Snyk to your CI pipeline
   - Set up automated testing
   - Configure notifications for new vulnerabilities

#### Troubleshooting Snyk
1. Check if Snyk is running:
   ```bash
   # Check Snyk CLI version (if installed correctly)
   snyk --version

   # Check Snyk CLI status
   snyk status

   # Test Snyk connection
   snyk test --help
   ```

2. Verify Snyk installation:
   ```bash
   # Check if Snyk is installed globally
   npm list -g snyk

   # Check Snyk executable path
   which snyk  # On Linux/Mac
   where snyk  # On Windows
   ```

3. If authentication fails:
   - Check your internet connection
   - Verify your Snyk account is active
   - Try running `snyk auth` again
   - Check authentication status: `snyk auth status`

4. If scans fail:
   - Ensure you're in a project directory
   - Check your Snyk API token is correct
   - Verify package.json exists
   - Check Snyk CLI version: `snyk --version`
   - Check Snyk logs: `snyk config get logLevel`

5. Common issues:
   - Network connectivity problems
   - Invalid API token
   - Outdated Snyk CLI
   - Permission issues
   - Node.js version compatibility

6. Debug Snyk:
   ```bash
   # Enable debug logging
   snyk config set logLevel=debug

   # Run a test with debug output
   snyk test --debug

   # Check Snyk configuration
   snyk config get
   ```

7. Reset Snyk configuration:
   ```bash
   # Clear Snyk configuration
   snyk config clear

   # Reset authentication
   snyk auth reset

   # Re-authenticate
   snyk auth
   ```

## Configuration

### Snyk Setup

1. Install Snyk CLI globally:
```bash
npm install -g snyk
```

2. Authenticate with Snyk:
```bash
snyk auth
```

### SonarQube Setup

1. Install Docker and Docker Compose:
   - Windows: Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: Install Docker and Docker Compose using your package manager
   - Mac: Install [Docker Desktop](https://www.docker.com/products/docker-desktop)

2. Create a `docker-compose.yml` file:
   ```yaml
   version: '3'
   services:
     sonarqube:
       image: sonarqube:latest
       container_name: sonarqube
       ports:
         - "9000:9000"
       environment:
         - SONAR_JDBC_URL=jdbc:postgresql://db:5432/sonar
         - SONAR_JDBC_USERNAME=sonar
         - SONAR_JDBC_PASSWORD=sonar
       volumes:
         - sonarqube_data:/opt/sonarqube/data
         - sonarqube_extensions:/opt/sonarqube/extensions
         - sonarqube_logs:/opt/sonarqube/logs
       depends_on:
         - db
       networks:
         - sonarnet
       restart: unless-stopped

     db:
       image: postgres:13
       container_name: sonarqube_db
       environment:
         - POSTGRES_USER=sonar
         - POSTGRES_PASSWORD=sonar
         - POSTGRES_DB=sonar
       volumes:
         - postgresql_data:/var/lib/postgresql/data
       networks:
         - sonarnet
       restart: unless-stopped

   volumes:
     sonarqube_data:
     sonarqube_extensions:
     sonarqube_logs:
     postgresql_data:

   networks:
     sonarnet:
       driver: bridge
   ```

3. Start SonarQube using Docker Compose:
   ```bash
   # Create and start containers
   docker-compose up -d

   # Check container status
   docker-compose ps

   # View logs
   docker-compose logs -f
   ```

4. Access SonarQube:
   - Open browser and navigate to `http://localhost:9000`
   - Default credentials: admin/admin (change on first login)
   - Wait for the initial setup to complete (may take a few minutes)

5. Install SonarQube Scanner:
   ```bash
   npm install -g sonarqube-scanner
   ```

6. Generate SonarQube Token:
   - Log in to SonarQube web interface
   - Go to User > My Account > Security
   - Generate a new token
   - Copy and save the token securely

7. Configure SonarQube Project:
   - In SonarQube web interface, go to Projects > Create Project
   - Choose a project key and name
   - Select your main branch
   - Choose your project visibility

8. Configure `sonar-project.properties`:
   ```properties
   # Project identification
   sonar.projectKey=your-project-key
   sonar.projectName=Your Project Name
   sonar.projectVersion=1.0

   # Source code
   sonar.sources=src
   sonar.sourceEncoding=UTF-8

   # SonarQube server
   sonar.host.url=http://localhost:9000
   sonar.login=your-sonarqube-token

   # Analysis parameters
   sonar.javascript.lcov.reportPaths=coverage/lcov.info
   sonar.coverage.exclusions=**/*.test.js,**/*.spec.js
   sonar.exclusions=**/node_modules/**,**/coverage/**,**/dist/**

   # Quality Gate
   sonar.qualitygate.wait=true
   ```

9. Run SonarQube Analysis:
   ```bash
   # Run analysis
   sonar-scanner

   # Or using npm script
   npm run sonar
   ```

10. View Results:
    - Open SonarQube web interface
    - Navigate to your project
    - View detailed analysis results including:
      - Code coverage
      - Code smells
      - Bugs
      - Vulnerabilities
      - Security hotspots

11. Configure Quality Gates:
    - In SonarQube web interface, go to Quality Gates
    - Create or modify quality gate rules
    - Set thresholds for:
      - Code coverage
      - Duplicated lines
      - Maintainability rating
      - Reliability rating
      - Security rating

12. Docker Maintenance:
    ```bash
    # Stop SonarQube
    docker-compose down

    # Start SonarQube
    docker-compose up -d

    # Restart SonarQube
    docker-compose restart

    # Update SonarQube
    docker-compose pull
    docker-compose up -d

    # Backup data
    docker-compose down
    # Copy the volumes from /var/lib/docker/volumes/
    # or use a backup tool like Duplicity

    # Clean up unused resources
    docker system prune
    ```

13. Troubleshooting Docker Setup:
    - Check container logs: `docker-compose logs -f`
    - Verify container status: `docker-compose ps`
    - Check network connectivity: `docker network inspect sonarnet`
    - Verify volume mounts: `docker volume ls`
    - Common issues:
      - Port conflicts (9000 already in use)
      - Insufficient memory (SonarQube requires at least 2GB RAM)
      - Database connection issues
      - Permission problems with mounted volumes

### Gemini AI Setup

1. Get your Gemini API key from Google AI Studio
2. Configure the API key in VS Code settings:
   - Open VS Code settings
   - Search for "AASO Security"
   - Enter your Gemini API key in the "Gemini API Key" field

## Usage

### Running Security Scans

1. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
2. Choose one of the following commands:
   - `AASO: Scan Code for Vulnerabilities` - Run a comprehensive security scan
   - `AASO: Scan Code with Snyk` - Run Snyk-specific vulnerability scan
   - `AASO: Scan Code with SonarQube` - Run SonarQube code quality analysis
   - `AASO: Analyze with Gemini AI` - Get AI-powered vulnerability analysis

### Viewing Results

1. Click on the AASO Security icon in the Activity Bar
2. View results in the following panels:
   - Vulnerabilities: Shows detected security issues
   - AI Analysis: Displays Gemini AI's analysis and recommendations

## Development

### Project Structure

- `src/` - Source code for the extension
- `out/` - Compiled JavaScript files
- `resources/` - Icons and other static resources
- `server.js` - Local server for handling API requests

### Available Scripts

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile automatically
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run start-server` - Start the local server

## Security Tools Integration

### Snyk Integration

The extension uses Snyk CLI to scan for vulnerabilities. Make sure you have:
- Snyk CLI installed
- Authenticated with Snyk
- Proper permissions to access the project

### SonarQube Integration

The extension integrates with SonarQube for code quality analysis. Ensure:
- SonarQube server is running
- Project is properly configured in SonarQube
- Authentication token is set up

### Gemini AI Integration

The AI analysis feature requires:
- Valid Gemini API key
- Internet connection
- Proper configuration in VS Code settings

## Troubleshooting

1. If scans are not working:
   - Check if all required tools are installed
   - Verify API keys and authentication
   - Check network connectivity

2. If the extension is not loading:
   - Restart VS Code
   - Check the Developer Tools console for errors
   - Verify Node.js version compatibility

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Add your license information here]

## Support

For support, please [add your support contact information] 