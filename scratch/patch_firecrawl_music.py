import os

lib_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\lib"
web_src_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\evweb\src"

# 1. Patch sports_service.dart with Firecrawl scraping
sports_path = os.path.join(lib_dir, "sports_service.dart")
with open(sports_path, 'r', encoding='utf-8') as f:
    sports_content = f.read()

old_sports_search = """      // 4. Tactical analysis search (Naver / Tavily)
      String exaContext = "";
      try {
        final searchRes = await SearchService.search('$homeTeam vs $awayTeam match tactical analysis The Athletic Sky Sports');
        final results = searchRes['results'] as List<SearchResultItem>?;
        if (results != null && results.isNotEmpty) {
          for (var item in results) {
            String snippet = item.snippet;
            if (snippet.length > 800) snippet = snippet.substring(0, 800) + '...';
            exaContext += "- [${item.title}]\\n  $snippet\\n\\n";
          }
        }
      } catch (e) {
        debugPrint('Sports tactical search error: $e');
      }"""

new_sports_search = """      // 4. Tactical column / article scraping via Firecrawl API (with fallback to SearchService)
      final firecrawlKey = prefs.getString('FIRECRAWL_API_KEY')?.trim();
      String tacticalColumnContext = "";

      if (firecrawlKey != null && firecrawlKey.isNotEmpty) {
        try {
          debugPrint('Fetching tactical articles via Firecrawl API...');
          final fcRes = await http.post(
            Uri.parse('https://api.firecrawl.dev/v1/search'),
            headers: {
              'Authorization': 'Bearer $firecrawlKey',
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'query': '$homeTeam vs $awayTeam tactical analysis The Athletic OR Sky Sports OR BBC Sport',
              'searchOptions': {'limit': 2},
              'pageOptions': {'fetchPageContent': true}
            }),
          ).timeout(const Duration(seconds: 8));

          if (fcRes.statusCode == 200) {
            final fcData = jsonDecode(fcRes.body);
            final dataList = fcData['data'] as List?;
            if (dataList != null && dataList.isNotEmpty) {
              for (var item in dataList) {
                final title = item['title'] ?? '전술 칼럼';
                String md = item['markdown'] ?? item['description'] ?? '';
                if (md.length > 1200) md = md.substring(0, 1200) + '...';
                tacticalColumnContext += "### [$title](${item['url'] ?? ''})\\n$md\\n\\n";
              }
            }
          }
        } catch (e) {
          debugPrint('Firecrawl scraping error/timeout: $e');
        }
      }

      // Fallback to Naver/Tavily search if Firecrawl has no results
      if (tacticalColumnContext.trim().isEmpty) {
        try {
          final searchRes = await SearchService.search('$homeTeam vs $awayTeam match tactical analysis The Athletic Sky Sports');
          final results = searchRes['results'] as List<SearchResultItem>?;
          if (results != null && results.isNotEmpty) {
            for (var item in results) {
              String snippet = item.snippet;
              if (snippet.length > 800) snippet = snippet.substring(0, 800) + '...';
              tacticalColumnContext += "- [${item.title}]\\n  $snippet\\n\\n";
            }
          }
        } catch (e) {
          debugPrint('Sports search fallback error: $e');
        }
      }"""

if old_sports_search in sports_content:
    sports_content = sports_content.replace(old_sports_search, new_sports_search)

sports_content = sports_content.replace("$exaContext", "$tacticalColumnContext")

with open(sports_path, 'w', encoding='utf-8') as f:
    f.write(sports_content)


# 2. Patch main.dart
main_path = os.path.join(lib_dir, "main.dart")
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

# settings_sync in app_ready
old_app_ready_settings = """          'tavilyKey': prefs.getString('TAVILY_API_KEY') ?? '',
          'visionEnabled': prefs.getBool('VISION_ENABLED') ?? true,"""

new_app_ready_settings = """          'tavilyKey': prefs.getString('TAVILY_API_KEY') ?? '',
          'firecrawlKey': prefs.getString('FIRECRAWL_API_KEY') ?? '',
          'visionEnabled': prefs.getBool('VISION_ENABLED') ?? true,"""

if old_app_ready_settings in main_content:
    main_content = main_content.replace(old_app_ready_settings, new_app_ready_settings)

# sports_settings_sync
old_sports_sync = """        _sendToReact('sports_settings_sync', {
          'apiKey': prefs.getString('API_FOOTBALL_KEY') ?? '',
          'teamName': prefs.getString('SPORTS_TEAM_NAME') ?? '',
          'active': prefs.getBool('SPORTS_ACTIVE') ?? false,
        });"""

new_sports_sync = """        _sendToReact('sports_settings_sync', {
          'apiKey': prefs.getString('API_FOOTBALL_KEY') ?? '',
          'firecrawlKey': prefs.getString('FIRECRAWL_API_KEY') ?? '',
          'teamName': prefs.getString('SPORTS_TEAM_NAME') ?? '',
          'active': prefs.getBool('SPORTS_ACTIVE') ?? false,
        });"""

if old_sports_sync in main_content:
    main_content = main_content.replace(old_sports_sync, new_sports_sync)

# save_sports_settings handler
old_save_sports = """      } else if (action == 'save_sports_settings') {
        final apiKey = payload['apiKey'];
        final teamName = payload['teamName'];
        final active = payload['active'];
        final prefs = await SharedPreferences.getInstance();
        if (apiKey != null) await prefs.setString('API_FOOTBALL_KEY', apiKey);
        if (teamName != null) await prefs.setString('SPORTS_TEAM_NAME', teamName);
        if (active != null) await prefs.setBool('SPORTS_ACTIVE', active);"""

new_save_sports = """      } else if (action == 'save_sports_settings') {
        final apiKey = payload['apiKey'];
        final firecrawlKey = payload['firecrawlKey'];
        final teamName = payload['teamName'];
        final active = payload['active'];
        final prefs = await SharedPreferences.getInstance();
        if (apiKey != null) await prefs.setString('API_FOOTBALL_KEY', apiKey);
        if (firecrawlKey != null) await prefs.setString('FIRECRAWL_API_KEY', firecrawlKey);
        if (teamName != null) await prefs.setString('SPORTS_TEAM_NAME', teamName);
        if (active != null) await prefs.setBool('SPORTS_ACTIVE', active);"""

if old_save_sports in main_content:
    main_content = main_content.replace(old_save_sports, new_save_sports)

# save_api_key handler
old_save_api = """        final tavilyKey = payload['tavilyKey'];
        final visionEnabled = payload['visionEnabled'];"""

new_save_api = """        final tavilyKey = payload['tavilyKey'];
        final firecrawlKey = payload['firecrawlKey'];
        final visionEnabled = payload['visionEnabled'];"""

if old_save_api in main_content:
    main_content = main_content.replace(old_save_api, new_save_api)

old_save_api_prefs = """        if (tavilyKey != null) await prefs.setString('TAVILY_API_KEY', tavilyKey);
        if (visionEnabled != null && visionEnabled is bool) await prefs.setBool('VISION_ENABLED', visionEnabled);"""

new_save_api_prefs = """        if (tavilyKey != null) await prefs.setString('TAVILY_API_KEY', tavilyKey);
        if (firecrawlKey != null) await prefs.setString('FIRECRAWL_API_KEY', firecrawlKey);
        if (visionEnabled != null && visionEnabled is bool) await prefs.setBool('VISION_ENABLED', visionEnabled);"""

if old_save_api_prefs in main_content:
    main_content = main_content.replace(old_save_api_prefs, new_save_api_prefs)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_content)


# 3. Patch evweb/src/index.jsx (Draggable Music Player + Firecrawl settings)
index_path = os.path.join(web_src_dir, "index.jsx")
with open(index_path, 'r', encoding='utf-8') as f:
    index_content = f.read()

# Make MusicPlayerBar draggable and float below StatusBar
old_music_bar = """function MusicPlayerBar({ open, collapsed, track, onCollapse, onExpand, onFullScreen }) {
    if (!open) return null;
    return (
        <div className="absolute top-0 left-0 right-0 flex justify-end" style={{ zIndex: 35 }}>
            <AnimatePresence mode="wait">
                {!collapsed ? (
                    <motion.div
                        key="expanded"
                        className="w-full flex items-center gap-3 px-4 py-2.5"
                        style={{
                            background: "rgba(16,27,51,0.96)",
                            borderBottom: `1px solid ${C.panelBorder}`,
                            backdropFilter: "blur(6px)",
                        }}
                        initial={{ x: "60%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "60%", opacity: 0 }}
                        transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
                        onClick={onFullScreen}
                    >
                        <SpinningCD size={40} artUrl={track.artUrl} />
                        <div className="flex flex-col flex-1 min-w-0">
                            <span style={{ ...sans, color: C.text, fontSize: 13, fontWeight: 600 }} className="truncate">
                                {track.title}
                            </span>
                            <span style={{ ...mono, color: C.slate, fontSize: 10, letterSpacing: 0.5 }} className="truncate">
                                {track.artist}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                            <motion.span
                                style={{ width: 5, height: 5, borderRadius: 99, background: C.lime, display: "inline-block" }}
                                animate={{ opacity: [1, 0.25, 1] }}
                                transition={{ duration: 0.9, repeat: Infinity }}
                            />
                            <span style={{ ...mono, color: C.lime, fontSize: 9, letterSpacing: 1 }}>PLAYING</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onCollapse(); }} style={{ color: C.slate, flexShrink: 0 }}>
                            <X size={16} />
                        </button>
                    </motion.div>
                ) : (
                    <motion.button
                        key="collapsed"
                        onClick={onExpand}
                        className="flex items-center justify-center"
                        style={{
                            width: 24,
                            height: 40,
                            marginTop: 10,
                            background: "rgba(16,27,51,0.96)",
                            border: `1px solid ${C.panelBorder}`,
                            borderRight: "none",
                            color: C.accent,
                        }}
                        initial={{ x: 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 40, opacity: 0 }}
                        transition={{ type: "tween", duration: 0.25 }}
                    >
                        <ChevronLeft size={14} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}"""

new_music_bar = """function MusicPlayerBar({ open, collapsed, track, onCollapse, onExpand, onFullScreen }) {
    if (!open) return null;
    return (
        <motion.div
            drag
            dragMomentum={false}
            className="fixed flex flex-col"
            style={{
                top: 56,
                right: 12,
                zIndex: 40,
                touchAction: "none",
            }}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
        >
            <AnimatePresence mode="wait">
                {!collapsed ? (
                    <motion.div
                        key="expanded"
                        className="flex items-center gap-2.5 px-3 py-2 cursor-grab active:cursor-grabbing select-none"
                        style={{
                            background: "rgba(16,27,51,0.94)",
                            border: `1px solid ${C.panelBorder}`,
                            borderRadius: 12,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                            backdropFilter: "blur(8px)",
                            maxWidth: 310,
                        }}
                        onClick={onFullScreen}
                    >
                        <SpinningCD size={34} artUrl={track.artUrl} />
                        <div className="flex flex-col flex-1 min-w-0 pr-1">
                            <span style={{ ...sans, color: C.text, fontSize: 12, fontWeight: 600 }} className="truncate">
                                {track.title}
                            </span>
                            <span style={{ ...mono, color: C.slate, fontSize: 9.5, letterSpacing: 0.5 }} className="truncate">
                                {track.artist}
                            </span>
                        </div>
                        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                            <motion.span
                                style={{ width: 5, height: 5, borderRadius: 99, background: C.lime, display: "inline-block" }}
                                animate={{ opacity: [1, 0.25, 1] }}
                                transition={{ duration: 0.9, repeat: Infinity }}
                            />
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onCollapse(); }} style={{ color: C.slate, flexShrink: 0, padding: 4 }}>
                            <X size={14} />
                        </button>
                    </motion.div>
                ) : (
                    <motion.button
                        key="collapsed"
                        onClick={onExpand}
                        className="flex items-center justify-center p-2 rounded-full cursor-grab active:cursor-grabbing"
                        style={{
                            background: "rgba(16,27,51,0.94)",
                            border: `1px solid ${C.panelBorder}`,
                            boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
                            color: C.accent,
                        }}
                    >
                        <SpinningCD size={28} artUrl={track.artUrl} />
                    </motion.button>
                )}
            </AnimatePresence>
        </motion.div>
    );
}"""

if old_music_bar in index_content:
    index_content = index_content.replace(old_music_bar, new_music_bar)

# Update ApiKeyScreen in index.jsx
old_api_screen_state = """    const [tavilyKey, setTavilyKey] = useState(localStorage.getItem("TAVILY_KEY") || "");
    const [visionEnabled, setVisionEnabled] = useState(() => {
        const v = localStorage.getItem("VISION_ENABLED");
        return v === null ? true : v === "true";
    });
    const [kmaKey, setKmaKey] = useState(localStorage.getItem("KMA_API_KEY") || "");"""

new_api_screen_state = """    const [tavilyKey, setTavilyKey] = useState(localStorage.getItem("TAVILY_KEY") || "");
    const [firecrawlKey, setFirecrawlKey] = useState(localStorage.getItem("FIRECRAWL_KEY") || "");
    const [visionEnabled, setVisionEnabled] = useState(() => {
        const v = localStorage.getItem("VISION_ENABLED");
        return v === null ? true : v === "true";
    });
    const [kmaKey, setKmaKey] = useState(localStorage.getItem("KMA_API_KEY") || "");"""

if old_api_screen_state in index_content:
    index_content = index_content.replace(old_api_screen_state, new_api_screen_state)

old_api_sync = """                if (payload.tavilyKey) setTavilyKey(payload.tavilyKey);
                if (payload.visionEnabled !== undefined) setVisionEnabled(payload.visionEnabled);"""

new_api_sync = """                if (payload.tavilyKey) setTavilyKey(payload.tavilyKey);
                if (payload.firecrawlKey) setFirecrawlKey(payload.firecrawlKey);
                if (payload.visionEnabled !== undefined) setVisionEnabled(payload.visionEnabled);"""

if old_api_sync in index_content:
    index_content = index_content.replace(old_api_sync, new_api_sync)

old_api_save = """        localStorage.setItem("TAVILY_KEY", tavilyKey);
        localStorage.setItem("VISION_ENABLED", visionEnabled.toString());
        localStorage.setItem("KMA_API_KEY", kmaKey);
        localStorage.setItem("LLM_ENDPOINT", endpoint);
        localStorage.setItem("LLM_MODEL", model);
        sendToFlutter("save_api_key", { key, naverClientId, naverClientSecret, tavilyKey, visionEnabled, kmaKey, endpoint, model });"""

new_api_save = """        localStorage.setItem("TAVILY_KEY", tavilyKey);
        localStorage.setItem("FIRECRAWL_KEY", firecrawlKey);
        localStorage.setItem("VISION_ENABLED", visionEnabled.toString());
        localStorage.setItem("KMA_API_KEY", kmaKey);
        localStorage.setItem("LLM_ENDPOINT", endpoint);
        localStorage.setItem("LLM_MODEL", model);
        sendToFlutter("save_api_key", { key, naverClientId, naverClientSecret, tavilyKey, firecrawlKey, visionEnabled, kmaKey, endpoint, model });"""

if old_api_save in index_content:
    index_content = index_content.replace(old_api_save, new_api_save)

# Add Firecrawl input in ApiKeyScreen Section 2
old_api_sec2 = """                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>Tavily Search API KEY</span>
                    <input
                        value={tavilyKey} onChange={(e) => setTavilyKey(e.target.value)} placeholder="tvly-..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </Section>"""

new_api_sec2 = """                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>Tavily Search API KEY</span>
                    <input
                        value={tavilyKey} onChange={(e) => setTavilyKey(e.target.value)} placeholder="tvly-..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />

                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale, marginTop: 4 }}>Firecrawl API KEY (전술 칼럼 / 웹 크롤링)</span>
                    <input
                        value={firecrawlKey} onChange={(e) => setFirecrawlKey(e.target.value)} placeholder="fc-..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </Section>"""

if old_api_sec2 in index_content:
    index_content = index_content.replace(old_api_sec2, new_api_sec2)

# Also update SportsSettingsScreen to support Firecrawl Key
old_sports_screen = """function SportsSettingsScreen({ onBack }) {
    const scale = window.innerWidth / 393;
    const [apiKey, setApiKey] = useState("");
    const [teamName, setTeamName] = useState("");
    const [active, setActive] = useState(false);

    useEffect(() => {
        const handleSync = (e) => {
            const { action, payload } = e.detail;
            if (action === "sports_settings_sync") {
                setApiKey(payload.apiKey || "");
                setTeamName(payload.teamName || "");
                setActive(payload.active || false);
            }
        };
        window.addEventListener("ev-native-event", handleSync);
        sendToFlutter("get_sports_settings", {});
        return () => window.removeEventListener("ev-native-event", handleSync);
    }, []);

    const handleSave = () => {
        sendToFlutter("save_sports_settings", { apiKey, teamName, active });
        alert("스포츠 알림 설정이 저장되었습니다.");
    };"""

new_sports_screen = """function SportsSettingsScreen({ onBack }) {
    const scale = window.innerWidth / 393;
    const [apiKey, setApiKey] = useState("");
    const [firecrawlKey, setFirecrawlKey] = useState("");
    const [teamName, setTeamName] = useState("");
    const [active, setActive] = useState(false);

    useEffect(() => {
        const handleSync = (e) => {
            const { action, payload } = e.detail;
            if (action === "sports_settings_sync") {
                setApiKey(payload.apiKey || "");
                setFirecrawlKey(payload.firecrawlKey || "");
                setTeamName(payload.teamName || "");
                setActive(payload.active || false);
            }
        };
        window.addEventListener("ev-native-event", handleSync);
        sendToFlutter("get_sports_settings", {});
        return () => window.removeEventListener("ev-native-event", handleSync);
    }, []);

    const handleSave = () => {
        sendToFlutter("save_sports_settings", { apiKey, firecrawlKey, teamName, active });
        alert("스포츠 알림 설정이 저장되었습니다.");
    };"""

if old_sports_screen in index_content:
    index_content = index_content.replace(old_sports_screen, new_sports_screen)

old_sports_inputs = """                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>API-Football KEY</span>
                    <input
                        value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API-Football Key 입력..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />"""

new_sports_inputs = """                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>API-Football KEY</span>
                    <input
                        value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API-Football Key 입력..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />

                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>Firecrawl API KEY (전술 칼럼 크롤링용)</span>
                    <input
                        value={firecrawlKey} onChange={(e) => setFirecrawlKey(e.target.value)} placeholder="fc-... (입력 시 The Athletic/Sky 기사 전문 수집)"
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />"""

if old_sports_inputs in index_content:
    index_content = index_content.replace(old_sports_inputs, new_sports_inputs)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_content)

print("Patch firecrawl & music applied successfully.")

