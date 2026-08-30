import 'weekly_summary_service.dart';
import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'llm_service.dart';
import 'obsidian_service.dart';
import 'local_storage_service.dart';
import 'notification_service.dart';
import 'weather_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'sports_service.dart';

Future<void> initializeService() async {
  final service = FlutterBackgroundService();

  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      autoStart: true,
      isForegroundMode: true,
      initialNotificationTitle: 'E.V. System',
      initialNotificationContent: 'Monitoring in background',
      foregroundServiceNotificationId: 888,
      // ⭕ [핵심 추가] 안드로이드 14+ 대응을 위한 FGS 타입 지정
      foregroundServiceTypes: [AndroidForegroundType.dataSync],
    ),
    iosConfiguration: IosConfiguration(
      autoStart: true,
      onForeground: onStart,
      onBackground: onIosBackground,
    ),
  );
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  await NotificationService.initialize();

  // Handle messages from the main UI
  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  service.on('process_llm_queue').listen((event) async {
    final String? query = event?['query'];
    if (query != null) {
      debugPrint('Background: processing LLM query');
      final response = await LlmService.generateResponse(query);
      
      // Save result to obsidian
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      await ObsidianService.saveMarkdownNote('E.V._Log_$timestamp', response.text);
      
      service.invoke('llm_result', {'result': response.text});
    }
  });
  
  final Map<String, DateTime> _lastScheduleTriggers = {};

  Timer.periodic(const Duration(minutes: 1), (timer) async {
    final now = DateTime.now();
    final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final prefs = await SharedPreferences.getInstance();

    // 1. Check schedule.json
    final schedules = await LocalStorageService.readScheduleEvents();
    for (var sched in schedules) {
      final id = sched['id'] as String;
      final days = (sched['days'] as List).cast<int>();
      final timeStr = sched['time'] as String; // "HH:MM"
      final type = sched['type'] as String?;
      String message = sched['message'] as String;

      if (days.contains(now.weekday)) {
        final parts = timeStr.split(':');
        if (parts.length == 2 && int.tryParse(parts[0]) == now.hour && int.tryParse(parts[1]) == now.minute) {
          final lastTrigger = _lastScheduleTriggers[id];
          if (lastTrigger == null || lastTrigger.day != now.day) {
            _lastScheduleTriggers[id] = now;
            
            // 날씨 연동 (학원)
            if (type == 'hakwon') {
              message = await WeatherService.getHakwonWeatherMessage(message);
            }

            await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': message}]);
            
            await NotificationService.showNotification("일정 알림", message);
            service.invoke('llm_result', {'id': 'schedule_${now.millisecondsSinceEpoch}', 'result': message});
          }
        }
      }
    }

    // 2. D-Day Smart Push (09:00)
    if (now.hour == 9 && now.minute == 0) {
      if (prefs.getString('LAST_DDAY_PUSH_DATE') != todayStr) {
        await prefs.setString('LAST_DDAY_PUSH_DATE', todayStr);
        final events = await LocalStorageService.readCalendarEvents();
        List<String> dDayMessages = [];
        
        for (var ev in events) {
          final dateStr = ev['date'] as String?;
          if (dateStr != null && dateStr.isNotEmpty) {
            try {
              final evDate = DateTime.parse(dateStr);
              final diff = evDate.difference(DateTime(now.year, now.month, now.day)).inDays;
              if (diff == 3) {
                dDayMessages.add("'${ev['title']}' 일정이 3일 남았습니다.");
              } else if (diff == 1) {
                dDayMessages.add("내일은 '${ev['title']}' 일정이 있습니다!");
              }
            } catch (_) {}
          }
        }
        
        if (dDayMessages.isNotEmpty) {
          final eventList = dDayMessages.join(', ');
          final prompt = "지금은 오전 9시입니다. 다가오는 일정들이 있습니다: $eventList\n"
              "이 일정들을 사용자에게 알려주는 메시지를 작성해주세요.\n"
              "★중요★ 반드시 '데일리 뷰글(Daily Bugle)' 신문 1면 기사 스타일로 작성하세요. "
              "첫 줄은 굵고 강렬한 뉴스 헤드라인(예: [특종! ...])을 쓰고, 그 아래에 본문 기사처럼 내용을 짧고 임팩트 있게 작성하세요.";
          
          final responseMsg = await LlmService.generateProactiveResponse(prompt);
          if (responseMsg != null && responseMsg.isNotEmpty) {
            await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': responseMsg}]);
            await NotificationService.showNotification("D-Day 알림", responseMsg);
            service.invoke('llm_result', {'id': 'dday_${now.millisecondsSinceEpoch}', 'result': responseMsg});
          }
        }
      }
    }


    // 2.5 Todo Daily Reset (02:00)
    if (now.hour == 2 && now.minute == 0) {
      if (prefs.getString('LAST_TODO_RESET_DATE') != todayStr) {
        await prefs.setString('LAST_TODO_RESET_DATE', todayStr);
        await LocalStorageService.resetTodoDaily();
        await NotificationService.showNotification("Todo 초기화", "오전 2시가 되어 어제 완료된 할 일들을 정리했습니다.");
      }
    }

        // 5. Sunday Weekly Executive Summary (21:00)
    if (now.weekday == DateTime.sunday && now.hour == 21 && now.minute == 0) {
      if (prefs.getString('LAST_WEEKLY_SUMMARY_DATE') != todayStr) {
        await WeeklySummaryService.generateWeeklyReport();
      }
    }

    // 4. Sports Morning Briefing (07:00)
    if (now.hour == 7 && now.minute == 0) {
      if (prefs.getString('LAST_SPORTS_DATE') != todayStr) {
        await prefs.setString('LAST_SPORTS_DATE', todayStr);
        await SportsService.generateMorningBriefing();
      }
    }
    // 3. Night Routine Check-in (00:30)
    if (now.hour == 0 && now.minute == 30) {
      if (prefs.getString('LAST_NIGHT_ROUTINE_DATE') != todayStr) {
        await prefs.setString('LAST_NIGHT_ROUTINE_DATE', todayStr);
        final prompt = "지금은 밤 12시 30분이야. 달력을 보고 내일 첫 일정을 브리핑해주거나, 오늘 남은 할 일이 있는지 물어보는 메시지를 작성해줘.\n"
            "★중요★ 반드시 '데일리 뷰글(Daily Bugle)' 신문 1면 기사 스타일로 작성해! "
            "첫 줄은 굵고 강렬한 야간 특종 뉴스 헤드라인(예: [심야 특보! ...])을 쓰고, 그 아래에 기사 본문처럼 짧게 브리핑을 해줘.";
        final responseMsg = await LlmService.generateProactiveResponse(prompt);
        if (responseMsg != null && responseMsg.isNotEmpty) {
          await LocalStorageService.appendConversationHistory([{'role': 'assistant', 'content': responseMsg}]);
          
          await NotificationService.showNotification("야간 루틴", responseMsg);
          service.invoke('llm_result', {'id': 'night_${now.millisecondsSinceEpoch}', 'result': responseMsg});
        }
      }
    }
  });
}