import 'dart:io';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PlaylistService {
  static const String defaultPlaylistPath = '/storage/emulated/0/Music';

  static Future<String> getPlaylistPath() async {
    final prefs = await SharedPreferences.getInstance();
    final path = prefs.getString('PLAYLIST_PATH')?.trim();
    if (path != null && path.isNotEmpty) {
      return path;
    }
    return defaultPlaylistPath;
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

  static Future<List<String>> getAvailablePlaylists() async {
    try {
      final hasPermission = await requestPermissions();
      if (!hasPermission) {
        debugPrint('Storage permission denied for playlists.');
        return [];
      }

      final path = await getPlaylistPath();
      final directory = Directory(path);
      
      if (!await directory.exists()) {
        return [];
      }

      final List<String> playlists = [];
      await for (final entity in directory.list(recursive: false)) {
        if (entity is File) {
          final filename = entity.path.split(Platform.pathSeparator).last;
          if (filename.toLowerCase().endsWith('.m3u') || filename.toLowerCase().endsWith('.m3u8')) {
            // Remove extension for display to LLM/User
            final nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
            playlists.add(nameWithoutExt);
          }
        }
      }
      return playlists;
    } catch (e) {
      debugPrint('Error reading playlists: $e');
      return [];
    }
  }
}
