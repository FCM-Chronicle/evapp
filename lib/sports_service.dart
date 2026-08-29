import 'search_service.dart';

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'llm_service.dart';
import 'local_storage_service.dart';
import 'notification_service.dart';

class SportsService {
  static Future<void> generateMorningBriefing() async {
    final prefs = await SharedPreferences.getInstance();
    final apiKey = prefs.getString('API_FOOTBALL_KEY')?.trim();
    final teamName = prefs.getString('SPORTS_TEAM_NAME')?.trim();
    final isActive = prefs.getBool('SPORTS_ACTIVE') ?? false;

    if (isActive != true || apiKey == null || apiKey.isEmpty || teamName == null || teamName.isEmpty) {
      return; // Not configured or disabled
    }

    try {
      // 1. Search for team ID
      final teamRes = await http.get(
        Uri.parse('https://v3.football.api-sports.io/teams?search=$teamName'),
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
      
      // Check if match is recent (within 36 hours for robustness)
      if (DateTime.now().difference(fixtureDate).inHours > 36) {
        debugPrint('No recent match for $actualTeamName');
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
      String statsSummary = "스코어: $homeTeam $goalsHome - $goalsAway $awayTeam\n";
      
      if (playerRes.statusCode == 200) {
        final playerData = jsonDecode(playerRes.body);
        for (var teamObj in playerData['response']) {
            if (teamObj['team']['id'] == teamId) {
                statsSummary += "우리팀 선수 평점:\n";
                for (var playerObj in teamObj['players']) {
                    final name = playerObj['player']['name'];
                    final rating = playerObj['statistics'][0]['games']['rating'] ?? 'N/A';
                    statsSummary += "- $name: $rating\n";
                }
            }
        }
      }


      // 4. Tactical analysis search (Naver / Tavily)
      String exaContext = "";
      try {
        final searchRes = await SearchService.search('$homeTeam vs $awayTeam match tactical analysis The Athletic Sky Sports');
        final results = searchRes['results'] as List<SearchResultItem>?;
        if (results != null && results.isNotEmpty) {
          for (var item in results) {
            String snippet = item.snippet;
            if (snippet.length > 800) snippet = snippet.substring(0, 800) + '...';
            exaContext += "- [${item.title}]\n  $snippet\n\n";
          }
        }
      } catch (e) {
        debugPrint('Sports tactical search error: $e');
      }

      // 5. Ask LLM to synthesize
      final prompt = "다음은 $actualTeamName 의 최근 경기 결과입니다.\n"
          "$statsSummary\n\n"
          "다음은 해당 경기에 대한 해외 매체의 전술 분석 기사 내용입니다:\n"
          "$exaContext\n\n"
          "위 데이터를 융합하여 다음 양식으로 브리핑을 작성해주세요:\n"
          "★중요★ 마크다운 표 형식으로 깔끔하게 만들어주세요.\n"
          "[경기 스코어 및 득점자]\n"
          "[선수별 주요 평점 표 (전체 선수가 너무 많으면 핵심 4~5명만 표 형식으로)]\n"
          "[핵심 전술 포인트 3가지]";

      
      final briefing = await LlmService.generateProactiveResponse(prompt);
      
      if (briefing != null && briefing.isNotEmpty) {
          await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': briefing}]);
          await NotificationService.showNotification("⚽ 스포츠 모닝 브리핑", briefing);
      }
    } catch (e) {
      debugPrint('SportsService error: $e');
    }
  }
}
