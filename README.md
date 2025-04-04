# AI-Storyteller

This AI Powered Story Telling program takes a users story idea and generates a short story, an image, the image prompt for the image generation, and a text to speech voice for the story.

Using Gemini 1.5 Flash API for text generation, Open AI's API for Image Generation, and Eleven Labs free API for text to speech generation.

### Installation
* Clone This Repository
* Add a .env file to the root directory of this repository
* Inside the .env file add your API Keys
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```
* Install dependencies with :
  ```
  npm install
  ```
* Run the server using the following command in the terminal : 
  ```
  node server.js
  ```
* Go to http://localhost:3000 to see the page

----------

### Images of the program working
* User Input : Story Ideas
<img width="762" alt="Screenshot 2025-04-04 at 7 00 30 AM copy" src="https://github.com/user-attachments/assets/8e435415-89a5-464f-b1f7-dafc5900d311" />

* How the AI Generated Voice functionality looks like : 
<img width="679" alt="Screenshot 2025-04-04 at 9 40 24 AM" src="https://github.com/user-attachments/assets/a213ac86-f1df-4096-806d-c90b079dca22" />

* Generated Image with Image Prompt on the bottom : 
<img width="691" alt="Screenshot 2025-04-04 at 7 01 12 AM copy" src="https://github.com/user-attachments/assets/f611079a-9ce6-4869-908a-08cddc1a9af4" />

-----------------------

* Additional Note :
  - When commiting this project to github, put the node_modules and .env filenames inside the .gitignore file. The .env contains your API Key's which you would want to stay hidden on github. 

