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

- Visual Studio Code (version 1.60.0 or higher)
- Node.js (version 16.x or higher)
- npm (comes with Node.js)

## Installation

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

4. Open the project in VS Code:
```bash
code .
```

5. Press F5 to start debugging the extension in a new VS Code window.

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