const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const CRITERIA = `
  1. Solve an everyday frustration (Wellness, Muscle relief, Sleep, Focus).
  2. High perceived value (looks expensive but is affordable).
  3. Easy to ship (Small/Light).
  4. Delivery must be under 7 days.
  5. AVOID: Fashion, generic jewelry, tech gadgets, or bulky items.
`;

async function filterProducts(rawData, provider = "GEMINI") {
  const prompt = `
    Analyze this product data: ${JSON.stringify(rawData)}
    Apply these criteria: ${CRITERIA}
    Return a JSON array of the top 3 matches. 
    Each object must have: title, price, reason_for_pick, and estimated_margin.
    Return ONLY valid JSON.
  `;

  try {
    if (provider === "GEMINI") {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } else {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      return response.choices[0].message.content;
    }
  } catch (error) {
    console.error("AI Filtering Error:", error.message);
    throw error;
  }
}

module.exports = { filterProducts };