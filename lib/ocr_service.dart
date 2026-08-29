import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class OcrService {
  static Future<String?> pickImageAndExtractText() async {
    try {
      final picker = ImagePicker();
      // 갤러리에서 이미지 선택
      final pickedFile = await picker.pickImage(source: ImageSource.gallery);
      if (pickedFile == null) return null;

      // 한국어 모델을 지원하는 텍스트 인식기 초기화
      final textRecognizer = TextRecognizer(script: TextRecognitionScript.korean);
      
      // 이미지 파일 경로를 통해 InputImage 객체 생성
      final inputImage = InputImage.fromFilePath(pickedFile.path);
      
      // 텍스트 추출 실행
      final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);
      
      // 메모리 누수 방지
      textRecognizer.close();
      
      return recognizedText.text;
    } catch (e) {
      print('OCR Error: $e');
      return null;
    }
  }

  static Future<String?> extractTextFromPath(String path) async {
    try {
      final textRecognizer = TextRecognizer(script: TextRecognitionScript.korean);
      final inputImage = InputImage.fromFilePath(path);
      final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);
      textRecognizer.close();
      return recognizedText.text;
    } catch (e) {
      print('OCR Path Error: $e');
      return null;
    }
  }
}
