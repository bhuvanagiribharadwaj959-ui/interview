# AI Interviewer
This is a simple AI Interviewer application built with Next.js (Pages Router).  
## Setup
1. **Environment Variables**:
Ensure your .env file in the root of my-app has the required keys for your configured LLM provider.
(A .env.example is provided for reference).

2. **Fish Speech TTS Setup**:
Add your Fish Speech endpoint details to the .env file:
```
FISH_TTS_API_URL=http://127.0.0.1:8080/v1/tts
FISH_TTS_API_KEY=your_optional_server_api_key
```
Start the Fish Speech v1.5 API server from the notebook and point `FISH_TTS_API_URL` to that `/v1/tts` endpoint.

3. **Install Dependencies**:
\\\ash
cd my-app
npm install
\\\

4. **Run the Application**:
\\\ash
npm run dev
\\\

5. **Usage**:
- Open http://localhost:3000.
- Click **Start Interview**.
- Allow microphone access.
- Speak when the microphone icon appears.
- Wait for the AI to respond.

## Technology Stack
- **Frontend**: Next.js (React), Tailwind CSS.
- **LLM**: Provider configurable.
- **TTS**: Fish Speech v1.5 API.
- **STT**: Web Speech API (Browser Native).
