import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class OcrService {
  /// 갤러리에서 이미지를 선택하고 텍스트를 인식하여 반환합니다.
  static Future<String?> pickImageAndExtractText() async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: ImageSource.gallery);
      if (pickedFile == null) return null;

      return await extractTextFromPath(pickedFile.path);
    } catch (e) {
      debugPrint('OCR Pick & Extract Error: $e');
      return null;
    }
  }

  /// 파일 경로로부터 텍스트를 인식합니다 (한국어 시도 후 라틴어 fallback).
  static Future<String?> extractTextFromPath(String path) async {
    final inputImage = InputImage.fromFilePath(path);

    // 1. 한국어 스크립트 시도
    TextRecognizer? koreanRecognizer;
    try {
      koreanRecognizer = TextRecognizer(script: TextRecognitionScript.korean);
      final RecognizedText recognizedText = await koreanRecognizer.processImage(inputImage);
      final text = recognizedText.text.trim();
      if (text.isNotEmpty) {
        return text;
      }
    } catch (e) {
      debugPrint('OCR Korean Recognizer Error: $e, falling back to Latin...');
    } finally {
      koreanRecognizer?.close();
    }

    // 2. 라틴어 스크립트 Fallback
    TextRecognizer? latinRecognizer;
    try {
      latinRecognizer = TextRecognizer(script: TextRecognitionScript.latin);
      final RecognizedText recognizedText = await latinRecognizer.processImage(inputImage);
      final text = recognizedText.text.trim();
      return text.isNotEmpty ? text : null;
    } catch (e) {
      debugPrint('OCR Latin Recognizer Error: $e');
      return null;
    } finally {
      latinRecognizer?.close();
    }
  }
}
