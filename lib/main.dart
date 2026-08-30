import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:printing/printing.dart';
import 'background_service.dart';
import 'llm_service.dart';
import 'local_storage_service.dart';
import 'document_service.dart';
import 'slide_viewer_page.dart';
import 'local_asset_server.dart'; // 새로 추가한 로컬 서버
import 'ocr_service.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:file_picker/file_picker.dart' as fp;
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'notification_service.dart';
import 'playlist_service.dart';
import 'obsidian_service.dart';
import 'stt_service.dart';
import 'tts_service.dart';
import 'package:image_picker/image_picker.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await NotificationService.initialize();
  } catch (e) {
    debugPrint('Notification init error: $e');
  }

  runApp(const MyApp());

  // UI 렌더링 후 백그라운드 서비스 시작 (블로킹 방지)
  initializeService().catchError((e) {
    debugPrint('Background service init error: $e');
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'E.V. App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F1826)),
        useMaterial3: true,
      ),
      home: const EVHomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class EVHomePage extends StatefulWidget {
  const EVHomePage({super.key});

  @override
  State<EVHomePage> createState() => _EVHomePageState();
}

class _EVHomePageState extends State<EVHomePage> {
  late final WebViewController _controller;
  bool _didFallback = false;
  String? _debugError;

  // 로컬 web asset을 서빙할 초소형 HTTP 서버.
  // file:// 대신 http://127.0.0.1:PORT 로 로드하기 위해 사용한다.
  final LocalAssetServer _assetServer = LocalAssetServer();

  // 명세서 1번: 대화는 conversation.json에 실제로 영속 저장된다.
  // 앱을 껐다 켜도 이전 대화 맥락이 유지되도록, 매 턴마다 디스크에 반영하고
  // 시작 시 여기서 다시 읽어온다. { 'role': 'user'|'assistant', 'content': ... }
  final List<Map<String, String>> _conversationHistory = [];

  // AI가 <generate_document> 태그로 실제로 만들어준 문서를 메시지 id별로
  // 들고 있는다. React는 파일 경로를 몰라도 되고("export_pdf"/"export_slide"
  // 를 { id }만 실어서 보내면), 여기서 그 id에 해당하는 실제 파일을 찾아
  // 열거나 공유한다.
  final Map<dynamic, GeneratedDocument> _documents = {};

  Timer? _idleTimer;
  DateTime _lastInteractionTime = DateTime.now();
  DateTime _lastProactiveTime = DateTime.fromMillisecondsSinceEpoch(0);



  Future<void> _processSharedImage(String path) async {
    debugPrint('Processing shared image: $path');
    try {
      _sendToReact('shared_image_processing', {'state': 'start'});
      final file = File(path);
      final bytes = await file.readAsBytes();
      final base64Image = 'data:image/${path.split('.').last};base64,${base64Encode(bytes)}';

      // Vision AI 직접 호출 (텍스트+수식+도형 원스톱 분석)
      final processed = await LlmService.processOcrForWrongNoteImage(base64Image);
      if (processed == null) {
        _sendToReact('shared_image_result', {'success': false, 'error': 'AI가 이미지를 분석하는 데 실패했습니다.'});
        return;
      }

      _sendToReact('shared_ocr_result', {
        'success': true,
        'subject': processed['subject'] ?? '기타',
        'problem': processed['problem'] ?? '',
        'solution': processed['solution'] ?? '',
      });
      _sendToReact('shared_image_result', {
        'success': true,
        'subject': processed['subject'] ?? '기타',
        'problem': processed['problem'] ?? '',
        'solution': processed['solution'] ?? '',
      });
    } catch (e) {
      debugPrint('processSharedImage error: $e');
      _sendToReact('shared_ocr_result', {'success': false, 'error': e.toString()});
      _sendToReact('shared_image_result', {'success': false, 'error': e.toString()});
    }
  }

  @override
  void initState() {
    super.initState();

    const MethodChannel('com.example.evapp/methods').setMethodCallHandler((call) async {
      if (call.method == 'sharedImageReceived') {
        final path = call.arguments['path'] as String?;
        if (path != null) {
          _processSharedImage(path);
        }
      }
    });

    // S펜 공유 이미지는 app_ready 이벤트 수신 시점에 처리 (React가 완전히 로드된 후)





    _idleTimer = Timer.periodic(const Duration(minutes: 1), (timer) async {
      final now = DateTime.now();
      
      // 15분 이상 아무 입력이 없고, 마지막 능동 메시지를 보낸지 2시간이 넘었을 때
      if (now.difference(_lastInteractionTime).inMinutes >= 15 &&
          now.difference(_lastProactiveTime).inHours >= 2) {
        
        final subjects = await LocalStorageService.readSubjects();
        List<String> neglected = [];
        
        for (var s in subjects) {
          final lastStudiedStr = s['last_studied'] as String?;
          if (lastStudiedStr != null) {
            try {
              final lastStudied = DateTime.parse(lastStudiedStr);
              // 마지막 공부한지 3일 이상 지났는지 확인
              if (now.difference(lastStudied).inDays >= 3) {
                neglected.add(s['subject']);
              }
            } catch (e) {}
          }
        }

        if (neglected.isNotEmpty) {
          final subjectList = neglected.join(', ');
          final contextPrompt = '사용자가 15분 이상 앱을 켜두고 활동이 없는 유휴 상태입니다. 최근 기록을 확인해보니 다음 과목들의 학습 기록이 3일 이상 지났습니다: $subjectList. 자연스럽게 해당 과목 공부를 권유하는 1~2문장의 말을 건네주세요. (단, 너무 귀찮게 하지 말고 가볍게)';
          
          final response = await LlmService.generateProactiveResponse(contextPrompt);
          if (response != null && response.isNotEmpty) {
            _lastProactiveTime = now;
            _lastInteractionTime = now; // 능동 메시지를 보냈으니 유휴 시간 리셋
            
            final msgId = 'proactive_${now.millisecondsSinceEpoch}';
            _conversationHistory.add({'role': 'assistant', 'content': response});
            await LocalStorageService.writeConversationHistory(_conversationHistory);
            
            _sendToReact('llm_result', {
              'id': msgId,
              'result': response,
              'document': false
            });
          }
        }
      }
    });

    // Initialize WebView Controller
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF05070A))
      ..setNavigationDelegate(
        NavigationDelegate(
          onWebResourceError: (WebResourceError error) {
            final detail =
                'code=${error.errorCode} type=${error.errorType} '
                'mainFrame=${error.isForMainFrame} url=${error.url} '
                'desc=${error.description}';
            debugPrint('WebResourceError: $detail');
            setState(() {
              _debugError = 'WebResourceError: $detail';
            });
            // If debug mode and we fail to load the localhost dev server,
            // fall back to the bundled build served via local HTTP server.
            if (kDebugMode && !_didFallback) {
              _didFallback = true;
              debugPrint(
                  'Failed to load dev server, falling back to local asset server...');
              _loadFromLocalAssetServer();
            }
          },
          onPageFinished: (url) async {
            // 페이지 로드가 끝난 뒤, JS 런타임 에러를 잡아서 EV_Debug 채널로
            // 넘겨준다. 케이블 연결 없이도 화면에서 바로 에러를 확인하기 위한
            // 임시 디버깅 장치.
            await _controller.runJavaScript('''
              window.onerror = function(msg, url, line, col, error) {
                if (window.EV_Debug) {
                  EV_Debug.postMessage(JSON.stringify({msg: msg, line: line, col: col}));
                }
              };
            ''');
          },
        ),
      )
      ..addJavaScriptChannel(
        'EV_Debug',
        onMessageReceived: (JavaScriptMessage message) {
          debugPrint('EV_Debug: ${message.message}');
          setState(() {
            _debugError = message.message;
          });
        },
      )
      ..addJavaScriptChannel(
        'EV_Channel',
        onMessageReceived: (JavaScriptMessage message) {
          _handleReactMessage(message.message);
        },
      );

    if (kDebugMode) {
      debugPrint(
          'Running in Debug Mode: Attempting to connect to Vite Dev Server (http://localhost:5173)...');
      _controller.loadRequest(Uri.parse('http://localhost:5173'));
    } else {
      _loadFromLocalAssetServer();
    }

    // Request permissions and initialize hardware info streams
    Future.delayed(const Duration(seconds: 1), () async {
      if (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) {
        await [
          Permission.location,
          Permission.bluetooth,
          Permission.bluetoothScan,
          Permission.bluetoothConnect,
        ].request();
      }

      // Check and request Notification Listener Service permission
      if (Platform.isAndroid) {
        try {
          final hasPermission = await const MethodChannel('com.example.evapp/methods').invokeMethod<bool>('checkNotificationPermission');
          if (hasPermission == false) {
            await const MethodChannel('com.example.evapp/methods').invokeMethod('requestNotificationPermission');
          }
          
          const EventChannel('com.example.evapp/notifications').receiveBroadcastStream().listen((dynamic event) {
            final Map<dynamic, dynamic> map = event;
            final pkg = map['package']?.toString() ?? '';
            // Ignore system UI and own app notifications to avoid loops/noise
            if (pkg == 'com.android.systemui' || pkg == 'com.example.evapp') return;

            final filtered = <String, dynamic>{
              'id': map['id']?.toString() ?? '',
              'title': map['title']?.toString() ?? '',
              'body': map['text']?.toString() ?? '',
              'package': pkg,
              'type': 'notification',
            };
            
            // 미디어 플레이어(예: Musicolet, Spotify) 알림은 음악 메타데이터로 변환
            if (pkg.contains('music') || pkg == 'in.krosbits.musicolet') {
              filtered['type'] = 'music_metadata';
              filtered['artist'] = map['text']?.toString() ?? '';
              filtered['album'] = map['album']?.toString() ?? '';
              if (map['artUrl'] != null) {
                filtered['artUrl'] = map['artUrl']?.toString();
              }
            }
            
            final type = filtered['type'] as String;
            filtered.remove('type');
            _sendToReact(type, filtered);
          }, onError: (dynamic error) {
            debugPrint('Notification EventChannel error: $error');
          });
        } catch (e) {
          debugPrint('Notification permission/channel error: $e');
        }
      }

      // 1. Wi-Fi & Network info dynamically
      final info = NetworkInfo();
      
      Future<void> updateNetworkStatus(List<ConnectivityResult> results) async {
        try {
          if (results.contains(ConnectivityResult.wifi) || results.contains(ConnectivityResult.ethernet)) {
            String? ssid;
            try {
              ssid = await info.getWifiName();
            } catch (e) {
              debugPrint('getWifiName error: $e');
            }
            if (ssid != null && ssid.isNotEmpty && ssid != '<unknown ssid>') {
              _sendToReact('wifi_change', {'connected': true, 'name': ssid.replaceAll('"', '')});
            } else {
              _sendToReact('wifi_change', {'connected': true, 'name': '알 수 없는 와이파이'});
            }
          } else if (results.contains(ConnectivityResult.mobile)) {
            _sendToReact('wifi_change', {'connected': false, 'name': '모바일 데이터'});
          } else {
            _sendToReact('wifi_change', {'connected': false, 'name': '네트워크 끊김'});
          }
        } catch (e) {
          debugPrint('Network status error: $e');
        }
      }

      Connectivity().onConnectivityChanged.listen(updateNetworkStatus);
      final initialResults = await Connectivity().checkConnectivity();
      updateNetworkStatus(initialResults);

      // 2. Bluetooth info
      try {
        FlutterBluePlus.adapterState.listen((BluetoothAdapterState state) async {
          if (state == BluetoothAdapterState.on) {
            // Wait a bit for connected devices to populate
            await Future.delayed(const Duration(seconds: 1));
            final connectedDevices = FlutterBluePlus.connectedDevices;
            if (connectedDevices.isNotEmpty) {
              final deviceName = connectedDevices.first.platformName;
              _sendToReact('bluetooth_connected', {'name': deviceName.isNotEmpty ? deviceName : 'Connected Device'});
            } else {
              _sendToReact('bluetooth_connected', {'name': 'Bluetooth On (No Device)'});
            }
          }
        });
      } catch (e) {
        debugPrint('Bluetooth init error: $e');
      }
    });

    // Listen to native notifications and metadata events
    // [H8 수정] 중복 EventChannel 리스너 제거 — 위의 리스너가 이미 알림/음악을 처리함
  }

  // assets/web/index.html을 file://이 아니라 http://127.0.0.1:PORT/index.html
  // 로 서빙해서 로드한다. WebView의 file:// 서브 리소스 차단 문제를 피하기 위함.
  Future<void> _loadFromLocalAssetServer() async {
    try {
      final port = await _assetServer.start(assetPrefix: 'assets/web');
      await _controller.loadRequest(Uri.parse('http://127.0.0.1:$port/index.html'));
    } catch (e) {
      debugPrint('Failed to start local asset server: $e');
      setState(() {
        _debugError = 'LocalAssetServer error: $e';
      });
    }
  }

  Future<void> _handleReactMessage(String jsonString) async {
    _lastInteractionTime = DateTime.now();
    try {
      final data = jsonDecode(jsonString);
      final action = data['action'];
      final payload = data['payload'];

      debugPrint('Received from React: action=$action, payload=$payload');

      // Handle actions from React here (e.g., notification_clicked, user_message)
      if (action == 'notification_clicked' || action == 'open_notification') {
        final id = payload['id'];
        debugPrint('Action: open notification $id via PendingIntent');
        if (id != null) {
          try {
            await const MethodChannel('com.example.evapp/methods').invokeMethod('executePendingIntent', {'id': id});
          } catch (e) {
            debugPrint('Error executing PendingIntent: $e');
          }
        }
      } else if (action == 'user_message' || action == 'send_message') {
        String text = (payload['text'] as String?) ?? '';
        final source = payload['source'];
        final msgId = payload['id'];
        String? attachmentBase64 = payload['attachmentBase64'] as String?;
        if (attachmentBase64 == null && payload['attachedFile'] is Map) {
          attachmentBase64 = payload['attachedFile']['base64'] as String?;
        }
        debugPrint('Action: process user message from $source: $text');

        final hasImage = attachmentBase64 != null && attachmentBase64.isNotEmpty;
        if (text.trim().isEmpty && !hasImage) {
          return;
        }
        // 이미지만 첨부하고 텍스트를 입력하지 않은 경우 기본 프롬프트 주입
        if (text.trim().isEmpty && hasImage) {
          text = '이 이미지를 분석해줘';
        }

        // 실제 NVIDIA NIM API를 통해 응답 생성. 이전 대화(_conversationHistory)를
        // 문맥으로 같이 보내고, 응답이 오면 히스토리에 이번 턴을 반영한다.
        if (LlmService.shouldSearch(text)) {
          _sendToReact('search_status', {'id': msgId, 'status': 'searching', 'engine': '웹'});
        }

        final response = await LlmService.generateResponse(
          text,
          history: _conversationHistory,
          base64Image: attachmentBase64,
          onSearchStatus: (status, engine) {
            _sendToReact('search_status', {'id': msgId, 'status': status, 'engine': engine});
          },
        );
        _sendToReact('search_status', {'id': msgId, 'status': 'done'});
        await LocalStorageService.appendConversationHistory([
          {'role': 'user', 'content': text},
          {'role': 'assistant', 'content': response.text}
        ]);
        
        _conversationHistory.clear();
        _conversationHistory.addAll(await LocalStorageService.readConversationHistory());
        _sendToReact('conversation_history', {'history': _conversationHistory});
        _sendToReact('conversation_sync_init', {'history': _conversationHistory});

        _sendToReact('llm_result', {
          'id': msgId,
          'text': response.text,
          'result': response.text,
          'document': response.document != null
              ? {'title': response.document!.title}
              : null,
        });

        // AI가 <update_calendar> 태그로 실제 일정 변경을 판단했을 때
        if (response.calendarEvents != null) {
          _sendToReact('calendar_sync', {'events': response.calendarEvents});
        }
        if (response.updatedMemories != null) {
          _sendToReact('memories_sync', {'content': response.updatedMemories, 'success': true});
        }
        if (response.updatedTodo != null) {
          final todoContent = await LocalStorageService.readTodo();
          _sendToReact('todo_sync', {'content': todoContent, 'items': response.updatedTodo, 'success': true});
        }

        // AI가 <generate_document> 태그로 실제 슬라이드/PDF를 만들었을 때만
        // 온다. React에는 파일 경로를 안 보내고(그 안에서 file:// 접근이 막힐
        // 수 있으니) 여기 메모리에만 들고 있다가, 사용자가 버튼을 누르면
        // export_pdf/export_slide 액션으로 이 id를 다시 보내준다.
        if (response.document != null) {
          _documents[msgId] = response.document!;
        }
      } else if (action == 'export_slide') {
        final id = payload['id'];
        final doc = _documents[id];
        if (doc == null) {
          debugPrint('Action: export_slide — no document found for id=$id');
          return;
        }
        debugPrint('Action: open slide viewer for ${doc.htmlPath}');
        if (!mounted) return;
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => SlideViewerPage(
              htmlFilePath: doc.htmlPath,
              title: doc.title,
            ),
          ),
        );
      } else if (action == 'export_pdf') {
        final id = payload['id'];
        final doc = _documents[id];
        if (doc == null) {
          debugPrint('Action: export_pdf — no document found for id=$id');
          return;
        }
        debugPrint('Action: share PDF at ${doc.pdfPath}');
        final bytes = await File(doc.pdfPath).readAsBytes();
        await Printing.sharePdf(
          bytes: bytes,
          filename: '${doc.title}.pdf',
        );
      } else if (action == 'export_images') {
        final id = payload['id'];
        final doc = _documents[id];
        if (doc == null) {
          debugPrint('Action: export_images — no document found for id=$id');
          return;
        }
        debugPrint('Action: export images for ${doc.pdfPath}');
        try {
          final bytes = await File(doc.pdfPath).readAsBytes();
          final tempDir = await getTemporaryDirectory();
          final List<XFile> xFiles = [];
          
          int pageNum = 1;
          await for (final page in Printing.raster(bytes, dpi: 300)) {
            final pngBytes = await page.toPng();
            final file = File('${tempDir.path}/${doc.title}_slide_$pageNum.png');
            await file.writeAsBytes(pngBytes);
            xFiles.add(XFile(file.path));
            pageNum++;
          }
          
          if (xFiles.isNotEmpty) {
            await Share.shareXFiles(xFiles, text: '${doc.title} 슬라이드 이미지');
          }
        } catch (e) {
          debugPrint('Error exporting images: $e');
        }
      } else if (action == 'new_chat') {
        // 메뉴에서 "새 대화 시작" — 문맥을 끊어야 하므로 메모리와
        // conversation.json 둘 다 초기화한다.
        debugPrint('Action: new chat, clearing conversation history');
        _conversationHistory.clear();
        await LocalStorageService.clearConversationHistory();
      } else if (action == 'play_music') {
        debugPrint('Action: play_music');
        const MethodChannel('com.example.evapp/methods').invokeMethod('playMusic');
      } else if (action == 'play_playlist') {
        debugPrint('Action: play_playlist');
        final name = payload['name'];
        if (name != null) {
          final basePath = await PlaylistService.getPlaylistPath();
          final dir = Directory(basePath);
          if (await dir.exists()) {
             var path = '$basePath/$name.m3u';
             if (!await File(path).exists()) {
                path = '$basePath/$name.m3u8';
             }
             if (await File(path).exists()) {
                const MethodChannel('com.example.evapp/methods').invokeMethod('playM3uFile', {'path': path});
             } else {
                debugPrint('Playlist file not found: $path');
             }
          }
        }
      } else if (action == 'pause_music') {
        debugPrint('Action: pause_music');
        const MethodChannel('com.example.evapp/methods').invokeMethod('pauseMusic');
      } else if (action == 'perform_ocr') {
        debugPrint('Action: perform_ocr');
        try {
          final text = await OcrService.pickImageAndExtractText();
          if (text != null && text.isNotEmpty) {
            _sendToReact('ocr_result', {'success': true, 'text': text});
          } else {
            _sendToReact('ocr_result', {'success': false, 'error': '텍스트를 인식하지 못했거나 취소되었습니다.'});
          }
        } catch (e) {
          debugPrint('perform_ocr error: $e');
          _sendToReact('ocr_result', {'success': false, 'error': e.toString()});
        }
      } else if (action == 'pick_directory') {
        debugPrint('Action: pick_directory');
        final target = payload['target'];
        try {
          String? directoryPath = await fp.FilePicker.platform.getDirectoryPath();
          if (directoryPath != null) {
            _sendToReact('directory_picked', {'path': directoryPath, 'target': target});
          }
        } catch (e) {
          debugPrint('Directory picker error: $e');
        }
      } else if (action == 'pick_file') {
        debugPrint('Action: pick_file');
        try {
          fp.FilePickerResult? result = await fp.FilePicker.platform.pickFiles(
            type: fp.FileType.custom,
            allowedExtensions: ['pdf', 'txt'],
          );

          if (result != null && result.files.single.path != null) {
            final file = File(result.files.single.path!);
            final extension = result.files.single.extension?.toLowerCase();
            String extractedText = '';

            if (extension == 'pdf') {
              final bytes = await file.readAsBytes();
              final document = PdfDocument(inputBytes: bytes);
              extractedText = PdfTextExtractor(document).extractText();
              document.dispose();
            } else if (extension == 'txt') {
              extractedText = await file.readAsString();
            }

            _sendToReact('file_picked', {
              'success': true,
              'filename': result.files.single.name,
              'text': extractedText,
            });
          } else {
            _sendToReact('file_picked', {'success': false, 'error': 'No file selected'});
          }
        } catch (e) {
          debugPrint('File picker error: $e');
          _sendToReact('file_picked', {'success': false, 'error': e.toString()});
        }
      } else if (action == 'app_ready') {
        // React 뷰가 마운트 완료되면 초기 데이터를 한꺼번에 쏴준다.
        // 기존의 Future.delayed() 방식은 로딩이 지연될 경우 이벤트 유실 발생.
        final events = await LocalStorageService.readCalendarEvents();
        _sendToReact('calendar_sync_init', {'events': events});

        final memories = await LocalStorageService.readMemories();
        _sendToReact('memories_sync_init', {'content': memories});

        final saved = await LocalStorageService.readConversationHistory();
        if (saved.isNotEmpty) {
          _conversationHistory.clear();
          _conversationHistory.addAll(saved);
          _sendToReact('conversation_history', {'history': saved});
          _sendToReact('conversation_sync_init', {'history': saved});
        }

        final archives = await LocalStorageService.listArchives();
        _sendToReact('archives_sync', {'archives': archives});
        _sendToReact('archives_list', {'archives': archives});

        final prefs = await SharedPreferences.getInstance();
        _sendToReact('sports_settings_sync', {
          'sportType': prefs.getString('SPORTS_TYPE') ?? 'football',
          'apiKey': prefs.getString('API_FOOTBALL_KEY') ?? '',
          'firecrawlKey': prefs.getString('FIRECRAWL_API_KEY') ?? '',
          'teamName': prefs.getString('SPORTS_TEAM_NAME') ?? '',
          'active': prefs.getBool('SPORTS_ACTIVE') ?? false,
        });

        _sendToReact('settings_sync', {
          'llmKey': prefs.getString('NVIDIA_NIM_API_KEY') ?? '',
          'visionKey': prefs.getString('VISION_API_KEY') ?? '',
          'naverClientId': prefs.getString('NAVER_CLIENT_ID') ?? '',
          'naverClientSecret': prefs.getString('NAVER_CLIENT_SECRET') ?? '',
          'tavilyKey': prefs.getString('TAVILY_API_KEY') ?? '',
          'firecrawlKey': prefs.getString('FIRECRAWL_API_KEY') ?? '',
          'visionEnabled': prefs.getBool('VISION_ENABLED') ?? true,
          'llmEndpoint': prefs.getString('LLM_ENDPOINT') ?? '',
          'visionEndpoint': prefs.getString('VISION_ENDPOINT') ?? '',
          'llmModel': prefs.getString('LLM_MODEL') ?? '',
          'visionModel': prefs.getString('LLM_VISION_MODEL') ?? 'meta/llama-3.2-11b-vision-instruct',
          'kmaKey': prefs.getString('KMA_API_KEY') ?? '',
          'ttsKey': prefs.getString('TTS_API_KEY') ?? '',
          'ttsEndpoint': prefs.getString('TTS_ENDPOINT') ?? '',
          'footballDataKey': prefs.getString('FOOTBALL_DATA_API_KEY') ?? '',
          'obsidianVaultPath': prefs.getString('OBSIDIAN_VAULT_PATH') ?? '',
          'obsidianInboxPath': prefs.getString('OBSIDIAN_INBOX_PATH') ?? prefs.getString('OBSIDIAN_PATH') ?? '',
          'obsidianPath': prefs.getString('OBSIDIAN_PATH') ?? '',
          'playlistPath': prefs.getString('PLAYLIST_PATH') ?? '',
          'footballTeams': prefs.getString('FOOTBALL_TEAMS') ?? '',
          'baseballTeams': prefs.getString('BASEBALL_TEAMS') ?? '',
        });

        final wrongNotes = await LocalStorageService.readWrongNotes();
        _sendToReact('wrong_notes_sync', {'notes': wrongNotes});

        final maskingRules = await LocalStorageService.readMaskingRules();
        _sendToReact('masking_rules_sync', {'rules': maskingRules});

        final todoContent = await LocalStorageService.readTodo();
        final todoItems = await LocalStorageService.readTodoItems();
        _sendToReact('todo_sync_init', {'content': todoContent, 'items': todoItems});

        final String? cachedImage = await const MethodChannel('com.example.evapp/methods').invokeMethod('getSharedImage');
        if (cachedImage != null) {
          _processSharedImage(cachedImage);
        }
      } else if (action == 'write_memories_file') {
        final content = payload['content'] as String? ?? '';
        final ok = await LocalStorageService.writeMemories(content);
        _sendToReact('memories_sync', {'content': content, 'success': ok});

      } else if (action == 'get_masking_rules') {
        final rules = await LocalStorageService.readMaskingRules();
        _sendToReact('masking_rules_sync', {'rules': rules});
      } else if (action == 'save_masking_rules') {
        final rules = payload['rules'];
        if (rules != null && rules is List) {
          await LocalStorageService.writeMaskingRules(rules);
          _sendToReact('masking_rules_sync', {'rules': rules, 'success': true});
        }
      } else if (action == 'save_sports_settings') {
        final prefs = await SharedPreferences.getInstance();
        // 새로운 SportsSettingsScreen에서 오는 payload
        final footballTeams = payload['footballTeams'];
        final baseballTeams = payload['baseballTeams'];
        final footballDataKey = payload['footballDataKey'];
        if (footballTeams != null) await prefs.setString('FOOTBALL_TEAMS', footballTeams);
        if (baseballTeams != null) await prefs.setString('BASEBALL_TEAMS', baseballTeams);
        if (footballDataKey != null) await prefs.setString('FOOTBALL_DATA_API_KEY', footballDataKey);
        // 기존 호환용 payload
        final sportType = payload['sportType'];
        final apiKey = payload['apiKey'];
        final firecrawlKey = payload['firecrawlKey'];
        final teamName = payload['teamName'];
        final active = payload['active'];
        if (sportType != null) await prefs.setString('SPORTS_TYPE', sportType);
        if (apiKey != null) await prefs.setString('API_FOOTBALL_KEY', apiKey);
        if (firecrawlKey != null) await prefs.setString('FIRECRAWL_API_KEY', firecrawlKey);
        if (teamName != null) await prefs.setString('SPORTS_TEAM_NAME', teamName);
        if (active != null) await prefs.setBool('SPORTS_ACTIVE', active);
      } else if (action == 'get_sports_settings') {
        final prefs = await SharedPreferences.getInstance();
        _sendToReact('sports_settings_sync', {
          'sportType': prefs.getString('SPORTS_TYPE') ?? 'football',
          'apiKey': prefs.getString('API_FOOTBALL_KEY') ?? '',
          'firecrawlKey': prefs.getString('FIRECRAWL_API_KEY') ?? '',
          'teamName': prefs.getString('SPORTS_TEAM_NAME') ?? '',
          'active': prefs.getBool('SPORTS_ACTIVE') ?? false,
        });
      } else if (action == 'get_archives') {
        final archives = await LocalStorageService.listArchives();
        _sendToReact('archives_sync', {'archives': archives});
        _sendToReact('archives_list', {'archives': archives});
      } else if (action == 'rename_archive') {
        final path = payload['path'] as String?;
        final newTitle = payload['title'] as String?;
        if (path != null && newTitle != null) {
          final ok = await LocalStorageService.renameArchive(path, newTitle);
          if (ok) {
            // 변경 후 목록 갱신
            final archives = await LocalStorageService.listArchives();
            _sendToReact('archives_sync', {'archives': archives});
            _sendToReact('archives_list', {'archives': archives});
          }
        }
      } else if (action == 'get_wrong_notes') {
        final wrongNotes = await LocalStorageService.readWrongNotes();
        _sendToReact('wrong_notes_sync', {'notes': wrongNotes});

        final maskingRules = await LocalStorageService.readMaskingRules();
        _sendToReact('masking_rules_sync', {'rules': maskingRules});
      } else if (action == 'get_schedule') {
        final schedule = await LocalStorageService.readScheduleEvents();
        _sendToReact('schedule_sync', {'schedule': schedule});
      } else if (action == 'write_schedule') {
        final schedule = payload['schedule'];
        if (schedule != null && schedule is List) {
          final ok = await LocalStorageService.writeScheduleEvents(schedule);
          _sendToReact('schedule_sync', {'schedule': schedule, 'success': ok});
        }
      } else if (action == 'get_todo') {
        final todoContent = await LocalStorageService.readTodo();
        final todoItems = await LocalStorageService.readTodoItems();
        _sendToReact('todo_sync', {'content': todoContent, 'items': todoItems});
      } else if (action == 'save_todo_items') {
        final items = payload['items'];
        if (items != null && items is List) {
          final ok = await LocalStorageService.writeTodoItems(items);
          final todoContent = await LocalStorageService.readTodo();
          final updatedItems = await LocalStorageService.readTodoItems();
          _sendToReact('todo_sync', {'content': todoContent, 'items': updatedItems, 'success': ok});
        }
      } else if (action == 'save_todo_raw') {
        final content = payload['content'] as String? ?? '';
        final ok = await LocalStorageService.writeTodo(content);
        final updatedItems = await LocalStorageService.readTodoItems();
        _sendToReact('todo_sync', {'content': content, 'items': updatedItems, 'success': ok});
      } else if (action == 'toggle_todo') {
        final index = payload['index'] as int?;
        if (index != null) {
          final items = await LocalStorageService.toggleTodoItem(index);
          final todoContent = await LocalStorageService.readTodo();
          _sendToReact('todo_sync', {'content': todoContent, 'items': items, 'success': true});
        }
      } else if (action == 'delete_todo') {
        final index = payload['index'] as int?;
        if (index != null) {
          final items = await LocalStorageService.deleteTodoItem(index);
          final todoContent = await LocalStorageService.readTodo();
          _sendToReact('todo_sync', {'content': todoContent, 'items': items, 'success': true});
        }
      } else if (action == 'add_todo') {
        final text = payload['text'] as String? ?? '';
        if (text.trim().isNotEmpty) {
          final items = await LocalStorageService.appendTodoItem(text);
          final todoContent = await LocalStorageService.readTodo();
          _sendToReact('todo_sync', {'content': todoContent, 'items': items, 'success': true});
        }
      } else if (action == 'capture_screen_query') {
        debugPrint('Action: capture_screen_query');
        try {
          final picker = ImagePicker();
          final pickedFile = await picker.pickImage(source: ImageSource.gallery);
          if (pickedFile != null) {
            final bytes = await pickedFile.readAsBytes();
            final base64Image = 'data:image/${pickedFile.name.split('.').last};base64,${base64Encode(bytes)}';
            _sendToReact('chat_image_picked', {
              'name': '화면_캡처_${pickedFile.name}',
              'base64': base64Image,
            });
          }
        } catch (e) {
          debugPrint('capture_screen_query error: $e');
        }
      } else if (action == 'pick_image_for_chat') {
        debugPrint('Action: pick_image_for_chat');
        try {
          final picker = ImagePicker();
          final pickedFile = await picker.pickImage(source: ImageSource.gallery);
          if (pickedFile != null) {
            final bytes = await pickedFile.readAsBytes();
            final base64Image = 'data:image/${pickedFile.name.split('.').last};base64,${base64Encode(bytes)}';
            _sendToReact('chat_image_picked', {
              'name': pickedFile.name,
              'base64': base64Image,
            });
          }
        } catch (e) {
          debugPrint('pick_image_for_chat error: $e');
        }
      } else if (action == 'perform_wrong_ocr') {
        debugPrint('Action: perform_wrong_ocr');
        try {
          final picker = ImagePicker();
          final pickedFile = await picker.pickImage(source: ImageSource.gallery);
          if (pickedFile == null) {
            _sendToReact('wrong_ocr_result', {'success': false, 'error': '취소되었습니다.'});
            _sendToReact('wrong_ocr_error', {'message': '취소되었습니다.'});
            return;
          }
          final bytes = await pickedFile.readAsBytes();
          final base64Image = 'data:image/${pickedFile.name.split('.').last};base64,${base64Encode(bytes)}';

          final processed = await LlmService.processOcrForWrongNoteImage(base64Image);
          if (processed == null) {
            _sendToReact('wrong_ocr_result', {'success': false, 'error': 'AI가 이미지를 분석하지 못했습니다.'});
            _sendToReact('wrong_ocr_error', {'message': 'AI가 이미지를 분석하지 못했습니다.'});
            return;
          }

          final current = await LocalStorageService.readWrongNotes();
          final newNote = {
            'id': 'wrong_${DateTime.now().millisecondsSinceEpoch}',
            'subject': processed['subject'] ?? '기타',
            'problem': processed['problem'] ?? '',
            'solution': processed['solution'] ?? '',
            'created_at': DateTime.now().toIso8601String(),
            'status': 'active', // 'active' (빌런) or 'prison' (래프트 수감)
          };
          current.add(newNote);
          await LocalStorageService.writeWrongNotes(current);
          
          _sendToReact('wrong_notes_sync', {'notes': current});
          _sendToReact('wrong_note_added', {'notes': current, 'note': newNote});
          _sendToReact('wrong_ocr_result', {'success': true, 'note': newNote});
        } catch (e) {
          debugPrint('perform_wrong_ocr error: $e');
          _sendToReact('wrong_ocr_result', {'success': false, 'error': e.toString()});
          _sendToReact('wrong_ocr_error', {'message': e.toString()});
        }
      } else if (action == 'arrest_villain') {
        final id = payload['id'];
        debugPrint('Action: arrest_villain id=$id');
        if (id != null) {
          final success = await LocalStorageService.updateWrongNoteStatus(id, 'prison');
          if (success) {
            final wrongNotes = await LocalStorageService.readWrongNotes();
            _sendToReact('wrong_notes_sync', {'notes': wrongNotes});
          }
        }
      } else if (action == 'delete_villain') {
        final id = payload['id'];
        debugPrint('Action: delete_villain id=$id');
        if (id != null) {
          final success = await LocalStorageService.deleteWrongNote(id);
          if (success) {
            final wrongNotes = await LocalStorageService.readWrongNotes();
            _sendToReact('wrong_notes_sync', {'notes': wrongNotes});
          }
        }
      } else if (action == 'generate_daily_bugle') {
        debugPrint('Action: generate_daily_bugle');
        try {
          final prompt = "오늘 일정이나 다가오는 중요한 D-Day를 확인하고, 단 1~2줄의 짧고 강렬한 뉴스 헤드라인만 작성해줘. "
                         "(예: [특종] 스파이더맨, 내일 수학 시험에서 위기 맞나?!). 기사 본문은 절대 작성하지 마.";
          final headline = await LlmService.generateProactiveResponse(prompt) ?? "NO NEWS TODAY";
          _sendToReact('daily_bugle_result', {'headline': headline});
        } catch (e) {
          debugPrint('generate_daily_bugle error: $e');
          _sendToReact('daily_bugle_result', {'headline': '[특보] 뷰글 편집국 통신 오류 발생!'});
        }
      } else if (action == 'load_archive') {
        final path = payload['path'];
        final success = await LocalStorageService.loadArchive(path);
        if (success) {
          final saved = await LocalStorageService.readConversationHistory();
          _conversationHistory.clear();
          _conversationHistory.addAll(saved);
          _sendToReact('conversation_history', {'history': saved});
          _sendToReact('conversation_sync_init', {'history': saved});
        }
      } else if (action == 'save_paths') {
        final obsidianVaultPath = payload['obsidianVaultPath'];
        final obsidianInboxPath = payload['obsidianInboxPath'];
        final obsidianPath = payload['obsidianPath'];
        final playlistPath = payload['playlistPath'];
        debugPrint('Action: save paths');
        final prefs = await SharedPreferences.getInstance();
        if (obsidianVaultPath != null && obsidianVaultPath.isNotEmpty) {
          await prefs.setString('OBSIDIAN_VAULT_PATH', obsidianVaultPath);
        }
        if (obsidianInboxPath != null && obsidianInboxPath.isNotEmpty) {
          await prefs.setString('OBSIDIAN_INBOX_PATH', obsidianInboxPath);
        }
        if (obsidianPath != null && obsidianPath.isNotEmpty) {
          await prefs.setString('OBSIDIAN_PATH', obsidianPath);
        }
        if (playlistPath != null && playlistPath.isNotEmpty) {
          await prefs.setString('PLAYLIST_PATH', playlistPath);
        }
        _sendToReact('paths_saved', {'success': true});
      } else if (action == 'save_api_key') {
        final key = payload['key'];
        final visionKey = payload['visionKey'];
        final naverClientId = payload['naverClientId'];
        final naverClientSecret = payload['naverClientSecret'];
        final tavilyKey = payload['tavilyKey'];
        final firecrawlKey = payload['firecrawlKey'];
        final visionEnabled = payload['visionEnabled'];
        final endpoint = payload['endpoint'];
        final visionEndpoint = payload['visionEndpoint'];
        final model = payload['model'];
        final visionModel = payload['visionModel'];
        final obsidianPath = payload['obsidianPath'];
        final kmaKey = payload['kmaKey'];
        final ttsKey = payload['ttsKey'];
        final ttsEndpoint = payload['ttsEndpoint'];
        final footballDataKey = payload['footballDataKey'];
        debugPrint('Action: save API keys');
        // Save to SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        if (key != null) await prefs.setString('NVIDIA_NIM_API_KEY', key);
        if (visionKey != null) await prefs.setString('VISION_API_KEY', visionKey);
        if (naverClientId != null) await prefs.setString('NAVER_CLIENT_ID', naverClientId);
        if (naverClientSecret != null) await prefs.setString('NAVER_CLIENT_SECRET', naverClientSecret);
        if (tavilyKey != null) await prefs.setString('TAVILY_API_KEY', tavilyKey);
        if (firecrawlKey != null) await prefs.setString('FIRECRAWL_API_KEY', firecrawlKey);
        if (visionEnabled != null && visionEnabled is bool) await prefs.setBool('VISION_ENABLED', visionEnabled);
        if (endpoint != null) await prefs.setString('LLM_ENDPOINT', endpoint);
        if (visionEndpoint != null) await prefs.setString('VISION_ENDPOINT', visionEndpoint);
        if (model != null) await prefs.setString('LLM_MODEL', model);
        if (visionModel != null) await prefs.setString('LLM_VISION_MODEL', visionModel);
        if (footballDataKey != null) await prefs.setString('FOOTBALL_DATA_API_KEY', footballDataKey);
        if (obsidianPath != null) await prefs.setString('OBSIDIAN_PATH', obsidianPath);
        if (kmaKey != null) await prefs.setString('KMA_API_KEY', kmaKey);
        if (ttsKey != null) await prefs.setString('TTS_API_KEY', ttsKey);
        if (ttsEndpoint != null) await prefs.setString('TTS_ENDPOINT', ttsEndpoint);
        _sendToReact('api_key_saved', {'success': true});
      } else if (action == 'save_shared_to_obsidian') {
        debugPrint('Action: save_shared_to_obsidian');
        final title = payload['title'] as String? ?? 'Shared Memo';
        final content = payload['content'] as String? ?? '';
        final err = await ObsidianService.saveMarkdownNote(title, content);
        _sendToReact('save_shared_result', {'success': err == null, 'error': err, 'type': 'obsidian'});
      } else if (action == 'save_shared_to_wrong') {
        debugPrint('Action: save_shared_to_wrong');
        final subject = payload['subject'] as String? ?? '기타';
        final problem = payload['problem'] as String? ?? '';
        final solution = payload['solution'] as String? ?? '';
        
        final current = await LocalStorageService.readWrongNotes();
        final newNote = {
          'id': 'wrong_${DateTime.now().millisecondsSinceEpoch}',
          'subject': subject,
          'problem': problem,
          'solution': solution,
          'created_at': DateTime.now().toIso8601String(),
          'status': 'active', // 'active' (빌런) or 'prison' (래프트 수감)
        };
        current.add(newNote);
        await LocalStorageService.writeWrongNotes(current);
        _sendToReact('wrong_notes_sync', {'notes': current});
        _sendToReact('save_shared_result', {'success': true, 'type': 'wrong'});
      } else if (action == 'start_voice_chat') {
        debugPrint('Action: start_voice_chat');
        if (await Permission.microphone.request().isGranted) {
          _sendToReact('voice_input', {'state': 'start'});
          _sendToReact('voice_state', {'active': true});
          await SttService.startListening(
            onResult: (text) async {
              _sendToReact('voice_input', {'state': 'end'});
              _sendToReact('voice_state', {'active': false});
              _sendToReact('stt_text', {'text': text, 'source': 'voice'});
              _sendToReact('spen_text', {'text': text});
              
              _conversationHistory.add({'role': 'user', 'content': text});
              await LocalStorageService.writeConversationHistory(_conversationHistory);
              _sendToReact('conversation_history', {'history': _conversationHistory});
              _sendToReact('conversation_sync_init', {'history': _conversationHistory});

              final llmResponse = await LlmService.generateResponse(text, history: _conversationHistory);
              
              _conversationHistory.add({'role': 'assistant', 'content': llmResponse.text});
              await LocalStorageService.writeConversationHistory(_conversationHistory);
              _sendToReact('conversation_history', {'history': _conversationHistory});
              _sendToReact('conversation_sync_init', {'history': _conversationHistory});
              _sendToReact('llm_result', {
                'id': 'voice_${DateTime.now().millisecondsSinceEpoch}',
                'text': llmResponse.text,
                'result': llmResponse.text,
              });
              
              await TtsService.speak(llmResponse.text);
            },
            onError: (error) {
              debugPrint('STT Error: $error');
              _sendToReact('voice_input', {'state': 'end'});
              _sendToReact('voice_state', {'active': false});
            },
            onComplete: () {
              _sendToReact('voice_input', {'state': 'end'});
              _sendToReact('voice_state', {'active': false});
            }
          );
        } else {
          debugPrint('Microphone permission denied');
          _sendToReact('voice_state', {'active': false});
        }
      } else if (action == 'stop_voice_chat') {
        debugPrint('Action: stop_voice_chat');
        await SttService.stopListening();
        await TtsService.stop();
        _sendToReact('voice_input', {'state': 'end'});
        _sendToReact('voice_state', {'active': false});
      }
    } catch (e) {
      debugPrint('Error parsing message from React: $e');
    }
  }

  void _sendToReact(String type, Map<String, dynamic> data) {
    final payloadString = jsonEncode({
      'type': type,
      ...data,
    });
    // This executes the JavaScript function defined in evapp/evweb/src/index.jsx
    _controller.runJavaScript("window.EV_receiveNativeEvent($payloadString)");
  }

  @override
  void dispose() {
    _idleTimer?.cancel();
    _assetServer.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF05070A),
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_debugError != null)
              Positioned(
                bottom: 20,
                left: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.85),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _debugError!,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}