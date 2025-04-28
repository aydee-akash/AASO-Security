import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { GeminiAnalyzer } from './gemini';

interface Vulnerability {
    line: number;
    column: number;
    description: string;
    type: string;
    file?: string;
}

interface GeminiAnalysis {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    classification: string;
    context: string;
    remediation: string[];
    confidence: number;
}

class VulnerabilityTreeProvider implements vscode.TreeDataProvider<Vulnerability> {
    private vulnerabilities: Vulnerability[] = [];
    private _onDidChangeTreeData: vscode.EventEmitter<Vulnerability | undefined | null> = new vscode.EventEmitter<Vulnerability | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<Vulnerability | undefined | null> = this._onDidChangeTreeData.event;

    constructor() {
        this.vulnerabilities = [];
    }

    updateVulnerabilities(vulnerabilities: Vulnerability[]) {
        console.log('Updating vulnerabilities:', vulnerabilities);
        this.vulnerabilities = vulnerabilities;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: Vulnerability): vscode.TreeItem {
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
        tooltip.appendMarkdown(`**Column:** ${element.column}`);
        
        return {
            label: label,
            description: element.description,
            tooltip: tooltip,
            iconPath: new vscode.ThemeIcon(this.getIconName(element.type)),
            command: {
                command: 'aaso-security.gotoLine',
                title: 'Go to Line',
                arguments: [element.line, element.column]
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

    getChildren(element?: Vulnerability): Vulnerability[] {
        if (element) {
            return [];
        }
        return this.vulnerabilities;
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
            iconPath: new vscode.ThemeIcon('warning', new vscode.ThemeColor(`charts.${color}`))
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

export function activate(context: vscode.ExtensionContext) {
    console.log('AASO Security extension is now active!');

    const vulnerabilityProvider = new VulnerabilityTreeProvider();
    const geminiAnalysisProvider = new GeminiAnalysisProvider();
    
    // Register the TreeDataProviders
    const vulnerabilityView = vscode.window.createTreeView('aaso-security.vulnerabilities', {
        treeDataProvider: vulnerabilityProvider,
        showCollapseAll: true
    });

    const geminiAnalysisView = vscode.window.createTreeView('aaso-security.geminiAnalysis', {
        treeDataProvider: geminiAnalysisProvider,
        showCollapseAll: true
    });
    
    context.subscriptions.push(vulnerabilityView, geminiAnalysisView);

    // Initialize with empty vulnerabilities
    vulnerabilityProvider.updateVulnerabilities([]);
    geminiAnalysisProvider.updateAnalysis(new Map());

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

            const vulnerabilities: Vulnerability[] = await response.json();
            console.log('Received vulnerabilities:', vulnerabilities);
            
            vulnerabilityProvider.updateVulnerabilities(vulnerabilities);
            
            if (vulnerabilities.length === 0) {
                vscode.window.showInformationMessage('No vulnerabilities found!');
            } else {
                vscode.window.showInformationMessage(`Found ${vulnerabilities.length} vulnerabilities`);
            }
        } catch (error) {
            console.error('Scan error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Error scanning code: ${errorMessage}`);
            
            // Check if the server is running
            if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
                vscode.window.showErrorMessage('Could not connect to the scan server. Make sure the server is running on http://localhost:3000');
            }
        }
    }

    // Function to analyze vulnerabilities with Gemini
    async function analyzeWithGemini() {
        const vulnerabilities = vulnerabilityProvider.getChildren();
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

    context.subscriptions.push(
        scanCommand,
        snykScanCommand,
        sonarqubeScanCommand,
        analyzeWithGeminiCommand,
        gotoLineCommand
    );
}

export function deactivate() {
    console.log('AASO Security extension deactivated');
} 