import os

lib_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\lib"
web_src_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\evweb\src"

# 1. Update obsidian_service.dart with dual paths and note search
obsidian_code = """import 'dart:io';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ObsidianService {
  static const String defaultObsidianVaultPath = '/storage/emulated/0/Documents/Obsidian';
  static const String defaultObsidianInboxPath = '/storage/emulated/0/Documents/Obsidian/Inbox';

  /// 새 메모/로그 저장용 경로 (Inbox)
  static Future<String> getInboxPath() async {
    final prefs = await SharedPreferences.getInstance();
    final path = prefs.getString('OBSIDIAN_INBOX_PATH')?.trim() ?? prefs.getString('OBSIDIAN_PATH')?.trim();
    if (path != null && path.isNotEmpty) {
      return path;
    }
    return defaultObsidianInboxPath;
  }

  /// 전체 노트 읽기/검색용 상위 경로 (Vault Root)
  static Future<String> getVaultRootPath() async {
    final prefs = await SharedPreferences.getInstance();
    final path = prefs.getString('OBSIDIAN_VAULT_PATH')?.trim();
    if (path != null && path.isNotEmpty) {
      return path;
    }
    // 기본값은 Inbox의 상위 폴더이거나 기본 Vault 경로
    final inbox = await getInboxPath();
    final parent = Directory(inbox).parent.path;
    return parent.isNotEmpty ? parent : defaultObsidianVaultPath;
  }

  static Future<bool> requestPermissions() async {
    if (await Permission.manageExternalStorage.request().isGranted) {
      return true;
    }
    if (await Permission.storage.request().isGranted) {
      return true;
    }
    return false;
  }

  /// 옵시디언 Inbox 폴더에 마크다운 파일 저장
  static Future<String?> saveMarkdownNote(String filename, String content) async {
    try {
      final hasPermission = await requestPermissions();
      if (!hasPermission) {
        return '저장소 권한이 거부되었습니다.';
      }

      final path = await getInboxPath();
      final directory = Directory(path);
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }

      final safeFilename = _sanitizeFilename(filename);
      final file = File('${directory.path}/$safeFilename.md');
      await file.writeAsString(content);

      debugPrint('Saved note to: ${file.path}');
      return null;
    } catch (e) {
      debugPrint('Error saving markdown note: $e');
      return e.toString();
    }
  }

  /// 옵시디언 볼트 전체 하위 폴더에서 관련 마크다운 노트 검색
  static Future<List<Map<String, String>>> searchNotes(String query, {int limit = 3}) async {
    try {
      final rootPath = await getVaultRootPath();
      final rootDir = Directory(rootPath);
      if (!await rootDir.exists()) return [];

      final results = <Map<String, String>>[];
      final keywords = query.split(' ').map((s) => s.trim()).where((s) => s.length >= 2).toList();
      if (keywords.isEmpty) return [];

      await for (final entity in rootDir.list(recursive: true, followLinks: false)) {
        if (entity is File && entity.path.endsWith('.md')) {
          final filename = entity.uri.pathSegments.last;
          try {
            final text = await entity.readAsString();
            bool isMatch = false;

            // 파일명 또는 본문 일치 여부 확인
            for (var kw in keywords) {
              if (filename.contains(kw) || text.contains(kw)) {
                isMatch = true;
                break;
              }
            }

            if (isMatch) {
              String excerpt = text;
              if (excerpt.length > 800) {
                excerpt = excerpt.substring(0, 800) + '...';
              }
              results.add({
                'title': filename.replaceAll('.md', ''),
                'path': entity.path,
                'content': excerpt,
              });
              if (results.length >= limit) break;
            }
          } catch (_) {}
        }
      }
      return results;
    } catch (e) {
      debugPrint('Error searching obsidian notes: $e');
      return [];
    }
  }

  static Future<String?> createNoteFromTag(String filename, String content) {
    final withoutExtension = filename.endsWith('.md')
        ? filename.substring(0, filename.length - 3)
        : filename;
    return saveMarkdownNote(withoutExtension, content);
  }

  static String _sanitizeFilename(String name) {
    final trimmed = name.trim().isEmpty ? 'Untitled' : name.trim();
    return trimmed.replaceAll(RegExp(r'[\\\\/:*?"<>|]'), '_');
  }
}
"""

obsidian_path = os.path.join(lib_dir, "obsidian_service.dart")
with open(obsidian_path, 'w', encoding='utf-8') as f:
    f.write(obsidian_code)


# 2. Create weekly_summary_service.dart
weekly_code = """import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'local_storage_service.dart';
import 'llm_service.dart';
import 'notification_service.dart';

class WeeklySummaryService {
  static Future<void> generateWeeklyReport() async {
    try {
      final now = DateTime.now();
      final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";

      final prefs = await SharedPreferences.getInstance();
      if (prefs.getString('LAST_WEEKLY_SUMMARY_DATE') == todayStr) {
        return; // Already executed today
      }

      // 1. Todo 읽기
      final todoContent = await LocalStorageService.readTodo();

      // 2. 오답노트 (빌런 현황) 읽기
      final wrongNotes = await LocalStorageService.readWrongNotes();
      int activeVillains = 0;
      int prisonVillains = 0;
      for (var note in wrongNotes) {
        if (note['status'] == 'prison') {
          prisonVillains++;
        } else {
          activeVillains++;
        }
      }

      // 3. 다가오는 D-Day 일정 읽기
      final calendarEvents = await LocalStorageService.readCalendarEvents();
      String upcomingEvents = "";
      for (var ev in calendarEvents) {
        final dateStr = ev['date']?.toString();
        if (dateStr != null && dateStr.isNotEmpty) {
          try {
            final evDate = DateTime.parse(dateStr);
            final diff = evDate.difference(DateTime(now.year, now.month, now.day)).inDays;
            if (diff >= 0 && diff <= 7) {
              upcomingEvents += "- [${ev['title']}] (D-$diff, ${ev['date']})\\n";
            }
          } catch (_) {}
        }
      }

      final prompt = "오늘은 일요일 밤 9시 주간 결산 시간입니다.\\n\\n"
          "■ 이번 주 Todo 현황:\\n$todoContent\\n\\n"
          "■ 오답노트 빌런 현황: 체포/정복 완료 $prisonVillains 개, 미해결 빌런 $activeVillains 개\\n\\n"
          "■ 다음 주 예정된 주요 D-Day 일정:\\n$upcomingEvents\\n\\n"
          "위 데이터를 바탕으로 사용자에게 한 주를 격려하고 다음 주를 준비하도록 돕는 [주간 종합 결산 리포트]를 작성해주세요.\\n"
          "★중요★ 반드시 '데일리 뷰글(Daily Bugle)' 주간 특별 에디션 신문 1면 스타일로 작성하세요.\\n"
          "첫 줄은 굵고 강렬한 주간 헤드라인(예: [주간 특종! ...])을 쓰고, 항목별로 알차게 요약해 주세요.";

      final report = await LlmService.generateProactiveResponse(prompt);
      if (report != null && report.isNotEmpty) {
        await prefs.setString('LAST_WEEKLY_SUMMARY_DATE', todayStr);
        await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': report}]);
        await NotificationService.showNotification("📰 주간 종합 결산 리포트", report);
      }
    } catch (e) {
      debugPrint('WeeklySummaryService error: $e');
    }
  }
}
"""

weekly_path = os.path.join(lib_dir, "weekly_summary_service.dart")
with open(weekly_path, 'w', encoding='utf-8') as f:
    f.write(weekly_code)


# 3. Update llm_service.dart (Vision model separation & Obsidian search injection)
llm_path = os.path.join(lib_dir, "llm_service.dart")
with open(llm_path, 'r', encoding='utf-8') as f:
    llm_content = f.read()

# Add _getVisionModel
old_get_model = """  static Future<String> _getModel() async {
    final prefs = await SharedPreferences.getInstance();
    final model = prefs.getString('LLM_MODEL')?.trim();
    return (model != null && model.isNotEmpty) ? model : '';
  }"""

new_get_model = """  static Future<String> _getModel() async {
    final prefs = await SharedPreferences.getInstance();
    final model = prefs.getString('LLM_MODEL')?.trim();
    return (model != null && model.isNotEmpty) ? model : '';
  }

  static Future<String> _getVisionModel() async {
    final prefs = await SharedPreferences.getInstance();
    final vModel = prefs.getString('LLM_VISION_MODEL')?.trim();
    if (vModel != null && vModel.isNotEmpty) return vModel;
    final model = await _getModel();
    return model.isNotEmpty ? model : 'meta/llama-3.2-11b-vision-instruct';
  }"""

if old_get_model in llm_content:
    llm_content = llm_content.replace(old_get_model, new_get_model)

# Use vision model in generateResponse when image is present
old_llm_post = """    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final modelName = await _getModel();

    final prefs = await SharedPreferences.getInstance();
    final bool isVisionEnabled = prefs.getBool('VISION_ENABLED') ?? true;
    final bool canSendImage = isVisionEnabled && base64Image != null && base64Image.isNotEmpty;"""

new_llm_post = """    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final mainModelName = await _getModel();
    final visionModelName = await _getVisionModel();

    final prefs = await SharedPreferences.getInstance();
    final bool isVisionEnabled = prefs.getBool('VISION_ENABLED') ?? true;
    final bool canSendImage = isVisionEnabled && base64Image != null && base64Image.isNotEmpty;
    final modelName = canSendImage ? visionModelName : mainModelName;"""

if old_llm_post in llm_content:
    llm_content = llm_content.replace(old_llm_post, new_llm_post)

# Inject Obsidian Vault search results into prompt when relevant
old_obsidian_prompt = """  if (_obsidianKeywords.hasMatch(userMessage)) {
    prompt += '\\n\\n# 옵시디언 노트 작성\\n'"""

new_obsidian_prompt = """  // 옵시디언 볼트에서 관련 노트 검색 및 컨텍스트 주입
  if (_obsidianKeywords.hasMatch(userMessage) || userMessage.contains('찾아') || userMessage.contains('메모') || userMessage.contains('필기')) {
    final matchedNotes = await ObsidianService.searchNotes(userMessage);
    if (matchedNotes.isNotEmpty) {
      prompt += '\\n\\n# 사용자 옵시디언 볼트 검색 결과\\n';
      for (var n in matchedNotes) {
        prompt += '### [${n['title']}]\\n${n['content']}\\n\\n';
      }
      prompt += '위 사용자의 개인 노트 내용을 기반으로 질문에 정확하게 답변하세요.\\n';
    }
  }

  if (_obsidianKeywords.hasMatch(userMessage)) {
    prompt += '\\n\\n# 옵시디언 노트 작성\\n'"""

if old_obsidian_prompt in llm_content:
    llm_content = llm_content.replace(old_obsidian_prompt, new_obsidian_prompt)

# Use vision model in processOcrForWrongNoteImage
old_ocr_image_model = """  static Future<Map<String, dynamic>?> processOcrForWrongNoteImage(String base64Image) async {
    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final modelName = await _getModel();"""

new_ocr_image_model = """  static Future<Map<String, dynamic>?> processOcrForWrongNoteImage(String base64Image) async {
    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final modelName = await _getVisionModel();"""

if old_ocr_image_model in llm_content:
    llm_content = llm_content.replace(old_ocr_image_model, new_ocr_image_model)

with open(llm_path, 'w', encoding='utf-8') as f:
    f.write(llm_content)


# 4. Update main.dart (S-Pen Direct Vision AI + Settings sync)
main_path = os.path.join(lib_dir, "main.dart")
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

# Update S-Pen _processSharedImage to directly use Vision AI
old_shared_image = """  Future<void> _processSharedImage(String path) async {
    debugPrint('Processing shared image: $path');
    try {
      _sendToReact('shared_image_processing', {'state': 'start'});
      final ocrText = await OcrService.extractTextFromPath(path);
      if (ocrText == null || ocrText.trim().isEmpty) {
        _sendToReact('shared_image_result', {'success': false, 'error': '이미지에서 텍스트를 파싱하지 못했습니다.'});
        return;
      }

      final processed = await LlmService.processOcrForWrongNote(ocrText);"""

new_shared_image = """  Future<void> _processSharedImage(String path) async {
    debugPrint('Processing shared image: $path');
    try {
      _sendToReact('shared_image_processing', {'state': 'start'});
      final file = File(path);
      final bytes = await file.readAsBytes();
      final base64Image = 'data:image/${path.split('.').last};base64,${base64Encode(bytes)}';

      // Vision AI 직접 호출 (텍스트+수식+도형 원스톱 분석)
      final processed = await LlmService.processOcrForWrongNoteImage(base64Image);"""

if old_shared_image in main_content:
    main_content = main_content.replace(old_shared_image, new_shared_image)

# Update settings_sync in app_ready
old_app_ready_settings = """          'llmModel': prefs.getString('LLM_MODEL') ?? '',
          'naverClientId': prefs.getString('NAVER_CLIENT_ID') ?? '',"""

new_app_ready_settings = """          'llmModel': prefs.getString('LLM_MODEL') ?? '',
          'visionModel': prefs.getString('LLM_VISION_MODEL') ?? '',
          'obsidianVaultPath': prefs.getString('OBSIDIAN_VAULT_PATH') ?? '',
          'obsidianInboxPath': prefs.getString('OBSIDIAN_INBOX_PATH') ?? prefs.getString('OBSIDIAN_PATH') ?? '',
          'naverClientId': prefs.getString('NAVER_CLIENT_ID') ?? '',"""

if old_app_ready_settings in main_content:
    main_content = main_content.replace(old_app_ready_settings, new_app_ready_settings)

# Update save_api_key in main.dart
old_save_api = """        final model = payload['model'];
        final naverClientId = payload['naverClientId'];"""

new_save_api = """        final model = payload['model'];
        final visionModel = payload['visionModel'];
        final naverClientId = payload['naverClientId'];"""

if old_save_api in main_content:
    main_content = main_content.replace(old_save_api, new_save_api)

old_save_model_prefs = """        if (model != null) await prefs.setString('LLM_MODEL', model);
        if (naverClientId != null) await prefs.setString('NAVER_CLIENT_ID', naverClientId);"""

new_save_model_prefs = """        if (model != null) await prefs.setString('LLM_MODEL', model);
        if (visionModel != null) await prefs.setString('LLM_VISION_MODEL', visionModel);
        if (naverClientId != null) await prefs.setString('NAVER_CLIENT_ID', naverClientId);"""

if old_save_model_prefs in main_content:
    main_content = main_content.replace(old_save_model_prefs, new_save_model_prefs)

# Update save_paths in main.dart
old_save_paths = """      } else if (action == 'save_paths') {
        final obsidianPath = payload['obsidianPath'];
        final playlistPath = payload['playlistPath'];
        final prefs = await SharedPreferences.getInstance();
        if (obsidianPath != null) await prefs.setString('OBSIDIAN_PATH', obsidianPath);
        if (playlistPath != null) await prefs.setString('PLAYLIST_PATH', playlistPath);"""

new_save_paths = """      } else if (action == 'save_paths') {
        final obsidianVaultPath = payload['obsidianVaultPath'];
        final obsidianInboxPath = payload['obsidianInboxPath'];
        final obsidianPath = payload['obsidianPath'];
        final playlistPath = payload['playlistPath'];
        final prefs = await SharedPreferences.getInstance();
        if (obsidianVaultPath != null) await prefs.setString('OBSIDIAN_VAULT_PATH', obsidianVaultPath);
        if (obsidianInboxPath != null) await prefs.setString('OBSIDIAN_INBOX_PATH', obsidianInboxPath);
        if (obsidianPath != null) await prefs.setString('OBSIDIAN_PATH', obsidianPath);
        if (playlistPath != null) await prefs.setString('PLAYLIST_PATH', playlistPath);"""

if old_save_paths in main_content:
    main_content = main_content.replace(old_save_paths, new_save_paths)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_content)


# 5. Update background_service.dart with Sunday 21:00 Weekly Summary
bg_path = os.path.join(lib_dir, "background_service.dart")
with open(bg_path, 'r', encoding='utf-8') as f:
    bg_content = f.read()

# Add WeeklySummaryService import
if "import 'weekly_summary_service.dart';" not in bg_content:
    bg_content = "import 'weekly_summary_service.dart';\n" + bg_content

# Add Sunday 21:00 trigger
weekly_trigger = """    // 5. Sunday Weekly Executive Summary (21:00)
    if (now.weekday == DateTime.sunday && now.hour == 21 && now.minute == 0) {
      if (prefs.getString('LAST_WEEKLY_SUMMARY_DATE') != todayStr) {
        await WeeklySummaryService.generateWeeklyReport();
      }
    }
"""

if "// 4. Sports Morning Briefing" in bg_content and "WeeklySummaryService.generateWeeklyReport" not in bg_content:
    bg_content = bg_content.replace("// 4. Sports Morning Briefing", weekly_trigger + "\n    // 4. Sports Morning Briefing")

with open(bg_path, 'w', encoding='utf-8') as f:
    f.write(bg_content)


# 6. Update index.jsx (ApiKeyScreen Vision Model & PathSettingsScreen Vault/Inbox)
index_path = os.path.join(web_src_dir, "index.jsx")
with open(index_path, 'r', encoding='utf-8') as f:
    index_content = f.read()

# Update ApiKeyScreen
old_api_state = """    const [endpoint, setEndpoint] = useState(() => localStorage.getItem("LLM_ENDPOINT") || "");
    const [model, setModel] = useState(() => localStorage.getItem("LLM_MODEL") || "");"""

new_api_state = """    const [endpoint, setEndpoint] = useState(() => localStorage.getItem("LLM_ENDPOINT") || "");
    const [model, setModel] = useState(() => localStorage.getItem("LLM_MODEL") || "");
    const [visionModel, setVisionModel] = useState(() => localStorage.getItem("LLM_VISION_MODEL") || "meta/llama-3.2-11b-vision-instruct");"""

if old_api_state in index_content:
    index_content = index_content.replace(old_api_state, new_api_state)

old_api_sync = """                if (payload.llmEndpoint) setEndpoint(payload.llmEndpoint);
                if (payload.llmModel) setModel(payload.llmModel);"""

new_api_sync = """                if (payload.llmEndpoint) setEndpoint(payload.llmEndpoint);
                if (payload.llmModel) setModel(payload.llmModel);
                if (payload.visionModel) setVisionModel(payload.visionModel);"""

if old_api_sync in index_content:
    index_content = index_content.replace(old_api_sync, new_api_sync)

old_api_save = """        localStorage.setItem("LLM_ENDPOINT", endpoint);
        localStorage.setItem("LLM_MODEL", model);
        sendToFlutter("save_api_key", { key, naverClientId, naverClientSecret, tavilyKey, firecrawlKey, visionEnabled, kmaKey, endpoint, model });"""

new_api_save = """        localStorage.setItem("LLM_ENDPOINT", endpoint);
        localStorage.setItem("LLM_MODEL", model);
        localStorage.setItem("LLM_VISION_MODEL", visionModel);
        sendToFlutter("save_api_key", { key, naverClientId, naverClientSecret, tavilyKey, firecrawlKey, visionEnabled, kmaKey, endpoint, model, visionModel });"""

if old_api_save in index_content:
    index_content = index_content.replace(old_api_save, new_api_save)

old_api_inputs = """                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>Model Name</span>
                    <input
                        value={model} onChange={(e) => setModel(e.target.value)} placeholder="llama-3.3-70b-instruct"
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />"""

new_api_inputs = """                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>텍스트 전용 모델명 (Main Model)</span>
                    <input
                        value={model} onChange={(e) => setModel(e.target.value)} placeholder="llama-3.3-70b-instruct"
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />

                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>비전 전용 모델명 (Vision Model - 사진/오답 분석 시 자동 전환)</span>
                    <input
                        value={visionModel} onChange={(e) => setVisionModel(e.target.value)} placeholder="meta/llama-3.2-11b-vision-instruct"
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />"""

if old_api_inputs in index_content:
    index_content = index_content.replace(old_api_inputs, new_api_inputs)

# Update PathSettingsScreen
old_path_screen = """function PathSettingsScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [obsidianPath, setObsidianPath] = useState(() => localStorage.getItem("OBSIDIAN_PATH") || "/storage/emulated/0/Documents/Obsidian/Inbox");
    const [playlistPath, setPlaylistPath] = useState(() => localStorage.getItem("PLAYLIST_PATH") || "/storage/emulated/0/Music");

    useEffect(() => {
        const handleNativeEvent = (e) => {
            const payload = e.detail;
            if (payload?.type === "directory_picked" && payload.path) {
                if (payload.target === "obsidian") setObsidianPath(payload.path);
                else if (payload.target === "playlist") setPlaylistPath(payload.path);
            }
        };
        window.addEventListener("ev-native-event", handleNativeEvent);
        return () => window.removeEventListener("ev-native-event", handleNativeEvent);
    }, []);

    const handleSave = () => {
        localStorage.setItem("OBSIDIAN_PATH", obsidianPath);
        localStorage.setItem("PLAYLIST_PATH", playlistPath);
        sendToFlutter("save_paths", { obsidianPath, playlistPath });
        alert("경로가 저장되었습니다.");
    };"""

new_path_screen = """function PathSettingsScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [obsidianVaultPath, setObsidianVaultPath] = useState(() => localStorage.getItem("OBSIDIAN_VAULT_PATH") || "/storage/emulated/0/Documents/Obsidian");
    const [obsidianInboxPath, setObsidianInboxPath] = useState(() => localStorage.getItem("OBSIDIAN_INBOX_PATH") || "/storage/emulated/0/Documents/Obsidian/Inbox");
    const [playlistPath, setPlaylistPath] = useState(() => localStorage.getItem("PLAYLIST_PATH") || "/storage/emulated/0/Music");

    useEffect(() => {
        const handleNativeEvent = (e) => {
            const payload = e.detail;
            if (payload?.type === "directory_picked" && payload.path) {
                if (payload.target === "obsidian_vault") setObsidianVaultPath(payload.path);
                else if (payload.target === "obsidian_inbox" || payload.target === "obsidian") setObsidianInboxPath(payload.path);
                else if (payload.target === "playlist") setPlaylistPath(payload.path);
            } else if (payload?.type === "settings_sync") {
                if (payload.obsidianVaultPath) setObsidianVaultPath(payload.obsidianVaultPath);
                if (payload.obsidianInboxPath) setObsidianInboxPath(payload.obsidianInboxPath);
            }
        };
        window.addEventListener("ev-native-event", handleNativeEvent);
        return () => window.removeEventListener("ev-native-event", handleNativeEvent);
    }, []);

    const handleSave = () => {
        localStorage.setItem("OBSIDIAN_VAULT_PATH", obsidianVaultPath);
        localStorage.setItem("OBSIDIAN_INBOX_PATH", obsidianInboxPath);
        localStorage.setItem("PLAYLIST_PATH", playlistPath);
        sendToFlutter("save_paths", { obsidianVaultPath, obsidianInboxPath, obsidianPath: obsidianInboxPath, playlistPath });
        alert("경로가 저장되었습니다.");
    };"""

if old_path_screen in index_content:
    index_content = index_content.replace(old_path_screen, new_path_screen)

old_path_inputs = """                <div className="flex flex-col gap-2 p-4 rounded-lg" style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)" }}>
                    <span style={{ ...mono, color: C.lime, fontSize: 11 * scale }}>옵시디언(Obsidian) 메모 저장 경로</span>
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>AI가 작성한 요약 및 메모가 저장되는 폴더입니다.</span>
                    <div className="flex gap-2">
                        <input
                            value={obsidianPath}
                            onChange={(e) => setObsidianPath(e.target.value)}
                            className="flex-1 bg-transparent outline-none"
                            style={{ ...mono, color: C.accent, fontSize: 11 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                        />
                        <button
                            onClick={() => sendToFlutter("pick_directory", { target: "obsidian" })}
                            className="flex items-center justify-center px-3"
                            style={{ border: `1px solid ${C.accent}`, color: C.accent }}
                            title="폴더 선택"
                        >
                            <FolderOpen size={16 * scale} />
                        </button>
                    </div>
                </div>"""

new_path_inputs = """                <div className="flex flex-col gap-2 p-4 rounded-lg" style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)" }}>
                    <span style={{ ...mono, color: C.lime, fontSize: 11 * scale }}>1. 옵시디언 볼트 상위 경로 (읽기 / 검색용)</span>
                    <span style={{ ...mono, color: C.slate, fontSize: 9.5 * scale }}>하위 모든 폴더의 .md 노트를 검색하여 AI가 답변에 인용합니다.</span>
                    <div className="flex gap-2">
                        <input
                            value={obsidianVaultPath}
                            onChange={(e) => setObsidianVaultPath(e.target.value)}
                            className="flex-1 bg-transparent outline-none"
                            style={{ ...mono, color: C.lime, fontSize: 11 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                        />
                        <button
                            onClick={() => sendToFlutter("pick_directory", { target: "obsidian_vault" })}
                            className="flex items-center justify-center px-3"
                            style={{ border: `1px solid ${C.lime}`, color: C.lime }}
                            title="볼트 상위 폴더 선택"
                        >
                            <FolderOpen size={16 * scale} />
                        </button>
                    </div>

                    <span style={{ ...mono, color: C.slate, fontSize: 11 * scale, marginTop: 8 }}>2. 옵시디언 인박스 경로 (새 메모 저장용)</span>
                    <span style={{ ...mono, color: C.slate, fontSize: 9.5 * scale }}>AI가 새로 생성한 메모/요약이 저장되는 폴더입니다.</span>
                    <div className="flex gap-2">
                        <input
                            value={obsidianInboxPath}
                            onChange={(e) => setObsidianInboxPath(e.target.value)}
                            className="flex-1 bg-transparent outline-none"
                            style={{ ...mono, color: C.accent, fontSize: 11 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                        />
                        <button
                            onClick={() => sendToFlutter("pick_directory", { target: "obsidian_inbox" })}
                            className="flex items-center justify-center px-3"
                            style={{ border: `1px solid ${C.accent}`, color: C.accent }}
                            title="인박스 폴더 선택"
                        >
                            <FolderOpen size={16 * scale} />
                        </button>
                    </div>
                </div>"""

if old_path_inputs in index_content:
    index_content = index_content.replace(old_path_inputs, new_path_inputs)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_content)

print("Patch vision, obsidian dual path, and weekly summary applied successfully.")

