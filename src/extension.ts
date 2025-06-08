import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { GeminiAnalyzer } from './gemini';

interface Vulnerability {
    line: number;
    column: number;
    description: string;
    type: string;
    file?: string;
    severity?: string;
    impact?: string;
    recommendation?: string;
    codeSnippet?: string;
}

interface GeminiAnalysis {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    confidence: number;
    classification: string;
    context: string;
    remediation: string[];
}

interface SonarDashboardItem {
    isDashboardItem: true;
}

class VulnerabilityTreeProvider implements vscode.TreeDataProvider<Vulnerability | SonarDashboardItem> {
    private vulnerabilities: Vulnerability[] = [];
    private sonarDashboardUrl?: string;
    private _onDidChangeTreeData: vscode.EventEmitter<Vulnerability | SonarDashboardItem | undefined | null> = new vscode.EventEmitter<Vulnerability | SonarDashboardItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<Vulnerability | SonarDashboardItem | undefined | null> = this._onDidChangeTreeData.event;

    constructor() {
        this.vulnerabilities = [];
    }

    updateVulnerabilities(vulnerabilities: Vulnerability[]) {
        console.log('Updating vulnerabilities:', vulnerabilities);
        this.vulnerabilities = vulnerabilities;
        this._onDidChangeTreeData.fire(undefined);
    }

    setSonarDashboardUrl(url: string | undefined) {
        this.sonarDashboardUrl = url;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: Vulnerability | SonarDashboardItem): vscode.TreeItem {
        if ('isDashboardItem' in element) {
            const item = new vscode.TreeItem('Open SonarQube Dashboard', vscode.TreeItemCollapsibleState.None);
            item.description = 'View detailed analysis results';
            item.iconPath = new vscode.ThemeIcon('link');
            item.command = {
                command: 'aaso-security.openSonarDashboard',
                title: 'Open SonarQube Dashboard',
                arguments: [this.sonarDashboardUrl]
            };
            return item;
        }

        // Get severity icon based on vulnerability type
        const severityIcon = this.getSeverityIcon(element.type);
        
        // Format the label with severity icon and location
        const location = element.file 
            ? `${element.file}:${element.line}`
            : `Line ${element.line}`;
            
        const label = `${severityIcon} [${element.type}] ${location}`;
        
        // Create a detailed tooltip
        const tooltip = new vscode.MarkdownString();
        tooltip.appendMarkdown(`### ${element.type}\n\n`);
        tooltip.appendMarkdown(`**Location:** ${location}\n\n`);
        tooltip.appendMarkdown(`**Description:** ${element.description}\n\n`);
        tooltip.appendMarkdown(`**Column:** ${element.column}\n\n`);
        if (element.severity) {
            tooltip.appendMarkdown(`**Severity:** ${element.severity}\n\n`);
        }
        if (element.impact) {
            tooltip.appendMarkdown(`**Impact:** ${element.impact}\n\n`);
        }
        if (element.recommendation) {
            tooltip.appendMarkdown(`**Recommendation:** ${element.recommendation}\n\n`);
        }
        if (element.codeSnippet) {
            tooltip.appendMarkdown(`**Code Snippet:**\n\`\`\`\n${element.codeSnippet}\n\`\`\``);
        }
        
        return {
            label: label,
            description: element.description,
            tooltip: tooltip,
            iconPath: new vscode.ThemeIcon(this.getIconName(element.type)),
            command: {
                command: 'aaso-security.showVulnerabilityDetails',
                title: 'Show Vulnerability Details',
                arguments: [element]
            },
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }

    private getIconName(type: string): string {
        const iconMap: { [key: string]: string } = {
            'SQL Injection': 'error',
            'Hardcoded Password': 'key',
            'Eval Usage': 'warning',
            'Unsafe HTML': 'alert',
            'Sensitive Data Exposure': 'shield',
            'Snyk': 'snyk',
            'SonarQube': 'sonarqube'
        };
        return iconMap[type] || 'warning';
    }

    private getSeverityIcon(type: string): string {
        const severityMap: { [key: string]: string } = {
            'SQL Injection': '$(error)',
            'Hardcoded Password': '$(key)',
            'Eval Usage': '$(warning)',
            'Unsafe HTML': '$(alert)',
            'Sensitive Data Exposure': '$(shield)',
            'Snyk': '$(snyk)',
            'SonarQube': '$(sonarqube)'
        };
        return severityMap[type] || '$(warning)';
    }

    getChildren(element?: Vulnerability | SonarDashboardItem): (Vulnerability | SonarDashboardItem)[] {
        if (element) {
            return [];
        }

        const items: (Vulnerability | SonarDashboardItem)[] = [...this.vulnerabilities];
        
        if (this.sonarDashboardUrl) {
            items.push({ isDashboardItem: true });
        }

        return items;
    }
}

class GeminiAnalysisProvider implements vscode.TreeDataProvider<{ vulnerability: Vulnerability; analysis: GeminiAnalysis }> {
    private analysisMap: Map<Vulnerability, GeminiAnalysis> = new Map();
    private _onDidChangeTreeData: vscode.EventEmitter<{ vulnerability: Vulnerability; analysis: GeminiAnalysis } | undefined | null> = new vscode.EventEmitter<{ vulnerability: Vulnerability; analysis: GeminiAnalysis } | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<{ vulnerability: Vulnerability; analysis: GeminiAnalysis } | undefined | null> = this._onDidChangeTreeData.event;

    updateAnalysis(analysisMap: Map<Vulnerability, GeminiAnalysis>) {
        this.analysisMap = analysisMap;
        this._onDidChangeTreeData.fire(undefined);
    }

    getAnalysisForVulnerability(vulnerability: Vulnerability): GeminiAnalysis | undefined {
        return this.analysisMap.get(vulnerability);
    }

    getTreeItem(element: { vulnerability: Vulnerability; analysis: GeminiAnalysis }): vscode.TreeItem {
        const riskLevelColors = {
            'LOW': 'lightgreen',
            'MEDIUM': 'yellow',
            'HIGH': 'orange',
            'CRITICAL': 'red'
        };

        const color = riskLevelColors[element.analysis.riskLevel];
        const label = `[${element.analysis.riskLevel}] ${element.vulnerability.description}`;
        
        return {
            label: label,
            description: `Confidence: ${element.analysis.confidence}%`,
            tooltip: this.createTooltip(element),
            iconPath: new vscode.ThemeIcon('warning', new vscode.ThemeColor(`charts.${color}`)),
            command: {
                command: 'aaso-security.showAIAnalysisDetails',
                title: 'Show AI Analysis Details',
                arguments: [element]
            }
        };
    }

    private createTooltip(element: { vulnerability: Vulnerability; analysis: GeminiAnalysis }): string {
        return `
Vulnerability: ${element.vulnerability.description}
Risk Level: ${element.analysis.riskLevel}
Classification: ${element.analysis.classification}
Confidence: ${element.analysis.confidence}%

Context:
${element.analysis.context}

Remediation Steps:
${element.analysis.remediation.map((step, i) => `${i + 1}. ${step}`).join('\n')}
`;
    }

    getChildren(element?: { vulnerability: Vulnerability; analysis: GeminiAnalysis }): { vulnerability: Vulnerability; analysis: GeminiAnalysis }[] {
        if (element) {
            return [];
        }
        return Array.from(this.analysisMap.entries()).map(([vulnerability, analysis]) => ({ vulnerability, analysis }));
    }
}

class ScanActionsTreeProvider implements vscode.TreeDataProvider<ScanAction> {
    private _onDidChangeTreeData: vscode.EventEmitter<ScanAction | undefined | null> = new vscode.EventEmitter<ScanAction | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<ScanAction | undefined | null> = this._onDidChangeTreeData.event;

    getTreeItem(element: ScanAction): vscode.TreeItem {
        return {
            label: element.label,
            description: element.description,
            iconPath: new vscode.ThemeIcon(element.icon),
            command: {
                command: element.command,
                title: element.label
            }
        };
    }

    getChildren(): ScanAction[] {
        return [
            {
                label: 'Basic Scan',
                description: 'Scan current file for vulnerabilities',
                icon: 'search',
                command: 'aaso-security.scanCode'
            },
            {
                label: 'Snyk Scan',
                description: 'Scan with Snyk for vulnerabilities',
                icon: 'shield',
                command: 'aaso-security.snykScan'
            },
            {
                label: 'SonarQube Scan',
                description: 'Scan with SonarQube for code quality',
                icon: 'graph',
                command: 'aaso-security.sonarqubeScan'
            },
            {
                label: 'AI Analysis',
                description: 'Analyze with Gemini AI',
                icon: 'sparkle',
                command: 'aaso-security.analyzeWithGemini'
            }
        ];
    }
}

interface ScanAction {
    label: string;
    description: string;
    icon: string;
    command: string;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('AASO Security extension is now active!');

    const vulnerabilityProvider = new VulnerabilityTreeProvider();
    const geminiAnalysisProvider = new GeminiAnalysisProvider();
    const scanActionsProvider = new ScanActionsTreeProvider();
    
    // Register the TreeDataProviders
    const vulnerabilityView = vscode.window.createTreeView('aaso-security.vulnerabilities', {
        treeDataProvider: vulnerabilityProvider,
        showCollapseAll: true
    });

    const geminiAnalysisView = vscode.window.createTreeView('aaso-security.geminiAnalysis', {
        treeDataProvider: geminiAnalysisProvider,
        showCollapseAll: true
    });

    const scanActionsView = vscode.window.createTreeView('aaso-security.scanActions', {
        treeDataProvider: scanActionsProvider,
        showCollapseAll: false
    });
    
    context.subscriptions.push(vulnerabilityView, geminiAnalysisView, scanActionsView);

    // Initialize with empty vulnerabilities
    vulnerabilityProvider.updateVulnerabilities([]);
    geminiAnalysisProvider.updateAnalysis(new Map());

    // Register the show vulnerability details command
    let disposable = vscode.commands.registerCommand('aaso-security.showVulnerabilityDetails', async (vulnerability: Vulnerability) => {
        // Create and show a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'vulnerabilityDetails',
            `Vulnerability: ${vulnerability.type}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Get the Gemini analysis if available
        const analysis = geminiAnalysisProvider.getAnalysisForVulnerability(vulnerability);

        // Set the webview content
        panel.webview.html = getWebviewContent(vulnerability, analysis);
    });

    // Register the show AI analysis details command
    let aiAnalysisDisposable = vscode.commands.registerCommand('aaso-security.showAIAnalysisDetails', 
        async (element: { vulnerability: Vulnerability; analysis: GeminiAnalysis }) => {
        // Create and show a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'aiAnalysisDetails',
            `AI Analysis: ${element.vulnerability.type}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Set the webview content
        panel.webview.html = getAIAnalysisWebviewContent(element);
    });

    context.subscriptions.push(disposable, aiAnalysisDisposable);

    // Function to scan code using the specified endpoint
    async function scanCode(endpoint: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        const text = document.getText();

        try {
            vscode.window.showInformationMessage('Scanning code for vulnerabilities...');
            console.log(`Sending scan request to ${endpoint}...`);
            
            const response = await fetch(`http://localhost:3000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: text })
            });

            console.log('Scan response status:', response.status);
            
            if (!response.ok) {
                let errorMessage = 'Unknown error';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || `HTTP error ${response.status}`;
                } catch (e) {
                    errorMessage = `HTTP error ${response.status}`;
                }
                console.error('Scan failed:', errorMessage);
                throw new Error(errorMessage);
            }

            const result = await response.json();
            let vulnerabilities: Vulnerability[] = [];

            if (Array.isArray(result)) {
                vulnerabilities = result;
            } else {
                vulnerabilities = result.vulnerabilities || [];
            }

            console.log('Received vulnerabilities:', vulnerabilities);
            
            // Update vulnerabilities
            vulnerabilityProvider.updateVulnerabilities(vulnerabilities);
            
            // For SonarQube scans, always set the dashboard URL
            if (endpoint === '/sonarqube-scan') {
                const sonarDashboardUrl = 'http://localhost:9000/dashboard?id=temp-project';
                vulnerabilityProvider.setSonarDashboardUrl(sonarDashboardUrl);
                vscode.window.showInformationMessage('SonarQube analysis complete! Click the dashboard button to view results.');
            } else {
                vulnerabilityProvider.setSonarDashboardUrl(undefined);
            }
            
            if (vulnerabilities.length === 0) {
                vscode.window.showInformationMessage('No vulnerabilities found!');
            } else {
                vscode.window.showInformationMessage(`Found ${vulnerabilities.length} vulnerabilities`);
            }
        } catch (error) {
            console.error('Scan error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Error scanning code: ${errorMessage}`);
            
            if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
                vscode.window.showErrorMessage('Could not connect to the scan server. Make sure the server is running on http://localhost:3000');
            }
        }
    }

    // Function to analyze vulnerabilities with Gemini
    async function analyzeWithGemini() {
        const items = vulnerabilityProvider.getChildren();
        const vulnerabilities = items.filter((item): item is Vulnerability => !('isDashboardItem' in item));
        
        if (vulnerabilities.length === 0) {
            vscode.window.showInformationMessage('No vulnerabilities to analyze. Please run a scan first.');
            return;
        }

        try {
            vscode.window.showInformationMessage('Analyzing vulnerabilities with Gemini AI...');
            console.log('Starting analysis for vulnerabilities:', vulnerabilities);
            
            const analyzer = new GeminiAnalyzer();
            const analysisMap = await analyzer.analyzeMultipleVulnerabilities(vulnerabilities);
            
            console.log('Analysis results:', Array.from(analysisMap.entries()));
            geminiAnalysisProvider.updateAnalysis(analysisMap);
            
            // Reveal the analysis view
            await vscode.commands.executeCommand('aaso-security.geminiAnalysis.focus');
            vscode.window.showInformationMessage('Gemini analysis complete!');
        } catch (error) {
            console.error('Gemini analysis error:', error);
            vscode.window.showErrorMessage(`Error analyzing with Gemini: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Register commands
    let scanCommand = vscode.commands.registerCommand('aaso-security.scanCode', () => {
        scanCode('/scan');
    });

    let snykScanCommand = vscode.commands.registerCommand('aaso-security.snykScan', () => {
        scanCode('/snyk-scan');
    });

    let sonarqubeScanCommand = vscode.commands.registerCommand('aaso-security.sonarqubeScan', () => {
        scanCode('/sonarqube-scan');
    });

    let analyzeWithGeminiCommand = vscode.commands.registerCommand('aaso-security.analyzeWithGemini', analyzeWithGemini);

    let gotoLineCommand = vscode.commands.registerCommand('aaso-security.gotoLine', (line: number, column: number) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const position = new vscode.Position(line - 1, column - 1);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
        }
    });

    // Register the open SonarQube dashboard command
    let openSonarDashboardDisposable = vscode.commands.registerCommand('aaso-security.openSonarDashboard', 
        async (url: string) => {
            if (url) {
                vscode.env.openExternal(vscode.Uri.parse(url));
            }
        }
    );

    context.subscriptions.push(
        scanCommand,
        snykScanCommand,
        sonarqubeScanCommand,
        analyzeWithGeminiCommand,
        gotoLineCommand,
        openSonarDashboardDisposable
    );
}

export function deactivate() {
    console.log('AASO Security extension deactivated');
}

function getWebviewContent(vulnerability: Vulnerability, analysis?: GeminiAnalysis): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vulnerability Details</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                padding: 20px;
                line-height: 1.6;
                background-color: #1e1e1e;
                color: #d4d4d4;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #333;
            }
            h1 {
                color: #ffffff;
                margin: 0;
            }
            .severity {
                padding: 5px 10px;
                border-radius: 4px;
                font-weight: bold;
            }
            .severity-high {
                background-color: #4a1f1f;
                color: #ff6b6b;
            }
            .severity-medium {
                background-color: #4a3a1f;
                color: #ffd93d;
            }
            .severity-low {
                background-color: #1f4a2c;
                color: #6bff6b;
            }
            .section {
                margin-bottom: 20px;
                background-color: #252526;
                padding: 15px;
                border-radius: 4px;
                border: 1px solid #333;
            }
            .section-title {
                font-size: 1.2em;
                font-weight: bold;
                margin-bottom: 10px;
                color: #ffffff;
            }
            .code-block {
                background-color: #2d2d2d;
                color: #d4d4d4;
                padding: 15px;
                border-radius: 4px;
                font-family: 'Courier New', Courier, monospace;
                white-space: pre-wrap;
                border: 1px solid #333;
            }
            .ai-analysis {
                background-color: #1e3a5f;
                padding: 15px;
                border-radius: 4px;
                margin-top: 20px;
                border: 1px solid #2d4d7d;
            }
            .remediation-steps {
                margin-top: 10px;
            }
            .remediation-step {
                margin-bottom: 5px;
                padding: 8px;
                background-color: #2d2d2d;
                border-radius: 4px;
                border: 1px solid #333;
            }
            strong {
                color: #ffffff;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${vulnerability.type}</h1>
            <span class="severity severity-${vulnerability.severity?.toLowerCase() || 'medium'}">
                ${vulnerability.severity || 'MEDIUM'} Severity
            </span>
        </div>

        <div class="section">
            <div class="section-title">Location</div>
            <div>${vulnerability.file || 'Current File'}: Line ${vulnerability.line}, Column ${vulnerability.column}</div>
        </div>

        <div class="section">
            <div class="section-title">Description</div>
            <div>${vulnerability.description}</div>
        </div>

        ${vulnerability.impact ? `
        <div class="section">
            <div class="section-title">Impact</div>
            <div>${vulnerability.impact}</div>
        </div>
        ` : ''}

        ${vulnerability.codeSnippet ? `
        <div class="section">
            <div class="section-title">Code Snippet</div>
            <div class="code-block">${vulnerability.codeSnippet}</div>
        </div>
        ` : ''}

        ${analysis ? `
        <div class="ai-analysis">
            <div class="section-title">AI Analysis</div>
            <div><strong>Risk Level:</strong> ${analysis.riskLevel}</div>
            <div><strong>Confidence:</strong> ${analysis.confidence}%</div>
            <div><strong>Classification:</strong> ${analysis.classification}</div>
            
            <div class="section-title">Context</div>
            <div>${analysis.context}</div>
            
            <div class="section-title">Remediation Steps</div>
            <div class="remediation-steps">
                ${analysis.remediation.map((step, index) => `
                    <div class="remediation-step">${index + 1}. ${step}</div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${vulnerability.recommendation ? `
        <div class="section">
            <div class="section-title">Recommendation</div>
            <div>${vulnerability.recommendation}</div>
        </div>
        ` : ''}
    </body>
    </html>`;
}

function getAIAnalysisWebviewContent(element: { vulnerability: Vulnerability; analysis: GeminiAnalysis }): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Analysis Details</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                padding: 20px;
                line-height: 1.6;
                background-color: #1e1e1e;
                color: #d4d4d4;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #333;
            }
            h1 {
                color: #ffffff;
                margin: 0;
            }
            .risk-level {
                padding: 5px 10px;
                border-radius: 4px;
                font-weight: bold;
            }
            .risk-critical {
                background-color: #4a1f1f;
                color: #ff6b6b;
            }
            .risk-high {
                background-color: #4a3a1f;
                color: #ffd93d;
            }
            .risk-medium {
                background-color: #4a3a1f;
                color: #ffd93d;
            }
            .risk-low {
                background-color: #1f4a2c;
                color: #6bff6b;
            }
            .section {
                margin-bottom: 20px;
                background-color: #252526;
                padding: 15px;
                border-radius: 4px;
                border: 1px solid #333;
            }
            .section-title {
                font-size: 1.2em;
                font-weight: bold;
                margin-bottom: 10px;
                color: #ffffff;
            }
            .confidence-meter {
                width: 100%;
                height: 20px;
                background-color: #2d2d2d;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
                border: 1px solid #333;
            }
            .confidence-fill {
                height: 100%;
                background-color: #4caf50;
                transition: width 0.3s ease;
            }
            .code-block {
                background-color: #2d2d2d;
                color: #d4d4d4;
                padding: 15px;
                border-radius: 4px;
                font-family: 'Courier New', Courier, monospace;
                white-space: pre-wrap;
                margin: 10px 0;
                border: 1px solid #333;
            }
            .remediation-steps {
                margin-top: 10px;
            }
            .remediation-step {
                margin-bottom: 10px;
                padding: 10px;
                background-color: #2d2d2d;
                border-radius: 4px;
                border: 1px solid #333;
            }
            .step-number {
                font-weight: bold;
                margin-right: 10px;
                color: #569cd6;
            }
            .metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            .metric-card {
                background-color: #252526;
                padding: 15px;
                border-radius: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                border: 1px solid #333;
            }
            .metric-value {
                font-size: 1.5em;
                font-weight: bold;
                color: #569cd6;
            }
            .metric-label {
                color: #d4d4d4;
                font-size: 0.9em;
            }
            strong {
                color: #ffffff;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>AI Analysis: ${element.vulnerability.type}</h1>
            <span class="risk-level risk-${element.analysis.riskLevel.toLowerCase()}">
                ${element.analysis.riskLevel} Risk
            </span>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">${element.analysis.confidence}%</div>
                <div class="metric-label">Confidence Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${element.analysis.classification}</div>
                <div class="metric-label">Classification</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Vulnerability Details</div>
            <div><strong>Type:</strong> ${element.vulnerability.type}</div>
            <div><strong>Location:</strong> ${element.vulnerability.file || 'Current File'}: Line ${element.vulnerability.line}</div>
            <div><strong>Description:</strong> ${element.vulnerability.description}</div>
        </div>

        <div class="section">
            <div class="section-title">Analysis Context</div>
            <div>${element.analysis.context}</div>
        </div>

        <div class="section">
            <div class="section-title">Remediation Steps</div>
            <div class="remediation-steps">
                ${element.analysis.remediation.map((step, index) => `
                    <div class="remediation-step">
                        <span class="step-number">${index + 1}.</span>
                        ${step}
                    </div>
                `).join('')}
            </div>
        </div>

        ${element.vulnerability.codeSnippet ? `
        <div class="section">
            <div class="section-title">Affected Code</div>
            <div class="code-block">${element.vulnerability.codeSnippet}</div>
        </div>
        ` : ''}
    </body>
    </html>`;
} 