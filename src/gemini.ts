import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

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

export class GeminiAnalyzer {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor() {
        // Hardcoded API key
        const API_KEY = 'AIzaSyBltfO0pCni99NkY3rD1HkhK5xJZubTkvY';
        this.genAI = new GoogleGenerativeAI(API_KEY);
        this.model = this.genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash"
        });
    }

    async analyzeVulnerability(vulnerability: Vulnerability): Promise<GeminiAnalysis> {
        const prompt = `Analyze the following code vulnerability and provide a detailed assessment:

Vulnerability Details:
- Type: ${vulnerability.type}
- Description: ${vulnerability.description}
- Location: ${vulnerability.file ? `File: ${vulnerability.file}` : ''} Line: ${vulnerability.line}, Column: ${vulnerability.column}

Please provide:
1. Risk level (LOW, MEDIUM, HIGH, or CRITICAL)
2. Vulnerability classification
3. Context about why this is a vulnerability
4. Specific remediation steps
5. Confidence level in your assessment (0-100)

Format your response as a JSON object with these exact keys:
{
    "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
    "classification": "string",
    "context": "string",
    "remediation": ["string"],
    "confidence": number
}`;

        try {
            console.log('Sending prompt to Gemini:', prompt);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            if (!response) {
                throw new Error('No response received from Gemini API');
            }

            const text = response.text();
            console.log('Raw response from Gemini:', text);

            if (!text) {
                throw new Error('Empty response received from Gemini API');
            }
            
            // Clean the response text by removing markdown code block syntax
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            console.log('Cleaned response:', cleanText);
            
            try {
                // Parse the JSON response
                const analysis: GeminiAnalysis = JSON.parse(cleanText);
                
                // Validate the analysis object
                if (!analysis.riskLevel || !analysis.classification || !analysis.context || !analysis.remediation || typeof analysis.confidence !== 'number') {
                    throw new Error('Invalid analysis format received from Gemini API');
                }
                
                console.log('Parsed analysis:', analysis);
                return analysis;
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                console.error('Failed to parse text:', cleanText);
                const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
                throw new Error(`Failed to parse Gemini response: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Gemini analysis error:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to analyze vulnerability with Gemini: ${error.message}`);
            }
            throw new Error('Failed to analyze vulnerability with Gemini');
        }
    }

    async analyzeMultipleVulnerabilities(vulnerabilities: Vulnerability[]): Promise<Map<Vulnerability, GeminiAnalysis>> {
        const results = new Map<Vulnerability, GeminiAnalysis>();
        
        for (const vuln of vulnerabilities) {
            try {
                const analysis = await this.analyzeVulnerability(vuln);
                results.set(vuln, analysis);
            } catch (error) {
                console.error(`Failed to analyze vulnerability: ${vuln.description}`, error);
            }
        }
        
        return results;
    }
} 