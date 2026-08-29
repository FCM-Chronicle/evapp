import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class SearchResultItem {
  final String title;
  final String url;
  final String snippet;

  SearchResultItem({required this.title, required this.url, required this.snippet});
}

class SearchService {
  static Future<String?> getNaverClientId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('NAVER_CLIENT_ID')?.trim();
  }

  static Future<String?> getNaverClientSecret() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('NAVER_CLIENT_SECRET')?.trim();
  }

  static Future<String?> getTavilyApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('TAVILY_API_KEY')?.trim();
  }

  // 최신 / 실시간 / 뉴스 / 트렌드 감지 정규식
  static final RegExp _latestKeywords = RegExp(
    r'최신|요즘|뉴스|실시간|최근|트렌드|어제|오늘|속보|업데이트|동향|해외|글로벌|전술|경기|latest|recent|news|today|update|tactical',
    caseSensitive: false,
  );

  /// 검색 실행: Tavily 응답이 없거나 키가 없으면 Naver로 즉시 안전 전환(Fallback)
  static Future<Map<String, dynamic>> search(String query, {Function(String engine)? onSearchStart}) async {
    final naverId = await getNaverClientId();
    final naverSecret = await getNaverClientSecret();
    final tavilyKey = await getTavilyApiKey();

    final hasNaver = (naverId != null && naverId.isNotEmpty && naverSecret != null && naverSecret.isNotEmpty);
    final hasTavily = (tavilyKey != null && tavilyKey.isNotEmpty);

    if (!hasNaver && !hasTavily) {
      return {'engine': 'none', 'results': <SearchResultItem>[]};
    }

    final bool isLatestQuery = _latestKeywords.hasMatch(query);

    if (isLatestQuery && hasTavily) {
      // 1순위: Tavily (실시간 웹/최신 정보)
      onSearchStart?.call('Tavily (최신)');
      final tavilyRes = await _searchTavily(query, tavilyKey);
      if (tavilyRes.isNotEmpty) {
        return {'engine': 'Tavily AI 검색', 'results': tavilyRes};
      }
      
      // Tavily 실패 또는 응답 없음 -> 네이버로 안전 전환
      if (hasNaver) {
        onSearchStart?.call('네이버 (전환됨)');
        final naverRes = await _searchNaver(query, naverId, naverSecret);
        if (naverRes.isNotEmpty) {
          return {'engine': '네이버 검색 (Tavily 폴백)', 'results': naverRes};
        }
      }
    } else {
      // 일반 정보 또는 Tavily 키 미등록 시 -> 네이버 우선
      if (hasNaver) {
        onSearchStart?.call('네이버');
        final naverRes = await _searchNaver(query, naverId, naverSecret);
        if (naverRes.isNotEmpty) {
          return {'engine': '네이버 검색', 'results': naverRes};
        }
      }
      // 네이버 실패 시 -> Tavily 시도
      if (hasTavily) {
        onSearchStart?.call('Tavily (전환됨)');
        final tavilyRes = await _searchTavily(query, tavilyKey);
        if (tavilyRes.isNotEmpty) {
          return {'engine': 'Tavily AI 검색', 'results': tavilyRes};
        }
      }
    }

    return {'engine': 'none', 'results': <SearchResultItem>[]};
  }

  /// 네이버 검색: 뉴스 검색 우선 시도 후, 결과가 없으면 웹 문서(webkr) 검색으로 2중 보강
  static Future<List<SearchResultItem>> _searchNaver(String query, String clientId, String clientSecret) async {
    try {
      // 1. 뉴스 검색 시도
      final newsUrl = Uri.parse('https://openapi.naver.com/v1/search/news.json?query=${Uri.encodeComponent(query)}&display=3&sort=sim');
      final newsRes = await http.get(newsUrl, headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      }).timeout(const Duration(seconds: 4));

      if (newsRes.statusCode == 200) {
        final data = jsonDecode(newsRes.body);
        final items = data['items'] as List?;
        if (items != null && items.isNotEmpty) {
          return items.map((item) {
            final rawTitle = item['title']?.toString() ?? '';
            final rawDesc = item['description']?.toString() ?? '';
            final cleanTitle = _stripHtml(rawTitle);
            final cleanDesc = _stripHtml(rawDesc);
            final link = (item['originallink']?.toString().isNotEmpty == true) ? item['originallink'].toString() : item['link']?.toString() ?? '';
            return SearchResultItem(title: cleanTitle, url: link, snippet: cleanDesc);
          }).toList();
        }
      }

      // 2. 뉴스에 결과가 없을 경우 일반 웹(webkr) 검색 시도
      final webUrl = Uri.parse('https://openapi.naver.com/v1/search/webkr.json?query=${Uri.encodeComponent(query)}&display=3');
      final webRes = await http.get(webUrl, headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      }).timeout(const Duration(seconds: 4));

      if (webRes.statusCode == 200) {
        final data = jsonDecode(webRes.body);
        final items = data['items'] as List?;
        if (items != null && items.isNotEmpty) {
          return items.map((item) {
            final rawTitle = item['title']?.toString() ?? '';
            final rawDesc = item['description']?.toString() ?? '';
            final cleanTitle = _stripHtml(rawTitle);
            final cleanDesc = _stripHtml(rawDesc);
            final link = item['link']?.toString() ?? '';
            return SearchResultItem(title: cleanTitle, url: link, snippet: cleanDesc);
          }).toList();
        }
      }
    } catch (e) {
      debugPrint('Naver search error: $e');
    }
    return [];
  }

  /// Tavily AI 검색: 4초 타임아웃 적용 (지연 시 빠른 네이버 폴백 유도)
  static Future<List<SearchResultItem>> _searchTavily(String query, String apiKey) async {
    try {
      final url = Uri.parse('https://api.tavily.com/search');
      final response = await http.post(url, headers: {
        'Content-Type': 'application/json',
      }, body: jsonEncode({
        'api_key': apiKey,
        'query': query,
        'search_depth': 'basic',
        'max_results': 3,
      })).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final results = data['results'] as List?;
        if (results != null && results.isNotEmpty) {
          return results.map((item) {
            final title = item['title']?.toString() ?? '';
            final url = item['url']?.toString() ?? '';
            final content = item['content']?.toString() ?? '';
            return SearchResultItem(title: title, url: url, snippet: content);
          }).toList();
        }
      }
    } catch (e) {
      debugPrint('Tavily search error/timeout: $e');
    }
    return [];
  }

  static String _stripHtml(String html) {
    return html
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&quot;', '"')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&apos;', "'");
  }
}
