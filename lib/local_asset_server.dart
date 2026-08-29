import 'dart:io';
import 'package:flutter/services.dart' show rootBundle;

/// Flutter 앱 안에 초소형 HTTP 서버를 띄워서, 번들된 웹 asset
/// (assets/web/...)을 http://127.0.0.1:PORT 로 서빙한다.
/// file:// 프로토콜에서 WebView가 서브 리소스(js/css) 로드를 막는
/// 문제를 근본적으로 피하기 위함.
class LocalAssetServer {
  HttpServer? _server;
  int? port;

  /// assetPrefix: pubspec.yaml에 등록된 폴더 경로 (예: 'assets/web')
  Future<int> start({String assetPrefix = 'assets/web'}) async {
    if (_server != null) return port!;
    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    port = _server!.port;
    _server!.listen((req) => _handle(req, assetPrefix));
    return port!;
  }

  Future<void> _handle(HttpRequest request, String assetPrefix) async {
    try {
      var path = request.uri.path;
      if (path == '/' || path.isEmpty) path = '/index.html';
      // 쿼리스트링/해시 제거하고, 맨 앞 슬래시 제거
      final cleanPath = path.startsWith('/') ? path.substring(1) : path;
      final assetKey = '$assetPrefix/$cleanPath';

      final data = await rootBundle.load(assetKey);
      final bytes = data.buffer.asUint8List(
        data.offsetInBytes,
        data.lengthInBytes,
      );

      request.response
        ..statusCode = HttpStatus.ok
        ..headers.contentType = _contentType(cleanPath)
        ..headers.add('Cache-Control', 'no-cache')
        ..headers.add('Access-Control-Allow-Origin', '*')
        ..add(bytes);
    } catch (e) {
      request.response.statusCode = HttpStatus.notFound;
      request.response.write('Not found: $e');
    } finally {
      await request.response.close();
    }
  }

  ContentType _contentType(String path) {
    if (path.endsWith('.html')) return ContentType.html;
    if (path.endsWith('.js')) {
      return ContentType('application', 'javascript', charset: 'utf-8');
    }
    if (path.endsWith('.css')) return ContentType('text', 'css');
    if (path.endsWith('.json')) return ContentType.json;
    if (path.endsWith('.svg')) return ContentType('image', 'svg+xml');
    if (path.endsWith('.png')) return ContentType('image', 'png');
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      return ContentType('image', 'jpeg');
    }
    if (path.endsWith('.woff2')) return ContentType('font', 'woff2');
    if (path.endsWith('.woff')) return ContentType('font', 'woff');
    return ContentType.binary;
  }

  Future<void> stop() async {
    await _server?.close(force: true);
    _server = null;
  }
}