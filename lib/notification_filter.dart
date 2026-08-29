import 'package:flutter/foundation.dart';

class NotificationFilter {
  static Map<String, dynamic>? filter(
      String pkg, String title, String text, String? album) {
    try {
      if (pkg == 'com.kakao.talk') {
        if (title.isNotEmpty && text.isNotEmpty) {
          return {
            'id': 'kakao_${DateTime.now().millisecondsSinceEpoch}',
            'eyebrow': 'KAKAOTALK',
            'message': '$title: $text',
            'color': '#FEE500',
          };
        }
      } else if (pkg == 'kr.co.quicket.bunjang') {
        final productName = title.replaceAll(RegExp(r'.*알림[:\-]?\s*'), '').trim();
        return {
          'id': 'bunjang_${DateTime.now().millisecondsSinceEpoch}',
          'eyebrow': 'BUNJANG',
          'message': '네가 관심 있던 "$productName"이(가) 번장에 올라왔어',
          'color': '#E53935',
        };
      } else if (pkg == 'com.google.android.googlequicksearchbox' ||
          pkg.contains('chrome')) {
        final lowerText = text.toLowerCase();
        if (lowerText.contains('daum')) {
          return {
            'id': 'google_sports_${DateTime.now().millisecondsSinceEpoch}',
            'eyebrow': 'SPORTS NEWS',
            'message': title,
            'color': '#4285F4',
          };
        } else if (lowerText.contains('경기 종료') || title.contains('경기 종료')) {
          return {
            'id': 'google_match_${DateTime.now().millisecondsSinceEpoch}',
            'eyebrow': 'MATCH RESULT',
            'message': '$title 경기 결과를 확인하시겠어요?',
            'color': '#34A853',
          };
        }
      } else if (pkg == 'com.mobilefootie.wc2010') {
        final keywords = ['득점', '선발 출전', '교체 출전', '경기 시작 15분 전', '어시', '경기 평점'];
        bool match = keywords.any((k) => text.contains(k) || title.contains(k));
        if (match) {
          final name = title.split(' ').first;
          return {
            'id': 'fotmob_${DateTime.now().millisecondsSinceEpoch}',
            'eyebrow': 'FOTMOB',
            'message': '$name 선수가 멋진 활약을 펼쳤어! ($text)',
            'color': '#00C853',
          };
        }
      } else if (pkg == 'com.instagram.android') {
        if (text.contains('게시물을 보냈습니다') || text.contains('릴스를 보냈습니다')) {
          final sender = title;
          final now = DateTime.now();
          final minutes = now.hour * 60 + now.minute;
          
          String message = '$sender가 너에게 릴스를 보냈네. 확인해 봐!';
          
          // 기숙사 시간표
          if (minutes >= (16 * 60 + 40) && minutes < (17 * 60 + 30)) {
            // 4:40 ~ 5:30: 자습
            message = '$sender가 너에게 릴스를 보냈네 쉬는시간에 체크하자';
          } else if (minutes >= (17 * 60 + 30) && minutes < (18 * 60 + 45)) {
            // 5:30 ~ 6:45: 저녁
            message = '$sender가 너에게 릴스를 보냈네. 저녁 맛있게 먹고 확인해 봐!';
          } else if (minutes >= (18 * 60 + 45) && minutes < (19 * 60 + 50)) {
            // 6:45 ~ 7:50: 1차 저녁자습
            message = '$sender가 너에게 릴스를 보냈네 쉬는시간에 체크하자';
          } else if (minutes >= (19 * 60 + 50) && minutes < (20 * 60 + 20)) {
            // 7:50 ~ 8:20: 쉬는시간
            message = '$sender가 너에게 릴스를 보냈네. 편의점 갈 시간인가? 쉬면서 확인해 봐!';
          } else if (minutes >= (20 * 60 + 20) && minutes < (22 * 60)) {
            // 8:20 ~ 10:00: 2차 저녁자습
            message = '$sender가 너에게 릴스를 보냈네. 지금 제일 빡센 시간이잖아 집중하고 쉬는시간에 체크하자';
          } else if (minutes >= (22 * 60) && minutes < (22 * 60 + 20)) {
            // 10:00 ~ 10:20: 쉬는시간
            message = '$sender가 너에게 릴스를 보냈네. 확인해 봐!';
          } else if (minutes >= (22 * 60 + 20) && minutes < (23 * 60 + 20)) {
            // 10:20 ~ 11:20: 3차 저녁자습
            message = '$sender가 너에게 릴스를 보냈네 쉬는시간에 체크하자';
          } else if (minutes >= (23 * 60 + 30) && minutes < (23 * 60 + 45)) {
            // 11:30 ~ 11:45: 우리엘
            message = '$sender가 너에게 릴스를 보냈네. 우리엘 끝나고 체크하자';
          } else if (minutes >= (0 * 60) && minutes < (1 * 60)) {
            // 12:00 ~ 1:00: 새벽자습
            message = '$sender가 너에게 릴스를 보냈네 쉬는시간에 체크하자';
          }
          
          return {
            'id': 'insta_${DateTime.now().millisecondsSinceEpoch}',
            'eyebrow': 'INSTAGRAM',
            'message': message,
            'color': '#E1306C',
          };
        }
      }
    } catch (e) {
      debugPrint('NotificationFilter error: $e');
    }
    return null;
  }
}
