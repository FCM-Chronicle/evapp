import os

lib_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\lib"
web_src_dir = r"c:\Users\jinuj\vsc\E.V.app\evapp\evweb\src"

# 1. Update main.dart: S-Pen cold start listener + capture_screen_query handler
main_path = os.path.join(lib_dir, "main.dart")
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

old_init_state = """    const MethodChannel('com.example.evapp/methods').setMethodCallHandler((call) async {
      if (call.method == 'sharedImageReceived') {
        final path = call.arguments['path'] as String?;
        if (path != null) {
          _processSharedImage(path);
        }
      }
    });"""

new_init_state = """    const MethodChannel('com.example.evapp/methods').setMethodCallHandler((call) async {
      if (call.method == 'sharedImageReceived') {
        final path = call.arguments['path'] as String?;
        if (path != null) {
          _processSharedImage(path);
        }
      }
    });

    // S펜 공유 또는 외부 공유 인텐트로 앱이 새로 켜졌을 때(Cold Start) 대기 중인 이미지 즉시 처리
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
    });"""

if old_init_state in main_content:
    main_content = main_content.replace(old_init_state, new_init_state)

# Add capture_screen_query handler in main.dart
old_action_picker = """      } else if (action == 'pick_image_for_chat') {
        debugPrint('Action: pick_image_for_chat');"""

new_action_picker = """      } else if (action == 'capture_screen_query') {
        debugPrint('Action: capture_screen_query');
        try {
          final picker = ImagePicker();
          final pickedFile = await picker.pickImage(source: ImageSource.gallery);
          if (pickedFile != null) {
            final bytes = await pickedFile.readAsBytes();
            final base64Image = 'data:image/${pickedFile.name.split('.').last};base64,${base64Encode(bytes)}';
            _sendToReact('chat_image_picked', {
              'name': '화면_캡처_${pickedFile.name}',
              'base64': base64Image,
            });
          }
        } catch (e) {
          debugPrint('capture_screen_query error: $e');
        }
      } else if (action == 'pick_image_for_chat') {
        debugPrint('Action: pick_image_for_chat');"""

if old_action_picker in main_content:
    main_content = main_content.replace(old_action_picker, new_action_picker)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_content)


# 2. Update llm_service.dart with enhanced Vision AI prompt
llm_path = os.path.join(lib_dir, "llm_service.dart")
with open(llm_path, 'r', encoding='utf-8') as f:
    llm_content = f.read()

old_vision_check = """    final prefs = await SharedPreferences.getInstance();
    final bool isVisionEnabled = prefs.getBool('VISION_ENABLED') ?? true;
    final bool canSendImage = isVisionEnabled && base64Image != null && base64Image.isNotEmpty;
    final modelName = canSendImage ? visionModelName : mainModelName;"""

new_vision_check = """    final prefs = await SharedPreferences.getInstance();
    final bool isVisionEnabled = prefs.getBool('VISION_ENABLED') ?? true;
    final bool canSendImage = isVisionEnabled && base64Image != null && base64Image.isNotEmpty;
    final modelName = canSendImage ? visionModelName : mainModelName;

    String finalSystemPrompt = systemPrompt;
    if (canSendImage) {
      finalSystemPrompt += '\\n\\n# [비전(Vision) AI 분석 모드 활성화]\\n'
          '사용자가 사진, 캡처 화면 또는 문제 이미지를 전송했습니다.\\n'
          '- 이미지 속 텍스트, 다이어그램, 수식, 그래프, 에러 화면, 사물 등을 시각적으로 정확히 분석하여 사용자의 질문에 답변하세요.\\n'
          '- 수식이나 기호는 LaTeX 포맷(\\\\(수식\\\\) 혹은 \\\\[수식\\\\])으로 작성하세요.\\n'
          '- 문제 풀이나 코드가 포함되어 있다면 핵심 개념과 정답을 단계별로 친절하게 설명하세요.\\n';
    }"""

if old_vision_check in llm_content:
    llm_content = llm_content.replace(old_vision_check, new_vision_check)

old_post_body = """            {'role': 'system', 'content': systemPrompt},"""
new_post_body = """            {'role': 'system', 'content': finalSystemPrompt},"""

if old_post_body in llm_content:
    llm_content = llm_content.replace(old_post_body, new_post_body)

with open(llm_path, 'w', encoding='utf-8') as f:
    f.write(llm_content)


# 3. Update index.jsx (Screen Share / Capture button & Gemini style query)
index_path = os.path.join(web_src_dir, "index.jsx")
with open(index_path, 'r', encoding='utf-8') as f:
    index_content = f.read()

# Add MonitorUp import
if "MonitorUp" not in index_content:
    index_content = index_content.replace("MonitorPlay,", "MonitorPlay, MonitorUp, Sparkles,")

# Add handleScreenCapture and button in chat input bar
old_input_buttons = """            <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: C.panelBorder }}>
                <button onClick={() => sendToFlutter("pick_file", {})} style={{ color: C.accent, flexShrink: 0 }} title="문서 첨부(PDF, TXT)">
                    <Paperclip size={18} />
                </button>
                <button onClick={() => sendToFlutter("pick_image_for_chat", {})} style={{ color: C.accent, flexShrink: 0 }} title="사진 첨부">
                    <ImageIcon size={18} />
                </button>
                <button onClick={() => sendToFlutter("perform_ocr", {})} style={{ color: C.accent, flexShrink: 0 }} title="텍스트 스캔(OCR)">
                    <FileText size={18} />
                </button>"""

new_input_buttons = """            <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: C.panelBorder }}>
                <button onClick={() => sendToFlutter("pick_file", {})} style={{ color: C.accent, flexShrink: 0 }} title="문서 첨부(PDF, TXT)">
                    <Paperclip size={18} />
                </button>
                <button onClick={() => sendToFlutter("pick_image_for_chat", {})} style={{ color: C.accent, flexShrink: 0 }} title="사진 첨부 (Vision AI)">
                    <ImageIcon size={18} />
                </button>
                <button
                    onClick={async () => {
                        try {
                            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                                const video = document.createElement("video");
                                video.srcObject = stream;
                                await video.play();
                                const canvas = document.createElement("canvas");
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                const ctx = canvas.getContext("2d");
                                ctx.drawImage(video, 0, 0);
                                stream.getTracks().forEach(t => t.stop());
                                const dataUrl = canvas.toDataURL("image/png");
                                setAttachedFile({ name: "화면공유_캡처.png", base64: dataUrl });
                            } else {
                                sendToFlutter("capture_screen_query", {});
                            }
                        } catch (e) {
                            sendToFlutter("capture_screen_query", {});
                        }
                    }}
                    style={{ color: C.lime, flexShrink: 0 }}
                    title="화면 공유 / 캡처 질문 (Gemini 스타일)"
                >
                    <MonitorUp size={18} />
                </button>
                <button onClick={() => sendToFlutter("perform_ocr", {})} style={{ color: C.accent, flexShrink: 0 }} title="텍스트 스캔(OCR)">
                    <FileText size={18} />
                </button>"""

if old_input_buttons in index_content:
    index_content = index_content.replace(old_input_buttons, new_input_buttons)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_content)

print("Patch S-Pen fix & screen share query applied successfully.")

