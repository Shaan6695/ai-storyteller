// server.js
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { ElevenLabsClient } from 'elevenlabs'; // Import ElevenLabs
import fs from 'fs'; // Node.js File System module
import path from 'path'; // Node.js Path module
import { fileURLToPath } from 'url'; // To get __dirname equivalent in ES Modules
import crypto from 'crypto'; // For generating unique filenames
// ... other imports ...
//import { Readable } from 'node:stream'; // Import Node.js Readable stream class
//import { pipeline } from 'node:stream/promises'; // Ensure pipeline is imported (or keep await import if preferred)

// --- Configuration ---
dotenv.config();
const PORT = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY; // Load ElevenLabs Key

// --- ES Module __dirname equivalent ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Directory for temporary audio files ---
const TEMP_AUDIO_DIR = path.join(__dirname, 'public', 'temp_audio');
// Ensure the directory exists
if (!fs.existsSync(TEMP_AUDIO_DIR)) {
    fs.mkdirSync(TEMP_AUDIO_DIR, { recursive: true });
    console.log(`Created temporary audio directory: ${TEMP_AUDIO_DIR}`);
}


// --- API Key Checks ---
if (!GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY not found."); process.exit(1);
}
if (!OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY not found."); process.exit(1);
}
if (!ELEVENLABS_API_KEY) {
    console.error("Error: ELEVENLABS_API_KEY not found."); process.exit(1); // Check ElevenLabs key
}

// --- Initialize Clients ---
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY }); // Initialize ElevenLabs

// --- Express App Setup ---
const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve files from 'public'
// Serve temporary audio files statically
app.use('/temp_audio', express.static(TEMP_AUDIO_DIR));
console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
console.log(`Serving temporary audio from URL path '/temp_audio' mapped to directory: ${TEMP_AUDIO_DIR}`);


// --- API Endpoint ---
app.post('/generate', async (req, res) => {
    const { storyIdea } = req.body;

    if (!storyIdea) {
        return res.status(400).json({ error: 'Story idea is required.' });
    }

    console.log(`Received story idea: "${storyIdea}"`);
    let storyText = null;
    let imagePromptText = null;
    let imageUrl = null;
    let audioUrl = null; // Variable for the audio file URL
    let generationError = null; // Combined error tracking

    try {
        // 1. Generate Story with Gemini
        console.log("Generating story...");
        // ... (Gemini story generation code - unchanged) ...
        const storyPrompt = `Write a short, creative, and engaging story (around 150-250 words) based on the following idea: "${storyIdea}".`;
        const storyResult = await textModel.generateContent(storyPrompt);
        const storyResponse = storyResult.response;
        storyText = storyResponse.text();

        if (!storyText) {
            console.error("Story generation failed:", storyResponse.promptFeedback);
            return res.status(500).json({ error: 'Story generation failed.', details: storyResponse.promptFeedback });
        }
        console.log("Story generated.");

        // Fork execution: Generate Image Prompt/Image AND Generate Audio in parallel (or sequence)
        // Using Promise.allSettled allows one to fail without stopping the others

        const [imageResult, audioResult] = await Promise.allSettled([
            // --- Image Generation Branch ---
            (async () => {
                console.log("Generating image prompt...");
                 const imagePromptInstruction = `Based on the following story, create a concise and visually descriptive prompt (around 30-50 words) suitable for the DALL-E AI image generator. Focus on the main subject, action, setting, and overall mood/style. Story: "${storyText}"`;
                 const imagePromptGen = await textModel.generateContent(imagePromptInstruction);
                 imagePromptText = imagePromptGen.response.text()?.trim();

                 if (!imagePromptText) {
                    console.warn("Image prompt generation failed:", imagePromptGen.response.promptFeedback);
                    throw new Error("Image prompt generation failed/blocked."); // Throw to be caught by allSettled
                 }
                 console.log("Image prompt generated:", imagePromptText);

                 console.log("Generating image with DALL-E...");
                 const imageResponse = await openai.images.generate({
                     model: "dall-e-2",
                     prompt: imagePromptText,
                     n: 1,
                     size: "1024x1024",
                 });

                 if (imageResponse.data?.[0]?.url) {
                    console.log("DALL-E Image generated:", imageResponse.data[0].url);
                    return { imageUrl: imageResponse.data[0].url, imagePrompt: imagePromptText }; // Return results
                 } else {
                     console.warn("DALL-E response invalid:", imageResponse);
                     throw new Error("DALL-E did not return a valid image URL."); // Throw error
                 }
            })(), // Immediately invoke the async function for image gen

            // --- Audio Generation Branch ---
            (async () => {
                if (!storyText) return null;

                console.log("Generating audio with ElevenLabs...");
                const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel's Voice ID
                const uniqueFilename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp3`;
                const filePath = path.join(TEMP_AUDIO_DIR, uniqueFilename);
                const fileUrl = `/temp_audio/${uniqueFilename}`;

                // Create the file write stream first
                const fileWriteStream = fs.createWriteStream(filePath);

                try {
                    // Generate the audio stream from ElevenLabs (the wrapper object)
                    const audioStreamWrapper = await elevenlabs.generate({
                        stream: true,
                        voice: voiceId,
                        text: storyText,
                        model_id: "eleven_multilingual_v2"
                    });

                    // --- FIX: Manually Iterate and Write ---
                    console.log("Starting audio stream processing...");
                    for await (const chunk of audioStreamWrapper) {
                        // Assuming the wrapper yields Buffer chunks compatible with write stream
                        fileWriteStream.write(chunk);
                    }
                    // Signal that no more data will be written
                    fileWriteStream.end();
                    console.log("Finished processing audio stream chunks.");

                    // Wait for the file stream to finish writing to disk
                    await new Promise((resolve, reject) => {
                        fileWriteStream.on('finish', resolve);
                        fileWriteStream.on('error', (err) => {
                            console.error("File write stream error:", err);
                            reject(err); // Reject the promise on file write error
                        });
                    });
                    // -----------------------------------------

                    console.log(`Audio saved successfully to: ${filePath}`);
                    console.log(`Audio accessible at URL: ${fileUrl}`);
                    return fileUrl; // Return the URL on success

                } catch (error) {
                     // Catch errors during ElevenLabs generation OR stream processing/writing
                    console.error("Error during audio generation or saving:", error);
                    // Attempt to clean up the potentially incomplete file
                    if (fileWriteStream && !fileWriteStream.closed) {
                        fileWriteStream.close(() => {
                             try { fs.unlinkSync(filePath); } catch (e) { /* Ignore unlink error */ }
                        });
                    } else {
                         try { fs.unlinkSync(filePath); } catch (e) { /* Ignore unlink error */ }
                    }
                     // Re-throw the error so Promise.allSettled sees it as rejected
                    throw error;
                }
            })() // Immediately invoke the async function for audio gen

        ]);

        // --- Process results from Promise.allSettled ---
        if (imageResult.status === 'fulfilled') {
            imageUrl = imageResult.value.imageUrl;
            imagePromptText = imageResult.value.imagePrompt; // Keep track of the prompt used
        } else {
            console.error("Image generation failed:", imageResult.reason);
            // Set specific error message for the frontend about the image
            generationError = (generationError ? generationError + "; " : "") + `Image generation failed: ${imageResult.reason?.message || 'Unknown reason'}`;
        }

        if (audioResult.status === 'fulfilled') {
            audioUrl = audioResult.value;
        } else {
            console.error("Audio generation failed:", audioResult.reason);
             // Set specific error message for the frontend about the audio
             generationError = (generationError ? generationError + "; " : "") + `Audio generation failed: ${audioResult.reason?.message || 'Unknown reason'}`;
        }


        // --- Send Final Response ---
        res.json({
            story: storyText,
            imageUrl: imageUrl,
            audioUrl: audioUrl, // Add the audio URL
            imagePrompt: imagePromptText, // Still useful to send
            error: generationError // Send combined errors/warnings
        });

    } catch (error) {
        // Catch errors from the initial story generation or other unexpected issues
        console.error("General error during generation process:", error);
        let errorMessage = generationError || 'An error occurred during the generation process.';
        if (!generationError && error.message) {
            errorMessage += ` Details: ${error.message}`;
        }
        // Send back whatever was successfully generated before the fatal error
        res.status(500).json({
            error: errorMessage,
            story: storyText,
            imageUrl: imageUrl,
            audioUrl: audioUrl
         });
    }
});


// --- TODO: Implement Cleanup for old audio files ---
// A simple cron job or a check on server start could remove files older than X days/hours
// Example (conceptual - would need a library like 'node-cron'):
// cron.schedule('0 0 * * *', () => { // Run daily at midnight
//   console.log('Running daily audio file cleanup...');
//   fs.readdir(TEMP_AUDIO_DIR, (err, files) => {
//     if (err) { console.error("Error reading audio dir for cleanup:", err); return; }
//     files.forEach(file => {
//       const filePath = path.join(TEMP_AUDIO_DIR, file);
//       fs.stat(filePath, (err, stats) => {
//         if (err) { console.error(`Error getting stats for ${file}:`, err); return; }
//         const now = Date.now();
//         const fileAgeHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);
//         if (fileAgeHours > 24) { // Delete files older than 24 hours
//           fs.unlink(filePath, err => {
//             if (err) console.error(`Error deleting old audio file ${file}:`, err);
//             else console.log(`Deleted old audio file: ${file}`);
//           });
//         }
//       });
//     });
//   });
// });


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});