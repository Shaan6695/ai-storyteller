// public/script.js
const storyIdeaInput = document.getElementById('story-idea');
const generateButton = document.getElementById('generate-button');
const loadingIndicator = document.getElementById('loading');
const errorMessageDiv = document.getElementById('error-message'); // General errors
const resultsDiv = document.getElementById('results');
const storyOutput = document.getElementById('story-output');

// Image related elements
const imageContainer = document.getElementById('image-container');
const generatedImage = document.getElementById('generated-image');
const imageError = document.getElementById('image-error'); // Specific image error display
const imagePromptDisplay = document.querySelector('.image-prompt-display'); // Optional prompt display
const imagePromptTextSpan = document.getElementById('image-prompt-text'); // Optional prompt display text


generateButton.addEventListener('click', async () => {
    const idea = storyIdeaInput.value.trim();
    if (!idea) {
        displayError("Please enter a story idea.");
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

        // --- Handle Response ---
        // Try to parse JSON regardless of status code, as backend might send error details
        const data = await response.json();

        if (!response.ok) {
            // Handle HTTP errors (4xx, 5xx)
            // Use error message from backend if available, otherwise use status text
            const errorMsg = data.error || `Request failed: ${response.statusText} (${response.status})`;
            console.error("Backend Error Response:", data); // Log the full error from backend
            displayError(errorMsg);
            // If story was generated before error, display it
             if(data.story) {
                 storyOutput.textContent = data.story;
                 resultsDiv.classList.remove('hidden'); // Show results div for the story
                 imageContainer.classList.add('hidden'); // Ensure image part is hidden
             }
        } else {
            // Success (2xx status code)
            resultsDiv.classList.remove('hidden'); // Show results container
            errorMessageDiv.classList.add('hidden'); // Hide general error message div

            // Display Story
            storyOutput.textContent = data.story || "No story generated.";

            // Display Image (or image error)
            if (data.imageUrl) {
                generatedImage.src = data.imageUrl;
                generatedImage.alt = `DALL-E image for story idea: ${idea.substring(0, 50)}...`; // Better alt text
                imageContainer.classList.remove('hidden'); // Show image container
                imageError.classList.add('hidden'); // Hide image error message
                 // Optionally display the prompt used
                 if (data.imagePrompt && imagePromptTextSpan) {
                    imagePromptTextSpan.textContent = data.imagePrompt;
                    imagePromptDisplay?.classList.remove('hidden');
                 } else {
                    imagePromptDisplay?.classList.add('hidden');
                 }
            } else {
                // No image URL, display specific image error from backend if available
                imageContainer.classList.add('hidden'); // Hide image container
                imageError.textContent = data.error || "Image could not be generated."; // Use specific error from backend
                imageError.classList.remove('hidden'); // Show image error message
                imagePromptDisplay?.classList.add('hidden'); // Hide prompt display
            }
        }

    } catch (error) {
        // --- Handle Network/Fetch Errors ---
        console.error("Fetch Error:", error);
        // Check if response exists from a failed fetch, try to parse
         let backendError = '';
         if (error.response) {
             try {
                 const errData = await error.response.json();
                 backendError = errData.error || JSON.stringify(errData);
             } catch (parseError) {
                 backendError = await error.response.text();
             }
         }
        displayError(`Network or server error: ${error.message}${backendError ? ` (Server: ${backendError})` : ''}`);
    } finally {
        // --- UI Updates: Stop Loading ---
        showLoading(false);
    }
});

function showLoading(isLoading) {
    loadingIndicator.style.display = isLoading ? 'block' : 'none';
    generateButton.disabled = isLoading;
    if (isLoading) {
        errorMessageDiv.classList.add('hidden'); // Hide errors when starting
        resultsDiv.classList.add('hidden'); // Hide results
        imageError.classList.add('hidden'); // Hide specific image error
    }
}

function displayError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden'); // Hide results section on general error
}

function clearOutput() {
    storyOutput.textContent = '';
    generatedImage.src = ''; // Clear image source
    generatedImage.alt = 'AI Generated Image';
    imageContainer.classList.add('hidden'); // Hide image container
    resultsDiv.classList.add('hidden');
    errorMessageDiv.classList.add('hidden'); // Hide general errors
    imageError.classList.add('hidden'); // Hide image-specific errors
    imageError.textContent = '';
    imagePromptDisplay?.classList.add('hidden'); // Hide optional prompt display
    if(imagePromptTextSpan) imagePromptTextSpan.textContent = '';
}