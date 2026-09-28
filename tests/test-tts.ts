import { EdgeTTS } from '@andresaya/edge-tts';

async function testTTS() {
  const tts = new EdgeTTS();
  console.log('Generating speech for Zyra with en-US-AriaNeural...');
  
  await tts.synthesize('Hello Eren, I am Zyra. Your personal artificial intelligence assistant.', 'en-US-AriaNeural', {
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
  });

  const buffer = tts.toBuffer();
  console.log(`Success! Synthesized audio buffer: ${buffer.length} bytes (MP3)`);
}

testTTS().catch(console.error);
