// Native stub — expo-speech-recognition is not available in Expo Go.
// Voice ordering is disabled on native until a development build is used.
export function useSpeechInput(_onFinalTranscript: (text: string) => void) {
  return {
    isRecording: false as const,
    interimText: '',
    isSupported: false as const,
    start: async () => {},
    stop: () => {},
  };
}
