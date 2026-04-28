import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for processing the survey image
  app.post("/api/process", async (req, res) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "Missing imageUrl" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 

      // Fetch the image from Firebase Storage URL
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString("base64");

      const prompt = `You are a disaster response AI. Read this handwritten survey (it may be in Hindi or another Indian language). 
      Translate it to English. Provide a 2-sentence summary of the needs. 
      Assign an urgency score from 1-10. 
      Finally, generate mock latitude and longitude coordinates near New Delhi, India for demo purposes (lat between 28.5 and 28.7, lng between 77.1 and 77.3).
      Return ONLY a JSON object with: { "summary": string, "urgency_score": number, "lat": number, "lng": number }`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg", // Assuming JPEG for simplicity, or we could detect it.
          },
        },
      ]);

      const text = result.response.text();
      // Clean up the JSON if Gemini wraps it in markdown blocks
      const jsonStr = text.replace(/```json|```/g, "").trim();
      const parsedData = JSON.parse(jsonStr);

      res.json(parsedData);
    } catch (error: any) {
      console.error("Processing error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
