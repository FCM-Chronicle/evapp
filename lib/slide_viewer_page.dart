// evapp/lib/slide_viewer_page.dart
//
// document_service.dart가 만든 reveal.js HTML 파일을, main.dart의 메인
// WebView(React 앱)와는 완전히 별개인 새 WebViewController로 열어서 진짜
// 슬라이드쇼로 보여준다. "슬라이드로 보기" 버튼을 눌렀을 때 여기로 push된다.

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class SlideViewerPage extends StatefulWidget {
  final String htmlFilePath;
  final String title;

  const SlideViewerPage({
    super.key,
    required this.htmlFilePath,
    required this.title,
  });

  @override
  State<SlideViewerPage> createState() => _SlideViewerPageState();
}

class _SlideViewerPageState extends State<SlideViewerPage> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..loadFile(widget.htmlFilePath);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.title, overflow: TextOverflow.ellipsis),
      ),
      body: WebViewWidget(controller: _controller),
    );
  }
}