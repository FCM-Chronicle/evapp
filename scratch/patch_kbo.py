import os

lib_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\lib"
web_src_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\evweb\src"

# 1. Patch sports_service.dart
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

    if (sportType == 'baseball') {
      await _generateKboBriefing(rawTeamName);
    } else {
      await _generateFootballBriefing(rawTeamName, prefs);
    }
  }

  /// KBO 한국프로야구 브리핑 (네이버 오픈 게이트웨이 활용 - API 키 불필요)
  static Future<void> _generateKboBriefing(String targetTeamName) async {
    try {
      final now = DateTime.now();
      // 어제 날짜 기준 조회
      final yesterday = now.subtract(const Duration(days: 1));
      final dateStr = "${yesterday.year}-${yesterday.month.toString().padLeft(2, '0')}-${yesterday.day.toString().padLeft(2, '0')}";

      final url = "https://api-gw.sports.naver.com/schedule/games?fields=basic,schedule,superMatch,baseball&fromDate=$dateStr&toDate=$dateStr&upperCategoryId=kbaseball&category=kbo";
      final headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://m.sports.naver.com/'
      };

      final response = await http.get(Uri.parse(url), headers: headers).timeout(const Duration(seconds: 5));
      if (response.statusCode != 200) {
        debugPrint('KBO schedule fetch failed: ${response.statusCode}');
        return;
      }

      final data = jsonDecode(response.body);
      final games = data['result']?['games'] as List?;
      if (games == null || games.isEmpty) {
        debugPrint('No KBO games found for $dateStr');
        return;
      }

      // 사용자가 지정한 팀 경기 찾기
      Map<String, dynamic>? targetGame;
      for (var g in games) {
        final home = g['homeTeamName']?.toString() ?? '';
        final away = g['awayTeamName']?.toString() ?? '';
        if (home.contains(targetTeamName) || away.contains(targetTeamName) || targetTeamName.contains(home) || targetTeamName.contains(away)) {
          targetGame = g as Map<String, dynamic>;
          break;
        }
      }

      if (targetGame == null) {
        debugPrint('No game for team $targetTeamName on $dateStr');
        return;
      }

      final gameId = targetGame['gameId'];
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

      // 세부 기록 (결승타, 홈런, 장타 등) 조회
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
                etcRecordsText += "- $how: $result\\n";
              }
            }
          }
        } catch (e) {
          debugPrint('KBO record fetch error: $e');
        }
      }

      final prompt = "다음은 어제($dateStr) 열린 KBO 프로야구 [$targetTeamName] 경기 결과 및 공식 기록입니다.\\n\\n"
          "■ 경기 기본 정보: $awayTeam $awayScore vs $homeScore $homeTeam ($stadium 구장)\\n"
          "■ 승리팀: $winner\\n"
          "■ 선발 투수: $awayTeam($awayStarter) vs $homeTeam($homeStarter)\\n"
          "■ 투수 결정: 승리($winPitcher) / 패전($losePitcher) / 세이브($savePitcher)\\n\\n"
          "■ 주요 타격 및 특이 기록:\\n$etcRecordsText\\n\\n"
          "위 데이터를 바탕으로 사용자에게 보낼 아침 KBO 경기 브리핑을 다음 양식으로 작성해주세요:\\n"
          "⚾ [KBO] $dateStr $targetTeamName 경기 결과\\n\\n"
          "■ 경기 스코어 ($stadium 구장)\\n"
          "■ 투수 기록\\n"
          "■ 주요 타격 & 홈런 기록\\n"
          "■ 핵심 활약 한줄 요약";

      final briefing = await LlmService.generateProactiveResponse(prompt);
      if (briefing != null && briefing.isNotEmpty) {
        await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': briefing}]);
        await NotificationService.showNotification("⚾ KBO 모닝 브리핑", briefing);
      }
    } catch (e) {
      debugPrint('KBO briefing error: $e');
    }
  }

  /// 축구 브리핑 (API-Football & Firecrawl)
  static Future<void> _generateFootballBriefing(String rawTeamName, SharedPreferences prefs) async {
    final apiKey = prefs.getString('API_FOOTBALL_KEY')?.trim();
    if (apiKey == null || apiKey.isEmpty) return;

    final String lookupName = _koreanTeamMap[rawTeamName] ??
        _koreanTeamMap[rawTeamName.replaceAll(' ', '')] ??
        rawTeamName.toLowerCase();

    try {
      // 1. Search for team ID
      final teamRes = await http.get(
        Uri.parse('https://v3.football.api-sports.io/teams?search=$lookupName'),
        headers: {'x-apisports-key': apiKey},
      );
      
      if (teamRes.statusCode != 200) return;
      final teamData = jsonDecode(teamRes.body);
      if (teamData['results'] == 0) return;
      final teamId = teamData['response'][0]['team']['id'];
      final actualTeamName = teamData['response'][0]['team']['name'];

      // 2. Get last fixture
      final fixRes = await http.get(
        Uri.parse('https://v3.football.api-sports.io/fixtures?team=$teamId&last=1'),
        headers: {'x-apisports-key': apiKey},
      );
      if (fixRes.statusCode != 200) return;
      final fixData = jsonDecode(fixRes.body);
      if (fixData['results'] == 0) return;
      
      final fixture = fixData['response'][0];
      final dateStr = fixture['fixture']['date'];
      final fixtureDate = DateTime.parse(dateStr);
      
      // Check if match is recent (within 36 hours)
      if (DateTime.now().difference(fixtureDate).inHours > 36) {
        debugPrint('No recent football match for $actualTeamName');
        return; 
      }

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
                statsSummary += "우리팀 선수 평점:\\n";
                for (var playerObj in teamObj['players']) {
                    final name = playerObj['player']['name'];
                    final rating = playerObj['statistics'][0]['games']['rating'] ?? 'N/A';
                    statsSummary += "- $name: $rating\\n";
                }
            }
        }
      }

      // 4. Tactical column / article scraping via Firecrawl API
      final firecrawlKey = prefs.getString('FIRECRAWL_API_KEY')?.trim();
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
              'searchOptions': {'limit': 2},
              'pageOptions': {'fetchPageContent': true}
            }),
          ).timeout(const Duration(seconds: 8));

          if (fcRes.statusCode == 200) {
            final fcData = jsonDecode(fcRes.body);
            final dataList = fcData['data'] as List?;
            if (dataList != null && dataList.isNotEmpty) {
              for (var item in dataList) {
                final title = item['title'] ?? '전술 칼럼';
                String md = item['markdown'] ?? item['description'] ?? '';
                if (md.length > 1200) md = md.substring(0, 1200) + '...';
                tacticalColumnContext += "### [$title](${item['url'] ?? ''})\\n$md\\n\\n";
              }
            }
          }
        } catch (e) {
          debugPrint('Firecrawl error: $e');
        }
      }

      if (tacticalColumnContext.trim().isEmpty) {
        try {
          final searchRes = await SearchService.search('$homeTeam vs $awayTeam match tactical analysis The Athletic Sky Sports');
          final results = searchRes['results'] as List<SearchResultItem>?;
          if (results != null && results.isNotEmpty) {
            for (var item in results) {
              String snippet = item.snippet;
              if (snippet.length > 800) snippet = snippet.substring(0, 800) + '...';
              tacticalColumnContext += "- [${item.title}]\\n  $snippet\\n\\n";
            }
          }
        } catch (e) {
          debugPrint('Sports search fallback error: $e');
        }
      }

      // 5. Ask LLM to synthesize
      final prompt = "다음은 $actualTeamName 의 최근 경기 결과입니다.\\n"
          "$statsSummary\\n\\n"
          "다음은 해당 경기에 대한 해외 매체의 전술 분석 기사 내용입니다:\\n"
          "$tacticalColumnContext\\n\\n"
          "위 데이터를 융합하여 다음 양식으로 브리핑을 작성해주세요:\\n"
          "★중요★ 마크다운 표 형식으로 깔끔하게 만들어주세요.\\n"
          "[경기 스코어 및 득점자]\\n"
          "[선수별 주요 평점 표 (전체 선수가 너무 많으면 핵심 4~5명만 표 형식으로)]\\n"
          "[핵심 전술 포인트 3가지]";

      final briefing = await LlmService.generateProactiveResponse(prompt);
      if (briefing != null && briefing.isNotEmpty) {
        await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': briefing}]);
        await NotificationService.showNotification("⚽ 스포츠 모닝 브리핑", briefing);
      }
    } catch (e) {
      debugPrint('SportsService football error: $e');
    }
  }
}
"""

sports_path = os.path.join(lib_dir, "sports_service.dart")
with open(sports_path, 'w', encoding='utf-8') as f:
    f.write(sports_service_code)


# 2. Patch main.dart
main_path = os.path.join(lib_dir, "main.dart")
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

# update sports_settings_sync in app_ready
old_main_sync = """        _sendToReact('sports_settings_sync', {
          'apiKey': prefs.getString('API_FOOTBALL_KEY') ?? '',
          'firecrawlKey': prefs.getString('FIRECRAWL_API_KEY') ?? '',
          'teamName': prefs.getString('SPORTS_TEAM_NAME') ?? '',
          'active': prefs.getBool('SPORTS_ACTIVE') ?? false,
        });"""

new_main_sync = """        _sendToReact('sports_settings_sync', {
          'sportType': prefs.getString('SPORTS_TYPE') ?? 'football',
          'apiKey': prefs.getString('API_FOOTBALL_KEY') ?? '',
          'firecrawlKey': prefs.getString('FIRECRAWL_API_KEY') ?? '',
          'teamName': prefs.getString('SPORTS_TEAM_NAME') ?? '',
          'active': prefs.getBool('SPORTS_ACTIVE') ?? false,
        });"""

if old_main_sync in main_content:
    main_content = main_content.replace(old_main_sync, new_main_sync)

# update save_sports_settings
old_save_sports = """      } else if (action == 'save_sports_settings') {
        final apiKey = payload['apiKey'];
        final firecrawlKey = payload['firecrawlKey'];
        final teamName = payload['teamName'];
        final active = payload['active'];
        final prefs = await SharedPreferences.getInstance();
        if (apiKey != null) await prefs.setString('API_FOOTBALL_KEY', apiKey);
        if (firecrawlKey != null) await prefs.setString('FIRECRAWL_API_KEY', firecrawlKey);
        if (teamName != null) await prefs.setString('SPORTS_TEAM_NAME', teamName);
        if (active != null) await prefs.setBool('SPORTS_ACTIVE', active);"""

new_save_sports = """      } else if (action == 'save_sports_settings') {
        final sportType = payload['sportType'];
        final apiKey = payload['apiKey'];
        final firecrawlKey = payload['firecrawlKey'];
        final teamName = payload['teamName'];
        final active = payload['active'];
        final prefs = await SharedPreferences.getInstance();
        if (sportType != null) await prefs.setString('SPORTS_TYPE', sportType);
        if (apiKey != null) await prefs.setString('API_FOOTBALL_KEY', apiKey);
        if (firecrawlKey != null) await prefs.setString('FIRECRAWL_API_KEY', firecrawlKey);
        if (teamName != null) await prefs.setString('SPORTS_TEAM_NAME', teamName);
        if (active != null) await prefs.setBool('SPORTS_ACTIVE', active);"""

if old_save_sports in main_content:
    main_content = main_content.replace(old_save_sports, new_save_sports)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_content)


# 3. Patch evweb/src/index.jsx (SportsSettingsScreen with Football & Baseball tabs)
index_path = os.path.join(web_src_dir, "index.jsx")
with open(index_path, 'r', encoding='utf-8') as f:
    index_content = f.read()

new_sports_screen_code = """function SportsSettingsScreen({ onBack }) {
    const scale = window.innerWidth / 393;
    const [sportType, setSportType] = useState("football"); // "football" | "baseball"
    const [apiKey, setApiKey] = useState("");
    const [firecrawlKey, setFirecrawlKey] = useState("");
    const [teamName, setTeamName] = useState("");
    const [active, setActive] = useState(false);

    const kboTeams = ["KIA", "한화", "LG", "삼성", "두산", "SSG", "KT", "롯데", "NC", "키움"];

    useEffect(() => {
        const handleSync = (e) => {
            const { action, payload } = e.detail;
            if (action === "sports_settings_sync") {
                if (payload.sportType) setSportType(payload.sportType);
                setApiKey(payload.apiKey || "");
                setFirecrawlKey(payload.firecrawlKey || "");
                setTeamName(payload.teamName || "");
                setActive(payload.active || false);
            }
        };
        window.addEventListener("ev-native-event", handleSync);
        sendToFlutter("get_sports_settings", {});
        return () => window.removeEventListener("ev-native-event", handleSync);
    }, []);

    const handleSave = () => {
        sendToFlutter("save_sports_settings", { sportType, apiKey, firecrawlKey, teamName, active });
        alert("스포츠 알림 설정이 저장되었습니다.");
    };

    const Section = ({ title, children }) => (
        <div className="flex flex-col gap-3 p-4 mb-4 rounded-lg" style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)" }}>
            <span style={{ ...mono, color: C.lime, fontSize: 11 * scale }}>{title}</span>
            {children}
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="스포츠 알림 설정" />
            <div className="flex-1 px-4 py-5 flex flex-col">
                <Section title="매일 아침 7시 스포츠 브리핑">
                    <div className="flex items-center justify-between mb-2">
                        <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>기능 활성화 (On/Off)</span>
                        <button 
                            onClick={() => setActive(!active)}
                            style={{ padding: `${4*scale}px ${12*scale}px`, border: `1px solid ${active ? C.lime : C.slate}`, color: active ? C.lime : C.slate, borderRadius: 4 }}
                        >
                            {active ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>브리핑 종목 선택</span>
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setSportType("football")}
                            className="flex-1 py-2 text-center rounded"
                            style={{
                                border: `1px solid ${sportType === "football" ? C.accent : C.panelBorder}`,
                                background: sportType === "football" ? "rgba(99,102,241,0.15)" : "transparent",
                                color: sportType === "football" ? C.accent : C.slate,
                                ...mono,
                                fontSize: 11 * scale
                            }}
                        >
                            ⚽ 축구 (EPL/해외)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSportType("baseball")}
                            className="flex-1 py-2 text-center rounded"
                            style={{
                                border: `1px solid ${sportType === "baseball" ? C.lime : C.panelBorder}`,
                                background: sportType === "baseball" ? "rgba(163,230,53,0.15)" : "transparent",
                                color: sportType === "baseball" ? C.lime : C.slate,
                                ...mono,
                                fontSize: 11 * scale
                            }}
                        >
                            ⚾ 야구 (KBO 리그)
                        </button>
                    </div>

                    {sportType === "baseball" ? (
                        <>
                            <div className="p-3 rounded mb-2" style={{ background: "rgba(163,230,53,0.06)", border: `1px solid rgba(163,230,53,0.2)` }}>
                                <span style={{ ...mono, color: C.lime, fontSize: 9.5 * scale }}>
                                    ✓ KBO 야구는 네이버 스포츠 오픈 게이트웨이를 사용하여 API 키 없이 100% 무료로 동작합니다.
                                </span>
                            </div>

                            <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>응원 구단 선택 (또는 직접 입력)</span>
                            <div className="flex flex-wrap gap-1.5 mb-2">
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
                            />
                        </>
                    ) : (
                        <>
                            <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>API-Football KEY</span>
                            <input
                                value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API-Football Key 입력..."
                                className="w-full bg-transparent outline-none"
                                style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                            />

                            <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>Firecrawl API KEY (전술 칼럼 크롤링용)</span>
                            <input
                                value={firecrawlKey} onChange={(e) => setFirecrawlKey(e.target.value)} placeholder="fc-... (입력 시 The Athletic/Sky 기사 전문 수집)"
                                className="w-full bg-transparent outline-none"
                                style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                            />

                            <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>응원하는 축구팀 (예: 토트넘, 손흥민, 아스널)</span>
                            <input
                                value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="팀 이름 한글 또는 영문 입력..."
                                className="w-full bg-transparent outline-none"
                                style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                            />
                        </>
                    )}
                </Section>

                <button
                    onClick={handleSave}
                    className="flex items-center justify-center mt-2"
                    style={{ padding: `${12 * scale}px`, border: `1px solid ${C.accent}`, color: C.accent, ...mono, fontSize: 12 * scale, letterSpacing: 1, gap: 8 * scale }}
                >
                    <Save size={14 * scale} /> 설정 저장하기
                </button>
            </div>
        </div>
    );
}"""

# Find and replace old SportsSettingsScreen
start_idx = index_content.find("function SportsSettingsScreen({ onBack }) {")
if start_idx != -1:
    end_idx = index_content.find("/* ------------------------------------------------------------------ */\n/* 화면 2-1: API", start_idx)
    if end_idx != -1:
        index_content = index_content[:start_idx] + new_sports_screen_code + "\n\n" + index_content[end_idx:]

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_content)

print("Patch KBO applied successfully.")

