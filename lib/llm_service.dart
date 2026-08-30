import 'search_service.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'local_storage_service.dart';
import 'document_service.dart';
import 'obsidian_service.dart';
import 'playlist_service.dart';

/// generateResponse()의 반환값. 화면에 보여줄 text 외에,
/// AI가 <update_calendar> 태그로 일정을 추가/수정했다면 그 결과
/// (calendar.json에 실제로 반영된 병합 후 전체 목록)를, <generate_document>
/// 태그로 슬라이드/문서를 만들었다면 그 결과(실제로 디스크에 저장된 HTML+PDF
/// 경로)를, <update_memory> 태그로 새 기억을 저장했다면 그 결과(append 후
/// memories.md 전체 내용)를 같이 담아 돌려준다. 모두 null이면 이번 응답엔
/// 그런 변경이 없었다는 뜻.
class LlmResponse {
  final String text;
  final List<Map<String, dynamic>>? calendarEvents;
  final GeneratedDocument? document;
  final String? updatedMemories;
  final List<Map<String, dynamic>>? updatedTodo;

  const LlmResponse(
    this.text, {
    this.calendarEvents,
    this.document,
    this.updatedMemories,
    this.updatedTodo,
  });
}

class LlmService {
  // AI 응답 안에서 일정 추가/수정 지시를 찾아내는 태그.
  // 예: <update_calendar>[{"id":"","date":"2026-08-15","time":"","title":"생일파티","type":"important"}]</update_calendar>
  // - id를 비워두면 새 일정으로 추가되고, 기존 id를 그대로 쓰면 해당 일정이 수정된다.
  // - 태그 자체는 사용자에게 보여주지 않고 잘라낸 뒤, calendar.json에 병합한다.
  static final RegExp _updateCalendarTag = RegExp(
    r'<update_calendar>([\s\S]*?)</update_calendar>',
    caseSensitive: false,
  );

  // AI 응답 안에서 슬라이드/문서 생성 지시를 찾아내는 태그.
  // 예: <generate_document>{"title":"...","slides":[{"heading":"...","bullets":["...","..."]}]}</generate_document>
  // 태그 자체는 사용자에게 보여주지 않고, 안의 JSON을 실제 reveal.js HTML +
  // PDF 파일로 렌더링한다(document_service.dart).
  static final RegExp _generateDocumentTag = RegExp(
    r'<generate_document>([\s\S]*?)</generate_document>',
    caseSensitive: false,
  );

  // AI 응답 안에서 기억 추가/수정 지시를 찾아내는 태그.
  // 예: <update_memory>사용자는 매운 음식을 싫어함</update_memory>
  // 여러 줄이면 각 줄이 memories.md에 개별 bullet으로 append된다.
  // 태그 자체는 사용자에게 보여주지 않고 잘라낸 뒤, memories.md에 반영한다.
  static final RegExp _updateMemoryTag = RegExp(
    r'<update_memory>([\s\S]*?)</update_memory>',
    caseSensitive: false,
  );

  // AI 응답 안에서 할 일(Todo) 추가/완료 지시를 찾아내는 태그.
  // 예: <update_todo>- [ ] 수학 숙제하기\n- [x] 이메일 확인하기</update_todo>
  static final RegExp _updateTodoTag = RegExp(
    r'<update_todo>([\s\S]*?)</update_todo>',
    caseSensitive: false,
  );

  // AI 응답 안에서 과목 학습 기록 추가 지시를 찾아내는 태그.
  static final RegExp _updateSubjectTag = RegExp(
    r'<update_subject>([\s\S]*?)</update_subject>',
    caseSensitive: false,
  );

  // AI 응답 안에서 옵시디언 노트를 만드는 태그.
  static final RegExp _createObsidianTag = RegExp(
    r'<create_obsidian\s+filename="([^"]+)">([\s\S]*?)</create_obsidian>',
    caseSensitive: false,
  );

  // 일정/스케줄 관련 질문일 때만 calendar.json을 시스템 프롬프트에 붙인다.
  static final RegExp _calendarKeywords = RegExp(
    r'일정|스케줄|캘린더|약속|언제|몇\s*시|회의|미팅|날짜|디데이|디-데이|시간표',
    caseSensitive: false,
  );

  // 오늘의 할 일(Todo) 관련 키워드 감지
  static final RegExp _todoKeywords = RegExp(
    r'할\s*일|투두|todo|체크리스트|할것|과제|숙제',
    caseSensitive: false,
  );

  // 옵시디언 노트 작성 키워드
  static final RegExp _obsidianKeywords = RegExp(
    r'메모해|노트|옵시디언|저장해|적어둬',
    caseSensitive: false,
  );

  // "슬라이드/피피티/보고서/pdf 만들어줘" 같은 문서 생성 요청일 때만
  // <generate_document> 태그 사용법을 시스템 프롬프트에 붙인다.
  static final RegExp _documentKeywords = RegExp(
    r'슬라이드|피피티|ppt|프레젠테이션|덱|문서\s*생성|보고서|pdf',
    caseSensitive: false,
  );

  // 웹 검색 키워드 감지
  static final RegExp _searchKeywords = RegExp(
    r'검색|찾아봐|뉴스|최신|어때|요즘|알려줘',
    caseSensitive: false,
  );

  static bool shouldSearch(String query) => _searchKeywords.hasMatch(query);

  // 음악/플레이리스트 키워드 감지
  static final RegExp _musicKeywords = RegExp(
    r'음악|노래|틀어|재생|플레이리스트|뮤직',
    caseSensitive: false,
  );

  // 학습/과목 키워드 감지
  static final RegExp _subjectKeywords = RegExp(
    r'공부|학습|과목|수학|과학|국어|영어|풀었|배웠|인강|복습|진도|물리|화학|생명|지학|역사|사회',
    caseSensitive: false,
  );

  static Future<String?> _getApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('NVIDIA_NIM_API_KEY')?.trim();
  }

  static Future<String> _getEndpoint() async {
    final prefs = await SharedPreferences.getInstance();
    final url = prefs.getString('LLM_ENDPOINT')?.trim();
    return (url != null && url.isNotEmpty) ? url : 'https://integrate.api.nvidia.com/v1/chat/completions';
  }

  static Future<String?> _getVisionApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    final vKey = prefs.getString('VISION_API_KEY')?.trim();
    if (vKey != null && vKey.isNotEmpty) return vKey;
    return _getApiKey();
  }

  static Future<String> _getVisionEndpoint() async {
    final prefs = await SharedPreferences.getInstance();
    final vUrl = prefs.getString('VISION_ENDPOINT')?.trim();
    if (vUrl != null && vUrl.isNotEmpty) return vUrl;
    return _getEndpoint();
  }

  static Future<String> _getModel() async {
    final prefs = await SharedPreferences.getInstance();
    final model = prefs.getString('LLM_MODEL')?.trim();
    return (model != null && model.isNotEmpty) ? model : 'meta/llama-3.3-70b-instruct';
  }

  static Future<String> _getVisionModel() async {
    final prefs = await SharedPreferences.getInstance();
    final vModel = prefs.getString('LLM_VISION_MODEL')?.trim();
    if (vModel != null && vModel.isNotEmpty) return vModel;
    // 텍스트 전용 모델로 fallback하면 이미지 전송 시 API 에러가 나므로
    // 항상 비전 지원 모델로 fallback한다.
    return 'meta/llama-3.2-11b-vision-instruct';
  }

  static Future<String> _getBaseSystemPrompt() async {
    try {
      return await rootBundle.loadString('assets/ev_system_prompt.md');
    } catch (e) {
      return 'System prompt not found.';
    }
  }

/// 사용자 메시지 내용에 따라 시스템 프롬프트를 구성한다.
/// - memories.md와 <update_memory> 사용법은 매 턴 항상 붙인다
///   (AI가 스스로 저장 여부를 판단할 수 있도록).
/// - calendar.json / <update_calendar>, 문서 생성 안내는
///   관련 키워드가 감지될 때만 조건부로 덧붙인다(토큰 절약).
 static Future<String> _buildSystemPrompt(
  String basePrompt,
  String userMessage, {
  Function(String engine)? onSearchStart,
}) async {
  String prompt = basePrompt;

  // memories.md는 매 턴 항상 붙인다 — AI가 스스로 저장 여부를 판단할 수 있게
  final memories = await LocalStorageService.readMemories();
  prompt += '\n\n# 사용자 기억 (memories.md)\n$memories';

  // 학습 과목 목록도 항상 붙인다 — AI가 문맥을 파악할 수 있도록
  final subjects = await LocalStorageService.readSubjects();
  prompt += '\n\n# 사용자 학습 과목 기록 (subject.json)\n${jsonEncode(subjects)}';

  // 동적 시간표(학원/기숙사 등)를 항상 붙인다 — AI가 현재 시간에 뭘 해야 할지 알 수 있도록
  final schedule = await LocalStorageService.readScheduleEvents();
  prompt += '\n\n# 사용자 시간표 (schedule.json)\n${jsonEncode(schedule)}\n- 위 시간표를 참고하여 현재 시간에 맞는 행동(학원 가기, 취침 등)을 안내해라. 기존 프롬프트에 하드코딩된 시간표가 있다면 무시하고 오직 이 schedule.json 데이터를 우선해라.';

  prompt += '\n\n# 기억을 추가/수정해야 할 때\n'
      '사용자 발화에서 지속적으로 유효한 개인 정보(성격, 취향, 진행 중인 일 등)를 '
      '스스로 판단해 감지했다면, 먼저 위 memories.md 목록에 이미 있는 내용인지 '
      '확인하고, 없다면 답변 맨 끝에 아래 태그를 붙여라. 이 태그는 사용자에게 '
      '보이지 않으니 자연스러운 확인 문장은 태그 밖에 따로 써라. 일시적 감정/상태는 '
      '절대 저장하지 않는다.\n'
      '<update_memory>새로 기억할 내용 (한 줄에 하나씩)</update_memory>\n'
      '- 저장할 게 없다고 판단되면 태그를 붙이지 않는다.';

  if (_calendarKeywords.hasMatch(userMessage)) {
    final events = await LocalStorageService.readCalendarEvents();
    prompt += '\n\n# 사용자 일정 (calendar.json)\n${jsonEncode(events)}'
        '\n\n# 일정을 추가하거나 바꿔야 할 때\n'
        '사용자가 일정을 추가/변경/삭제해달라고 요청한 경우에만, 답변 맨 끝에 아래 '
        '형식의 태그를 붙여라. 이 태그는 사용자에게 보이지 않으니, 자연스러운 확인 '
        '문장은 태그 밖에 따로 작성해라.\n'
        '<update_calendar>[{"id":"","date":"YYYY-MM-DD","time":"HH:mm 또는 빈 문자열","title":"일정 제목","type":"work|normal|important"}]</update_calendar>\n'
        '- 새 일정이면 id는 빈 문자열로 둔다(자동 생성됨).\n'
        '- 기존 일정을 수정하려면 위 목록에 있는 그 일정의 id를 그대로 사용한다.\n'
        '- 여러 일정을 한 번에 넣을 수도 있다(배열에 여러 개).\n'
        '- 단순 조회 질문이면 이 태그를 붙이지 않는다.';
  }

  // 옵시디언 볼트에서 관련 노트 검색 및 컨텍스트 주입
  if (_obsidianKeywords.hasMatch(userMessage) || userMessage.contains('찾아') || userMessage.contains('메모') || userMessage.contains('필기')) {
    final matchedNotes = await ObsidianService.searchNotes(userMessage);
    if (matchedNotes.isNotEmpty) {
      prompt += '\n\n# 사용자 옵시디언 볼트 검색 결과\n';
      for (var n in matchedNotes) {
        prompt += '### [${n['title']}]\n${n['content']}\n\n';
      }
      prompt += '위 사용자의 개인 노트 내용을 기반으로 질문에 정확하게 답변하세요.\n';
    }
  }

  if (_obsidianKeywords.hasMatch(userMessage)) {
    prompt += '\n\n# 옵시디언 노트 작성\n'
        '사용자가 특정 텍스트나 정보에 대해 "이거 메모해줘", "노트로 만들어줘", "옵시디언에 저장해줘"라고 요청한 경우, '
        '아래 태그를 답변 맨 끝에 포함해라. 태그 내용은 사용자 기기의 옵시디언 폴더에 마크다운 파일로 저장된다.\n'
        '<create_obsidian filename="적절한제목.md">노트 본문(마크다운)</create_obsidian>\n'
        '- 제목은 내용을 잘 나타내는 이름으로 해라.\n'
        '- 자연스러운 확인 문장("옵시디언 노트로 저장할게")은 태그 밖에 써라.';
  }

  if (_todoKeywords.hasMatch(userMessage)) {
    final todoContent = await LocalStorageService.readTodo();
    prompt += '\n\n# 사용자 오늘의 할 일 (todo.md)\n$todoContent'
        '\n\n# 할 일(Todo)을 추가/완료/수정해야 할 때\n'
        '사용자가 오늘 할 일을 추가하거나 완료했다고 언급한 경우, 답변 맨 끝에 아래 태그를 붙여라. 이 태그는 사용자에게 보이지 않으니 자연스러운 확인 문장은 태그 밖에 작성해라.\n'
        '<update_todo>\n'
        '- [ ] 새로 추가할 할 일\n'
        '- [x] 완료한 할 일\n'
        '</update_todo>\n'
        '- 단순 조회 질문이면 태그를 붙이지 않는다.';
  }

  if (_subjectKeywords.hasMatch(userMessage)) {
    prompt += '\n\n# 학습 과목 기록\n'
        '사용자가 특정 과목을 공부했다고 언급하거나, 그 과목에 대해 질문/대화를 나눴다면 해당 과목을 학습한 것으로 인지하고 아래 태그를 답변 맨 끝에 추가해라.\n'
        '<update_subject>{"subject":"과목명","last_studied":"YYYY-MM-DD"}</update_subject>\n'
        '- 과목명은 되도록 짧고 명확하게 적어라 (예: "수학", "영어").\n'
        '- 여러 과목이면 태그를 여러 번 써라.\n'
        '- 태그는 화면에 보이지 않으므로 태그 밖에 자연스럽게 대답해라.';
  }

  if (_documentKeywords.hasMatch(userMessage)) {
    prompt += '\n\n# 슬라이드/문서를 만들어야 할 때\n'
        '사용자가 슬라이드, PPT, 프레젠테이션, 보고서, PDF 같은 문서를 만들어달라고 '
        '요청한 경우에만, 답변 맨 끝에 아래 형식의 태그를 반드시 포함해라. 이 태그는 '
        '사용자에게 보이지 않으니, 자연스러운 확인 문장은 태그 밖에 따로 써라.\n'
        '<generate_document>{"title":"문서 제목","slides":[{"heading":"슬라이드 제목","bullets":["항목1","항목2"]}]}</generate_document>\n'
        '- slides 배열의 각 항목이 실제 슬라이드 한 장이 된다(보통 3~8장).\n'
        '- 각 슬라이드는 heading 하나와 bullets 여러 개로 구성해라. 문장을 길게 늘어놓지 말고 핵심만 짧게.\n'
        '- "PDF로 줘"라고만 해도 같은 태그를 쓴다 — PDF는 이 슬라이드 데이터를 그대로 페이지로 렌더링한 것이다.\n'
        '- 단순히 문서/PDF에 대해 물어보는 질문(예: "PDF가 뭐야?")이면 이 태그를 붙이지 않는다.';
  }

  if (_musicKeywords.hasMatch(userMessage)) {
    final playlists = await PlaylistService.getAvailablePlaylists();
    bool isMusicActive = false;
    try {
      isMusicActive = await const MethodChannel('com.example.evapp/methods').invokeMethod('checkMusicActive') ?? false;
    } catch (e) {
      debugPrint('Error checking music active: $e');
    }

    prompt += '\n\n# 음악/플레이리스트 재생 요청\n';
    if (isMusicActive) {
      prompt += '현재 기기에서 이미 음악이 재생 중이거나 백그라운드에 있습니다.\n'
          '사용자가 음악 재생을 원할 때 **다음 두 가지 중 하나를 선택하도록 먼저 물어보세요**:\n'
          '1. 기존 듣던 음악을 이어서 재생할까요?\n'
          '2. 아니면 준비된 플레이리스트를 새로 틀어드릴까요?\n\n'
          '만약 사용자가 "기존 음악(1번)"을 선택하면 답변 맨 끝에 `<resume_music>` 태그를 출력하세요.\n'
          '만약 사용자가 "특정 플레이리스트(2번)"를 선택하면 답변 맨 끝에 `<play_playlist name="플레이리스트이름">` 태그를 출력하세요.\n\n';
    } else {
      prompt += '현재 재생 중인 배경 음악이 없으므로 무조건 아래 플레이리스트 중에서 재생해야 합니다.\n'
          '사용자가 노래를 틀어달라고 하면 어떤 플레이리스트를 재생할지 먼저 물어보세요.\n'
          '사용자가 특정 플레이리스트를 지목했다면 답변 맨 끝에 `<play_playlist name="플레이리스트이름">` 태그를 출력하세요.\n\n';
    }

    if (playlists.isNotEmpty) {
       prompt += '현재 감지된 플레이리스트 목록:\n' + playlists.map((p) => '- $p').join('\n') + '\n';
    } else {
       prompt += '현재 감지된 플레이리스트가 없습니다. 사용자에게 설정의 플레이리스트 폴더에 .m3u 파일을 넣어달라고 안내하세요.\n';
    }
    prompt += '- 태그는 사용자에게 보이지 않으므로 자연스러운 안내 멘트는 태그 밖에 따로 작성하세요.';
  }

  if (_searchKeywords.hasMatch(userMessage)) {
    final searchRes = await SearchService.search(userMessage, onSearchStart: onSearchStart);
    final results = searchRes['results'] as List<SearchResultItem>?;
    final engineName = searchRes['engine'] ?? '웹 검색';
    if (results != null && results.isNotEmpty) {
      prompt += '\n\n# 실시간 웹 검색 결과 ($engineName)\n';
      for (var item in results) {
        String snippet = item.snippet;
        if (snippet.length > 500) {
          snippet = snippet.substring(0, 500) + '...';
        }
        prompt += '- [${item.title}](${item.url})\n  본문: $snippet\n\n';
      }
      prompt += '위 최신 검색 결과를 바탕으로 사용자의 질문에 친절하고 명확하게 답해라.';
    }
  }

  return prompt;
}

  static Future<LlmResponse> generateResponse(
    String userMessage, {
    List<Map<String, String>> history = const [],
    String? base64Image,
    Function(String status, String engine)? onSearchStatus,
  }) async {
    // 개인정보 마스킹 적용
    final sanitizedUserMessage = await LocalStorageService.applyMasking(userMessage);
    final sanitizedHistory = <Map<String, String>>[];
    for (var h in history) {
      final content = h['content'] ?? '';
      sanitizedHistory.add({
        'role': h['role'] ?? 'user',
        'content': await LocalStorageService.applyMasking(content),
      });
    }

    final basePrompt = await _getBaseSystemPrompt();
    final systemPrompt = await _buildSystemPrompt(
      basePrompt,
      sanitizedUserMessage,
      onSearchStart: (engine) {
        onSearchStatus?.call('searching', engine);
      },
    );
    final prefs = await SharedPreferences.getInstance();
    final bool isVisionEnabled = prefs.getBool('VISION_ENABLED') ?? true;
    final bool canSendImage = isVisionEnabled && base64Image != null && base64Image.isNotEmpty;
    final apiKey = canSendImage ? await _getVisionApiKey() : await _getApiKey();
    final endpoint = canSendImage ? await _getVisionEndpoint() : await _getEndpoint();
    final mainModelName = await _getModel();
    final visionModelName = await _getVisionModel();
    final modelName = canSendImage ? visionModelName : mainModelName;

    String finalSystemPrompt = systemPrompt;
    if (canSendImage) {
      finalSystemPrompt += '\n\n# [비전(Vision) AI 분석 모드 활성화]\n'
          '사용자가 사진, 캡처 화면 또는 문제 이미지를 전송했습니다.\n'
          '- 이미지 속 텍스트, 다이어그램, 수식, 그래프, 에러 화면, 사물 등을 시각적으로 정확히 분석하여 사용자의 질문에 답변하세요.\n'
          '- 수식이나 기호는 LaTeX 포맷(\\(수식\\) 혹은 \\[수식\\])으로 작성하세요.\n'
          '- 문제 풀이나 코드가 포함되어 있다면 핵심 개념과 정답을 단계별로 친절하게 설명하세요.\n';
    }

    if (apiKey == null || apiKey.isEmpty) {
      return const LlmResponse('Error: API key not set.');
    }

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $apiKey',
        },
        body: jsonEncode({
          'model': modelName,
          'messages': [
            {'role': 'system', 'content': finalSystemPrompt},
            ...sanitizedHistory,
            if (canSendImage)
              {
                'role': 'user',
                'content': [
                  {'type': 'text', 'text': sanitizedUserMessage},
                  {
                    'type': 'image_url',
                    'image_url': {'url': base64Image}
                  }
                ]
              }
            else
              {'role': 'user', 'content': sanitizedUserMessage},
          ],
          'temperature': 0.7,
        }),
      ).timeout(const Duration(seconds: 120), onTimeout: () {
        throw Exception('API 요청 시간이 초과되었습니다 (120초). 모델이 응답하는 데 너무 오래 걸립니다.');
      });

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        String content =
            jsonResponse['choices'][0]['message']['content'] as String;

        // AI가 실제로 일정을 추가/수정하라고 판단했다면 <update_calendar> 태그가
        // 붙어 온다. 그 안의 JSON을 calendar.json에 실제로 병합하고, 태그 자체는
        // 화면에 보여줄 텍스트에서 잘라낸다. 이제 캘린더 반영은 정규식으로 사용자
        // 문장을 추측하던 데모 로직이 아니라, AI가 문맥을 보고 내린 판단을 그대로
        // 따른다.
        List<Map<String, dynamic>>? mergedEvents;
        final tagMatch = _updateCalendarTag.firstMatch(content);
        if (tagMatch != null) {
          final rawJson = tagMatch.group(1)?.trim() ?? '[]';
          
          // 보다 견고한 JSON 추출: 첫 번째 '['와 마지막 ']' 사이를 추출
          String cleanJson = rawJson;
          int startIdx = rawJson.indexOf('[');
          int endIdx = rawJson.lastIndexOf(']');
          if (startIdx != -1 && endIdx != -1 && endIdx > startIdx) {
            cleanJson = rawJson.substring(startIdx, endIdx + 1);
          }

          try {
            mergedEvents =
                await LocalStorageService.mergeCalendarEventsFromJson(cleanJson);
          } catch (e) {
            debugPrint('Failed to merge <update_calendar> payload: $e\nJSON was: $cleanJson');
          }
          content = content.replaceFirst(tagMatch.group(0)!, '').trim();
        }

        // 마찬가지로 AI가 슬라이드/문서를 만들어야 한다고 판단했다면
        // <generate_document> 태그가 붙어 온다. 여기서 실제로 reveal.js HTML과
        // PDF 파일을 디스크에 만든다 — 예전처럼 타이머로 진행바만 채우고 끝나는
        // 게 아니라, 진짜 산출물이 생긴다.
        GeneratedDocument? document;
        final docMatch = _generateDocumentTag.firstMatch(content);
        if (docMatch != null) {
          final rawJson = docMatch.group(1)?.trim() ?? '{}';
          
          // 보다 견고한 JSON 추출: 첫 번째 '{'와 마지막 '}' 사이를 추출
          String cleanJson = rawJson;
          int startIdx = rawJson.indexOf('{');
          int endIdx = rawJson.lastIndexOf('}');
          if (startIdx != -1 && endIdx != -1 && endIdx > startIdx) {
            cleanJson = rawJson.substring(startIdx, endIdx + 1);
          }

          try {
            final decoded = jsonDecode(cleanJson);
            if (decoded is Map) {
              final deck = SlideDeck.fromJson(Map<String, dynamic>.from(decoded));
              document = await DocumentService.saveDeck(deck);
            }
          } catch (e) {
            debugPrint('Failed to build document from AI response: $e\nJSON was: $cleanJson');
          }
          content = content.replaceFirst(docMatch.group(0)!, '').trim();
        }

        // AI가 새로 기억해야 할 내용이 있다고 판단했다면 <update_memory> 태그가
        // 붙어 온다. memories.md에 실제로 append하고, 태그 자체는 화면에 보여줄
        // 텍스트에서 잘라낸다. 기존 내용과 완전히 같은 줄은 appendMemory() 안에서
        // 자동으로 걸러진다.
        String? updatedMemories;
        final memMatch = _updateMemoryTag.firstMatch(content);
        if (memMatch != null) {
          final rawMemory = memMatch.group(1)?.trim() ?? '';
          if (rawMemory.isNotEmpty) {
            final cleanMemory = rawMemory.replaceAll(RegExp(r'^```[A-Za-z]*|```$', multiLine: true), '').trim();
            try {
              updatedMemories = await LocalStorageService.appendMemory(cleanMemory);
            } catch (e) {
              debugPrint('Failed to append <update_memory> payload: $e');
            }
          }
          content = content.replaceFirst(memMatch.group(0)!, '').trim();
        }

        // 할 일(Todo) 업데이트 태그 처리
        List<Map<String, dynamic>>? updatedTodo;
        final todoMatch = _updateTodoTag.firstMatch(content);
        if (todoMatch != null) {
          final rawTodo = todoMatch.group(1)?.trim() ?? '';
          if (rawTodo.isNotEmpty) {
            try {
              updatedTodo = await LocalStorageService.mergeTodoFromTags(rawTodo);
            } catch (e) {
              debugPrint('Failed to merge <update_todo> payload: $e');
            }
          }
          content = content.replaceFirst(todoMatch.group(0)!, '').trim();
        }

        // 과목 업데이트 태그 처리
        final subjectMatches = _updateSubjectTag.allMatches(content).toList();
        for (var match in subjectMatches) {
          final rawJson = match.group(1)?.trim() ?? '{}';
          
          // 보다 견고한 JSON 추출: 첫 번째 '{'와 마지막 '}' 사이를 추출
          String cleanJson = rawJson;
          int startIdx = rawJson.indexOf('{');
          int endIdx = rawJson.lastIndexOf('}');
          if (startIdx != -1 && endIdx != -1 && endIdx > startIdx) {
            cleanJson = rawJson.substring(startIdx, endIdx + 1);
          }

          try {
            await LocalStorageService.mergeSubjectFromJson(cleanJson);
          } catch (e) {
            debugPrint('Failed to merge <update_subject> payload: $e\nJSON was: $cleanJson');
          }
          content = content.replaceFirst(match.group(0)!, '').trim();
        }

        // 옵시디언 노트 작성 태그
        String? obsidianError;
        bool obsidianSaved = false;
        final obsMatch = _createObsidianTag.firstMatch(content);
        if (obsMatch != null) {
          final filename = obsMatch.group(1)?.trim() ?? 'Untitled.md';
          final noteContent = obsMatch.group(2)?.trim() ?? '';
          if (noteContent.isNotEmpty) {
            try {
              obsidianError = await ObsidianService.createNoteFromTag(filename, noteContent);
              obsidianSaved = obsidianError == null;
            } catch (e) {
              obsidianError = e.toString();
              debugPrint('Failed to create Obsidian note: $e');
            }
          }
          content = content.replaceFirst(obsMatch.group(0)!, '').trim();
        }

        if (content.isEmpty) {
          if (document != null) {
            content = '${document.title} 만들었어. 아래 버튼으로 확인할 수 있어.';
          } else if (mergedEvents != null) {
            content = '일정을 반영했어.';
          } else if (updatedTodo != null) {
            content = '할 일을 반영했어.';
          } else if (updatedMemories != null) {
            content = '기억해뒀어.';
          } else if (obsidianSaved) {
            content = '옵시디언에 노트를 저장했어!';
          } else if (obsidianError != null) {
            content = '옵시디언 저장 실패: $obsidianError';
          }
        } else if (obsidianError != null) {
          content += '\n\n(참고: 옵시디언 저장에 실패했습니다 - $obsidianError)';
        }

        return LlmResponse(
          content,
          calendarEvents: mergedEvents,
          document: document,
          updatedMemories: updatedMemories,
          updatedTodo: updatedTodo,
        );
      } else {
        return LlmResponse('Error: API returned status ${response.statusCode}\n[Debug] Endpoint: $endpoint\n[Debug] Model: $modelName');
      }
    } catch (e) {
      return const LlmResponse('Error: Failed to reach LLM API.');
    }
  }

  static Future<String?> generateProactiveResponse(String contextPrompt, {String? systemPromptOverride}) async {
    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final modelName = await _getModel();

    if (apiKey == null || apiKey.isEmpty) return null;

    final systemPrompt = systemPromptOverride ?? "너는 보스(사용자)를 돕는 E.V. (능동형 AI 비서)야.\n"
        "아래 제공되는 현재 상황(시간, 배터리 상태, 다가오는 일정 등)을 보고, 보스에게 꼭 해줄 말이 있으면 1~2문장의 짧고 친근한 알림 메시지를 작성해.\n"
        "만약 굳이 알릴 필요가 없거나 이미 지나간/너무 먼 일정이라면 'SILENT'라고만 대답해.";

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $apiKey',
        },
        body: jsonEncode({
          'model': modelName,
          'messages': [
            {'role': 'system', 'content': systemPrompt},
            {'role': 'user', 'content': contextPrompt},
          ],
          'temperature': 0.7,
        }),
      );

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        String content = jsonResponse['choices'][0]['message']['content'] as String;
        content = content.trim();
        if (content.toUpperCase().contains('SILENT')) {
          return null;
        }
        return content;
      }
    } catch (e) {
      debugPrint('Proactive LLM error: $e');
    }
    return null;
  }

  static Future<String?> extractTextFromImage(String base64Image) async {
    final apiKey = await _getVisionApiKey();
    final endpoint = await _getVisionEndpoint();
    final modelName = await _getVisionModel();

    if (apiKey == null || apiKey.isEmpty) return null;

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $apiKey',
        },
        body: jsonEncode({
          'model': modelName,
          'messages': [
            {'role': 'system', 'content': '이미지에서 텍스트만 정확하게 추출해서 그대로 반환하세요.'},
            {
              'role': 'user',
              'content': [
                {'type': 'text', 'text': 'Extract text from this image'},
                {
                  'type': 'image_url',
                  'image_url': {'url': base64Image}
                }
              ]
            },
          ],
          'temperature': 0.1,
        }),
      );

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        return jsonResponse['choices'][0]['message']['content'] as String;
      }
    } catch (e) {
      debugPrint('extractTextFromImage error: $e');
    }
    return null;
  }


  /// LLM 응답에서 <think> 태그나 설명글을 제거하고 순수 JSON Map을 안전하게 추출
  static Map<String, dynamic>? _extractJsonMap(String rawContent) {
    try {
      String clean = rawContent.trim();

      // 1. <think>...</think> 제거 (DeepSeek R1 / Reasoning 모델 대응)
      clean = clean.replaceAll(RegExp(r'<think>[\s\S]*?<\/think>', caseSensitive: false), '').trim();

      // 2. ```json ... ``` 또는 ``` ... ``` 마크다운 코드 블록 추출
      final codeBlockMatch = RegExp(r'```(?:json)?\s*([\s\S]*?)\s*```').firstMatch(clean);
      if (codeBlockMatch != null) {
        clean = codeBlockMatch.group(1)?.trim() ?? clean;
      }

      // 3. 첫 번째 '{' 와 마지막 '}' 사이 추출
      final startIdx = clean.indexOf('{');
      final endIdx = clean.lastIndexOf('}');
      if (startIdx != -1 && endIdx != -1 && endIdx > startIdx) {
        clean = clean.substring(startIdx, endIdx + 1);
      }

      // 4. JSON 파싱
      final decoded = jsonDecode(clean);
      if (decoded is Map) {
        return decoded.cast<String, dynamic>();
      }
    } catch (e) {
      debugPrint('LlmService._extractJsonMap error: $e\nRaw was: $rawContent');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> processOcrForWrongNote(String text) async {
    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final modelName = await _getModel();

    if (apiKey == null || apiKey.isEmpty) return null;

    final systemPrompt = "당신은 학생들의 문제지 오답 노트를 만드는 인공지능 교사입니다.\n"
        "제공된 텍스트(OCR 결과)를 보고 문제와 해설을 올바르게 복원해야 합니다.\n"
        "요구사항:\n"
        "1. 과목(수학, 과학, 영어, 국어, 사회, 기타 등)을 판단해 'subject' 필드에 분류해 주세요. (한 단어)\n"
        "2. 문제를 문맥에 맞게 보정하고, 수식이나 기호는 LaTeX 포맷(\\(수식\\) 혹은 \\[수식\\])으로 변환하여 'problem' 필드에 작성해 주세요.\n"
        "3. 만약 해설이나 정답이 명확하지 않다면 직접 정답과 상세한 풀이 과정을 작성하여 'solution' 필드에 적어주세요. 풀이 수식도 LaTeX로 감싸주세요.\n"
        "반드시 JSON 형식으로만 응답해 주세요.\n"
        "JSON 구조: {\"subject\": \"...\", \"problem\": \"...\", \"solution\": \"...\"}";

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $apiKey',
        },
        body: jsonEncode({
          'model': modelName,
          'messages': [
            {'role': 'system', 'content': systemPrompt},
            {'role': 'user', 'content': text}
          ],
          'temperature': 0.3,
        }),
      ).timeout(const Duration(seconds: 90));

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        final content = jsonResponse['choices'][0]['message']['content'] as String;
        return _extractJsonMap(content);
      } else {
        debugPrint('processOcrForWrongNote API error: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('processOcrForWrongNote error: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> processOcrForWrongNoteImage(String rawBase64Image) async {
    // image/jpg -> image/jpeg 및 데이터 URI 규격 표준화
    String base64Image = rawBase64Image.trim();
    if (base64Image.startsWith('data:image/jpg;')) {
      base64Image = base64Image.replaceFirst('data:image/jpg;', 'data:image/jpeg;');
    } else if (!base64Image.startsWith('data:image/')) {
      base64Image = 'data:image/jpeg;base64,$base64Image';
    }
    final apiKey = await _getVisionApiKey();
    final endpoint = await _getVisionEndpoint();
    final modelName = await _getVisionModel();

    if (apiKey == null || apiKey.isEmpty) return null;

    final systemPrompt = "당신은 학생들의 문제지 오답 노트를 만드는 인공지능 교사입니다.\n"
        "제공된 이미지를 보고 문제와 해설을 올바르게 복원해야 합니다.\n"
        "요구사항:\n"
        "1. 과목(수학, 과학, 영어, 국어, 사회, 기타 등)을 판단해 'subject' 필드에 분류해 주세요. (한 단어)\n"
        "2. 이미지 안의 문제를 문맥에 맞게 보정하고, 수식이나 기호는 LaTeX 포맷(\\(\\수식\\) 혹은 \\[\\수식\\])으로 변환하여 'problem' 필드에 작성해 주세요.\n"
        "3. 만약 해설이나 정답이 명확하지 않다면 직접 정답과 상세한 풀이 과정을 작성하여 'solution' 필드에 적어주세요. 풀이 수식도 LaTeX로 감싸주세요.\n"
        "반드시 JSON 형식으로만 응답해 주세요. 마크다운 ```json 코드 블록은 있어도 상관없습니다.\n"
        "JSON 구조: {\"subject\": \"...\", \"problem\": \"...\", \"solution\": \"...\"}";

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $apiKey',
        },
        body: jsonEncode({
          'model': modelName,
          'messages': [
            {'role': 'system', 'content': systemPrompt},
            {
              'role': 'user',
              'content': [
                {'type': 'text', 'text': '이 문제 이미지를 JSON 오답 노트 포맷으로 만들어주세요.'},
                {
                  'type': 'image_url',
                  'image_url': {'url': base64Image}
                }
              ]
            }
          ],
          'temperature': 0.3,
        }),
      );

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        final content = jsonResponse['choices'][0]['message']['content'] as String;
        return _extractJsonMap(content);
      }
    } catch (e) {
      debugPrint('processOcrForWrongNoteImage error: $e');
    }
    return null;
  }
}