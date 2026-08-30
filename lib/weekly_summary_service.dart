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
              upcomingEvents += "- [${ev['title']}] (D-$diff, ${ev['date']})\n";
            }
          } catch (_) {}
        }
      }

      final prompt = "오늘은 일요일 밤 9시 주간 결산 시간입니다.\n\n"
          "■ 이번 주 Todo 현황:\n$todoContent\n\n"
          "■ 오답노트 빌런 현황: 체포/정복 완료 $prisonVillains 개, 미해결 빌런 $activeVillains 개\n\n"
          "■ 다음 주 예정된 주요 D-Day 일정:\n$upcomingEvents\n\n"
          "위 데이터를 바탕으로 사용자에게 한 주를 격려하고 다음 주를 준비하도록 돕는 [주간 종합 결산 리포트]를 작성해주세요.\n"
          "★중요★ 반드시 '데일리 뷰글(Daily Bugle)' 주간 특별 에디션 신문 1면 스타일로 작성하세요.\n"
          "첫 줄은 굵고 강렬한 주간 헤드라인(예: [주간 특종! ...])을 쓰고, 항목별로 알차게 요약해 주세요.";

      final weeklySystemPrompt = "너는 사용자의 한 주를 정리해 주는 능동형 AI 비서 E.V.다.\n"
          "사용자가 제공한 데이터를 기반으로 '데일리 뷰글(Daily Bugle)' 주간 특별 에디션 신문 1면 스타일의 종합 결산 리포트를 작성해.\n"
          "헤드라인, Todo 달성 현황, 오답 빌런 퇴치 전황, 다음 주 예고 등 항목별로 알차게 정리해라.\n"
          "SILENT라고 응답하지 마라. 반드시 리포트를 작성해야 한다.";
      final report = await LlmService.generateProactiveResponse(prompt, systemPromptOverride: weeklySystemPrompt);
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
