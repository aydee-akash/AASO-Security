const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Local data storage
const phenotypeDict = {
  typeA: {},
  typeB: {},
  typeC: {},
  typeD: {}
};

// Helper function to calculate similarity between sequences
function calculateSimilarity(seq1, seq2) {
  let matches = 0;
  const minLength = Math.min(seq1.length, seq2.length);
  for (let i = 0; i < minLength; i++) {
    if (seq1[i] === seq2[i]) matches++;
  }
  return matches / Math.max(seq1.length, seq2.length);
}

// Helper function to determine phenotype
function determinePhenotype(cysts, irregularCycle, hyperandrogenism) {
  if (cysts === 'Y' && irregularCycle === 'Y' && hyperandrogenism === 'Y') return "typeA";
  if (cysts === 'N' && irregularCycle === 'Y' && hyperandrogenism === 'Y') return "typeB";
  if (cysts === 'Y' && irregularCycle === 'N' && hyperandrogenism === 'Y') return "typeC";
  if (cysts === 'Y' && irregularCycle === 'Y' && hyperandrogenism === 'N') return "typeD";
  return null;
}

// Add sequence endpoint
app.post('/api/add-sequence', async (req, res) => {
  try {
    const { geneName, sequence, cysts, irregularCycle, hyperandrogenism } = req.body;
    
    const phenotype = determinePhenotype(cysts, irregularCycle, hyperandrogenism);
    if (!phenotype) {
      return res.status(400).json({ error: 'Invalid phenotype combination' });
    }

    // Add sequence to local storage
    if (!phenotypeDict[phenotype][geneName]) {
      phenotypeDict[phenotype][geneName] = [];
    }
    phenotypeDict[phenotype][geneName].push(sequence);

    res.status(201).json({ message: 'Sequence added successfully' });
  } catch (error) {
    console.error('Error adding sequence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare sequences endpoint
app.post('/api/compare-sequences', async (req, res) => {
  try {
    const { geneName, sequence } = req.body;
    const results = {};
    const totalComparisons = {};

    // Initialize results and totalComparisons
    for (const phenotype in phenotypeDict) {
      results[phenotype] = 0;
      totalComparisons[phenotype] = 0;
    }

    // Compare sequences for each phenotype
    for (const phenotype in phenotypeDict) {
      const genes = phenotypeDict[phenotype];
      if (genes[geneName]) {
        const matches = genes[geneName].filter(storedSeq => 
          calculateSimilarity(storedSeq, sequence) === 1.0
        ).length;
        
        results[phenotype] = matches;
        totalComparisons[phenotype] = genes[geneName].length;
      }
    }

    // Calculate final probabilities
    const finalProbabilities = {};
    for (const phenotype in phenotypeDict) {
      const total = totalComparisons[phenotype];
      finalProbabilities[phenotype] = total > 0 ? (results[phenotype] / total) * 100 : 0;
    }

    res.json(finalProbabilities);
  } catch (error) {
    console.error('Error comparing sequences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat endpoint for PCOS-related queries
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    // Here you would integrate with OpenAI API
    // For now, returning a placeholder response
    res.json({ response: "I'm a PCOS assistant. How can I help you today?" });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 