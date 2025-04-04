# AI-Storyteller

Story Telling program that takes a users story idea and generates a short story, an image, and image prompt for the image generation. 

Using Gemini 1.5 Flash API for text generation and Open AI's API for Image Generation. 

### Installation
* Clone This Repository
* Add a .env file to the root directory of this repository
* Inside the .env file add your API Keys
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
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
<img width="1136" alt="User Input for story idea" src="https://github.com/user-attachments/assets/26a7a555-b70a-49ab-905d-fe0c2524dfb3" />


* Generated Image with Image Prompt on the bottom
<img width="691" alt="Screenshot 2025-04-04 at 7 01 12 AM copy" src="https://github.com/user-attachments/assets/f611079a-9ce6-4869-908a-08cddc1a9af4" />

-----------------------

* Additional Note :
  - When commiting this project to github, put the node_modules and .env filenames inside the .gitignore file. The .env contains your API Key's which you would want to stay hidden on github. 

