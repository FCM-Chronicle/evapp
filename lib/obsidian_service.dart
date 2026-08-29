// evapp/lib/obsidian_service.dart

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ObsidianService {
  static const String defaultObsidianInboxPath = '/storage/emulated/0/Documents/Obsidian/Inbox';

  static Future<String> _getObsidianPath() async {
    final prefs = await SharedPreferences.getInstance();
    final path = prefs.getString('OBSIDIAN_PATH')?.trim();
    if (path != null && path.isNotEmpty) {
      return path;
    }
    return defaultObsidianInboxPath;
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

  static Future<String?> saveMarkdownNote(String filename, String content) async {
    try {
      final hasPermission = await requestPermissions();
      if (!hasPermission) {
        return '저장소 권한이 거부되었습니다.';
      }

      final path = await _getObsidianPath();
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

  /// Entry point used by main.dart when the LLM response contains a
  /// <create_obsidian filename="Note.md">...</create_obsidian> tag.
  /// `filename` may or may not include the .md extension — both work,
  /// since saveMarkdownNote always appends .md itself.
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