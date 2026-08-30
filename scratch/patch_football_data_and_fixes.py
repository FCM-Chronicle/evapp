import os

lib_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\lib"
web_src_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\evweb\src"

# 1. Update background_service.dart with SharedPreferences persistent dates
bg_path = os.path.join(lib_dir, "background_service.dart")
with open(bg_path, 'r', encoding='utf-8') as f:
    bg_content = f.read()

# Replace in-memory check with SharedPreferences persistent check
old_bg_loop = """  final Map<String, DateTime> _lastScheduleTriggers = {};
  DateTime? _lastDDayPush;
  DateTime? _lastNightRoutine;
  DateTime? _lastTodoReset;
  DateTime? _lastSportsBriefing;

  Timer.periodic(const Duration(minutes: 1), (timer) async {
    final now = DateTime.now();

    // 1. Check schedule.json"""

new_bg_loop = """  final Map<String, DateTime> _lastScheduleTriggers = {};

  Timer.periodic(const Duration(minutes: 1), (timer) async {
    final now = DateTime.now();
    final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final prefs = await SharedPreferences.getInstance();

    // 1. Check schedule.json"""

if old_bg_loop in bg_content:
    bg_content = bg_content.replace(old_bg_loop, new_bg_loop)

old_dday = """    // 2. D-Day Smart Push (09:00)
    if (now.hour == 9 && now.minute == 0) {
      if (_lastDDayPush == null || _lastDDayPush!.day != now.day) {
        _lastDDayPush = now;"""

new_dday = """    // 2. D-Day Smart Push (09:00)
    if (now.hour == 9 && now.minute == 0) {
      if (prefs.getString('LAST_DDAY_PUSH_DATE') != todayStr) {
        await prefs.setString('LAST_DDAY_PUSH_DATE', todayStr);"""

if old_dday in bg_content:
    bg_content = bg_content.replace(old_dday, new_dday)

old_todo_reset = """    // 2.5 Todo Daily Reset (02:00)
    if (now.hour == 2 && now.minute == 0) {
      if (_lastTodoReset == null || _lastTodoReset!.day != now.day) {
        _lastTodoReset = now;
        await LocalStorageService.resetTodoDaily();"""

new_todo_reset = """    // 2.5 Todo Daily Reset (02:00)
    if (now.hour == 2 && now.minute == 0) {
      if (prefs.getString('LAST_TODO_RESET_DATE') != todayStr) {
        await prefs.setString('LAST_TODO_RESET_DATE', todayStr);
        await LocalStorageService.resetTodoDaily();"""

if old_todo_reset in bg_content:
    bg_content = bg_content.replace(old_todo_reset, new_todo_reset)

old_sports_trigger = """    // 4. Sports Morning Briefing (07:00)
    if (now.hour == 7 && now.minute == 0) {
      if (_lastSportsBriefing == null || _lastSportsBriefing!.day != now.day) {
        _lastSportsBriefing = now;
        await SportsService.generateMorningBriefing();
      }
    }"""

new_sports_trigger = """    // 4. Sports Morning Briefing (07:00)
    if (now.hour == 7 && now.minute == 0) {
      if (prefs.getString('LAST_SPORTS_DATE') != todayStr) {
        await prefs.setString('LAST_SPORTS_DATE', todayStr);
        await SportsService.generateMorningBriefing();
      }
    }"""

if old_sports_trigger in bg_content:
    bg_content = bg_content.replace(old_sports_trigger, new_sports_trigger)

old_night_trigger = """    // 3. Night Routine Check-in (00:30)
    if (now.hour == 0 && now.minute == 30) {
      if (_lastNightRoutine == null || _lastNightRoutine!.day != now.day) {
        _lastNightRoutine = now;"""

new_night_trigger = """    // 3. Night Routine Check-in (00:30)
    if (now.hour == 0 && now.minute == 30) {
      if (prefs.getString('LAST_NIGHT_ROUTINE_DATE') != todayStr) {
        await prefs.setString('LAST_NIGHT_ROUTINE_DATE', todayStr);"""

if old_night_trigger in bg_content:
    bg_content = bg_content.replace(old_night_trigger, new_night_trigger)

with open(bg_path, 'w', encoding='utf-8') as f:
    f.write(bg_content)


# 2. Update sports_service.dart with Football-Data.org and KBO rest-day notifications
sports_path = os.path.join(lib_dir, "sports_service.dart")
sports_service_code = """import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'llm_service.dart';
import 'local_storage_service.dart';
import 'notification_service.dart';

class SportsService {
  // Football-Data.org (영구 무료 플랜) 전세계 주요 클럽 Team ID 매핑
  static final Map<String, int> _footballDataTeamIdMap = {
    '토트넘': 73,
    '토트넘 홋스퍼': 73,
    'tottenham': 73,
    'tottenham hotspur': 73,
    '손흥민': 73,
    '아스널': 57,
    '아스날': 57,
    'arsenal': 57,
    '첼시': 61,
    'chelsea': 61,
    '리버풀': 64,
    'liverpool': 64,
    '맨시티': 65,
    '맨체스터 시티': 65,
    'manchester city': 65,
    '맨유': 66,
    '맨체스터 유나이티드': 66,
    'manchester united': 66,
    '뉴캐슬': 67,
    'newcastle': 67,
    '울버햄튼': 76,
    'wolverhampton': 76,
    '황희찬': 76,
    '레알': 86,
    '레알 마드리드': 86,
    'real madrid': 86,
    '바르샤': 81,
    '바르셀로나': 81,
    'barcelona': 81,
    '아틀레티코': 78,
    'atletico madrid': 78,
    '바이에른 뮌헨': 5,
    '뮌헨': 5,
    'bayern munich': 5,
    '김민재': 5,
    '도르트문트': 4,
    'dortmund': 4,
    '레버쿠젠': 3,
    'leverkusen': 3,
    '파리': 524,
    'psg': 524,
    'paris saint-germain': 524,
    '이강인': 524,
    '밀란': 98,
    'ac milan': 98,
    '인터밀란': 108,
    'inter': 108,
    '유벤투스': 109,
    'juventus': 109,
  };

  static Future<void> generateMorningBriefing() async {
    final prefs = await SharedPreferences.getInstance();
    final isActive = prefs.getBool('SPORTS_ACTIVE') ?? false;
    final sportType = prefs.getString('SPORTS_TYPE') ?? 'football';
    final rawTeamName = prefs.getString('SPORTS_TEAM_NAME')?.trim();

    if (isActive != true || rawTeamName == null || rawTeamName.isEmpty) {
      return; // Disabled or no team configured
    }

    final teamList = rawTeamName
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    if (teamList.isEmpty) return;

    if (sportType == 'baseball') {
      await _generateKboMultiBriefing(teamList);
    } else {
      await _generateFootballDataBriefing(teamList, prefs);
    }
  }

  /// KBO 한국프로야구 다중 팀 브리핑 (네이버 오픈 게이트웨이 활용)
  static Future<void> _generateKboMultiBriefing(List<String> teamList) async {
    try {
      final now = DateTime.now();
      final yesterday = now.subtract(const Duration(days: 1));
      final dateStr = "${yesterday.year}-${yesterday.month.toString().padLeft(2, '0')}-${yesterday.day.toString().padLeft(2, '0')}";

      final url = "https://api-gw.sports.naver.com/schedule/games?fields=basic,schedule,superMatch,baseball&fromDate=$dateStr&toDate=$dateStr&upperCategoryId=kbaseball&category=kbo";
      final headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://m.sports.naver.com/'
      };

      final response = await http.get(Uri.parse(url), headers: headers).timeout(const Duration(seconds: 5));
      if (response.statusCode != 200) return;

      final data = jsonDecode(response.body);
      final games = data['result']?['games'] as List?;
      if (games == null || games.isEmpty) {
        // 비시즌 또는 월요일 휴식일 안내
        await NotificationService.showNotification("⚾ KBO 모닝 알림", "어제는 KBO 정기 휴식일이거나 경기 일정이 없는 날이었습니다.");
        return;
      }

      final Set<String> processedGameIds = {};
      String combinedGameSummaries = "";

      for (var targetTeam in teamList) {
        Map<String, dynamic>? targetGame;
        for (var g in games) {
          final home = g['homeTeamName']?.toString() ?? '';
          final away = g['awayTeamName']?.toString() ?? '';
          if (home.contains(targetTeam) || away.contains(targetTeam) || targetTeam.contains(home) || targetTeam.contains(away)) {
            targetGame = g as Map<String, dynamic>;
            break;
          }
        }

        if (targetGame == null) continue;
        final gameId = targetGame['gameId']?.toString();
        if (gameId != null && processedGameIds.contains(gameId)) continue;
        if (gameId != null) processedGameIds.add(gameId);

        final homeTeam = targetGame['homeTeamName'] ?? '';
        final awayTeam = targetGame['awayTeamName'] ?? '';
        final homeScore = targetGame['homeTeamScore'] ?? 0;
        final awayScore = targetGame['awayTeamScore'] ?? 0;
        final stadium = targetGame['stadium'] ?? '';
        final winner = targetGame['winner'] ?? '';
        final winPitcher = targetGame['winPitcherName'] ?? '없음';
        final losePitcher = targetGame['losePitcherName'] ?? '없음';
        final savePitcher = targetGame['savePitcherName'] ?? '없음';
        final homeStarter = targetGame['homeStarterName'] ?? '';
        final awayStarter = targetGame['awayStarterName'] ?? '';

        String etcRecordsText = "";
        if (gameId != null) {
          try {
            final recordUrl = "https://api-gw.sports.naver.com/schedule/games/$gameId/record";
            final recordRes = await http.get(Uri.parse(recordUrl), headers: headers).timeout(const Duration(seconds: 4));
            if (recordRes.statusCode == 200) {
              final recordData = jsonDecode(recordRes.body);
              final etcRecords = recordData['result']?['recordData']?['etcRecords'] as List?;
              if (etcRecords != null && etcRecords.isNotEmpty) {
                for (var r in etcRecords) {
                  final how = r['how'] ?? '';
                  final result = r['result'] ?? '';
                  etcRecordsText += "  - $how: $result\\n";
                }
              }
            }
          } catch (e) {
            debugPrint('KBO record fetch error: $e');
          }
        }

        combinedGameSummaries += "\\n--- [$homeTeam vs $awayTeam 경기 데이터] ---\\n"
            "• 스코어: $awayTeam $awayScore vs $homeScore $homeTeam ($stadium 구장)\\n"
            "• 승리팀: $winner\\n"
            "• 선발 투수: $awayTeam($awayStarter) vs $homeTeam($homeStarter)\\n"
            "• 투수 결정: 승리($winPitcher) / 패전($losePitcher) / 세이브($savePitcher)\\n"
            "• 주요 타격/홈런 기록:\\n$etcRecordsText\\n";
      }

      if (combinedGameSummaries.trim().isEmpty) {
        await NotificationService.showNotification("⚾ KBO 모닝 알림", "어제는 등록하신 구단들의 경기 일정이 없었습니다.");
        return;
      }

      final prompt = "다음은 어제($dateStr) 열린 KBO 프로야구 관심 구단들의 경기 결과 및 공식 기록입니다:\\n"
          "$combinedGameSummaries\\n\\n"
          "위 데이터를 바탕으로 사용자에게 보낼 아침 KBO 종합 경기 브리핑을 작성해주세요.\\n"
          "팀이 여러 개라면 팀별로 보기 좋게 구분해서 작성해주세요.\\n"
          "포맷:\\n"
          "⚾ [KBO] $dateStr 모닝 경기 브리핑\\n"
          "(각 경기별: 경기 스코어 / 투수 기록 / 주요 타격 & 홈런 / 한줄 요약)";

      final briefing = await LlmService.generateProactiveResponse(prompt);
      if (briefing != null && briefing.isNotEmpty) {
        await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': briefing}]);
        await NotificationService.showNotification("⚾ KBO 모닝 브리핑", briefing);
      }
    } catch (e) {
      debugPrint('KBO multi-briefing error: $e');
    }
  }

  /// 축구 브리핑: Football-Data.org (영구 무료 12개 리그) + Firecrawl 전술 칼럼 크롤링
  static Future<void> _generateFootballDataBriefing(List<String> teamList, SharedPreferences prefs) async {
    final token = prefs.getString('API_FOOTBALL_KEY')?.trim();
    if (token == null || token.isEmpty) {
      debugPrint('Football-Data.org token not set.');
      return;
    }

    final firecrawlKey = prefs.getString('FIRECRAWL_API_KEY')?.trim();
    String combinedFootballContext = "";

    try {
      for (var rawTeamName in teamList) {
        final cleanKey = rawTeamName.toLowerCase().replaceAll(' ', '');
        final teamId = _footballDataTeamIdMap[rawTeamName] ??
            _footballDataTeamIdMap[cleanKey] ??
            _footballDataTeamIdMap[rawTeamName.toLowerCase()];

        if (teamId == null) {
          debugPrint('Team ID not found for: $rawTeamName');
          continue;
        }

        // Football-Data.org: 최신 경기 조회
        final url = Uri.parse('https://api.football-data.org/v4/teams/$teamId/matches?status=FINISHED&limit=1');
        final matchRes = await http.get(url, headers: {
          'X-Auth-Token': token,
        }).timeout(const Duration(seconds: 6));

        if (matchRes.statusCode != 200) {
          debugPrint('Football-Data.org request failed (${matchRes.statusCode}) for $rawTeamName');
          continue;
        }

        final matchData = jsonDecode(matchRes.body);
        final matches = matchData['matches'] as List?;
        if (matches == null || matches.isEmpty) continue;

        final match = matches[0];
        final compName = match['competition']?['name'] ?? '리그 경기';
        final homeTeamName = match['homeTeam']?['name'] ?? '';
        final awayTeamName = match['awayTeam']?['name'] ?? '';
        final homeScore = match['score']?['fullTime']?['home'] ?? 0;
        final awayScore = match['score']?['fullTime']?['away'] ?? 0;
        final halfHome = match['score']?['halfTime']?['home'] ?? 0;
        final halfAway = match['score']?['halfTime']?['away'] ?? 0;
        final dateStr = match['utcDate']?.toString().split('T').first ?? '';

        // Firecrawl: 해당 매치업 심층 전술 분석 기사 전문 수집
        String tacticalArticleContext = "";
        if (firecrawlKey != null && firecrawlKey.isNotEmpty) {
          try {
            final fcRes = await http.post(
              Uri.parse('https://api.firecrawl.dev/v1/search'),
              headers: {
                'Authorization': 'Bearer $firecrawlKey',
                'Content-Type': 'application/json',
              },
              body: jsonEncode({
                'query': '$homeTeamName vs $awayTeamName tactical analysis The Athletic OR Sky Sports OR BBC Sport',
                'searchOptions': {'limit': 1},
                'pageOptions': {'fetchPageContent': true}
              }),
            ).timeout(const Duration(seconds: 7));

            if (fcRes.statusCode == 200) {
              final fcData = jsonDecode(fcRes.body);
              final dataList = fcData['data'] as List?;
              if (dataList != null && dataList.isNotEmpty) {
                for (var item in dataList) {
                  final title = item['title'] ?? '전술 칼럼';
                  String md = item['markdown'] ?? item['description'] ?? '';
                  if (md.length > 900) md = md.substring(0, 900) + '...';
                  tacticalArticleContext += "  - [$title] $md\\n";
                }
              }
            }
          } catch (e) {
            debugPrint('Firecrawl error for $rawTeamName: $e');
          }
        }

        combinedFootballContext += "\\n--- [$rawTeamName 경기 결과 ($compName)] ---\\n"
            "• 매치업: $homeTeamName $homeScore : $awayScore $awayTeamName (전반 $halfHome : $halfAway)\\n"
            "• 경기 일시: $dateStr\\n"
            "• 해외 전술 분석 기사 요약:\\n$tacticalArticleContext\\n";
      }

      if (combinedFootballContext.trim().isEmpty) {
        debugPrint('No finished matches found for configured football teams');
        return;
      }

      final prompt = "다음은 관심 해외 축구 구단들의 최근 경기 결과 및 해외 매체 전술 분석 기사 내용입니다:\\n"
          "$combinedFootballContext\\n\\n"
          "위 데이터를 융합하여 사용자에게 보낼 아침 축구 모닝 브리핑을 작성해주세요.\\n"
          "팀이 여러 개라면 팀별로 깔끔하게 구분하고, 경기 스코어와 전술 핵심 포인트 3가지를 마크다운으로 정리해주세요.";

      final briefing = await LlmService.generateProactiveResponse(prompt);
      if (briefing != null && briefing.isNotEmpty) {
        await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': briefing}]);
        await NotificationService.showNotification("⚽ 해외축구 모닝 브리핑", briefing);
      }
    } catch (e) {
      debugPrint('Football-Data.org briefing error: $e');
    }
  }
}
"""

with open(sports_path, 'w', encoding='utf-8') as f:
    f.write(sports_service_code)


# 3. Update React UI in index.jsx to label Football-Data.org token
index_path = os.path.join(web_src_dir, "index.jsx")
with open(index_path, 'r', encoding='utf-8') as f:
    index_content = f.read()

old_football_label = """                            <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>API-Football KEY</span>
                            <input
                                value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API-Football Key 입력..."
                                className="w-full bg-transparent outline-none"
                                style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                            />"""

new_football_label = """                            <div className="p-2.5 rounded mb-1" style={{ background: "rgba(99,102,241,0.06)", border: `1px solid rgba(99,102,241,0.2)` }}>
                                <span style={{ ...mono, color: C.accent, fontSize: 9.5 * scale }}>
                                    ✓ Football-Data.org (영구 무료 플랜) 토큰을 사용합니다. (EPL, 챔스, 라리가 등 지원)
                                </span>
                            </div>
                            <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>Football-Data.org API Token</span>
                            <input
                                value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Football-Data.org API Token (예: a1b2c3...)"
                                className="w-full bg-transparent outline-none"
                                style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                            />"""

if old_football_label in index_content:
    index_content = index_content.replace(old_football_label, new_football_label)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_content)

print("Patch Football-Data.org & persistent triggers applied successfully.")

