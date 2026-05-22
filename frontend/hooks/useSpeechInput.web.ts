import { useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export function useSpeechInput(onFinalTranscript: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const pendingTranscript = useRef('');

  useSpeechRecognitionEvent('start', () => {
    setIsRecording(true);
    setInterimText('');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      pendingTranscript.current = transcript;
      setInterimText(transcript);
    } else {
      setInterimText(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    setInterimText('');
    const transcript = pendingTranscript.current.trim();
    pendingTranscript.current = '';
    if (transcript) onFinalTranscript(transcript);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsRecording(false);
    setInterimText('');
    pendingTranscript.current = '';
  });

  const start = async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) return;
    pendingTranscript.current = '';
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      addsPunctuation: true,
    });
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  return { isRecording, interimText, isSupported: true as const, start, stop };
}
