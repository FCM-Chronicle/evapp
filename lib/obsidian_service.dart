import 'dart:io';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ObsidianService {
  static const String defaultObsidianVaultPath = '/storage/emulated/0/Documents/Obsidian';
  static const String defaultObsidianInboxPath = '/storage/emulated/0/Documents/Obsidian/Inbox';

  /// 새 메모/로그 저장용 경로 (Inbox)
  static Future<String> getInboxPath() async {
    final prefs = await SharedPreferences.getInstance();
    final path = prefs.getString('OBSIDIAN_INBOX_PATH')?.trim() ?? prefs.getString('OBSIDIAN_PATH')?.trim();
    if (path != null && path.isNotEmpty) {
      return path;
    }
    return defaultObsidianInboxPath;
  }

  /// 전체 노트 읽기/검색용 상위 경로 (Vault Root)
  static Future<String> getVaultRootPath() async {
    final prefs = await SharedPreferences.getInstance();
    final path = prefs.getString('OBSIDIAN_VAULT_PATH')?.trim();
    if (path != null && path.isNotEmpty) {
      return path;
    }
    // 기본값은 Inbox의 상위 폴더이거나 기본 Vault 경로
    final inbox = await getInboxPath();
    final parent = Directory(inbox).parent.path;
    return parent.isNotEmpty ? parent : defaultObsidianVaultPath;
  }

  static Future<bool> requestPermissions() async {
    if (await Permission.manageExternalStorage.request().isGranted) {
      return true;
    }
    if (await Permission.storage.request().isGranted) {
      return true;
    }
    return false;
  }

  /// 옵시디언 Inbox 폴더에 마크다운 파일 저장
  static Future<String?> saveMarkdownNote(String filename, String content) async {
    try {
      final hasPermission = await requestPermissions();
      if (!hasPermission) {
        return '저장소 권한이 거부되었습니다.';
      }

      final path = await getInboxPath();
      final directory = Directory(path);
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }

      final safeFilename = _sanitizeFilename(filename);
      final file = File('${directory.path}/$safeFilename.md');
      await file.writeAsString(content);

      debugPrint('Saved note to: ${file.path}');
      return null;
    } catch (e) {
      debugPrint('Error saving markdown note: $e');
      return e.toString();
    }
  }

  /// 옵시디언 볼트 전체 하위 폴더에서 관련 마크다운 노트 검색
  static Future<List<Map<String, String>>> searchNotes(String query, {int limit = 3}) async {
    try {
      final rootPath = await getVaultRootPath();
      final rootDir = Directory(rootPath);
      if (!await rootDir.exists()) return [];

      final results = <Map<String, String>>[];
      final keywords = query.split(' ').map((s) => s.trim()).where((s) => s.length >= 2).toList();
      if (keywords.isEmpty) return [];

      await for (final entity in rootDir.list(recursive: true, followLinks: false)) {
        if (entity is File && entity.path.endsWith('.md')) {
          final filename = entity.uri.pathSegments.last;
          try {
            final text = await entity.readAsString();
            bool isMatch = false;

            // 파일명 또는 본문 일치 여부 확인
            for (var kw in keywords) {
              if (filename.contains(kw) || text.contains(kw)) {
                isMatch = true;
                break;
              }
            }

            if (isMatch) {
              String excerpt = text;
              if (excerpt.length > 800) {
                excerpt = excerpt.substring(0, 800) + '...';
              }
              results.add({
                'title': filename.replaceAll('.md', ''),
                'path': entity.path,
                'content': excerpt,
              });
              if (results.length >= limit) break;
            }
          } catch (_) {}
        }
      }
      return results;
    } catch (e) {
      debugPrint('Error searching obsidian notes: $e');
      return [];
    }
  }

  static Future<String?> createNoteFromTag(String filename, String content) {
    final withoutExtension = filename.endsWith('.md')
        ? filename.substring(0, filename.length - 3)
        : filename;
    return saveMarkdownNote(withoutExtension, content);
  }

  static String _sanitizeFilename(String name) {
    final trimmed = name.trim().isEmpty ? 'Untitled' : name.trim();
    return trimmed.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
  }
}
