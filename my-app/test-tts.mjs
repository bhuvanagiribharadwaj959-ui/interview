import { EdgeTTS } from 'node-edge-tts';
const tts = new EdgeTTS({ voice: 'en-US-ChristopherNeural' });
await tts.ttsPromise("Hello, this is a test.", "test.mp3");
console.log("Done");
