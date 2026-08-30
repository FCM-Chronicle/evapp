import os

lib_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\lib"
web_src_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\evweb\src"

# 1. Update sports_service.dart
sports_service_code = """import 'search_service.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'llm_service.dart';
import 'local_storage_service.dart';
import 'notification_service.dart';

class SportsService {
  static final Map<String, String> _koreanTeamMap = {
    '토트넘': 'tottenham',
    '토트넘 홋스퍼': 'tottenham',
    '아스널': 'arsenal',
    '아스날': 'arsenal',
    '첼시': 'chelsea',
    '맨시티': 'manchester city',
    '맨체스터 시티': 'manchester city',
    '맨유': 'manchester united',
    '맨체스터 유나이티드': 'manchester united',
    '리버풀': 'liverpool',
    '뮌헨': 'bayern munich',
    '바이에른 뮌헨': 'bayern munich',
    '레알': 'real madrid',
    '레알 마드리드': 'real madrid',
    '바르샤': 'barcelona',
    '바르셀로나': 'barcelona',
    '파리': 'paris saint germain',
    'psg': 'paris saint germain',
    '밀란': 'ac milan',
    '인터밀란': 'inter',
    '유벤투스': 'juventus',
    '아틀레티코': 'atletico madrid',
    '울버햄튼': 'wolverhampton',
    '황희찬': 'wolverhampton',
    '손흥민': 'tottenham',
    '이강인': 'paris saint germain',
    '김민재': 'bayern munich',
  };

  static Future<void> generateMorningBriefing() async {
    final prefs = await SharedPreferences.getInstance();
    final isActive = prefs.getBool('SPORTS_ACTIVE') ?? false;
    final sportType = prefs.getString('SPORTS_TYPE') ?? 'football';
    final rawTeamName = prefs.getString('SPORTS_TEAM_NAME')?.trim();

    if (isActive != true || rawTeamName == null || rawTeamName.isEmpty) {
      return; // Disabled or no team configured
    }

    // 쉼표(,)로 구분된 다중 팀 목록 분리 지원
    final teamList = rawTeamName
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    if (teamList.isEmpty) return;

    if (sportType == 'baseball') {
      await _generateKboMultiBriefing(teamList);
    } else {
      await _generateFootballMultiBriefing(teamList, prefs);
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
      if (games == null || games.isEmpty) return;

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
        debugPrint('No finished games found for teams: ${teamList.join(", ")}');
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

  /// 축구 다중 팀 브리핑 (API-Football & Firecrawl)
  static Future<void> _generateFootballMultiBriefing(List<String> teamList, SharedPreferences prefs) async {
    final apiKey = prefs.getString('API_FOOTBALL_KEY')?.trim();
    if (apiKey == null || apiKey.isEmpty) return;

    final firecrawlKey = prefs.getString('FIRECRAWL_API_KEY')?.trim();
    String combinedFootballContext = "";

    try {
      for (var rawTeamName in teamList) {
        final String lookupName = _koreanTeamMap[rawTeamName] ??
            _koreanTeamMap[rawTeamName.replaceAll(' ', '')] ??
            rawTeamName.toLowerCase();

        // 1. Search for team ID
        final teamRes = await http.get(
          Uri.parse('https://v3.football.api-sports.io/teams?search=$lookupName'),
          headers: {'x-apisports-key': apiKey},
        );
        if (teamRes.statusCode != 200) continue;
        final teamData = jsonDecode(teamRes.body);
        if (teamData['results'] == 0) continue;
        final teamId = teamData['response'][0]['team']['id'];
        final actualTeamName = teamData['response'][0]['team']['name'];

        // 2. Get last fixture
        final fixRes = await http.get(
          Uri.parse('https://v3.football.api-sports.io/fixtures?team=$teamId&last=1'),
          headers: {'x-apisports-key': apiKey},
        );
        if (fixRes.statusCode != 200) continue;
        final fixData = jsonDecode(fixRes.body);
        if (fixData['results'] == 0) continue;

        final fixture = fixData['response'][0];
        final dateStr = fixture['fixture']['date'];
        final fixtureDate = DateTime.parse(dateStr);

        // 최근 36시간 이내 경기만 취급
        if (DateTime.now().difference(fixtureDate).inHours > 36) continue;

        final fixId = fixture['fixture']['id'];
        final homeTeam = fixture['teams']['home']['name'];
        final awayTeam = fixture['teams']['away']['name'];
        final goalsHome = fixture['goals']['home'];
        final goalsAway = fixture['goals']['away'];

        // 3. Get Player Ratings & Stats
        final playerRes = await http.get(
          Uri.parse('https://v3.football.api-sports.io/fixtures/players?fixture=$fixId'),
          headers: {'x-apisports-key': apiKey},
        );
        String statsSummary = "스코어: $homeTeam $goalsHome - $goalsAway $awayTeam\\n";

        if (playerRes.statusCode == 200) {
          final playerData = jsonDecode(playerRes.body);
          for (var teamObj in playerData['response']) {
            if (teamObj['team']['id'] == teamId) {
              statsSummary += "선수 평점:\\n";
              for (var playerObj in teamObj['players']) {
                final name = playerObj['player']['name'];
                final rating = playerObj['statistics'][0]['games']['rating'] ?? 'N/A';
                statsSummary += "  - $name: $rating\\n";
              }
            }
          }
        }

        // 4. Tactical column / article scraping via Firecrawl API
        String tacticalColumnContext = "";
        if (firecrawlKey != null && firecrawlKey.isNotEmpty) {
          try {
            final fcRes = await http.post(
              Uri.parse('https://api.firecrawl.dev/v1/search'),
              headers: {
                'Authorization': 'Bearer $firecrawlKey',
                'Content-Type': 'application/json',
              },
              body: jsonEncode({
                'query': '$homeTeam vs $awayTeam tactical analysis The Athletic OR Sky Sports OR BBC Sport',
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
                  if (md.length > 800) md = md.substring(0, 800) + '...';
                  tacticalColumnContext += "  - [$title] $md\\n";
                }
              }
            }
          } catch (e) {
            debugPrint('Firecrawl error for $actualTeamName: $e');
          }
        }

        combinedFootballContext += "\\n--- [$actualTeamName 경기 결과] ---\\n"
            "$statsSummary"
            "전술 분석 기사 요약:\\n$tacticalColumnContext\\n";
      }

      if (combinedFootballContext.trim().isEmpty) {
        debugPrint('No recent football matches for configured teams');
        return;
      }

      final prompt = "다음은 관심 축구 구단들의 최근 경기 결과 및 전술 분석 기사 내용입니다:\\n"
          "$combinedFootballContext\\n\\n"
          "위 데이터를 융합하여 사용자에게 보낼 아침 축구 모닝 브리핑을 작성해주세요.\\n"
          "팀이 여러 개라면 팀별로 구분하여 스코어, 주요 선수 평점 표, 핵심 전술 포인트를 마크다운으로 작성해주세요.";

      final briefing = await LlmService.generateProactiveResponse(prompt);
      if (briefing != null && briefing.isNotEmpty) {
        await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': briefing}]);
        await NotificationService.showNotification("⚽ 스포츠 모닝 브리핑", briefing);
      }
    } catch (e) {
      debugPrint('Football multi-briefing error: $e');
    }
  }
}
"""

sports_path = os.path.join(lib_dir, "sports_service.dart")
with open(sports_path, 'w', encoding='utf-8') as f:
    f.write(sports_service_code)


# 2. Update React UI in index.jsx to support multiple team selection
index_path = os.path.join(web_src_dir, "index.jsx")
with open(index_path, 'r', encoding='utf-8') as f:
    index_content = f.read()

# Update handleTeamClick in SportsSettingsScreen
old_team_click = """                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {kboTeams.map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTeamName(t)}
                                        style={{
                                            padding: `${4 * scale}px ${8 * scale}px`,
                                            border: `1px solid ${teamName === t ? C.lime : C.panelBorder}`,
                                            background: teamName === t ? "rgba(163,230,53,0.2)" : "transparent",
                                            color: teamName === t ? C.lime : C.slate,
                                            borderRadius: 4,
                                            ...mono,
                                            fontSize: 10 * scale
                                        }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <input
                                value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="응원 구단명 (예: KIA, 한화, 삼성)..."
                                className="w-full bg-transparent outline-none"
                                style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                            />"""

new_team_click = """                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {kboTeams.map((t) => {
                                    const isSelected = teamName.split(',').map(s => s.trim()).includes(t);
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => {
                                                const currentList = teamName.split(',').map(s => s.trim()).filter(Boolean);
                                                if (isSelected) {
                                                    setTeamName(currentList.filter(item => item !== t).join(', '));
                                                } else {
                                                    setTeamName([...currentList, t].join(', '));
                                                }
                                            }}
                                            style={{
                                                padding: `${4 * scale}px ${8 * scale}px`,
                                                border: `1px solid ${isSelected ? C.lime : C.panelBorder}`,
                                                background: isSelected ? "rgba(163,230,53,0.2)" : "transparent",
                                                color: isSelected ? C.lime : C.slate,
                                                borderRadius: 4,
                                                ...mono,
                                                fontSize: 10 * scale
                                            }}
                                        >
                                            {isSelected ? `✓ ${t}` : t}
                                        </button>
                                    );
                                })}
                            </div>
                            <input
                                value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="응원 구단명 (다중 선택 시 쉼표로 구분: KIA, 한화, 삼성)..."
                                className="w-full bg-transparent outline-none"
                                style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                            />"""

if old_team_click in index_content:
    index_content = index_content.replace(old_team_click, new_team_click)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_content)

print("Patch multi-teams applied successfully.")

