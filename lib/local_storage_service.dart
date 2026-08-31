// evapp/lib/local_storage_service.dart
//
// Reads/writes the files the AI reads for context and writes back to:
//   - memories.md       (free-form markdown notes about the user)
//   - calendar.json      (array of { id, date, time, title, type })
//   - conversation.json  (array of { role, content } — persisted chat history)
//
// On mobile (Android/iOS) these live in the app's sandboxed
// Application Documents Directory via path_provider.
// On desktop platforms (Windows/macOS/Linux — used for local dev/testing)
// they fall back to a ./files/ folder relative to the project so they're
// easy to inspect while developing.

import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

class LocalStorageService {
  static const String memoriesFileName = 'memories.md';
  static const String calendarFileName = 'calendar.json';
  static const String conversationFileName = 'conversation.json';
  static const String subjectFileName = 'subject.json';
  static const String scheduleFileName = 'schedule.json';
  static const String wrongFileName = 'wrong.json';
  static const String todoFileName = 'todo.md';
  static const String taskFileName = 'task.md';
  static const String maskingFileName = 'masking_rules.json';
  static const String ddayFileName = 'dday.json';

  static const String defaultTodo = '# 오늘의 할 일 (Todo)\n\n- [ ] 예시: 이메일 확인하기\n';
  static const String defaultTask = '# Tasks\n\n복잡한 작업을 수행할 때 이곳에 계획을 세우고 하나씩 실행합니다.\n\n- `[ ]` uncompleted\n- `[/]` in progress\n- `[x]` completed\n';
  static const String defaultDdayJson = '[]';

  static const String defaultMemories =
      '# memories.md\n\n- 사용자는 Flutter Webview 하이브리드 앱을 만들고 있음\n- 선호 톤: 간결, 기술적\n';

  static const String defaultCalendarJson = '''
[
  {"id": "evt_1", "date": "2026-08-10", "time": "14:00", "title": "팀 회의", "type": "work"},
  {"id": "evt_2", "date": "2026-08-10", "time": "", "title": "저녁 약속", "type": "normal"},
  {"id": "evt_3", "date": "2026-08-15", "time": "", "title": "친구 생일파티", "type": "important"}
]
''';

  static const String defaultScheduleJson = '[{"id": "hakwon_tue_thu", "days": [2, 4], "time": "16:40", "type": "hakwon", "message": "보스, 4시 40분이야. 학원 갈 준비해야지?"}, {"id": "dorm_night", "days": [1, 2, 3, 4, 5], "time": "22:30", "type": "dorm", "message": "오늘 하루도 수고했어! 얼른 기숙사 들어가서 자자."}]';

  /// Returns the directory files should be stored in.
  static Future<Directory> _baseDirectory() async {
    final bool isDesktop =
        !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);

    if (isDesktop) {
      final dir = Directory('./files');
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      return dir;
    }

    // Mobile (Android/iOS): sandboxed Application Documents Directory.
    return await getApplicationDocumentsDirectory();
  }

  static Future<File> _fileFor(String name) async {
    final dir = await _baseDirectory();
    return File('${dir.path}/$name');
  }

  static Future<File> get memoriesFile async => _fileFor(memoriesFileName);
  static Future<File> get calendarFile async => _fileFor(calendarFileName);
  static Future<File> get conversationFile async =>
      _fileFor(conversationFileName);
  static Future<File> get subjectFile async => _fileFor(subjectFileName);
  static Future<File> get scheduleFile async => _fileFor(scheduleFileName);
  static Future<File> get wrongFile async => _fileFor(wrongFileName);
  static Future<File> get todoFile async => _fileFor(todoFileName);
  static Future<File> get taskFile async => _fileFor(taskFileName);
  static Future<File> get maskingFile async => _fileFor(maskingFileName);
  static Future<File> get ddayFile async => _fileFor(ddayFileName);

  /// Reads memories.md, creating it with default content on first run.
  static Future<String> readMemories() async {
    try {
      final file = await memoriesFile;
      if (!await file.exists()) {
        await file.writeAsString(defaultMemories);
        return defaultMemories;
      }
      return await file.readAsString();
    } catch (e) {
      debugPrint('LocalStorageService.readMemories error: $e');
      return defaultMemories;
    }
  }

  static Future<bool> writeMemories(String content) async {
    try {
      final file = await memoriesFile;
      await file.writeAsString(content);
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeMemories error: $e');
      return false;
    }
  }

  /// Appends new memory content (from an <update_memory> tag) to the
  /// existing memories.md, rather than overwriting it. Each non-empty
  /// line from [newContent] is added as its own bullet, and exact
  /// duplicate lines (already present) are skipped so the AI can't
  /// balloon the file by re-saving the same fact every turn.
  static Future<String> appendMemory(String newContent) async {
    try {
      final current = await readMemories();

      final existingLines = current
          .split('\n')
          .map((l) => l.trim())
          .where((l) => l.isNotEmpty)
          .toSet();

      final newLines = newContent
          .split('\n')
          .map((l) => l.trim())
          .where((l) => l.isNotEmpty)
          .map((l) => l.startsWith('-') ? l : '- $l')
          .where((l) => !existingLines.contains(l))
          .toList();

      if (newLines.isEmpty) return current;

      final updated = '${current.trimRight()}\n${newLines.join('\n')}\n';
      await writeMemories(updated);
      return updated;
    } catch (e) {
      debugPrint('LocalStorageService.appendMemory error: $e');
      return await readMemories();
    }
  }

  /// Reads calendar.json, creating it with default content on first run.
  /// Returns a decoded List<Map<String, dynamic>>.
  static Future<List<Map<String, dynamic>>> readCalendarEvents() async {
    try {
      final file = await calendarFile;
      String raw;
      if (!await file.exists()) {
        await file.writeAsString(defaultCalendarJson);
        raw = defaultCalendarJson;
      } else {
        raw = await file.readAsString();
      }
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      debugPrint('LocalStorageService.readCalendarEvents error: $e');
      return [];
    }
  }

  static Future<bool> writeCalendarEvents(List<dynamic> events) async {
    try {
      final file = await calendarFile;
      await file.writeAsString(jsonEncode(events));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeCalendarEvents error: $e');
      return false;
    }
  }

  /// Reads schedule.json, creating it with default content on first run.
  static Future<List<Map<String, dynamic>>> readScheduleEvents() async {
    try {
      final file = await scheduleFile;
      String raw;
      if (!await file.exists()) {
        await file.writeAsString(defaultScheduleJson);
        raw = defaultScheduleJson;
      } else {
        raw = await file.readAsString();
      }
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      debugPrint('LocalStorageService.readScheduleEvents error: $e');
      return [];
    }
  }

  static Future<bool> writeScheduleEvents(List<dynamic> events) async {
    try {
      final file = await scheduleFile;
      await file.writeAsString(jsonEncode(events));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeScheduleEvents error: $e');
      return false;
    }
  }

  /// Reads dday.json, creating it with default content on first run.
  static Future<List<Map<String, dynamic>>> readDdays() async {
    try {
      final file = await ddayFile;
      String raw;
      if (!await file.exists()) {
        await file.writeAsString(defaultDdayJson);
        raw = defaultDdayJson;
      } else {
        raw = await file.readAsString();
      }
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      debugPrint('LocalStorageService.readDdays error: $e');
      return [];
    }
  }

  static Future<bool> writeDdays(List<dynamic> ddays) async {
    try {
      final file = await ddayFile;
      await file.writeAsString(jsonEncode(ddays));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeDdays error: $e');
      return false;
    }
  }

  /// Merges a raw JSON string (from an <update_calendar> tag) into the
  /// existing calendar.json. Events are matched/replaced by id; new ids
  /// are appended.
  static Future<List<Map<String, dynamic>>> mergeCalendarEventsFromJson(
    String rawJson,
  ) async {
    try {
      final decoded = jsonDecode(rawJson);
      if (decoded is! List) return await readCalendarEvents();

      final incoming = decoded.cast<Map<String, dynamic>>();
      final current = await readCalendarEvents();
      final byId = {for (final e in current) e['id']?.toString(): e};

      for (final ev in incoming) {
        final rawId = ev['id']?.toString().trim() ?? '';
            final id = rawId.isEmpty
                ? 'evt_${DateTime.now().millisecondsSinceEpoch}_${current.length}'
                : rawId;
        byId[id] = {...ev, 'id': id};
      }

      final merged = byId.values.toList();
      await writeCalendarEvents(merged);
      return merged;
    } catch (e) {
      debugPrint('LocalStorageService.mergeCalendarEventsFromJson error: $e');
      return await readCalendarEvents();
    }
  }

  /// Reads subject.json, creating it empty on first run.
  /// Returns a decoded List<Map<String, dynamic>>.
  static Future<List<Map<String, dynamic>>> readSubjects() async {
    try {
      final file = await subjectFile;
      if (!await file.exists()) {
        await file.writeAsString('[]');
        return [];
      }
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return [];
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      debugPrint('LocalStorageService.readSubjects error: $e');
      return [];
    }
  }

  static Future<bool> writeSubjects(List<dynamic> subjects) async {
    try {
      final file = await subjectFile;
      await file.writeAsString(jsonEncode(subjects));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeSubjects error: $e');
      return false;
    }
  }

  /// Merges a raw JSON string (from an <update_subject> tag) into the
  /// existing subject.json. Overwrites the last_studied date if the subject already exists.
  static Future<List<Map<String, dynamic>>> mergeSubjectFromJson(
    String rawJson,
  ) async {
    try {
      final decoded = jsonDecode(rawJson);
      if (decoded is! Map) return await readSubjects();

      final current = await readSubjects();
      final subjectName = decoded['subject']?.toString();
      final lastStudied = decoded['last_studied']?.toString() ?? DateTime.now().toIso8601String().split('T')[0];

      if (subjectName == null || subjectName.isEmpty) return current;

      bool found = false;
      for (var s in current) {
        if (s['subject'] == subjectName) {
          s['last_studied'] = lastStudied;
          found = true;
          break;
        }
      }

      if (!found) {
        current.add({
          'subject': subjectName,
          'last_studied': lastStudied,
        });
      }

      await writeSubjects(current);
      return current;
    } catch (e) {
      debugPrint('LocalStorageService.mergeSubjectFromJson error: $e');
      return await readSubjects();
    }
  }

  /// Reads schedule.json
  static Future<List<Map<String, dynamic>>> readSchedules() async {
    try {
      final file = await scheduleFile;
      if (!await file.exists()) {
        await file.writeAsString(defaultScheduleJson);
        return jsonDecode(defaultScheduleJson).cast<Map<String, dynamic>>();
      }
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return [];
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      debugPrint('LocalStorageService.readSchedules error: $e');
      return [];
    }
  }

  static Future<bool> writeSchedules(List<dynamic> schedules) async {
    try {
      final file = await scheduleFile;
      await file.writeAsString(jsonEncode(schedules));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeSchedules error: $e');
      return false;
    }
  }

  /// Reads conversation.json (persisted chat history), creating it empty
  /// on first run. Each entry is { "role": "user"|"assistant", "content": "..." }.
  static Future<List<Map<String, String>>> readConversationHistory() async {
    try {
      final file = await conversationFile;
      if (!await file.exists()) {
        await file.writeAsString('[]');
        return [];
      }
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return [];
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .map((e) => Map<String, String>.from(
                  (e as Map).map(
                    (k, v) => MapEntry(k.toString(), v.toString()),
                  ),
                ))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('LocalStorageService.readConversationHistory error: $e');
      return [];
    }
  }

  static Future<bool> writeConversationHistory(
    List<Map<String, String>> history,
  ) async {
    try {
      final file = await conversationFile;
      await file.writeAsString(jsonEncode(history));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeConversationHistory error: $e');
      return false;
    }
  }

  /// Appends entries safely using a lock file to prevent isolate race conditions.
  static Future<bool> appendConversationHistory(List<Map<String, String>> newEntries) async {
    final dir = await _baseDirectory();
    final lockFile = File('${dir.path}/conversation.lock');
    RandomAccessFile? raf;
    try {
      raf = await lockFile.open(mode: FileMode.write);
      await raf.lock(FileLock.exclusive);
      
      final current = await readConversationHistory();
      current.addAll(newEntries);
      while (current.length > 20) {
        current.removeAt(0);
      }
      
      final file = await conversationFile;
      await file.writeAsString(jsonEncode(current));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.appendConversationHistory error: $e');
      return false;
    } finally {
      if (raf != null) {
        try {
          await raf.unlock();
          await raf.close();
        } catch (_) {}
      }
    }
  }

  /// Clears conversation.json (used by the "new_chat" action), archiving
  /// the current history first so it is not lost.
  static Future<bool> clearConversationHistory() async {
    try {
      final file = await conversationFile;
      if (await file.exists()) {
        final content = await file.readAsString();
        if (content.isNotEmpty && content != '[]') {
          final dir = await _baseDirectory();
          final archivesDir = Directory('${dir.path}/archives');
          if (!await archivesDir.exists()) {
            await archivesDir.create(recursive: true);
          }
          final timestamp = DateTime.now().toIso8601String().replaceAll(':', '-');
          final archiveFile = File('${archivesDir.path}/conversation_$timestamp.json');

          // 첫 번째 사용자 메시지를 제목으로 추출
          String title = '';
          try {
            final decoded = jsonDecode(content);
            if (decoded is List) {
              for (var msg in decoded) {
                if (msg is Map && msg['role'] == 'user') {
                  title = (msg['content'] as String? ?? '').trim();
                  // 제목이 너무 길면 잘라내기
                  if (title.length > 50) {
                    title = '${title.substring(0, 47)}...';
                  }
                  break;
                }
              }
            }
          } catch (_) {}

          // title 포함 형식으로 저장
          final archiveData = jsonEncode({
            'title': title.isEmpty ? '제목 없음' : title,
            'messages': jsonDecode(content),
          });
          await archiveFile.writeAsString(archiveData);
        }
      }
      return await writeConversationHistory([]);
    } catch (e) {
      debugPrint('LocalStorageService.clearConversationHistory error: $e');
      return false;
    }
  }

  /// Lists all archived conversation files.
  static Future<List<Map<String, String>>> listArchives() async {
    try {
      final dir = await _baseDirectory();
      final archivesDir = Directory('${dir.path}/archives');
      if (!await archivesDir.exists()) return [];

      final files = await archivesDir.list().toList();
      final list = <Map<String, String>>[];
      for (final f in files) {
        if (f is File && f.path.endsWith('.json')) {
          final stat = await f.stat();
          String title = '';

          // 아카이브 파일에서 title 읽기
          try {
            final content = await f.readAsString();
            final decoded = jsonDecode(content);
            if (decoded is Map && decoded.containsKey('title')) {
              // 새 형식: {title: "...", messages: [...]}
              title = decoded['title'] as String? ?? '';
            } else if (decoded is List && decoded.isNotEmpty) {
              // 기존 형식: [{role, content}, ...] — 첫 user 메시지에서 추출
              for (var msg in decoded) {
                if (msg is Map && msg['role'] == 'user') {
                  title = (msg['content'] as String? ?? '').trim();
                  if (title.length > 50) {
                    title = '${title.substring(0, 47)}...';
                  }
                  break;
                }
              }
            }
          } catch (_) {}

          list.add({
            'path': f.path,
            'name': f.path.split(Platform.pathSeparator).last,
            'date': stat.modified.toIso8601String(),
            'title': title.isEmpty ? '제목 없음' : title,
          });
        }
      }
      list.sort((a, b) => b['date']!.compareTo(a['date']!));
      return list;
    } catch (e) {
      debugPrint('LocalStorageService.listArchives error: $e');
      return [];
    }
  }

  /// Renames an archived conversation's title.
  static Future<bool> renameArchive(String path, String newTitle) async {
    try {
      final file = File(path);
      if (!await file.exists()) return false;

      final content = await file.readAsString();
      final decoded = jsonDecode(content);

      Map<String, dynamic> archiveData;
      if (decoded is Map) {
        // 새 형식
        archiveData = Map<String, dynamic>.from(decoded);
        archiveData['title'] = newTitle;
      } else if (decoded is List) {
        // 기존 형식 → 새 형식으로 마이그레이션
        archiveData = {
          'title': newTitle,
          'messages': decoded,
        };
      } else {
        return false;
      }

      await file.writeAsString(jsonEncode(archiveData));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.renameArchive error: $e');
      return false;
    }
  }

  /// Loads a specific archive and sets it as the current conversation.
  static Future<bool> loadArchive(String path) async {
    try {
      final archiveFile = File(path);
      if (await archiveFile.exists()) {
        final content = await archiveFile.readAsString();
        final decoded = jsonDecode(content);

        List messages;
        if (decoded is Map && decoded.containsKey('messages')) {
          // 새 형식: {title: "...", messages: [...]}
          messages = decoded['messages'] as List;
        } else if (decoded is List) {
          // 기존 형식: [{role, content}, ...]
          messages = decoded;
        } else {
          return false;
        }

        final history = messages
            .map((e) => Map<String, String>.from(
                  (e as Map).map(
                    (k, v) => MapEntry(k.toString(), v.toString()),
                  ),
                ))
            .toList();
        return await writeConversationHistory(history);
      }
      return false;
    } catch (e) {
      debugPrint('LocalStorageService.loadArchive error: $e');
      return false;
    }
  }

  static Future<List<Map<String, dynamic>>> readWrongNotes() async {
    try {
      final file = await wrongFile;
      if (!await file.exists()) {
        return [];
      }
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return [];
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      debugPrint('LocalStorageService.readWrongNotes error: $e');
      return [];
    }
  }

  static Future<bool> writeWrongNotes(List<dynamic> notes) async {
    try {
      final file = await wrongFile;
      await file.writeAsString(jsonEncode(notes));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeWrongNotes error: $e');
      return false;
    }
  }

  static Future<bool> updateWrongNoteStatus(String id, String newStatus) async {
    try {
      final notes = await readWrongNotes();
      bool found = false;
      for (var note in notes) {
        if (note['id'] == id) {
          note['status'] = newStatus;
          found = true;
          break;
        }
      }
      if (found) {
        return await writeWrongNotes(notes);
      }
      return false;
    } catch (e) {
      debugPrint('LocalStorageService.updateWrongNoteStatus error: $e');
      return false;
    }
  }

  static Future<bool> deleteWrongNote(String id) async {
    try {
      final notes = await readWrongNotes();
      final initialLength = notes.length;
      notes.removeWhere((note) => note['id'] == id);
      
      if (notes.length != initialLength) {
        return await writeWrongNotes(notes);
      }
      return false;
    } catch (e) {
      debugPrint('LocalStorageService.deleteWrongNote error: $e');
      return false;
    }
  }

  static Future<String> readTodo() async {
    try {
      final file = await todoFile;
      if (!await file.exists()) {
        await file.writeAsString(defaultTodo);
        return defaultTodo;
      }
      return await file.readAsString();
    } catch (e) {
      debugPrint('LocalStorageService.readTodo error: $e');
      return defaultTodo;
    }
  }

  static Future<bool> writeTodo(String content) async {
    try {
      final file = await todoFile;
      await file.writeAsString(content);
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeTodo error: $e');
      return false;
    }
  }

  /// Parses todo.md into a structured List<Map<String, dynamic>>
  /// [{ id, text, completed }]
  static Future<List<Map<String, dynamic>>> readTodoItems() async {
    try {
      final content = await readTodo();
      final lines = content.split('\n');
      final List<Map<String, dynamic>> items = [];
      int index = 0;
      for (final line in lines) {
        final trimmed = line.trim();
        if (trimmed.startsWith('- [ ]')) {
          final text = trimmed.substring(5).trim();
          if (text.isNotEmpty) {
            items.add({
              'id': 'todo_$index',
              'text': text,
              'completed': false,
            });
            index++;
          }
        } else if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
          final text = trimmed.substring(5).trim();
          if (text.isNotEmpty) {
            items.add({
              'id': 'todo_$index',
              'text': text,
              'completed': true,
            });
            index++;
          }
        }
      }
      return items;
    } catch (e) {
      debugPrint('LocalStorageService.readTodoItems error: $e');
      return [];
    }
  }

  /// Serializes structured todo items back to markdown and saves to todo.md
  static Future<bool> writeTodoItems(List<dynamic> items) async {
    try {
      final buffer = StringBuffer();
      buffer.writeln('# 오늘의 할 일 (Todo)');
      buffer.writeln();
      buffer.writeln('직접 수정해서 오늘 할 일을 기록하세요. (매일 오전 2시에 에이전트가 확인하여 초기화 또는 정리해 드립니다)');
      buffer.writeln();
      for (final item in items) {
        final text = (item['text'] ?? '').toString().trim();
        final bool completed = item['completed'] == true;
        if (text.isNotEmpty) {
          buffer.writeln(completed ? '- [x] $text' : '- [ ] $text');
        }
      }
      return await writeTodo(buffer.toString());
    } catch (e) {
      debugPrint('LocalStorageService.writeTodoItems error: $e');
      return false;
    }
  }

  static Future<List<Map<String, dynamic>>> appendTodoItem(String text) async {
    final items = await readTodoItems();
    if (text.trim().isNotEmpty) {
      items.add({
        'id': 'todo_${DateTime.now().millisecondsSinceEpoch}',
        'text': text.trim(),
        'completed': false,
      });
      await writeTodoItems(items);
    }
    return items;
  }

  static Future<List<Map<String, dynamic>>> toggleTodoItem(int index) async {
    final items = await readTodoItems();
    if (index >= 0 && index < items.length) {
      items[index]['completed'] = !(items[index]['completed'] == true);
      await writeTodoItems(items);
    }
    return items;
  }

  static Future<List<Map<String, dynamic>>> deleteTodoItem(int index) async {
    final items = await readTodoItems();
    if (index >= 0 && index < items.length) {
      items.removeAt(index);
      await writeTodoItems(items);
    }
    return items;
  }

  static Future<List<Map<String, dynamic>>> mergeTodoFromTags(String rawContent) async {
    try {
      final items = await readTodoItems();
      final lines = rawContent.split('\n');
      for (var line in lines) {
        line = line.trim();
        if (line.isEmpty) continue;
        bool completed = false;
        String text = line;
        if (line.startsWith('- [x]') || line.startsWith('- [X]')) {
          completed = true;
          text = line.substring(5).trim();
        } else if (line.startsWith('- [ ]')) {
          completed = false;
          text = line.substring(5).trim();
        } else if (line.startsWith('-')) {
          text = line.substring(1).trim();
        }
        if (text.isNotEmpty) {
          final existingIdx = items.indexWhere((it) => it['text'] == text);
          if (existingIdx != -1) {
            items[existingIdx]['completed'] = completed;
          } else {
            items.add({
              'id': 'todo_${DateTime.now().millisecondsSinceEpoch}_${items.length}',
              'text': text,
              'completed': completed,
            });
          }
        }
      }
      await writeTodoItems(items);
      return items;
    } catch (e) {
      debugPrint('LocalStorageService.mergeTodoFromTags error: $e');
      return await readTodoItems();
    }
  }

  static Future<void> resetTodoDaily() async {
    try {
      final current = await readTodo();
      final lines = current.split('\n');
      final newLines = <String>[];
      for (final line in lines) {
        if (!line.trim().startsWith('- [x]') && !line.trim().startsWith('- [X]')) {
          newLines.add(line);
        }
      }
      if (newLines.join('\n').trim().isEmpty) {
        await writeTodo(defaultTodo);
      } else {
        await writeTodo(newLines.join('\n'));
      }
    } catch (e) {
      debugPrint('LocalStorageService.resetTodoDaily error: $e');
    }
  }

  static Future<String> readTask() async {
    try {
      final file = await taskFile;
      if (!await file.exists()) {
        await file.writeAsString(defaultTask);
        return defaultTask;
      }
      return await file.readAsString();
    } catch (e) {
      debugPrint('LocalStorageService.readTask error: $e');
      return defaultTask;
    }
  }

  static Future<bool> writeTask(String content) async {
    try {
      final file = await taskFile;
      await file.writeAsString(content);
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeTask error: $e');
      return false;
    }
  }

  static Future<List<Map<String, dynamic>>> readMaskingRules() async {
    try {
      final file = await maskingFile;
      if (!await file.exists()) {
        return [];
      }
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return [];
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      debugPrint('LocalStorageService.readMaskingRules error: $e');
      return [];
    }
  }

  static Future<bool> writeMaskingRules(List<dynamic> rules) async {
    try {
      final file = await maskingFile;
      await file.writeAsString(jsonEncode(rules));
      return true;
    } catch (e) {
      debugPrint('LocalStorageService.writeMaskingRules error: $e');
      return false;
    }
  }

  static Future<String> applyMasking(String text) async {
    try {
      final rules = await readMaskingRules();
      if (rules.isEmpty) return text;
      String result = text;
      for (var rule in rules) {
        final original = rule['original']?.toString() ?? '';
        final masked = rule['masked']?.toString() ?? '';
        final bool enabled = rule['enabled'] != false;
        if (enabled && original.isNotEmpty && masked.isNotEmpty) {
          result = result.replaceAll(original, masked);
        }
      }
      return result;
    } catch (e) {
      debugPrint('LocalStorageService.applyMasking error: $e');
      return text;
    }
  }

}
