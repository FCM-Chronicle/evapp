// evapp/lib/document_service.dart
//
// AI가 <generate_document> 태그로 돌려준 슬라이드 데이터(SlideDeck)를 실제
// 산출물 두 가지로 바꾼다:
//   - reveal.js 기반의 독립 실행형 HTML — SlideViewerPage에서 그대로 열어
//     실제 슬라이드쇼로 보여준다("슬라이드로 보기").
//   - pdf 패키지로 렌더링한 진짜 PDF — 슬라이드 한 장당 페이지 한 장
//     ("PDF로 내보내기").
//
// 예전 데모처럼 타이머로 진행바만 채우고 "생성 완료" 문구를 하드코딩하던
// 방식이 아니라, 이 파일이 실제로 디스크에 파일을 만든다.
//
// 이 파일을 쓰려면 pubspec.yaml에 아래 의존성이 필요하다(현재 프로젝트에
// 아직 없다면 추가해야 함):
//   pdf: ^3.10.0
//   printing: ^5.11.0

import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

/// AI가 준 슬라이드 한 장.
class SlideContent {
  final String heading;
  final List<String> bullets;

  const SlideContent({required this.heading, required this.bullets});

  factory SlideContent.fromJson(Map<String, dynamic> json) {
    final rawBullets = json['bullets'];
    final bullets = <String>[];
    if (rawBullets is List) {
      for (final b in rawBullets) {
        final s = b?.toString().trim() ?? '';
        if (s.isNotEmpty) bullets.add(s);
      }
    }
    final heading = (json['heading']?.toString() ?? '').trim();
    return SlideContent(
      heading: heading.isEmpty ? '(제목 없음)' : heading,
      bullets: bullets,
    );
  }
}

/// AI가 <generate_document> 태그로 준 전체 문서/슬라이드 덱.
class SlideDeck {
  final String title;
  final List<SlideContent> slides;

  const SlideDeck({required this.title, required this.slides});

  factory SlideDeck.fromJson(Map<String, dynamic> json) {
    final rawSlides = json['slides'];
    final slides = <SlideContent>[];
    if (rawSlides is List) {
      for (final s in rawSlides) {
        if (s is Map) {
          slides.add(SlideContent.fromJson(Map<String, dynamic>.from(s)));
        }
      }
    }
    final title = (json['title']?.toString() ?? '').trim();
    return SlideDeck(
      title: title.isEmpty ? '제목 없음' : title,
      // 슬라이드가 하나도 안 파싱되면 빈 덱을 만들지 않고, 최소 한 장은
      // 있도록 방어한다 — AI가 형식을 살짝 어겨도 뷰어가 빈 화면이 되지 않게.
      slides: slides.isEmpty
          ? [const SlideContent(heading: '(내용 없음)', bullets: [])]
          : slides,
    );
  }
}

/// generateDeck() / saveDeck()의 결과 — 실제로 디스크에 만들어진 두 파일의
/// 경로. main.dart가 메시지 id별로 들고 있다가, 사용자가 "PDF로 내보내기" /
/// "슬라이드로 보기" 버튼을 누르면 이 경로로 실제 파일을 연다.
class GeneratedDocument {
  final String title;
  final String htmlPath;
  final String pdfPath;

  const GeneratedDocument({
    required this.title,
    required this.htmlPath,
    required this.pdfPath,
  });
}

class DocumentService {
  static Future<Directory> _documentsDir() async {
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory('${base.path}/documents');
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  static String _escapeHtml(String input) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
  }

  /// reveal.js 표준 CDN 번들을 쓰는 독립 실행형 HTML 문서를 만든다.
  /// 네트워크가 있는 실제 기기에서 열릴 것을 전제로 한다(이 앱 자체가
  /// dev 서버/에셋을 로드할 때도 마찬가지 전제).
  static String buildRevealHtml(SlideDeck deck) {
    final sections = deck.slides.map((s) {
      final items = s.bullets
          .map((b) => '            <li>${_escapeHtml(b)}</li>')
          .join('\n');
      final list = items.isEmpty ? '' : '\n          <ul>\n$items\n          </ul>';
      return '''
        <section>
          <h2>${_escapeHtml(s.heading)}</h2>$list
        </section>''';
    }).join('\n');

    return '''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${_escapeHtml(deck.title)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.6.1/reveal.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.6.1/theme/night.min.css" />
</head>
<body>
  <div class="reveal">
    <div class="slides">
$sections
    </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.6.1/reveal.min.js"></script>
  <script>
    Reveal.initialize({ hash: true, controls: true, progress: true, transition: 'slide' });
  </script>
</body>
</html>
''';
  }

  /// 슬라이드 한 장 = PDF 한 페이지로 실제 PDF 바이트를 만든다.
  static Future<Uint8List> buildPdfBytes(SlideDeck deck) async {
    final doc = pw.Document();
    final font = await PdfGoogleFonts.nanumGothicRegular();
    final fontBold = await PdfGoogleFonts.nanumGothicBold();

    for (final s in deck.slides) {
      doc.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4.landscape,
          build: (context) => pw.Padding(
            padding: const pw.EdgeInsets.all(40),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  s.heading,
                  style: pw.TextStyle(font: fontBold, fontSize: 26, fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 20),
                ...s.bullets.map(
                  (b) => pw.Padding(
                    padding: const pw.EdgeInsets.only(bottom: 10),
                    child: pw.Row(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('•  ', style: pw.TextStyle(font: font, fontSize: 14)),
                        pw.Expanded(child: pw.Text(b, style: pw.TextStyle(font: font, fontSize: 14))),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }
    return doc.save();
  }

  /// HTML + PDF를 둘 다 실제로 파일로 저장하고 그 경로를 돌려준다.
  static Future<GeneratedDocument> saveDeck(SlideDeck deck) async {
    final dir = await _documentsDir();
    final ts = DateTime.now().millisecondsSinceEpoch;
    final safeName = deck.title
        .replaceAll(RegExp(r'[^\w가-힣\-]+'), '_')
        .replaceAll(RegExp(r'_+'), '_');
    final base = safeName.isEmpty ? 'document' : safeName;

    final htmlFile = File('${dir.path}/${base}_$ts.html');
    final pdfFile = File('${dir.path}/${base}_$ts.pdf');

    await htmlFile.writeAsString(buildRevealHtml(deck));
    await pdfFile.writeAsBytes(await buildPdfBytes(deck));

    return GeneratedDocument(
      title: deck.title,
      htmlPath: htmlFile.path,
      pdfPath: pdfFile.path,
    );
  }
}