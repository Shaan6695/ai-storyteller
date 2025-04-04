// public/script.js
const storyIdeaInput = document.getElementById('story-idea');
const generateButton = document.getElementById('generate-button');
const loadingIndicator = document.getElementById('loading');
const generalErrorMessageDiv = document.getElementById('error-message'); // For fatal errors
const partialErrorMessageDiv = document.getElementById('partial-error-message'); // For non-fatal warnings/errors
const resultsDiv = document.getElementById('results');
const storyOutput = document.getElementById('story-output');

// Image related elements
const imageContainer = document.getElementById('image-container');
const generatedImage = document.getElementById('generated-image');
const imageError = document.getElementById('image-error');
const imagePromptDisplay = document.querySelector('.image-prompt-display');
const imagePromptTextSpan = document.getElementById('image-prompt-text');

// Audio related elements
const audioContainer = document.getElementById('audio-container');
const storyAudio = document.getElementById('story-audio');
const audioError = document.getElementById('audio-error');


generateButton.addEventListener('click', async () => {
    const idea = storyIdeaInput.value.trim();
    if (!idea) {
        displayError("Please enter a story idea.", true); // Use general error display for input validation
        return;
    }

    // --- UI Updates: Start Loading ---
    showLoading(true);
    clearOutput();

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ storyIdea: idea }),
        });

        const data = await response.json(); // Parse JSON regardless of status

        if (!response.ok) {
            // Handle HTTP errors (4xx, 5xx) - Likely fatal for the whole request
            const errorMsg = data.error || `Request failed: ${response.statusText} (${response.status})`;
            console.error("Backend Error Response:", data);
            displayError(errorMsg, true); // Show in general error display
             // Optionally show partial results if backend sent them despite error
             if(data.story) storyOutput.textContent = data.story;
             resultsDiv.classList.remove('hidden'); // Show results div even on error if there's partial data
        } else {
            // Success (2xx status code) - Results should contain generated content and possibly specific errors
            resultsDiv.classList.remove('hidden'); // Show results container
            generalErrorMessageDiv.classList.add('hidden'); // Hide general error message div

            // Display Story (should always be present on success)
            storyOutput.textContent = data.story || "No story generated.";

            // Display Image (or image error)
            if (data.imageUrl) {
                generatedImage.src = data.imageUrl;
                generatedImage.alt = `DALL-E image for: ${idea.substring(0, 50)}...`;
                imageContainer.classList.remove('hidden');
                imageError.classList.add('hidden'); // Hide specific image error message
                if (data.imagePrompt && imagePromptTextSpan) {
                    imagePromptTextSpan.textContent = data.imagePrompt;
                    imagePromptDisplay?.classList.remove('hidden');
                } else {
                    imagePromptDisplay?.classList.add('hidden');
                }
            } else {
                // No image URL, but request was overall successful (story generated)
                imageContainer.classList.add('hidden');
                // Image-specific error message might be in data.error (check backend logic)
                // We'll rely on the combined error message below for now, or use a dedicated image error field if added later
                 imagePromptDisplay?.classList.add('hidden');
            }

             // Display Audio Player (or audio error)
            if (data.audioUrl) {
                 // Preload 'metadata' to get duration quickly, 'auto' to load whole file
                 storyAudio.preload = 'metadata';
                 storyAudio.src = data.audioUrl;
                 audioContainer.classList.remove('hidden'); // Show audio container
                 audioError.classList.add('hidden'); // Hide specific audio error message
            } else {
                 // No audio URL
                 audioContainer.classList.add('hidden');
                 // Audio-specific error might be in data.error
            }

             // Display combined non-fatal errors/warnings if any
             if (data.error) {
                 displayError(data.error, false); // Use partial error display
             } else {
                 partialErrorMessageDiv.classList.add('hidden'); // Hide if no partial errors
             }
        }

    } catch (error) {
        // --- Handle Network/Fetch Errors ---
        console.error("Fetch Error:", error);
         displayError(`Network or server communication error: ${error.message}`, true); // Use general display
    } finally {
        // --- UI Updates: Stop Loading ---
        showLoading(false);
    }
});

function showLoading(isLoading) {
    loadingIndicator.style.display = isLoading ? 'block' : 'none';
    generateButton.disabled = isLoading;
    if (isLoading) {
        // Hide everything during loading
        generalErrorMessageDiv.classList.add('hidden');
        partialErrorMessageDiv.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        // Ensure specific error messages within results are also hidden initially
        imageError.classList.add('hidden');
        audioError.classList.add('hidden');
    }
}

// Consolidated error display function
// isFatal: true uses general error div, false uses partial error div
function displayError(message, isFatal) {
     const targetDiv = isFatal ? generalErrorMessageDiv : partialErrorMessageDiv;
     const otherDiv = isFatal ? partialErrorMessageDiv : generalErrorMessageDiv;

     targetDiv.textContent = message;
     targetDiv.classList.remove('hidden');
     targetDiv.className = isFatal ? 'error' : 'warning'; // Style accordingly
     otherDiv.classList.add('hidden'); // Hide the other error div

     if (isFatal) {
         resultsDiv.classList.add('hidden'); // Hide results section on fatal error
     }
}

function clearOutput() {
    storyOutput.textContent = '';

    generatedImage.src = '';
    generatedImage.alt = 'AI Generated Image';
    imageContainer.classList.add('hidden');
    imagePromptDisplay?.classList.add('hidden');
    if(imagePromptTextSpan) imagePromptTextSpan.textContent = '';
    imageError.classList.add('hidden');
    imageError.textContent = '';


    storyAudio.src = ''; // Clear audio source
    storyAudio.removeAttribute('src'); // More thorough reset for audio
    audioContainer.classList.add('hidden'); // Hide audio container
    audioError.classList.add('hidden');
    audioError.textContent = '';


    resultsDiv.classList.add('hidden'); // Hide the main results container
    generalErrorMessageDiv.classList.add('hidden'); // Hide general errors
    partialErrorMessageDiv.classList.add('hidden'); // Hide partial errors
    generalErrorMessageDiv.textContent = '';
    partialErrorMessageDiv.textContent = '';
}