// server.js
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai'; // Import OpenAI

// --- Configuration ---
dotenv.config();
const PORT = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Load OpenAI Key

if (!GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY not found in .env file.");
    process.exit(1);
}
if (!OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY not found in .env file.");
    process.exit(1); // Exit if OpenAI key is missing too
}

// --- Initialize Google Generative AI ---
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Initialize OpenAI ---
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Express App Setup ---
const app = express();
app.use(express.json());
app.use(express.static('public'));

// --- API Endpoint ---
app.post('/generate', async (req, res) => {
    const { storyIdea } = req.body;

    if (!storyIdea) {
        return res.status(400).json({ error: 'Story idea is required.' });
    }

    console.log(`Received story idea: "${storyIdea}"`);
    let storyText = null; // Initialize variables to hold results
    let imagePromptText = null;
    let imageUrl = null;
    let generationError = null; // To track specific errors

    try {
        // 1. Generate Story with Gemini
        console.log("Generating story...");
        const storyPrompt = `Write a short, creative, and engaging story (around 150-250 words) based on the following idea: "${storyIdea}".`;
        const storyResult = await textModel.generateContent(storyPrompt);
        const storyResponse = storyResult.response;
        storyText = storyResponse.text(); // Assign to outer scope variable

        if (!storyText) {
            console.error("Story generation blocked or failed:", storyResponse.promptFeedback || "Unknown reason");
            generationError = 'Story generation failed. The prompt might have been blocked.';
            // Stop processing if story fails
            return res.status(500).json({ error: generationError, details: storyResponse.promptFeedback });
        }
        console.log("Story generated.");

        // 2. Generate Image Prompt with Gemini
        console.log("Generating image prompt...");
        const imagePromptInstruction = `Based on the following story, create a concise and visually descriptive prompt (around 30-50 words) suitable for the DALL-E AI image generator. Focus on the main subject, action, setting, and overall mood/style. Story: "${storyText}"`;
        const imagePromptResult = await textModel.generateContent(imagePromptInstruction);
        const imagePromptResponse = imagePromptResult.response;
        imagePromptText = imagePromptResponse.text()?.trim(); // Assign and trim

        if (!imagePromptText) {
            console.warn("Image prompt generation blocked or failed:", imagePromptResponse.promptFeedback || "Unknown reason");
            // Don't stop the whole process, just note the warning.
            // We can still return the story.
            imagePromptText = null; // Ensure it's null if failed
        } else {
            console.log("Image prompt generated:", imagePromptText);

             // 3. Generate Image with DALL-E using the prompt
            console.log("Generating image with DALL-E...");
            try {
                // Use dall-e-2 for faster/cheaper results, or dall-e-3 for higher quality
                // Check OpenAI docs for valid sizes for each model. 1024x1024 is common.
                const imageResponse = await openai.images.generate({
                    model: "dall-e-2", // or "dall-e-3"
                    prompt: imagePromptText,
                    n: 1, // Generate one image
                    size: "1024x1024", // Common size, check model compatibility
                    // response_format: "url" // Default is URL
                });

                // Extract the URL (check response structure in OpenAI docs if needed)
                 if (imageResponse.data && imageResponse.data.length > 0 && imageResponse.data[0].url) {
                    imageUrl = imageResponse.data[0].url; // Assign image URL
                    console.log("DALL-E Image generated:", imageUrl);
                 } else {
                    console.warn("DALL-E response did not contain a valid image URL:", imageResponse);
                    generationError = 'DALL-E image generation succeeded but no URL was returned.';
                 }

            } catch (dalleError) {
                console.error("Error calling DALL-E API:", dalleError);
                 generationError = `DALL-E image generation failed: ${dalleError.message || 'Unknown error'}`;
                 // If DALL-E fails, we still have the story and maybe the prompt
                 // We will send these back with an error/warning about the image
            }
        } // End of DALL-E generation block

        // 4. Send Final Response to Frontend
        // Include the story, the final image URL (if generated), and any errors/warnings
        res.json({
            story: storyText,
            imageUrl: imageUrl, // Send the actual image URL now
            imagePrompt: imagePromptText, // Optionally send the prompt used for debugging/info
            error: generationError // Send specific image generation error message if any
        });

    } catch (error) {
        // Catch broader errors (e.g., Gemini initial call failure, network issues)
        console.error("General error during generation:", error);
        let errorMessage = generationError || 'An error occurred during generation.'; // Use specific error if available
         if (!generationError && error.message) {
             errorMessage += ` Details: ${error.message}`;
         }
        res.status(500).json({ error: errorMessage, story: storyText }); // Send back story if it was generated before error
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});