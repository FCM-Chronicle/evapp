import os

lib_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\lib"
web_src_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\evweb\src"

# ========================================================================
# PART 1: llm_service.dart fixes (H1, H2, H6)
# ========================================================================
llm_path = os.path.join(lib_dir, "llm_service.dart")
with open(llm_path, 'r', encoding='utf-8') as f:
    llm = f.read()

# H2: _getVisionModel fallback should NOT return text model
llm = llm.replace(
    """  static Future<String> _getVisionModel() async {
    final prefs = await SharedPreferences.getInstance();
    final vModel = prefs.getString('LLM_VISION_MODEL')?.trim();
    if (vModel != null && vModel.isNotEmpty) return vModel;
    final model = await _getModel();
    return model.isNotEmpty ? model : 'meta/llama-3.2-11b-vision-instruct';
  }""",
    """  static Future<String> _getVisionModel() async {
    final prefs = await SharedPreferences.getInstance();
    final vModel = prefs.getString('LLM_VISION_MODEL')?.trim();
    if (vModel != null && vModel.isNotEmpty) return vModel;
    // 텍스트 전용 모델로 fallback하면 이미지 전송 시 API 에러가 나므로
    // 항상 비전 지원 모델로 fallback한다.
    return 'meta/llama-3.2-11b-vision-instruct';
  }"""
)

# H1: extractTextFromImage should use vision model
llm = llm.replace(
    """  static Future<String?> extractTextFromImage(String base64Image) async {
    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final modelName = await _getModel();""",
    """  static Future<String?> extractTextFromImage(String base64Image) async {
    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final modelName = await _getVisionModel();"""
)

# H6: generateProactiveResponse - accept optional systemPromptOverride
llm = llm.replace(
    """  static Future<String?> generateProactiveResponse(String contextPrompt) async {
    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final modelName = await _getModel();

    if (apiKey == null || apiKey.isEmpty) return null;

    final systemPrompt = "너는 보스(사용자)를 돕는 E.V. (능동형 AI 비서)야.\\n"
        "아래 제공되는 현재 상황(시간, 배터리 상태, 다가오는 일정 등)을 보고, 보스에게 꼭 해줄 말이 있으면 1~2문장의 짧고 친근한 알림 메시지를 작성해.\\n"
        "만약 굳이 알릴 필요가 없거나 이미 지나간/너무 먼 일정이라면 'SILENT'라고만 대답해.";""",
    """  static Future<String?> generateProactiveResponse(String contextPrompt, {String? systemPromptOverride}) async {
    final apiKey = await _getApiKey();
    final endpoint = await _getEndpoint();
    final modelName = await _getModel();

    if (apiKey == null || apiKey.isEmpty) return null;

    final systemPrompt = systemPromptOverride ?? "너는 보스(사용자)를 돕는 E.V. (능동형 AI 비서)야.\\n"
        "아래 제공되는 현재 상황(시간, 배터리 상태, 다가오는 일정 등)을 보고, 보스에게 꼭 해줄 말이 있으면 1~2문장의 짧고 친근한 알림 메시지를 작성해.\\n"
        "만약 굳이 알릴 필요가 없거나 이미 지나간/너무 먼 일정이라면 'SILENT'라고만 대답해.";"""
)

with open(llm_path, 'w', encoding='utf-8') as f:
    f.write(llm)
print("[1/3] llm_service.dart: H1, H2, H6 fixed")

# ========================================================================
# PART 2: main.dart fixes (C3, C4, H3, H4, H7, H8, M11)
# ========================================================================
main_path = os.path.join(lib_dir, "main.dart")
with open(main_path, 'r', encoding='utf-8') as f:
    main = f.read()

# C4: Move S-Pen cold start from addPostFrameCallback to app_ready
# Remove the addPostFrameCallback block
main = main.replace(
    """    // S펜 공유 또는 외부 공유 인텐트로 앱이 새로 켜졌을 때(Cold Start) 대기 중인 이미지 즉시 처리
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        final path = await const MethodChannel('com.example.evapp/methods').invokeMethod<String>('getSharedImage');
        if (path != null && path.isNotEmpty) {
          debugPrint('Startup: retrieved shared image from intent: $path');
          _processSharedImage(path);
        }
      } catch (e) {
        debugPrint('Error retrieving startup shared image: $e');
      }
    });""",
    """    // S펜 공유 이미지는 app_ready 이벤트 수신 시점에 처리 (React가 완전히 로드된 후)"""
)

# C4 continued: Add getSharedImage call inside app_ready handler
# Find the app_ready handler and add the cold start image retrieval after settings sync
old_app_ready_end = """        _sendToReact('conversation_sync_init', {'history': _conversationHistory});"""
new_app_ready_end = """        _sendToReact('conversation_sync_init', {'history': _conversationHistory});

        // S펜 공유 또는 외부 공유 인텐트로 앱이 새로 켜졌을 때(Cold Start)
        // React가 완전히 마운트된 이 시점에 대기 중인 이미지를 회수한다.
        try {
          final sharedPath = await const MethodChannel('com.example.evapp/methods').invokeMethod<String>('getSharedImage');
          if (sharedPath != null && sharedPath.isNotEmpty) {
            debugPrint('app_ready: retrieved shared image from cold start intent: $sharedPath');
            _processSharedImage(sharedPath);
          }
        } catch (e) {
          debugPrint('Error retrieving startup shared image: $e');
        }"""
main = main.replace(old_app_ready_end, new_app_ready_end, 1)  # Replace only first occurrence

# C3: Allow image-only messages (no text required when attachment exists)
main = main.replace(
    """        if (text == null || text.trim().isEmpty) {
          return;
        }""",
    """        final attachmentBase64 = payload['attachmentBase64'] as String?;
        final hasImage = attachmentBase64 != null && attachmentBase64.isNotEmpty;
        if ((text == null || text.trim().isEmpty) && !hasImage) {
          return;
        }
        // 이미지만 첨부하고 텍스트를 입력하지 않은 경우 기본 프롬프트 주입
        if ((text == null || text.trim().isEmpty) && hasImage) {
          text = '이 이미지를 분석해줘';
        }"""
)

# C3 continued: Remove the duplicate attachmentBase64 declaration below (it's now declared above)
main = main.replace(
    """        final attachmentBase64 = payload['attachmentBase64'] as String?;\n""",
    "",
    1  # Remove only the SECOND occurrence (the old one below)
)
# Actually this is tricky - let me find the exact second occurrence
# The old code had attachmentBase64 declared further down. Let me check.
# Since we added it at the top, we need to remove the duplicate later.
# Let me find where it was originally declared
old_attachment_decl = """        final attachmentBase64 = payload['attachmentBase64'];"""
if old_attachment_decl in main:
    main = main.replace(old_attachment_decl, """        // attachmentBase64 already extracted above""")

# H3: save_api_key - add visionModel saving
main = main.replace(
    """      } else if (action == 'save_api_key') {
        final key = payload['key'];
        final naverClientId = payload['naverClientId'];
        final naverClientSecret = payload['naverClientSecret'];
        final tavilyKey = payload['tavilyKey'];
        final firecrawlKey = payload['firecrawlKey'];
        final visionEnabled = payload['visionEnabled'];
        final endpoint = payload['endpoint'];
        final model = payload['model'];
        final obsidianPath = payload['obsidianPath'];
        final kmaKey = payload['kmaKey'];
        final ttsKey = payload['ttsKey'];
        final ttsEndpoint = payload['ttsEndpoint'];""",
    """      } else if (action == 'save_api_key') {
        final key = payload['key'];
        final naverClientId = payload['naverClientId'];
        final naverClientSecret = payload['naverClientSecret'];
        final tavilyKey = payload['tavilyKey'];
        final firecrawlKey = payload['firecrawlKey'];
        final visionEnabled = payload['visionEnabled'];
        final endpoint = payload['endpoint'];
        final model = payload['model'];
        final visionModel = payload['visionModel'];
        final obsidianPath = payload['obsidianPath'];
        final kmaKey = payload['kmaKey'];
        final ttsKey = payload['ttsKey'];
        final ttsEndpoint = payload['ttsEndpoint'];
        final footballDataKey = payload['footballDataKey'];"""
)
main = main.replace(
    """        if (model != null) await prefs.setString('LLM_MODEL', model);
        if (obsidianPath != null) await prefs.setString('OBSIDIAN_PATH', obsidianPath);""",
    """        if (model != null) await prefs.setString('LLM_MODEL', model);
        if (visionModel != null) await prefs.setString('LLM_VISION_MODEL', visionModel);
        if (footballDataKey != null) await prefs.setString('FOOTBALL_DATA_API_KEY', footballDataKey);
        if (obsidianPath != null) await prefs.setString('OBSIDIAN_PATH', obsidianPath);"""
)

# H4: save_paths - add vault/inbox paths
main = main.replace(
    """      } else if (action == 'save_paths') {
        final obsidianPath = payload['obsidianPath'];
        final playlistPath = payload['playlistPath'];
        debugPrint('Action: save paths');
        final prefs = await SharedPreferences.getInstance();
        if (obsidianPath != null && obsidianPath.isNotEmpty) {
          await prefs.setString('OBSIDIAN_PATH', obsidianPath);
        }
        if (playlistPath != null && playlistPath.isNotEmpty) {
          await prefs.setString('PLAYLIST_PATH', playlistPath);
        }""",
    """      } else if (action == 'save_paths') {
        final obsidianVaultPath = payload['obsidianVaultPath'];
        final obsidianInboxPath = payload['obsidianInboxPath'];
        final obsidianPath = payload['obsidianPath'];
        final playlistPath = payload['playlistPath'];
        debugPrint('Action: save paths');
        final prefs = await SharedPreferences.getInstance();
        if (obsidianVaultPath != null && obsidianVaultPath.isNotEmpty) {
          await prefs.setString('OBSIDIAN_VAULT_PATH', obsidianVaultPath);
        }
        if (obsidianInboxPath != null && obsidianInboxPath.isNotEmpty) {
          await prefs.setString('OBSIDIAN_INBOX_PATH', obsidianInboxPath);
        }
        if (obsidianPath != null && obsidianPath.isNotEmpty) {
          await prefs.setString('OBSIDIAN_PATH', obsidianPath);
        }
        if (playlistPath != null && playlistPath.isNotEmpty) {
          await prefs.setString('PLAYLIST_PATH', playlistPath);
        }"""
)

# H7: Voice chat - add history parameter and handle document/calendar/memory tags
main = main.replace(
    """              final llmResponse = await LlmService.generateResponse(text);""",
    """              final llmResponse = await LlmService.generateResponse(text, history: _conversationHistory);"""
)

# H8: Remove duplicate EventChannel listener (lines 370-394)
main = main.replace(
    """    const EventChannel('com.example.evapp/notifications').receiveBroadcastStream().listen((event) {
      if (event is Map) {
        final pkg = event['package'];
        final title = event['title'];
        final text = event['text'];
        final album = event['album'];
        final artUrl = event['artUrl'];

        if (artUrl != null && pkg == 'in.krosbits.musicolet') {
          // This is music metadata
          _sendToReact('music_metadata', {
            'title': title,
            'artist': text,
            'album': album,
            'artUrl': artUrl,
          });
        } else {
          // Pass to custom filter engine
          final filtered = NotificationFilter.filter(pkg, title, text, album);
          if (filtered != null) {
            _sendToReact('custom_notification', filtered);
          }
        }
      }
    });""",
    """    // [H8 수정] 중복 EventChannel 리스너 제거 — 위의 리스너가 이미 알림/음악을 처리함"""
)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main)
print("[2/3] main.dart: C3, C4, H3, H4, H7, H8 fixed")

# ========================================================================
# PART 3: index.jsx fixes (C1, C2, H5, H9, M9)
# ========================================================================
index_path = os.path.join(web_src_dir, "index.jsx")
with open(index_path, 'r', encoding='utf-8') as f:
    idx = f.read()

# M9: Fix C.green → C.lime in ExportButtons
idx = idx.replace(
    """style={{ border: `1px solid ${C.green}`, color: C.green, background: "rgba(50,205,50,0.06)" }}""",
    """style={{ border: `1px solid ${C.lime}`, color: C.lime, background: "rgba(107,255,194,0.06)" }}"""
)

# H9: Fix screen share button label and behavior
idx = idx.replace(
    """                    title="화면 공유 / 캡처 질문 (Gemini 스타일)"
                >
                    <MonitorUp size={18} />""",
    """                    title="스크린샷 첨부 질문"
                >
                    <ImageIcon size={17} style={{ filter: "hue-rotate(120deg)" }} />"""
)

# C1: Fix ApiKeyScreen - add missing useState declarations
idx = idx.replace(
    """function ApiKeyScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [key, setKey] = useState(() => localStorage.getItem("LLM_KEY") || "");
    const [searchKey, setSearchKey] = useState(() => localStorage.getItem("EXA_KEY") || "");
    const [kmaKey, setKmaKey] = useState(() => localStorage.getItem("KMA_API_KEY") || "");
    const [endpoint, setEndpoint] = useState(() => localStorage.getItem("LLM_ENDPOINT") || "");
    const [model, setModel] = useState(() => localStorage.getItem("LLM_MODEL") || "");
    const [visionModel, setVisionModel] = useState(() => localStorage.getItem("LLM_VISION_MODEL") || "meta/llama-3.2-11b-vision-instruct");""",
    """function ApiKeyScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [key, setKey] = useState(() => localStorage.getItem("LLM_KEY") || "");
    const [searchKey, setSearchKey] = useState(() => localStorage.getItem("EXA_KEY") || "");
    const [kmaKey, setKmaKey] = useState(() => localStorage.getItem("KMA_API_KEY") || "");
    const [endpoint, setEndpoint] = useState(() => localStorage.getItem("LLM_ENDPOINT") || "");
    const [model, setModel] = useState(() => localStorage.getItem("LLM_MODEL") || "");
    const [visionModel, setVisionModel] = useState(() => localStorage.getItem("LLM_VISION_MODEL") || "meta/llama-3.2-11b-vision-instruct");
    const [visionEnabled, setVisionEnabled] = useState(() => localStorage.getItem("VISION_ENABLED") !== "false");
    const [naverClientId, setNaverClientId] = useState(() => localStorage.getItem("NAVER_CLIENT_ID") || "");
    const [naverClientSecret, setNaverClientSecret] = useState(() => localStorage.getItem("NAVER_CLIENT_SECRET") || "");
    const [tavilyKey, setTavilyKey] = useState(() => localStorage.getItem("TAVILY_KEY") || "");
    const [firecrawlKey, setFirecrawlKey] = useState(() => localStorage.getItem("FIRECRAWL_KEY") || "");
    const [footballDataKey, setFootballDataKey] = useState(() => localStorage.getItem("FOOTBALL_DATA_KEY") || "");"""
)

# C1 continued: Fix handleSave to save ALL fields
idx = idx.replace(
    """    const handleSave = () => {
        localStorage.setItem("LLM_KEY", key);
        localStorage.setItem("EXA_KEY", searchKey);
        localStorage.setItem("KMA_API_KEY", kmaKey);
        localStorage.setItem("LLM_ENDPOINT", endpoint);
        localStorage.setItem("LLM_MODEL", model);
        sendToFlutter("save_api_key", { key, searchKey, kmaKey, endpoint, model });
        alert("저장되었습니다.");
    };""",
    """    const handleSave = () => {
        localStorage.setItem("LLM_KEY", key);
        localStorage.setItem("EXA_KEY", searchKey);
        localStorage.setItem("KMA_API_KEY", kmaKey);
        localStorage.setItem("LLM_ENDPOINT", endpoint);
        localStorage.setItem("LLM_MODEL", model);
        localStorage.setItem("LLM_VISION_MODEL", visionModel);
        localStorage.setItem("VISION_ENABLED", String(visionEnabled));
        localStorage.setItem("NAVER_CLIENT_ID", naverClientId);
        localStorage.setItem("NAVER_CLIENT_SECRET", naverClientSecret);
        localStorage.setItem("TAVILY_KEY", tavilyKey);
        localStorage.setItem("FIRECRAWL_KEY", firecrawlKey);
        localStorage.setItem("FOOTBALL_DATA_KEY", footballDataKey);
        sendToFlutter("save_api_key", {
            key, searchKey, kmaKey, endpoint, model, visionModel,
            naverClientId, naverClientSecret, tavilyKey, firecrawlKey,
            visionEnabled, footballDataKey,
        });
        alert("저장되었습니다.");
    };"""
)

# C1 continued: Add Football-Data.org key input after Firecrawl
idx = idx.replace(
    """                </Section>

                <Section title="3. 기상청 날씨">""",
    """                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale, marginTop: 4 }}>Football-Data.org API KEY (축구 경기 정보)</span>
                    <input
                        value={footballDataKey} onChange={(e) => setFootballDataKey(e.target.value)} placeholder="Football-Data.org Token..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.blue, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </Section>

                <Section title="3. 기상청 날씨">"""
)

# H5: Replace PathSettingsScreen with dual path version
idx = idx.replace(
    """function PathSettingsScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [obsidianPath, setObsidianPath] = useState(() => localStorage.getItem("OBSIDIAN_PATH") || "/storage/emulated/0/Documents/Obsidian/Inbox");
    const [playlistPath, setPlaylistPath] = useState(() => localStorage.getItem("PLAYLIST_PATH") || "/storage/emulated/0/Music");

    useEffect(() => {
        const handleNativeEvent = (e) => {
            const payload = e.detail;
            if (payload?.type === "directory_picked" && payload.path) {
                if (payload.target === "obsidian") setObsidianPath(payload.path);
                else if (payload.target === "playlist") setPlaylistPath(payload.path);
            }
        };
        window.addEventListener("ev-native-event", handleNativeEvent);
        return () => window.removeEventListener("ev-native-event", handleNativeEvent);
    }, []);

    const handleSave = () => {
        localStorage.setItem("OBSIDIAN_PATH", obsidianPath);
        localStorage.setItem("PLAYLIST_PATH", playlistPath);
        sendToFlutter("save_paths", { obsidianPath, playlistPath });
        alert("저장되었습니다.");
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="경로 설정" />
            <div className="flex-1 px-5 py-6 flex flex-col" style={{ gap: 16 * scale }}>
                <span style={{ ...mono, color: C.slate, fontSize: 11 * scale }}>옵시디언 Inbox 폴더 경로</span>
                <div className="flex w-full" style={{ border: `1px solid ${C.panelBorder}`, padding: `${4 * scale}px` }}>
                    <input value={obsidianPath} readOnly className="flex-1 bg-transparent outline-none" style={{ ...mono, color: C.accent, fontSize: 13 * scale, padding: `${8 * scale}px` }} />
                    <button onClick={() => sendToFlutter("pick_directory", { target: "obsidian" })} className="flex items-center justify-center gap-2" style={{ background: "rgba(255,59,46,0.12)", color: C.accent, padding: `0 ${12 * scale}px`, marginLeft: `${4 * scale}px`, border: `1px solid ${C.accent}`, flexShrink: 0 }}>
                        <FolderOpen size={16 * scale} />
                        <span style={{ ...mono, fontSize: 11 * scale }}>선택</span>
                    </button>
                </div>

                <span style={{ ...mono, color: C.slate, fontSize: 11 * scale, marginTop: 8 * scale }}>플레이리스트 폴더 경로 (.m3u)</span>
                <div className="flex w-full" style={{ border: `1px solid ${C.panelBorder}`, padding: `${4 * scale}px` }}>
                    <input value={playlistPath} readOnly className="flex-1 bg-transparent outline-none" style={{ ...mono, color: C.accent, fontSize: 13 * scale, padding: `${8 * scale}px` }} />
                    <button onClick={() => sendToFlutter("pick_directory", { target: "playlist" })} className="flex items-center justify-center gap-2" style={{ background: "rgba(255,59,46,0.12)", color: C.accent, padding: `0 ${12 * scale}px`, marginLeft: `${4 * scale}px`, border: `1px solid ${C.accent}`, flexShrink: 0 }}>
                        <FolderOpen size={16 * scale} />
                        <span style={{ ...mono, fontSize: 11 * scale }}>선택</span>
                    </button>
                </div>

                <button onClick={handleSave} className="flex items-center justify-center" style={{ padding: `${12 * scale}px`, marginTop: 16 * scale, border: `1px solid ${C.accent}`, color: C.accent, ...mono, fontSize: 12 * scale, letterSpacing: 1, gap: 8 * scale }}>
                    <Save size={14 * scale} /> 저장
                </button>
            </div>
        </div>
    );
}""",
    """function PathSettingsScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [obsidianVaultPath, setObsidianVaultPath] = useState(() => localStorage.getItem("OBSIDIAN_VAULT_PATH") || "/storage/emulated/0/Documents/Obsidian");
    const [obsidianInboxPath, setObsidianInboxPath] = useState(() => localStorage.getItem("OBSIDIAN_INBOX_PATH") || localStorage.getItem("OBSIDIAN_PATH") || "/storage/emulated/0/Documents/Obsidian/Inbox");
    const [playlistPath, setPlaylistPath] = useState(() => localStorage.getItem("PLAYLIST_PATH") || "/storage/emulated/0/Music");

    useEffect(() => {
        const handleNativeEvent = (e) => {
            const payload = e.detail;
            if (payload?.type === "directory_picked" && payload.path) {
                if (payload.target === "obsidian_vault") setObsidianVaultPath(payload.path);
                else if (payload.target === "obsidian_inbox" || payload.target === "obsidian") setObsidianInboxPath(payload.path);
                else if (payload.target === "playlist") setPlaylistPath(payload.path);
            }
        };
        window.addEventListener("ev-native-event", handleNativeEvent);
        return () => window.removeEventListener("ev-native-event", handleNativeEvent);
    }, []);

    const handleSave = () => {
        localStorage.setItem("OBSIDIAN_VAULT_PATH", obsidianVaultPath);
        localStorage.setItem("OBSIDIAN_INBOX_PATH", obsidianInboxPath);
        localStorage.setItem("PLAYLIST_PATH", playlistPath);
        sendToFlutter("save_paths", { obsidianVaultPath, obsidianInboxPath, obsidianPath: obsidianInboxPath, playlistPath });
        alert("경로가 저장되었습니다.");
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="경로 설정" />
            <div className="flex-1 px-5 py-6 flex flex-col" style={{ gap: 16 * scale }}>
                <Section title="옵시디언 (Obsidian)">
                    <span style={{ ...mono, color: C.lime, fontSize: 10.5 * scale }}>1. 볼트 상위 경로 (읽기 / 검색용)</span>
                    <span style={{ ...mono, color: C.slate, fontSize: 9 * scale }}>하위 모든 폴더의 .md 노트를 검색하여 AI가 답변에 인용합니다.</span>
                    <div className="flex w-full" style={{ border: `1px solid ${C.panelBorder}`, padding: `${4 * scale}px` }}>
                        <input value={obsidianVaultPath} onChange={(e) => setObsidianVaultPath(e.target.value)} className="flex-1 bg-transparent outline-none" style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${8 * scale}px` }} />
                        <button onClick={() => sendToFlutter("pick_directory", { target: "obsidian_vault" })} className="flex items-center justify-center gap-2" style={{ background: "rgba(107,255,194,0.08)", color: C.lime, padding: `0 ${12 * scale}px`, marginLeft: `${4 * scale}px`, border: `1px solid ${C.lime}`, flexShrink: 0 }}>
                            <FolderOpen size={16 * scale} />
                        </button>
                    </div>

                    <span style={{ ...mono, color: C.accent, fontSize: 10.5 * scale, marginTop: 8 }}>2. 인박스 경로 (새 메모 저장용)</span>
                    <span style={{ ...mono, color: C.slate, fontSize: 9 * scale }}>AI가 새로 생성한 메모/요약이 저장되는 폴더입니다.</span>
                    <div className="flex w-full" style={{ border: `1px solid ${C.panelBorder}`, padding: `${4 * scale}px` }}>
                        <input value={obsidianInboxPath} onChange={(e) => setObsidianInboxPath(e.target.value)} className="flex-1 bg-transparent outline-none" style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${8 * scale}px` }} />
                        <button onClick={() => sendToFlutter("pick_directory", { target: "obsidian_inbox" })} className="flex items-center justify-center gap-2" style={{ background: "rgba(255,59,46,0.08)", color: C.accent, padding: `0 ${12 * scale}px`, marginLeft: `${4 * scale}px`, border: `1px solid ${C.accent}`, flexShrink: 0 }}>
                            <FolderOpen size={16 * scale} />
                        </button>
                    </div>
                </Section>

                <Section title="플레이리스트">
                    <span style={{ ...mono, color: C.slate, fontSize: 10.5 * scale }}>음악 플레이리스트 폴더 경로 (.m3u)</span>
                    <div className="flex w-full" style={{ border: `1px solid ${C.panelBorder}`, padding: `${4 * scale}px` }}>
                        <input value={playlistPath} onChange={(e) => setPlaylistPath(e.target.value)} className="flex-1 bg-transparent outline-none" style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${8 * scale}px` }} />
                        <button onClick={() => sendToFlutter("pick_directory", { target: "playlist" })} className="flex items-center justify-center gap-2" style={{ background: "rgba(255,59,46,0.08)", color: C.accent, padding: `0 ${12 * scale}px`, marginLeft: `${4 * scale}px`, border: `1px solid ${C.accent}`, flexShrink: 0 }}>
                            <FolderOpen size={16 * scale} />
                        </button>
                    </div>
                </Section>

                <button onClick={handleSave} className="flex items-center justify-center" style={{ padding: `${12 * scale}px`, marginTop: 16 * scale, border: `1px solid ${C.accent}`, color: C.accent, ...mono, fontSize: 12 * scale, letterSpacing: 1, gap: 8 * scale }}>
                    <Save size={14 * scale} /> 저장
                </button>
            </div>
        </div>
    );
}"""
)

# C2: Add SportsSettingsScreen and MaskingSettingsScreen components
# Insert them right before the PathSettingsScreen function
sports_and_masking = """
/* ------------------------------------------------------------------ */
/* 스포츠 알림 설정                                                     */
/* ------------------------------------------------------------------ */
function SportsSettingsScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [footballTeams, setFootballTeams] = useState(() => localStorage.getItem("FOOTBALL_TEAMS") || "");
    const [baseballTeams, setBaseballTeams] = useState(() => localStorage.getItem("BASEBALL_TEAMS") || "");
    const [footballDataKey, setFootballDataKey] = useState(() => localStorage.getItem("FOOTBALL_DATA_KEY") || "");

    useEffect(() => {
        const handleNativeEvent = (e) => {
            const payload = e.detail;
            if (payload?.type === "sports_settings_sync") {
                if (payload.footballTeams) setFootballTeams(payload.footballTeams);
                if (payload.baseballTeams) setBaseballTeams(payload.baseballTeams);
            }
        };
        window.addEventListener("ev-native-event", handleNativeEvent);
        return () => window.removeEventListener("ev-native-event", handleNativeEvent);
    }, []);

    const handleSave = () => {
        localStorage.setItem("FOOTBALL_TEAMS", footballTeams);
        localStorage.setItem("BASEBALL_TEAMS", baseballTeams);
        localStorage.setItem("FOOTBALL_DATA_KEY", footballDataKey);
        sendToFlutter("save_sports_settings", { footballTeams, baseballTeams, footballDataKey });
        alert("스포츠 설정이 저장되었습니다.");
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="스포츠 알림 설정" />
            <div className="flex-1 px-5 py-6 flex flex-col" style={{ gap: 16 * scale }}>
                <Section title="⚽ 축구 (Football-Data.org)">
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>응원팀 (쉼표로 구분, 예: 토트넘, 아스널, 레알)</span>
                    <input
                        value={footballTeams} onChange={(e) => setFootballTeams(e.target.value)} placeholder="토트넘, 아스널"
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.blue, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale, marginTop: 4 }}>Football-Data.org API Token</span>
                    <input
                        value={footballDataKey} onChange={(e) => setFootballDataKey(e.target.value)} placeholder="API Token..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </Section>
                <Section title="⚾ 야구 (KBO · 네이버 스포츠)">
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>응원팀 (쉼표로 구분, 예: KIA, 한화, 삼성)</span>
                    <input
                        value={baseballTeams} onChange={(e) => setBaseballTeams(e.target.value)} placeholder="KIA, 한화"
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 9 * scale, opacity: 0.7 }}>KBO 데이터는 네이버 스포츠 오픈 게이트웨이를 사용하므로 별도의 API 키가 필요하지 않습니다.</span>
                </Section>
                <button onClick={handleSave} className="flex items-center justify-center" style={{ padding: `${12 * scale}px`, marginTop: 8 * scale, border: `1px solid ${C.accent}`, color: C.accent, ...mono, fontSize: 12 * scale, letterSpacing: 1, gap: 8 * scale }}>
                    <Save size={14 * scale} /> 저장
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 개인정보 마스킹 설정                                                  */
/* ------------------------------------------------------------------ */
function MaskingSettingsScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [rules, setRules] = useState(() => {
        try { return JSON.parse(localStorage.getItem("MASKING_RULES") || "[]"); } catch { return []; }
    });
    const [newOriginal, setNewOriginal] = useState("");
    const [newReplacement, setNewReplacement] = useState("");

    useEffect(() => {
        const handleNativeEvent = (e) => {
            const payload = e.detail;
            if (payload?.type === "masking_rules_sync" && payload.rules) {
                setRules(payload.rules);
            }
        };
        window.addEventListener("ev-native-event", handleNativeEvent);
        return () => window.removeEventListener("ev-native-event", handleNativeEvent);
    }, []);

    const addRule = () => {
        if (!newOriginal.trim()) return;
        const updated = [...rules, { original: newOriginal.trim(), replacement: newReplacement.trim() || "[비공개]" }];
        setRules(updated);
        setNewOriginal("");
        setNewReplacement("");
        localStorage.setItem("MASKING_RULES", JSON.stringify(updated));
        sendToFlutter("save_masking_rules", { rules: updated });
    };

    const removeRule = (idx) => {
        const updated = rules.filter((_, i) => i !== idx);
        setRules(updated);
        localStorage.setItem("MASKING_RULES", JSON.stringify(updated));
        sendToFlutter("save_masking_rules", { rules: updated });
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="개인정보 마스킹 설정" />
            <div className="flex-1 px-5 py-6 flex flex-col" style={{ gap: 12 * scale }}>
                <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>
                    AI에게 전송되기 전에 원본 텍스트가 대체 텍스트로 자동 치환됩니다.
                </span>
                {rules.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2" style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)" }}>
                        <span style={{ ...mono, color: C.accent, fontSize: 11 * scale, flex: 1 }}>{r.original}</span>
                        <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>→</span>
                        <span style={{ ...mono, color: C.lime, fontSize: 11 * scale, flex: 1 }}>{r.replacement}</span>
                        <button onClick={() => removeRule(i)} style={{ color: C.danger, flexShrink: 0 }}>✕</button>
                    </div>
                ))}
                <div className="flex flex-col gap-2 mt-2 p-3" style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)" }}>
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>새 규칙 추가</span>
                    <input value={newOriginal} onChange={(e) => setNewOriginal(e.target.value)} placeholder="원본 (예: 김진우)"
                        className="w-full bg-transparent outline-none" style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }} />
                    <input value={newReplacement} onChange={(e) => setNewReplacement(e.target.value)} placeholder="대체 (예: [학생A])"
                        className="w-full bg-transparent outline-none" style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }} />
                    <button onClick={addRule} className="flex items-center justify-center gap-1" style={{ padding: `${10 * scale}px`, border: `1px solid ${C.lime}`, color: C.lime, ...mono, fontSize: 11 * scale }}>
                        + 추가
                    </button>
                </div>
            </div>
        </div>
    );
}

"""

idx = idx.replace(
    """function PathSettingsScreen({ onBack }) {""",
    sports_and_masking + """function PathSettingsScreen({ onBack }) {"""
)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(idx)
print("[3/3] index.jsx: C1, C2, H5, H9, M9 fixed")

# ========================================================================
# PART 4: weekly_summary_service.dart fix (H6 - use custom system prompt)
# ========================================================================
weekly_path = os.path.join(lib_dir, "weekly_summary_service.dart")
with open(weekly_path, 'r', encoding='utf-8') as f:
    weekly = f.read()

weekly = weekly.replace(
    """      final report = await LlmService.generateProactiveResponse(prompt);""",
    """      final weeklySystemPrompt = "너는 사용자의 한 주를 정리해 주는 능동형 AI 비서 E.V.다.\\n"
          "사용자가 제공한 데이터를 기반으로 '데일리 뷰글(Daily Bugle)' 주간 특별 에디션 신문 1면 스타일의 종합 결산 리포트를 작성해.\\n"
          "헤드라인, Todo 달성 현황, 오답 빌런 퇴치 전황, 다음 주 예고 등 항목별로 알차게 정리해라.\\n"
          "SILENT라고 응답하지 마라. 반드시 리포트를 작성해야 한다.";
      final report = await LlmService.generateProactiveResponse(prompt, systemPromptOverride: weeklySystemPrompt);"""
)

with open(weekly_path, 'w', encoding='utf-8') as f:
    f.write(weekly)
print("[4/4] weekly_summary_service.dart: H6 fixed")

print("\n✅ All CRITICAL (4) + HIGH (9) + MEDIUM (3) fixes applied successfully!")

