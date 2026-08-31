import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class MealService {
  static const String _neisBaseUrl = 'https://open.neis.go.kr/hub';

  /// 학교 검색 (학교명으로 시도교육청코드, 표준학교코드 검색)
  static Future<List<Map<String, dynamic>>> searchSchool(String query) async {
    if (query.trim().isEmpty) return [];
    try {
      final prefs = await SharedPreferences.getInstance();
      final neisKey = prefs.getString('NEIS_API_KEY')?.trim();
      final keyParam = (neisKey != null && neisKey.isNotEmpty) ? '&KEY=$neisKey' : '';
      final url = Uri.parse(
        '$_neisBaseUrl/schoolInfo?Type=json&pIndex=1&pSize=20$keyParam&SCHUL_NM=${Uri.encodeComponent(query.trim())}',
      );
      final res = await http.get(url).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map && decoded.containsKey('schoolInfo')) {
          final rowList = decoded['schoolInfo'][1]['row'] as List;
          return rowList.map<Map<String, dynamic>>((row) {
            return {
              'schoolName': row['SCHUL_NM'] ?? '',
              'officeCode': row['ATPT_OFCDC_SC_CODE'] ?? '',
              'officeName': row['ATPT_OFCDC_SC_NM'] ?? '',
              'schoolCode': row['SD_SCHUL_CODE'] ?? '',
              'address': row['ORG_RDNMA'] ?? row['ORG_RDNZC'] ?? '',
              'schoolKind': row['SCHUL_KND_SC_NM'] ?? '',
            };
          }).toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('MealService.searchSchool error: $e');
      return [];
    }
  }

  /// 특정 일자의 급식 정보 조회 (YYYYMMDD)
  static Future<Map<String, dynamic>> getMeal({
    required String officeCode,
    required String schoolCode,
    required String yyyymmdd,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final neisKey = prefs.getString('NEIS_API_KEY')?.trim();
      final keyParam = (neisKey != null && neisKey.isNotEmpty) ? '&KEY=$neisKey' : '';
      final cleanDate = yyyymmdd.replaceAll('-', '').replaceAll('.', '').trim();
      final url = Uri.parse(
        '$_neisBaseUrl/mealServiceDietInfo?Type=json&pIndex=1&pSize=10$keyParam&ATPT_OFCDC_SC_CODE=$officeCode&SD_SCHUL_CODE=$schoolCode&MLSV_YMD=$cleanDate',
      );
      final res = await http.get(url).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map && decoded.containsKey('mealServiceDietInfo')) {
          final rowList = decoded['mealServiceDietInfo'][1]['row'] as List;
          final List<Map<String, dynamic>> meals = [];

          for (var row in rowList) {
            final rawDish = (row['DDISH_NM'] as String? ?? '')
                .replaceAll('<br/>', '\n')
                .replaceAll(RegExp(r'\([0-9\.\* ]+\)'), '') // 알레르기 번호 제거
                .trim();
            final typeCode = row['MMEAL_SC_CODE'] as String? ?? '2'; // 1: 조식, 2: 중식, 3: 석식
            final typeName = row['MMEAL_SC_NM'] as String? ?? '중식';
            final calInfo = row['CAL_INFO'] as String? ?? '';

            meals.add({
              'typeCode': typeCode,
              'typeName': typeName,
              'dish': rawDish,
              'calorie': calInfo,
            });
          }

          return {
            'date': cleanDate,
            'meals': meals,
          };
        }
      }
      return {'date': cleanDate, 'meals': []};
    } catch (e) {
      debugPrint('MealService.getMeal error: $e');
      return {'date': yyyymmdd, 'meals': []};
    }
  }

  /// 저장된 학교 정보 읽기
  static Future<Map<String, String>> getSavedSchoolInfo() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'schoolName': prefs.getString('SAVED_SCHOOL_NAME') ?? '배재고등학교',
      'officeCode': prefs.getString('SAVED_OFFICE_CODE') ?? 'B10',
      'schoolCode': prefs.getString('SAVED_SCHOOL_CODE') ?? '7010156',
    };
  }

  /// 학교 정보 저장
  static Future<void> saveSchoolInfo({
    required String schoolName,
    required String officeCode,
    required String schoolCode,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('SAVED_SCHOOL_NAME', schoolName);
    await prefs.setString('SAVED_OFFICE_CODE', officeCode);
    await prefs.setString('SAVED_SCHOOL_CODE', schoolCode);
  }
}
