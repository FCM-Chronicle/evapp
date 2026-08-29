import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_to_text.dart';

class SttService {
  static final SpeechToText _speechToText = SpeechToText();
  static bool _isInitialized = false;

  static Future<bool> initialize() async {
    if (_isInitialized) return true;
    try {
      _isInitialized = await _speechToText.initialize(
        onError: (val) => debugPrint('STT Error: $val'),
        onStatus: (val) => debugPrint('STT Status: $val'),
      );
      return _isInitialized;
    } catch (e) {
      debugPrint('STT Init Exception: $e');
      return false;
    }
  }

  static Future<void> startListening({
    required Function(String text) onResult,
    required Function(String error) onError,
    required VoidCallback onComplete,
  }) async {
    final ok = await initialize();
    if (!ok) {
      onError("STT 서비스를 초기화할 수 없습니다.");
      return;
    }

    if (_speechToText.isListening) {
      await _speechToText.stop();
    }

    try {
      await _speechToText.listen(
        onResult: (result) {
          if (result.finalResult) {
            onResult(result.recognizedWords);
            onComplete();
          }
        },
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
        cancelOnError: true,
      );
    } catch (e) {
      onError("음성 인식 시작 실패: $e");
    }
  }

  static Future<void> stopListening() async {
    if (_speechToText.isListening) {
      await _speechToText.stop();
    }
  }

  static bool get isListening => _speechToText.isListening;
}
