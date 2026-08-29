import 'package:flutter_tts/flutter_tts.dart';
import 'package:flutter/foundation.dart';

class TtsService {
  static final FlutterTts _flutterTts = FlutterTts();
  static bool _isInitialized = false;
  static bool _isPlaying = false;

  static Future<void> _init() async {
    if (_isInitialized) return;
    
    await _flutterTts.setLanguage("ko-KR");
    await _flutterTts.setSpeechRate(0.5); // 0.0 to 1.0
    await _flutterTts.setVolume(1.0); // 0.0 to 1.0
    await _flutterTts.setPitch(1.0); // 0.5 to 1.5

    _flutterTts.setStartHandler(() {
      _isPlaying = true;
    });

    _flutterTts.setCompletionHandler(() {
      _isPlaying = false;
    });

    _flutterTts.setErrorHandler((msg) {
      debugPrint("TTS Error: $msg");
      _isPlaying = false;
    });

    _isInitialized = true;
  }

  static Future<void> speak(String text) async {
    try {
      await _init();
      await stop(); // Stop current speech if any
      await _flutterTts.speak(text);
    } catch (e) {
      debugPrint("TTS Exception: $e");
    }
  }

  static Future<void> stop() async {
    try {
      await _init();
      await _flutterTts.stop();
      _isPlaying = false;
    } catch (e) {
      debugPrint("TTS Stop Exception: $e");
    }
  }

  static bool get isPlaying => _isPlaying;
}
