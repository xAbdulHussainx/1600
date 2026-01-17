require('dotenv').config();
const express = require('express');
const cors = require('cors');
const runScraper = require('./scrapers/kalodata');
const { filterProducts } = require('./services/aiService');

const app = express();
app.use(cors());
app.use(express.json());

// 1. The helper function (Place this at the top)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/api/scrape-and-filter', async (req, res) => {
  try {
    console.log("🚀 Step 1: Launching Scraper...");
    const data = await runScraper(process.env.KALO_EMAIL, process.env.KALO_PASS);
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No products found on the page." });
    }

    console.log(`🤖 Step 2: Filtering ${data.length} products with AI...`);

    // 2. The Retry Logic (Inserted here)
    let attempts = 0;
    let filteredResult;

    while (attempts < 3) {
      try {
        // We pass "GEMINI" here. If you want to test OpenAI, change it here!
        filteredResult = await filterProducts(data, "OPENAI");
        break; // ✅ Success! Exit the loop.
      } catch (error) {
        // If we hit the 429 "Too Many Requests" error
        if (error.status === 429 || error.message.includes('429')) {
          attempts++;
          console.log(`⏳ Quota hit. Waiting 20s before retry (Attempt ${attempts}/3)...`);
          await wait(20000); // Wait 20 seconds
        } else {
          // If it's a different error (like a typo), stop immediately
          throw error;
        }
      }
    }

    if (!filteredResult) {
        throw new Error("AI failed to return data after multiple attempts.");
    }

    // Clean up the AI response (remove markdown code blocks)
    const cleanJson = filteredResult.replace(/```json|```/g, "").trim();
    
    console.log("✅ Successfully filtered!");
    res.json(JSON.parse(cleanJson));

  } catch (error) {
    console.error("❌ Pipeline Error:", error.message);
    res.status(500).json({ error: error.message || "Something went wrong." });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));