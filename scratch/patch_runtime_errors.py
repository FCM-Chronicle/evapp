import os

lib_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\lib"
web_src_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\evweb\src"

# ========================================================================
# PART 1: index.jsx fixes
# ========================================================================
index_path = os.path.join(web_src_dir, "index.jsx")
with open(index_path, 'r', encoding='utf-8') as f:
    idx = f.read()

# ---- FIX 1: Add Section helper component (used by ApiKeyScreen, SportsSettingsScreen, etc.)
# Insert it right before SportsSettingsScreen
section_component = """/* ------------------------------------------------------------------ */
/* Section 래퍼 — 설정 화면에서 그룹핑용                                   */
/* ------------------------------------------------------------------ */
function Section({ title, children }) {
    const { scale } = useResponsiveLayout();
    return (
        <div className="flex flex-col gap-2 p-4 rounded-lg mb-3" style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)" }}>
            {title && <span style={{ ...mono, color: C.accent, fontSize: 11 * (scale || 1), letterSpacing: 0.5, marginBottom: 4 }}>{title}</span>}
            {children}
        </div>
    );
}

"""

if "function Section(" not in idx:
    idx = idx.replace(
        "/* ------------------------------------------------------------------ */\n/* 스포츠 알림 설정",
        section_component + "/* ------------------------------------------------------------------ */\n/* 스포츠 알림 설정"
    )
    # Try alternate line endings
    if "function Section(" not in idx:
        idx = idx.replace(
            "/* ------------------------------------------------------------------ */\r\n/* 스포츠 알림 설정",
            section_component + "/* ------------------------------------------------------------------ */\r\n/* 스포츠 알림 설정"
        )

# ---- FIX 2: Add missing state in EVApp for setSearchEngineStatus and setAttachedFile
# These are used in the native event handler but not declared at EVApp level.
# setSearchEngineStatus and setAttachedFile need to be lifted or declared here.
old_evapp_state = """    const [wrongOcrProcessing, setWrongOcrProcessing] = useState(false);
    const [sharedOcrData, setSharedOcrData] = useState(null);"""

new_evapp_state = """    const [wrongOcrProcessing, setWrongOcrProcessing] = useState(false);
    const [sharedOcrData, setSharedOcrData] = useState(null);
    const [searchEngineStatus, setSearchEngineStatus] = useState(null);
    const [attachedFile, setAttachedFile] = useState(null);"""

idx = idx.replace(old_evapp_state, new_evapp_state)

# ---- FIX 3: SidePanel scroll fix - add overflow-y-auto to menu items container
idx = idx.replace(
    """                        <div className="flex flex-col p-2 gap-1">
                            {items.map(({ key, label, icon: Icon }) => (""",
    """                        <div className="flex-1 flex flex-col p-2 gap-1 overflow-y-auto">
                            {items.map(({ key, label, icon: Icon }) => ("""
)

# ---- FIX 4: Fix screen share button - setAttachedFile is now available at EVApp level,
# but the screen share onClick is inside MainScreen which has its OWN attachedFile state.
# The issue is that chat_image_picked handler in EVApp sets EVApp's attachedFile,
# but MainScreen has its own copy. We need to pass it down or use the MainScreen's handler.
# Actually, looking at the code - MainScreen has its own attachedFile state at line 1355.
# The issue is that chat_image_picked in EVApp sets EVApp's setAttachedFile but MainScreen
# doesn't know about it. Let me check how chat_image_picked flows...

# The screen share button is inside MainScreen so it uses MainScreen's setAttachedFile (line 1355)
# But the chat_image_picked native event is handled in EVApp which needs to forward to MainScreen.
# The simplest fix: make EVApp's native event handler for chat_image_picked forward via a state prop.

# Actually let me re-check: MainScreen already has attachedFile state (line 1355).
# The native events chat_image_picked and file_picked are handled in EVApp at lines 3144-3157.
# They call setAttachedFile which is EVApp-level, NOT MainScreen-level.
# This is the ROOT CAUSE of setAttachedFile not working!

# The fix: Remove chat_image_picked/file_picked handling from EVApp's native event handler
# and instead add a state variable that MainScreen can pick up.

# Actually, the simplest approach: add attachedFileEvent state to EVApp that MainScreen consumes
old_chat_image = """                case "chat_image_picked":
                    setAttachedFile({ name: payload.name, base64: payload.base64, type: "image/picked" });
                    triggerAlert("success");
                    break;

                case "file_picked":
                    if (payload.success && payload.text) {
                        setAttachedFile({ name: payload.filename, text: payload.text, type: "document" });
                        triggerAlert("success");
                    } else {
                        triggerToast({ eyebrow: "첨부 실패", message: payload.error || "파일을 읽을 수 없습니다.", icon: BellRing, color: C.danger });
                        triggerAlert("error");
                    }
                    break;"""

new_chat_image = """                case "chat_image_picked":
                    setAttachedFile({ name: payload.name, base64: payload.base64, type: "image/picked", _ts: Date.now() });
                    triggerAlert("success");
                    break;

                case "file_picked":
                    if (payload.success && payload.text) {
                        setAttachedFile({ name: payload.filename, text: payload.text, type: "document", _ts: Date.now() });
                        triggerAlert("success");
                    } else {
                        triggerToast({ eyebrow: "첨부 실패", message: payload.error || "파일을 읽을 수 없습니다.", icon: BellRing, color: C.danger });
                        triggerAlert("error");
                    }
                    break;"""

idx = idx.replace(old_chat_image, new_chat_image)

# Now find MainScreen and pass attachedFileEvent prop down
# First find the MainScreen render call in EVApp
old_main_render = """                    <MainScreen"""
# Find the props being passed to MainScreen
# We need to check what's there
import re
main_screen_match = re.search(r'<MainScreen\b', idx)
if main_screen_match:
    pos = main_screen_match.start()
    # Find the closing />
    end_pos = idx.find('/>', pos)
    main_screen_tag = idx[pos:end_pos+2]

# Add attachedFileFromNative prop to MainScreen
idx = idx.replace(
    """                    <MainScreen
                        onMenu=""",
    """                    <MainScreen
                        attachedFileFromNative={attachedFile}
                        onMenu="""
)

# Now in MainScreen function, receive and use this prop
old_main_screen_fn = """function MainScreen({ onMenu, historyOn, alertPulse, toast, calendarMd, newChatSignal, musicOn, musicCollapsed, musicTrack,"""
new_main_screen_fn = """function MainScreen({ onMenu, historyOn, alertPulse, toast, calendarMd, newChatSignal, musicOn, musicCollapsed, musicTrack, attachedFileFromNative,"""
idx = idx.replace(old_main_screen_fn, new_main_screen_fn)

# Check if this prop pattern exists
if "attachedFileFromNative" in idx:
    # Add useEffect in MainScreen to pick up attachedFileFromNative
    old_main_attached = """    const [attachedFile, setAttachedFile] = useState(null);"""
    new_main_attached = """    const [attachedFile, setAttachedFile] = useState(null);

    // EVApp에서 네이티브 이벤트(chat_image_picked/file_picked)로 받은 첨부 파일을 동기화
    useEffect(() => {
        if (attachedFileFromNative) {
            setAttachedFile(attachedFileFromNative);
        }
    }, [attachedFileFromNative]);"""
    idx = idx.replace(old_main_attached, new_main_attached, 1)

# ---- FIX 5: Pass searchEngineStatus from EVApp down to MainScreen
idx = idx.replace(
    """                        attachedFileFromNative={attachedFile}""",
    """                        attachedFileFromNative={attachedFile}
                        searchEngineStatusFromParent={searchEngineStatus}"""
)

# Update MainScreen to receive it
idx = idx.replace(
    """attachedFileFromNative,""",
    """attachedFileFromNative, searchEngineStatusFromParent,"""
)

# In MainScreen, the searchEngineStatus state at line 1357 should sync with parent
old_search_state = """    const [searchEngineStatus, setSearchEngineStatus] = useState(null);"""
new_search_state = """    const [searchEngineStatus, setSearchEngineStatus] = useState(null);

    // EVApp에서 네이티브 이벤트(search_status)로 받은 검색 상태를 동기화
    useEffect(() => {
        setSearchEngineStatus(searchEngineStatusFromParent);
    }, [searchEngineStatusFromParent]);"""
idx = idx.replace(old_search_state, new_search_state, 1)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(idx)
print("[1/2] index.jsx fixed: Section component, state lifting, SidePanel scroll, attachedFile flow")

# ========================================================================
# PART 2: llm_service.dart - Add 120s timeout for DeepSeek/slow models
# ========================================================================
llm_path = os.path.join(lib_dir, "llm_service.dart")
with open(llm_path, 'r', encoding='utf-8') as f:
    llm = f.read()

# Add timeout to the main generateResponse HTTP call
llm = llm.replace(
    """      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $apiKey',
        },
        body: jsonEncode({
          'model': modelName,
          'messages': [
            {'role': 'system', 'content': finalSystemPrompt},""",
    """      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $apiKey',
        },
        body: jsonEncode({
          'model': modelName,
          'messages': [
            {'role': 'system', 'content': finalSystemPrompt},""",
    1
)

# Add .timeout to the http.post call closing
# Find the specific pattern after the post body
old_post_end = """          'temperature': 0.7,
        }),
      );

      if (response.statusCode == 200) {"""

new_post_end = """          'temperature': 0.7,
        }),
      ).timeout(const Duration(seconds: 120), onTimeout: () {
        throw Exception('API 요청 시간이 초과되었습니다 (120초). 모델이 응답하는 데 너무 오래 걸립니다.');
      });

      if (response.statusCode == 200) {"""

llm = llm.replace(old_post_end, new_post_end, 1)

# Fix the catch block to handle timeout and 504 errors
old_catch = """    } catch (e) {
      debugPrint('LLM API Error: $e');
      return LlmResponse('Error: $e');
    }"""

new_catch = """    } catch (e) {
      debugPrint('LLM API Error: $e');
      String errorMsg = e.toString();
      if (errorMsg.contains('504') || errorMsg.contains('Gateway Timeout')) {
        return const LlmResponse('서버 응답 시간이 초과되었습니다 (504 Gateway Timeout). 잠시 후 다시 시도해 주세요. 프롬프트가 너무 긴 경우 질문을 짧게 나눠서 보내면 도움이 됩니다.');
      }
      if (errorMsg.contains('시간이 초과') || errorMsg.contains('TimeoutException')) {
        return const LlmResponse('AI 모델 응답 대기 시간이 초과되었습니다. 네트워크 상태를 확인하거나 더 빠른 모델(llama-3.3-70b 등)을 사용해 보세요.');
      }
      return LlmResponse('Error: $errorMsg');
    }"""

if old_catch in llm:
    llm = llm.replace(old_catch, new_catch, 1)

# Also add timeout to processOcrForWrongNoteImage (vision call for wrong notes)
llm = llm.replace(
    """          'temperature': 0.3,
        }),
      );

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        String content = jsonResponse['choices'][0]['message']['content'] as String;
        content = content.trim();

        if (content.startsWith('```')) {
          final lines = content.split('\\n');
          if (lines.first.startsWith('```json') || lines.first.startsWith('```')) {
            lines.removeAt(0);
          }
          if (lines.last.startsWith('```')) {
            lines.removeLast();
          }
          content = lines.join('\\n').trim();
        }

        final decoded = jsonDecode(content);
        if (decoded is Map) {
          return decoded.cast<String, dynamic>();
        }
      }
    } catch (e) {
      debugPrint('processOcrForWrongNote error: $e');""",
    """          'temperature': 0.3,
        }),
      ).timeout(const Duration(seconds: 90));

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        String content = jsonResponse['choices'][0]['message']['content'] as String;
        content = content.trim();

        if (content.startsWith('```')) {
          final lines = content.split('\\n');
          if (lines.first.startsWith('```json') || lines.first.startsWith('```')) {
            lines.removeAt(0);
          }
          if (lines.last.startsWith('```')) {
            lines.removeLast();
          }
          content = lines.join('\\n').trim();
        }

        final decoded = jsonDecode(content);
        if (decoded is Map) {
          return decoded.cast<String, dynamic>();
        }
      } else {
        debugPrint('processOcrForWrongNote API error: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      debugPrint('processOcrForWrongNote error: $e');""",
    1
)

with open(llm_path, 'w', encoding='utf-8') as f:
    f.write(llm)
print("[2/2] llm_service.dart fixed: 120s timeout, 504 error handling, vision OCR timeout")

print("\nAll runtime error fixes applied.")

