import "./index.css";
import { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu,
    X,
    KeyRound,
    History,
    FileText,
    ArrowLeft,
    Send,
    Save,
    Paperclip,
    Link2,
    CheckCircle2,
    FileDown,
    MonitorPlay, MonitorUp, Sparkles,
    BellRing,
    MessageSquarePlus,
    Crosshair,
    Pencil,
    Check,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Wifi,
    Bluetooth,
    Mic,
    FolderOpen,
    Timer,
    BookOpen,
    Clock,
    Image as ImageIcon,
    Trophy,
    Shield,
    Trash2,
    Plus,
    CheckSquare,
    ListTodo,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Flutter Webview 통신 스텁 (실제 구현은 사용자가 붙일 것)              */
/* ------------------------------------------------------------------ */
function sendToFlutter(action, payload) {
    try {
        if (window.EV_Channel && window.EV_Channel.postMessage) {
            window.EV_Channel.postMessage(JSON.stringify({ action, payload }));
        } else {
            console.log("[EV_Channel stub]", action, payload);
        }
    } catch (e) {
        console.log("[EV_Channel error]", e);
    }
}

//* ------------------------------------------------------------------ */
/* 반응형 레이아웃 훅 — 폰/태블릿 화면 폭에 맞춰 컨테이너 최대폭과       */
/* UI 스케일(코어 크기, 폰트 등)을 같이 계산한다.                        */
/* ------------------------------------------------------------------ */
function useResponsiveLayout() {
    const compute = () => {
        const w = typeof window !== "undefined" ? window.innerWidth : 390;
        const h = typeof window !== "undefined" ? window.innerHeight : 844;
        const isLandscape = w > h;
        const shortSide = Math.min(w, h);
        const isTablet = shortSide >= 600; // 갤탭 S10 FE 등 태블릿 폭 기준

        let maxWidth;
        if (isTablet) {
            // 태블릿에서 옆 여백이 과하게 남지 않도록 폭을 더 넉넉하게 잡는다.
            maxWidth = isLandscape
                ? Math.min(w * 0.72, 980)
                : Math.min(w * 0.92, 760);
        } else {
            maxWidth = isLandscape ? 640 : 384;
        }

        // 384px(기준 폰 폭) 대비 비율로 UI 스케일 산출, 너무 커지지 않게 상한
        const scale = Math.min(Math.max(maxWidth / 384, 1), 1.6);

        return { isLandscape, isTablet, maxWidth, scale };
    };

    const [layout, setLayout] = useState(compute);

    useEffect(() => {
        const update = () => setLayout(compute());
        update();
        window.addEventListener("resize", update);
        window.addEventListener("orientationchange", update);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("orientationchange", update);
        };
    }, []);

    return layout;
}

/* ------------------------------------------------------------------ */
/* 컬러 토큰                                                           */
/* ------------------------------------------------------------------ */
/* 스타일 가이드(E.V. UI) 팔레트 매핑:
   - accent(구 cyan) = 코어/음성 시스템의 메인 액센트(레드), 가장 채도 높은 색
   - accentOrange     = 코어 좌측 호(arc) 그라데이션 짝, 레드와 세트로만 사용
   - blue             = 데이터/awareness 전용 보조 액센트 (레드와 섞어 쓰지 않음)
   - panel/panelBorder = 반투명 남색 유리질 패널 + 얇은 흰색 헤어라인 보더
   - lime             = 성공/완료 표시 (가이드 값과 동일해 그대로 유지)
   - danger           = 경고/에러, 코어 레드 계열 재사용 */
const C = {
    bg: "#050506",
    panel: "#101B33",
    panelBorder: "rgba(255,255,255,0.08)",
    accent: "#FF3B2E",
    accentOrange: "#FFA24C",
    blue: "#4C86FF",
    lime: "#6BFFC2",
    amber: "#FFA24C",
    danger: "#FF3B2E",
    slate: "#8A8D94",
    text: "#F2F2F0",
    textAccent: "#FF8A6B",
};

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
const sans = { fontFamily: "'Inter', ui-sans-serif, system-ui" };

/* 구글 로그인 버튼에 쓰는 G 아이콘 (base64) */
const GOOGLE_ICON_URI =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAA5FBMVEVHcEz9SlD/TkL/RUH/RUD/RkP4gyr/SUX/Rj//SE3/Yjb/UDn/Szz9TFb/Yi7/WTT8TVn/cyf/Zi7/iRz/fSL/lRb/SEjeuwX/qQ7/nhP/tgv9TFX6yQj/wwn/zAffugr8zgb+zwnzzQb4ywkvhv82qo79zgQek+ApjurzzAPlywIvhv0qifjRyQEth/y5yAKnxwAoivaMxQUak94fj+hzxAtawxdawhgLpa4OncYVltc8wCobvFIMuWgHqp0KorWaxQEnvz4bvUwPumUNumQMumgIr4wIqaIRvFoNu2MKtnRJwh6BPIl6AAAATHRSTlMAWZDK7P8Orf//Gv///+b/5P7////4dor///8qmP/9K0j/tu7/DeYwRP//HWr/rv///v/b///+HMT///+XTvD/5f//yGzw///////mXfQ9oAAAAWBJREFUeAF0z1UCgCAQRdEZ7O7u/W9STPr93oMCcENi2Y5jWwRBM9fz7zl0QeCFcidRHLMeJAkRj6dZdom/0+Uu62FRlpcQQILsfFVfIrqE/wPWoWleEXstYutdgO9dP9wi++/VCt0dx0dwL5u4DvNyiaFywbB1WS6ymfp+rJSMM5g2H7fYjOCsi5wOIAiCKNhRnG1bazv/fG7erFW/VcNezFEsKWVVZk2bOVi0BVuawE9GbcGOJrxoD3DEZD5ZtAcLdsX9vvWSW/ZM5g+H7JnHhFMcsI+CPpwXVOGSBsT8+Xy9VX5qfQerC77yDP94rEvB8/VCscO4z1f49+db8D9BFJEQ6N64/0hyqhVV03hxIo7+eMNLhmnZimLLjut6msCKZ3qhR+wN0/f9IAjD0PV4kV3rW/QoXF5sC4+KcEAShMkWzBeQ+QaFLX5rKrOWzcQjsHbUgCJbThA4lmwXVv8BPaBVEHC66TMAAAAASUVORK5CYII=";

/* ------------------------------------------------------------------ */
/* 공통: HUD 프레임 (코너 브라켓 + 스캔라인)                             */
/* ------------------------------------------------------------------ */
function HUDFrame({ children, alertPulse }) {
    return (
        <div
            className="relative w-full h-full overflow-hidden"
            style={{ background: C.bg, width: "100%", height: "100%" }}
        >
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    opacity: 0.035,
                    backgroundImage:
                        "repeating-linear-gradient(0deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 8px)",
                }}
            />
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
                }}
            />
            <div className="pointer-events-none absolute top-3 left-3">
                <CornerLegs />
            </div>
            <div className="pointer-events-none absolute top-3 right-3">
                <CornerLegs flipX />
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3">
                <CornerLegs flipY />
            </div>
            <div className="pointer-events-none absolute bottom-3 right-3">
                <CornerLegs flipX flipY />
            </div>
            <div className="relative w-full h-full">{children}</div>
            {/* 스파이디 센스 — 테두리 전체가 찌릿하며 반응 */}
            <SpideySenseAlert pulse={alertPulse} />
        </div>
    );
}

function CornerLegs({ flipX, flipY }) {
    return (
        <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            style={{ transform: `scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})` }}
        >
            <line x1="0" y1="0" x2="16" y2="0" stroke={C.blue} strokeWidth="1" opacity="0.9" />
            <line x1="0" y1="0" x2="0" y2="16" stroke={C.blue} strokeWidth="1" opacity="0.9" />
            <line x1="0" y1="0" x2="9" y2="9" stroke={C.accent} strokeWidth="1" opacity="0.5" />
            <line x1="4" y1="0" x2="4" y2="7" stroke={C.accent} strokeWidth="1" opacity="0.35" />
            <line x1="0" y1="4" x2="7" y2="4" stroke={C.accent} strokeWidth="1" opacity="0.35" />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/* 거미 마스코트 — 스타일 가이드 §4 "거미 마스코트: 상단 중앙 로고, 코어      */
/* 중심에도 작게 등장 — 브랜드 앵커". 라인아트 각진 다리(스파이디 로고      */
/* 실루엣) + 채워진 두부/복부. 로고와 코어 중심 두 군데에서 재사용한다.     */
/* ------------------------------------------------------------------ */
function SpiderMascotIcon({ size = 22, color = C.accent, opacity = 1 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" style={{ opacity, flexShrink: 0 }}>
            <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12,10 L5,7 L2,3" />
                <path d="M11,13 L3,13 L0,15" />
                <path d="M11,17 L3,19 L1,23" />
                <path d="M12,20 L6,24 L4,29" />
                <path d="M20,10 L27,7 L30,3" />
                <path d="M21,13 L29,13 L32,15" />
                <path d="M21,17 L29,19 L31,23" />
                <path d="M20,20 L26,24 L28,29" />
            </g>
            <ellipse cx="16" cy="19" rx="6" ry="7.4" fill={color} />
            <circle cx="16" cy="9.2" r="3.7" fill={color} />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/* 스파이디 센스 알림 — 테두리 전체가 신경 곤두서듯 찌릿, 팝업 대신 사용   */
/* ------------------------------------------------------------------ */
function SpideySenseAlert({ pulse }) {
    return (
        <AnimatePresence>
            {pulse && (
                <motion.div
                    key={pulse.key}
                    className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: [0, 1, 0.35, 0.9, 0],
                        x: [0, -2, 2, -1.5, 1, 0],
                        y: [0, 1.5, -1.5, 1, -1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.95, times: [0, 0.15, 0.4, 0.65, 1], ease: "easeInOut" }}
                    style={{
                        boxShadow: `inset 0 0 3px ${pulse.color}, inset 0 0 26px ${pulse.color}aa, inset 0 0 70px ${pulse.color}44`,
                        border: `1px solid ${pulse.color}`,
                        borderRadius: "inherit"
                    }}
                >
                    {pulse.type === "notification" && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-80">
                            {[1, 2, 3].map((i) => (
                                <motion.div
                                    key={`ripple-${i}`}
                                    className="absolute rounded-full border border-white"
                                    initial={{ width: 0, height: 0, opacity: 0.9 }}
                                    animate={{ width: "150vw", height: "150vw", opacity: 0 }}
                                    transition={{ duration: 1.2, delay: i * 0.15, ease: "easeOut" }}
                                    style={{
                                        boxShadow: "0 0 15px rgba(255,255,255,0.7), inset 0 0 15px rgba(255,255,255,0.7)"
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/* 푸시 알림 토스트 — Ctrl+A로 발동, 상단에서 잠깐 떴다가 사라짐          */
/* alert() 같은 팝업 대신, 기존 HUD 톤에 맞춘 슬림한 배너로 처리한다.      */
/* 와이파이(Ctrl+W) / 블루투스(Ctrl+B) 연결 알림도 같은 배너를 공유한다.   */
/*                                                                      */
/* PendingIntent 연동: toast에 id가 실려있으면(=실제 알림) 클릭 가능한   */
/* "리모컨 버튼"이 된다. 탭하면 onOpen(id)이 호출되고, 그 안에서 그      */
/* 알림 ID를 EV_Channel로 그대로 쏴주면 Flutter/네이티브가 PendingIntent */
/* 를 실행한다. id가 없는 토스트(와이파이/블루투스 등)는 그냥 정보성이라  */
/* 클릭해도 아무 일도 일어나지 않는다.                                   */
/* ------------------------------------------------------------------ */
function TopToast({ toast, onOpen }) {
    const Icon = toast?.icon || BellRing;
    const tone = toast?.color || C.accent;
    const clickable = !!(toast?.id && onOpen);
    return (
        <div
            className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center"
            style={{ paddingTop: 14, zIndex: 40 }}
        >
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key={toast.key}
                        onClick={clickable ? () => onOpen(toast.id) : undefined}
                        role={clickable ? "button" : undefined}
                        className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5"
                        style={{
                            background: "rgba(16,27,51,0.92)",
                            border: `1px solid ${tone}`,
                            boxShadow: `0 0 0 1px ${tone}22, 0 8px 24px rgba(0,0,0,0.5), 0 0 18px ${tone}44`,
                            maxWidth: "86%",
                            backdropFilter: "blur(6px)",
                            cursor: clickable ? "pointer" : "default",
                        }}
                        initial={{ opacity: 0, y: -18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -14, scale: 0.97 }}
                        transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
                    >
                        <motion.span
                            style={{ display: "inline-flex", color: tone, flexShrink: 0 }}
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Icon size={14} />
                        </motion.span>
                        <div className="flex flex-col">
                            <span style={{ ...mono, color: tone, fontSize: 9.5, letterSpacing: 1.5 }}>
                                {toast.eyebrow}
                            </span>
                            <span style={{ ...sans, color: C.text, fontSize: 13, marginTop: 1 }}>
                                {toast.message}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* 앱 전역에서 Ctrl(또는 Cmd)+지정한 키를 잡아 테스트용 동작을 실행하는
   공용 훅. 텍스트 입력창 안에서는 브라우저 기본 동작(전체 선택 등)을
   방해하지 않도록 피해간다.
   - Ctrl+A → 푸시 알림 토스트 테스트
   - Ctrl+M → 음악 플레이어 on/off 테스트 (실제 연동 시엔 대화에서
     "musicstart"가 오면 켜고, "music_off"가 오면 끄면 됨 — 대화 텍스트로도
     동일하게 켜고 끌 수 있음)
   - Ctrl+W → 와이파이 연결 토스트 테스트 (임의의 이름으로 "OOO 연결됨")
   - Ctrl+B → 블루투스 연결 토스트 테스트 (임의의 기기명으로 "OOO 연결됨") */
function useGlobalHotkey(key, onTrigger) {
    useEffect(() => {
        const handler = (e) => {
            const pressed = e.key?.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && pressed === key) {
                const tag = document.activeElement?.tagName;
                const isEditable =
                    tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
                if (isEditable) return;
                e.preventDefault();
                onTrigger();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [key, onTrigger]);
}

function usePushNotificationHotkey(onTrigger) {
    useGlobalHotkey("a", onTrigger);
}
function useMusicPlayerHotkey(onTrigger) {
    useGlobalHotkey("m", onTrigger);
}
function useWifiHotkey(onTrigger) {
    useGlobalHotkey("w", onTrigger);
}
function useBluetoothHotkey(onTrigger) {
    useGlobalHotkey("b", onTrigger);
}
function useVoiceInputHotkey(onTrigger) {
    useGlobalHotkey("s", onTrigger);
}

/* ------------------------------------------------------------------ */
/* CD 앨범 커버 — 1:1 비율, 느리게 계속 회전                             */
/* ------------------------------------------------------------------ */
function SpinningCD({ size = 40, artUrl }) {
    return (
        <motion.div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                position: "relative",
                flexShrink: 0,
                background: artUrl ? `url(${artUrl}) center/cover no-repeat` : `conic-gradient(from 0deg, ${C.panel}, ${C.blue}55, ${C.panel} 50%, ${C.accent}55, ${C.panel})`,
                border: `1px solid ${C.panelBorder}`,
                overflow: "hidden",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        >
            <div style={{ position: "absolute", inset: size * 0.09, borderRadius: "50%", border: `1px solid ${C.panelBorder}`, opacity: 0.65 }} />
            <div style={{ position: "absolute", inset: size * 0.19, borderRadius: "50%", border: `1px solid ${C.panelBorder}`, opacity: 0.45 }} />
            <div style={{ position: "absolute", inset: size * 0.31, borderRadius: "50%", border: `1px solid ${C.panelBorder}`, opacity: 0.3 }} />
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: size * 0.24,
                    height: size * 0.24,
                    borderRadius: "50%",
                    background: C.bg,
                    border: `1px solid ${C.accent}`,
                    transform: "translate(-50%,-50%)",
                }}
            />
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/* 전체화면 뮤직 플레이어                                                */
/* ------------------------------------------------------------------ */
function FullScreenMusicPlayer({ track, onClose }) {
    return (
        <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ zIndex: 40, background: "rgba(10, 15, 26, 0.95)", backdropFilter: "blur(12px)" }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full"
                style={{ background: "rgba(255,255,255,0.1)", color: C.text }}
            >
                <X size={24} />
            </button>
            <div className="flex flex-col items-center w-full max-w-sm px-8">
                <SpinningCD size={260} artUrl={track.artUrl} />
                <div className="mt-10 text-center w-full">
                    <h2 style={{ ...sans, color: C.text, fontSize: 24, fontWeight: 700 }} className="truncate w-full">{track.title || "No Track"}</h2>
                    <p style={{ ...sans, color: C.slate, fontSize: 16, marginTop: 4 }} className="truncate w-full">{track.artist || "Unknown Artist"}</p>
                    {track.album && (
                        <p style={{ ...mono, color: C.accent, fontSize: 12, marginTop: 8, letterSpacing: 0.5 }} className="truncate w-full">{track.album}</p>
                    )}
                </div>
                <div className="w-full mt-12 flex flex-col items-center">
                    <div className="w-full h-1.5 rounded-full relative overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <motion.div
                            className="absolute top-0 left-0 h-full rounded-full"
                            style={{ background: C.accent }}
                            animate={{ width: ["0%", "100%"] }}
                            transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                    <div className="flex justify-between w-full mt-2" style={{ ...mono, fontSize: 10, color: C.slate }}>
                        <span>PLAYING</span>
                        <motion.span
                            animate={{ opacity: [1, 0.25, 1] }}
                            transition={{ duration: 0.9, repeat: Infinity }}
                            style={{ color: C.lime }}
                        >
                            LIVE
                        </motion.span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/* 음악 플레이어 바 — 화면 상단에 뜨고, X를 누르면 오른쪽으로 줄어들며    */
/* "<" 모양 탭으로 접힌다. 다시 누르면 펼쳐진다. (테스트 버전, Ctrl+M)    */
/* ------------------------------------------------------------------ */
function MusicPlayerBar({ open, collapsed, track, onCollapse, onExpand, onFullScreen }) {
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
}

/* ------------------------------------------------------------------ */
/* 원형 코어 — 소나 핑 + 방사형 스포크 + 궤도 파티클로 한층 화려하게       */
/* ------------------------------------------------------------------ */
function CircularCore({ active, size = 100 }) {
    const spokes = 10;
    return (
        <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
            {active &&
                [0, 1].map((i) => (
                    <motion.div
                        key={`ping-${i}`}
                        style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${C.accent}` }}
                        initial={{ scale: 0.9, opacity: 0.55 }}
                        animate={{ scale: [0.9, 1.75], opacity: [0.5, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: "easeOut" }}
                    />
                ))}

            <motion.svg
                viewBox="0 0 100 100"
                style={{ position: "absolute", inset: 0 }}
                animate={active ? { rotate: 360 } : { rotate: 0 }}
                transition={active ? { duration: 11, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
            >
                {Array.from({ length: spokes }).map((_, i) => {
                    const angle = (360 / spokes) * i;
                    const rad = (angle * Math.PI) / 180;
                    const x2 = 50 + 46 * Math.cos(rad);
                    const y2 = 50 + 46 * Math.sin(rad);
                    return <line key={i} x1="50" y1="50" x2={x2} y2={y2} stroke={C.accent} strokeWidth="0.5" opacity="0.18" />;
                })}
                {/* 동심 다각형 — 스포크 마디를 직선으로 이어 실제 거미줄처럼 보이게
                    한다(매끈한 원이 아니라 각진 폴리곤이어야 거미줄 결이 산다). */}
                {[18, 30, 42].map((radius, ri) => {
                    const points = Array.from({ length: spokes })
                        .map((_, i) => {
                            const angle = (360 / spokes) * i;
                            const rad = (angle * Math.PI) / 180;
                            return `${50 + radius * Math.cos(rad)},${50 + radius * Math.sin(rad)}`;
                        })
                        .join(" ");
                    return (
                        <polygon
                            key={`web-ring-${ri}`}
                            points={points}
                            fill="none"
                            stroke={C.accent}
                            strokeWidth="0.4"
                            opacity={0.3 - ri * 0.05}
                        />
                    );
                })}
            </motion.svg>

            <motion.div
                style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${C.accent}` }}
                animate={
                    active
                        ? { scale: [1, 1.12, 1], opacity: [0.55, 0.15, 0.55] }
                        : { scale: [1, 1.04, 1], opacity: [0.3, 0.45, 0.3] }
                }
                transition={{ duration: active ? 1.8 : 3.4, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
                style={{ position: "absolute", inset: size * 0.06, borderRadius: "50%", border: `1px dashed ${C.blue}`, opacity: 0.5 }}
                animate={active ? { rotate: -360 } : { rotate: 0 }}
                transition={active ? { duration: 6.5, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
            />

            <motion.div
                style={{
                    position: "absolute",
                    inset: size * 0.16,
                    borderRadius: "50%",
                    border: `1px solid ${C.blue}`,
                    opacity: 0.7,
                }}
                animate={active ? { rotate: 360 } : { rotate: 0 }}
                transition={active ? { duration: 4.5, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: -2,
                        left: "50%",
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: C.accent,
                        transform: "translateX(-50%)",
                    }}
                />
            </motion.div>

            {active &&
                [0, 1, 2].map((i) => (
                    <motion.div
                        key={`orb-${i}`}
                        style={{ position: "absolute", inset: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3 + i * 0.8, repeat: Infinity, ease: "linear", delay: i * 0.3 }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: size * 0.02,
                                left: "50%",
                                width: 3,
                                height: 3,
                                borderRadius: "50%",
                                background: i % 2 ? C.lime : C.accent,
                                transform: "translateX(-50%)",
                                boxShadow: `0 0 6px ${i % 2 ? C.lime : C.accent}`,
                            }}
                        />
                    </motion.div>
                ))}

            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", width: size * 0.5, height: size * 0.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <SpiderMascotIcon size={size * 0.5} color={C.accent} opacity={0.45} />
                </div>
                <motion.div
                    style={{
                        position: "absolute",
                        width: size * 0.36,
                        height: size * 0.36,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${C.accent}55, transparent 70%)`,
                    }}
                    animate={active ? { scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] } : { scale: 1, opacity: 0.4 }}
                    transition={{ duration: active ? 0.9 : 0.3, repeat: active ? Infinity : 0, ease: "easeInOut" }}
                />
                <motion.div
                    style={{ position: "relative", width: size * 0.26, height: size * 0.26, borderRadius: "50%", background: C.accent }}
                    animate={active ? { scale: [1, 0.72, 1], opacity: [1, 0.55, 1] } : { scale: 1, opacity: 0.75 }}
                    transition={{ duration: active ? 0.9 : 0.3, repeat: active ? Infinity : 0, ease: "easeInOut" }}
                />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 웹슈터 로더 — 거미줄 노드가 사방으로 뻗어나가며 데이터를 엮는 파동       */
/* 검색/파일 분석 등 "탐색" 상태 전용. 뻔한 스피너 대신 사용.              */
/* ------------------------------------------------------------------ */
function WebNodeLoader({ size = 88, tone = C.accent }) {
    const strands = 7;
    const rings = 3;
    return (
        <svg width={size} height={size} viewBox="0 0 100 100">
            {Array.from({ length: strands }).map((_, i) => {
                const angle = (360 / strands) * i;
                const rad = (angle * Math.PI) / 180;
                const x2 = 50 + 45 * Math.cos(rad);
                const y2 = 50 + 45 * Math.sin(rad);
                return (
                    <motion.line
                        key={`strand-${i}`}
                        x1="50"
                        y1="50"
                        x2={x2}
                        y2={y2}
                        stroke={tone}
                        strokeWidth="0.9"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0.15 }}
                        animate={{ pathLength: [0, 1, 1, 0.15], opacity: [0.15, 0.95, 0.95, 0.15] }}
                        transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.09, ease: "easeInOut" }}
                    />
                );
            })}

            {Array.from({ length: rings }).map((_, r) => {
                const radius = 13 + r * 11;
                const points = Array.from({ length: strands })
                    .map((_, i) => {
                        const angle = (360 / strands) * i;
                        const rad = (angle * Math.PI) / 180;
                        return `${50 + radius * Math.cos(rad)},${50 + radius * Math.sin(rad)}`;
                    })
                    .join(" ");
                return (
                    <motion.polygon
                        key={`ring-${r}`}
                        points={points}
                        fill="none"
                        stroke={tone}
                        strokeWidth="0.6"
                        style={{ transformOrigin: "50px 50px" }}
                        initial={{ opacity: 0, scale: 0.55 }}
                        animate={{ opacity: [0, 0.6, 0], scale: [0.55, 1, 1.18] }}
                        transition={{ duration: 2.6, repeat: Infinity, delay: 0.25 + r * 0.32, ease: "easeOut" }}
                    />
                );
            })}

            {Array.from({ length: strands }).map((_, i) => {
                const angle = (360 / strands) * i;
                const rad = (angle * Math.PI) / 180;
                const radius = 24;
                const x = 50 + radius * Math.cos(rad);
                const y = 50 + radius * Math.sin(rad);
                return (
                    <motion.circle
                        key={`node-${i}`}
                        cx={x}
                        cy={y}
                        r="1.4"
                        fill={tone}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                    />
                );
            })}

            <motion.circle
                cx="50"
                cy="50"
                r="3.2"
                fill={tone}
                animate={{ scale: [1, 1.5, 1], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "50px 50px" }}
            />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/* 떠있는 상태창                                                       */
/* ------------------------------------------------------------------ */
function FloatingReadout({ label, value, delay = 0 }) {
    return (
        <motion.div
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.25 }}
        >
            <div style={{ width: 12, height: 1, background: C.blue, opacity: 0.7 }} />
            <div
                className="px-1.5 py-0.5"
                style={{ border: `1px solid ${C.blue}`, background: "rgba(76,134,255,0.06)" }}
            >
                <span style={{ ...mono, color: C.blue, fontSize: 9, letterSpacing: 0.5 }}>{label}</span>
                {value && (
                    <span style={{ ...mono, color: C.slate, fontSize: 9, marginLeft: 5 }}>{value}</span>
                )}
            </div>
        </motion.div>
    );
}

function Dots() {
    return (
        <span className="inline-flex" style={{ marginLeft: 2 }}>
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    animate={{ opacity: [0.15, 1, 0.15] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
                >
                    .
                </motion.span>
            ))}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* 음성 입력 파동 — 볼륨 단축키/S펜으로 STT가 켜졌을 때 HUD 하단에 뜨는  */
/* 오디오 웨이브. 실제 볼륨(dB) 값이 오면 각 바 높이에 매핑해주면 되고,   */
/* 지금은 데모라 스태거된 애니메이션으로 "듣고 있음"을 표현한다.          */
/* ------------------------------------------------------------------ */
function VoiceWaveform({ active }) {
    const bars = 22;
    return (
        <AnimatePresence>
            {active && (
                <motion.div
                    className="flex items-center justify-center gap-3 px-4 py-2.5 border-t"
                    style={{ borderColor: C.panelBorder, background: "rgba(16,27,51,0.9)" }}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <motion.span
                        style={{ display: "inline-flex", color: C.lime, flexShrink: 0 }}
                        animate={{ opacity: [1, 0.35, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <Mic size={14} />
                    </motion.span>
                    <div className="flex items-end gap-[3px]" style={{ height: 22 }}>
                        {Array.from({ length: bars }).map((_, i) => (
                            <motion.span
                                key={i}
                                style={{ width: 2, borderRadius: 1, background: C.lime, display: "inline-block" }}
                                animate={{ height: [4, 16, 6, 20, 4] }}
                                transition={{
                                    duration: 0.85 + (i % 5) * 0.09,
                                    repeat: Infinity,
                                    delay: i * 0.025,
                                    ease: "easeInOut",
                                }}
                            />
                        ))}
                    </div>
                    <span style={{ ...mono, color: C.lime, fontSize: 9.5, letterSpacing: 1.5 }}>LISTENING</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


function HoloProgressBar({ progress, label, tone = C.accent }) {
    const pct = Math.max(0, Math.min(100, progress));
    return (
        <div className="w-full flex flex-col gap-1.5" style={{ maxWidth: 280 }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <motion.span
                        style={{ width: 5, height: 5, borderRadius: 99, background: tone, display: "inline-block" }}
                        animate={{ opacity: [1, 0.25, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                    />
                    <span style={{ ...mono, color: tone, fontSize: 9.5, letterSpacing: 1 }}>{label}</span>
                </div>
                <span style={{ ...mono, color: C.slate, fontSize: 9.5 }}>{Math.round(pct)}%</span>
            </div>
            <div
                className="relative h-[4px] w-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.panelBorder}`, borderRadius: 8 }}
            >
                <motion.div
                    className="absolute inset-y-0 left-0"
                    style={{
                        background: `linear-gradient(90deg, ${C.blue}, ${tone})`,
                        boxShadow: `0 0 10px ${tone}aa`,
                    }}
                    animate={{ width: `${pct}%` }}
                    transition={{ ease: "linear", duration: 0.12 }}
                />
                <motion.div
                    className="absolute inset-y-0"
                    style={{
                        width: 28,
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)",
                        mixBlendMode: "screen",
                    }}
                    animate={{ left: ["-12%", "112%"] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex justify-between px-[1px]">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
                    ))}
                </div>
            </div>
            <div
                className="w-full h-[6px]"
                style={{
                    background: `linear-gradient(180deg, ${tone}22, transparent)`,
                    opacity: 0.5,
                    filter: "blur(1px)",
                }}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 웹 검색 상태 — 큰 웹노드 로더가 중심에 뜨는 동안엔 라벨만, 완료 시 출처 */
/* ------------------------------------------------------------------ */
function SearchStatus({ phase, sources }) {
    return (
        <div className="flex flex-col items-center gap-2 w-full" style={{ maxWidth: 280 }}>
            {phase === "searching" ? (
                <span style={{ ...mono, color: C.accent, fontSize: 10.5, letterSpacing: 1 }}>
                    웹 검색 중
                    <Dots />
                </span>
            ) : (
                <div className="flex flex-col items-stretch gap-1.5 w-full">
                    <div className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={12} color={C.lime} />
                        <span style={{ ...mono, color: C.lime, fontSize: 10, letterSpacing: 1 }}>
                            검색 완료 · 출처 {sources.length}건
                        </span>
                    </div>
                    {sources.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.2 }}
                            className="flex items-center gap-1.5 px-2 py-1.5"
                            style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(76,134,255,0.05)", borderRadius: 8 }}
                        >
                            <Link2 size={11} color={C.blue} style={{ flexShrink: 0 }} />
                            <span style={{ ...sans, color: C.slate, fontSize: 11 }} className="truncate">
                                {s}
                            </span>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 문서 내보내기 버튼 — PDF / 슬라이드                                   */
/* ------------------------------------------------------------------ */
function ExportButtons({ onExportPdf, onExportSlide, onExportImages }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={onExportPdf}
                className="flex items-center gap-1.5 px-3 py-1.5"
                style={{ border: `1px solid ${C.accent}`, color: C.accent, background: "rgba(255,59,46,0.06)" }}
            >
                <FileDown size={13} />
                <span style={{ ...mono, fontSize: 10, letterSpacing: 0.5 }}>PDF로 내보내기</span>
            </button>
            <button
                onClick={onExportSlide}
                className="flex items-center gap-1.5 px-3 py-1.5"
                style={{ border: `1px solid ${C.blue}`, color: C.blue, background: "rgba(76,134,255,0.06)" }}
            >
                <MonitorPlay size={13} />
                <span style={{ ...mono, fontSize: 10, letterSpacing: 0.5 }}>슬라이드로 보기</span>
            </button>
            <button
                onClick={onExportImages}
                className="flex items-center gap-1.5 px-3 py-1.5"
                style={{ border: `1px solid ${C.lime}`, color: C.lime, background: "rgba(107,255,194,0.06)" }}
            >
                <ImageIcon size={13} />
                <span style={{ ...mono, fontSize: 10, letterSpacing: 0.5 }}>사진으로 내보내기</span>
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 토글 스위치                                                         */
/* ------------------------------------------------------------------ */
function Switch({ on, onChange }) {
    return (
        <button
            onClick={() => onChange(!on)}
            className="relative"
            style={{
                width: 40,
                height: 20,
                border: `1px solid ${on ? C.accent : C.panelBorder}`,
                background: on ? "rgba(255,59,46,0.12)" : "transparent",
                flexShrink: 0,
            }}
        >
            <motion.span
                className="absolute top-0.5"
                style={{ width: 14, height: 14, background: on ? C.accent : C.slate }}
                animate={{ left: on ? 22 : 3 }}
                transition={{ type: "tween", duration: 0.15 }}
            />
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* 상단 상태바                                                         */
/* ------------------------------------------------------------------ */
function StatusBar({ onMenu, showBack, onBack, title }) {
    return (
        <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: C.panelBorder }}
        >
            <div className="flex items-center gap-3">
                {showBack ? (
                    <button onClick={onBack} style={{ color: C.slate }}>
                        <ArrowLeft size={18} />
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <SpiderMascotIcon size={14} color={C.accent} opacity={0.85} />
                        <span style={{ ...mono, color: C.lime, fontSize: 11, letterSpacing: 1 }}>
                            ● STATUS: ONLINE
                        </span>
                    </div>
                )}
                {title && (
                    <span style={{ ...mono, color: C.text, fontSize: 13 }}>{title}</span>
                )}
            </div>
            {!showBack && (
                <button onClick={onMenu} style={{ color: C.accent }}>
                    <Menu size={20} />
                </button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 사이드 패널                                                         */
/* ------------------------------------------------------------------ */
function SidePanel({ open, onClose, onNavigate, historyOn, onToggleHistory }) {
    const items = [
        { key: "newchat", label: "새 대화 시작", icon: MessageSquarePlus },
        { key: "todo", label: "오늘의 할 일 (Todo)", icon: CheckSquare },
        { key: "masking", label: "개인정보 마스킹 설정", icon: Shield },
        { key: "sports", label: "스포츠 알림 설정", icon: Trophy },
        { key: "apikey", label: "API / 모델 설정", icon: KeyRound },
        { key: "schedule", label: "시간표 관리", icon: Clock },
        { key: "paths", label: "경로 설정", icon: FolderOpen },
        { key: "calendar", label: "캘린더", icon: CalendarDays },
        { key: "wrong", label: "빌런 도감", icon: BookOpen },
        { key: "bugle", label: "오늘의 브리핑", icon: FileText },
        { key: "history", label: "이전 대화", icon: History },
        { key: "memories", label: "memories.md", icon: FileText },
        { key: "pace", label: "페이스 계산기", icon: Timer },
    ];
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="absolute inset-0 z-10"
                        style={{ background: "rgba(0,0,0,0.5)" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="absolute top-0 right-0 h-full z-20 flex flex-col"
                        style={{ width: "78%", background: C.panel, borderLeft: `1px solid ${C.panelBorder}` }}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "tween", duration: 0.25 }}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.panelBorder }}>
                            <span style={{ ...mono, color: C.slate, fontSize: 11 }}>MENU</span>
                            <button onClick={onClose} style={{ color: C.slate }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col p-2 gap-1 overflow-y-auto">
                            {items.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => onNavigate(key)}
                                    className="flex items-center gap-3 px-3 py-3 text-left"
                                    style={{
                                        border: `1px solid ${C.panelBorder}`,
                                        color: C.text,
                                    }}
                                >
                                    <Icon size={16} color={C.accent} />
                                    <span style={{ ...sans, fontSize: 14 }}>{label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-2 px-2">
                            <span style={{ ...mono, color: C.slate, fontSize: 10, letterSpacing: 1 }}>설정</span>
                        </div>
                        <div className="px-2 pt-1">
                            <div
                                className="flex items-center justify-between gap-3 px-3 py-3"
                                style={{ border: `1px solid ${C.panelBorder}` }}
                            >
                                <div className="flex flex-col">
                                    <span style={{ ...sans, color: C.text, fontSize: 14 }}>채팅 기록 표시</span>
                                    <span style={{ ...sans, color: C.slate, fontSize: 11, marginTop: 2 }}>
                                        {historyOn ? "이전 대화가 위로 쌓이며 이어집니다" : "지금 나눈 대화만 표시됩니다"}
                                    </span>
                                </div>
                                <Switch on={historyOn} onChange={onToggleHistory} />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 1: 환영 + 구글 로그인                                           */
/* ------------------------------------------------------------------ */
function WelcomeScreen({ onLogin }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-8">
            <div className="flex flex-col items-center gap-1">
                <SpiderMascotIcon size={30} color={C.accent} opacity={0.9} />
                <span style={{ ...mono, color: C.accent, fontSize: 11, letterSpacing: 3, marginTop: 4 }}>{"> SYSTEM BOOT"}</span>
                <div className="inline-block" style={{ marginTop: 6 }}>
                    {/* 그림자를 별도 span으로 겹쳐 쌓는 대신 text-shadow 하나로
                        처리한다. 겹친 두 개의 절대배치 span 방식은 화면 크기/
                        스케일이 달라지면 정렬이 어긋나기 쉬운데, text-shadow는
                        글자 자체에 붙어있어서 화면 크기와 무관하게 항상 같은
                        상대 위치(오른쪽 아래 3px)를 유지한다. */}
                    <span
                        style={{
                            ...sans,
                            fontSize: 48,
                            fontWeight: 800,
                            letterSpacing: "0.03em",
                            color: C.text,
                            textShadow: `3px 3px 0 ${C.blue}66, 0 0 26px ${C.accent}66`,
                        }}
                    >
                        E.V.
                    </span>
                </div>
                <span style={{ ...mono, color: C.slate, fontSize: 10, letterSpacing: 2, marginTop: 4 }}>
                    PERSONAL AI INSTANCE
                </span>
            </div>

            <CircularCore active size={78} />

            <p style={{ ...sans, color: C.slate, fontSize: 13, lineHeight: 1.6, maxWidth: 260 }}>
                E.V. 피터 파커의 개인 AI비서.
                <br />
                어서 시작하자고!
            </p>
            <button
                onClick={() => {
                    sendToFlutter("google_login", {});
                    onLogin();
                }}
                className="flex items-center justify-center gap-2.5 w-full max-w-xs py-3"
                style={{ border: `1px solid ${C.accent}`, color: C.accent, ...mono, fontSize: 13, letterSpacing: 1 }}
            >
                <img src={GOOGLE_ICON_URI} alt="" width={18} height={18} style={{ flexShrink: 0 }} />
                GOOGLE 계정으로 계속하기
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 데모용 목업 데이터                                                    */
/* ------------------------------------------------------------------ */
const MOCK_SOURCES = [
    "arxiv.org/abs/2406.xxxxx — 관련 연구 요약",
    "docs.example.com/reference — 공식 문서",
    "news.example.com/latest — 최신 동향 기사",
];

const WIFI_NAMES = ["EV_LAB_5G", "HomeNet_802", "Cafe_Guest_WiFi"];
const BT_DEVICES = ["AirPods Pro", "Galaxy Buds", "EV Controller"];

const DEFAULT_CALENDAR_MD = `# calendar.md

## 2026-08-10
- 팀 회의 14:00
- 저녁 약속

## 2026-08-15
- 친구 생일파티
`;

/* ------------------------------------------------------------------ */
/* calendar.md 파싱 / 수정 헬퍼                                         */
/* ------------------------------------------------------------------ */
function parseCalendarMd(md) {
    const lines = md.split("\n");
    const map = {};
    let currentDate = null;
    for (const line of lines) {
        const dateMatch = line.match(/^##\s*(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            currentDate = dateMatch[1];
            if (!map[currentDate]) map[currentDate] = [];
            continue;
        }
        const eventMatch = line.match(/^-\s*(.+)/);
        if (eventMatch && currentDate) {
            map[currentDate].push(eventMatch[1].trim());
        }
    }
    return map;
}

/* Flutter가 calendar.json(진짜 저장소)을 읽거나 AI의 <update_calendar>
   태그를 반영한 뒤 "calendar_sync" 이벤트로 돌려주는 이벤트 배열
   ({ id, date, time, title, type }[])을, 화면(CalendarScreen)이 쓰는
   calendar.md 텍스트 형식으로 변환한다. 예전엔 이 반대 방향(React가 문장을
   추측해서 md를 직접 고치는 것)이었는데, 이제 진짜 데이터가 항상 출처다. */
function eventsToCalendarMd(events) {
    const byDate = {};
    for (const ev of events || []) {
        if (!ev?.date) continue;
        if (!byDate[ev.date]) byDate[ev.date] = [];
        const label = ev.time ? `${ev.title} ${ev.time}` : ev.title || "일정";
        byDate[ev.date].push(label);
    }
    const dates = Object.keys(byDate).sort();
    if (dates.length === 0) return "# calendar.md\n";
    const body = dates
        .map((d) => `## ${d}\n${byDate[d].map((line) => `- ${line}`).join("\n")}`)
        .join("\n\n");
    return `# calendar.md\n\n${body}\n`;
}

function getMonthMatrix(year, month) {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

/* ------------------------------------------------------------------ */
/* AI 메시지 렌더러 (생각 중 / 생각 과정 표시)                             */
/* ------------------------------------------------------------------ */
function AssistantMessage({ text, streaming, isLatest, textMaxWidth, bodyFontSize, searchStatus }) {
    const [showThought, setShowThought] = useState(false);

    if (!text && streaming) {
        return (
            <span className="flex items-center gap-1.5" style={{ ...mono, color: searchStatus ? C.lime : C.accent, fontSize: 10.5, letterSpacing: 1 }}>
                {searchStatus ? `🔍 [${searchStatus}] 검색 중` : "생각 중"}<Dots />
            </span>
        );
    }

    if (!text) return null;

    let thoughtProcess = null;
    let finalAnswer = text;

    const thinkEndIdx = text.indexOf("</think>");
    if (thinkEndIdx !== -1) {
        const fullThought = text.substring(0, thinkEndIdx + 8);
        finalAnswer = text.substring(thinkEndIdx + 8).trim();
        thoughtProcess = fullThought.replace(/<think>/g, "").replace(/<\/think>/g, "").trim();
    } else if (text.includes("<think>")) {
        // Still thinking, hasn't closed yet
        thoughtProcess = text.replace(/<think>/g, "").trim();
        finalAnswer = "";
    }

    return (
        <div className="flex flex-col gap-2 w-full items-center" style={{ maxWidth: textMaxWidth }}>
            {thoughtProcess && (
                <div className="flex flex-col gap-1 w-full">
                    <button
                        onClick={() => setShowThought(!showThought)}
                        className="flex items-center gap-1.5 self-start px-2 py-1 rounded-lg"
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            border: `1px solid ${C.panelBorder}`,
                            color: C.slate,
                        }}
                    >
                        <span style={{ ...mono, fontSize: 9.5, letterSpacing: 0.5 }}>
                            {showThought ? "▼ 생각 과정 접기" : "▶ 생각 과정 보기"}
                        </span>
                        {streaming && !finalAnswer && <Dots />}
                    </button>
                    {showThought && (
                        <div
                            className="p-3 rounded-lg mt-1 text-left w-full"
                            style={{
                                background: "rgba(0,0,0,0.3)",
                                borderLeft: `2px solid ${C.accent}`,
                                color: C.slate,
                                fontSize: bodyFontSize ? bodyFontSize * 0.9 : 12.5,
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {thoughtProcess}
                        </div>
                    )}
                </div>
            )}
            {finalAnswer && (
                <p style={{ ...sans, color: isLatest ? C.text : C.slate, fontSize: bodyFontSize || 12.5, lineHeight: isLatest ? 1.85 : 1.6, letterSpacing: 0.1, whiteSpace: "pre-wrap", textAlign: "center" }}>
                    {finalAnswer}
                </p>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2: 메인 콘솔                                                    */
/* ------------------------------------------------------------------ */
function MainScreen({
    onMenu,
    menuOpen,
    onCloseMenu,
    onNavigate,
    historyOn,
    onToggleHistory,
    onAlert,
    calendarMd,
    newChatSignal,
    onMusicOn,
    onMusicOff,
    micActive,
    textInjectEvent,
    llmResultEvent,
    conversationHistoryEvent,
    attachedFileFromNative,
    searchEngineStatusFromParent,
}) {
    const [input, setInput] = useState("");
    const [attachedFile, setAttachedFile] = useState(null);
    const [log, setLog] = useState([]);
    const [searchEngineStatus, setSearchEngineStatus] = useState(null);

    useEffect(() => {
        if (attachedFileFromNative) {
            setAttachedFile(attachedFileFromNative);
        }
    }, [attachedFileFromNative]);

    // EVApp에서 네이티브 이벤트(search_status)로 받은 검색 상태를 동기화
    useEffect(() => {
        setSearchEngineStatus(searchEngineStatusFromParent);
    }, [searchEngineStatusFromParent]);
    // entry: { id, user, kind: 'chat'|'search'|'file', phase, progress, sources, assistant, streaming, attachment }
    const idxRef = useRef(0);
    const fullReplyRef = useRef("");
    const latestRef = useRef(null);
    const fileInputRef = useRef(null);
    const [synced, setSynced] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const dragCounterRef = useRef(0);
    const inputSourceRef = useRef("text"); // "text" | "voice" | "spen"
    const { isLandscape, scale } = useResponsiveLayout();

    // 메뉴에서 "새 대화 시작"을 누르면 newChatSignal이 올라가고, 대화 기록을
    // 비운다. Flutter 쪽 새 세션 시작도 루트에서 이미 트리거해준다.
    useEffect(() => {
        setLog([]);
    }, [newChatSignal]);

    // 앱 시작 시 Flutter가 conversation.json에서 복원해 보내준 이전 대화
    // (conversationHistoryEvent.history: [{role:'user'|'assistant', content}, ...])
    // 를 채팅 로그 형태({id, user, assistant, kind:'chat'})로 변환해 채워넣는다.
    // 이게 없으면 Dart 쪽에 파일이 잘 저장돼 있어도 화면은 항상 빈 채팅으로
    // 시작한다.
    useEffect(() => {
        const history = conversationHistoryEvent?.history;
        if (!history || history.length === 0) return;

        const restored = [];
        let pending = null;
        history.forEach((msg, idx) => {
            if (msg.role === "user") {
                pending = { id: `restored_${idx}`, user: msg.content, assistant: "", kind: "chat", streaming: false };
                restored.push(pending);
            } else if (msg.role === "assistant") {
                if (pending) {
                    pending.assistant = msg.content;
                    pending = null;
                } else {
                    // 짝이 없는 assistant 메시지(비정상 케이스) — 빈 user로 감싸서 표시
                    restored.push({ id: `restored_${idx}`, user: "", assistant: msg.content, kind: "chat", streaming: false });
                }
            }
        });

        setLog(restored);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationHistoryEvent]);

    // STT 결과나 S펜으로 넘어온 텍스트(textInjectEvent)가 도착하면 입력창에
    // 채워넣는다. 소스를 기억해뒀다가 전송할 때 Flutter로 같이 실어보낸다.
    useEffect(() => {
        if (!textInjectEvent?.text) return;
        inputSourceRef.current = textInjectEvent.source || "voice";
        setInput((prev) => (prev ? `${prev} ${textInjectEvent.text}` : textInjectEvent.text));
    }, [textInjectEvent]);

    // S펜으로 화면 위 텍스트를 오려내면(cut) 브라우저 cut 이벤트가 뜬다.
    // 선택된 텍스트를 낚아채서 곧바로 Flutter(Llama API/옵시디언)로 전달한다.
    useEffect(() => {
        const handleCut = (e) => {
            const text = e.clipboardData?.getData("text/plain") || window.getSelection()?.toString() || "";
            if (!text.trim()) return;
            sendToFlutter("text_captured", { text, source: "spen_cut" });
        };
        document.addEventListener("cut", handleCut);
        return () => document.removeEventListener("cut", handleCut);
    }, []);

    const visible = historyOn ? log : log.slice(-1);
    const older = historyOn ? visible.slice(0, -1) : [];
    const latest = visible[visible.length - 1];
    const activelyStreaming = log.length > 0 && log[log.length - 1].streaming;

    // 새 메시지가 추가되거나 기록 표시 여부가 바뀔 때만 최신 대화를 화면
    // 중앙으로 스크롤 — 스트리밍 중 토큰이 찍힐 때마다 끌려 내려가지 않도록
    // log.length / historyOn 변화에만 반응한다. 그 사이엔 자유롭게 위로
    // 스크롤해서 지난 대화를 볼 수 있다.
    useEffect(() => {
        requestAnimationFrame(() => {
            latestRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
    }, [log.length, historyOn]);

    const streamText = (id, text) => {
        fullReplyRef.current = text;
        idxRef.current = 0;
        const tick = setInterval(() => {
            idxRef.current += 1;
            const slice = fullReplyRef.current.slice(0, idxRef.current);
            setLog((prev) => prev.map((e) => (e.id === id ? { ...e, assistant: slice } : e)));
            if (idxRef.current >= fullReplyRef.current.length) {
                clearInterval(tick);
                setLog((prev) => prev.map((e) => (e.id === id ? { ...e, streaming: false } : e)));
                setSynced(true);
                sendToFlutter("update_memory", { note: text });
                setTimeout(() => setSynced(false), 2400);
            }
        }, 18);
    };

    // Flutter가 실제 NVIDIA NIM API 응답을 "llm_result"로 돌려주면
    // ({ id, text }) — id가 일치하는 말풍선을 찾아 타이핑 애니메이션으로
    // 출력한다. handleSend에서 만든 id와 EV_Channel로 보낸 id가 같은 값.
    // 단, 시스템 프롬프트 규칙상 AI가 "music_start"/"music_off"만 딱 뱉는
    // 경우엔 그 문자열을 그대로 보여주지 않고 실제 음악 제어로 변환한다.
    useEffect(() => {
        if (!llmResultEvent) return;
        const { id, text, document } = llmResultEvent;
        if (id == null) return;
        const trimmed = (text || "").trim();

        if (trimmed === "music_start" || (text && text.includes("<resume_music>"))) {
            onMusicOn();
            const cleaned = (text || "").replace("<resume_music>", "").trim() || "음악을 재생할게.";
            setLog((prev) => prev.map((e) => (e.id === id ? { ...e, assistant: cleaned, streaming: false } : e)));
            return;
        }
        const playlistMatch = text ? text.match(/<play_playlist\s+name="([^"]+)">/i) : null;
        if (playlistMatch) {
            const playlistName = playlistMatch[1];
            onMusicOn();
            const cleanText = text.replace(playlistMatch[0], "").trim() || `${playlistName} 플레이리스트를 재생할게.`;
            setLog((prev) => prev.map((e) => (e.id === id ? { ...e, assistant: cleanText, streaming: false } : e)));
            sendToFlutter("play_playlist", { name: playlistName });
            return;
        }
        if (trimmed === "music_off") {
            onMusicOff();
            setLog((prev) => prev.map((e) => (e.id === id ? { ...e, assistant: "음악을 껐어.", streaming: false } : e)));
            return;
        }

        // 진짜 실패했을 때만 온다 — API 키 미설정, 네트워크 실패, 응답 코드
        // 오류 등 llm_service.dart가 "Error: "로 시작하는 문자열을 돌려준
        // 경우. 사용자가 "에러"라고 타이핑했다고 데모로 흉내내던 예전 로직은
        // 없앴다.
        if (trimmed.startsWith("Error:")) {
            onAlert("error");
        }

        // AI가 <generate_document> 태그로 실제 reveal.js 슬라이드 + PDF를
        // 만들었을 때만 온다({ title }). 예전엔 가짜 진행바가 다 채워지면
        // 무조건 "문서 생성 완료"였는데, 이제 이 kind 전환은 실제 파일이
        // 만들어졌을 때만 일어난다.
        if (document) {
            setLog((prev) => prev.map((e) => (e.id === id ? { ...e, kind: "file", document } : e)));
            onAlert("success");
        }

        streamText(id, text || "응답을 받지 못했어. 잠시 후 다시 시도해줘.");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [llmResultEvent]);

    // 클립보드나 드래그로 들어온 이미지를 첨부파일로 등록한다.
    const attachDroppedFile = (file) => {
        if (!file) return;
        setAttachedFile(file);
        sendToFlutter("file_selected", { name: file.name || "dropped-file", size: file.size });
    };

    const handleSend = async () => {
        if (!input.trim() && !attachedFile) return;
        let text = input.trim();
        const id = Date.now();
        
        let attachmentBase64 = null;
        let attachmentName = null;

        if (attachedFile) {
            attachmentName = attachedFile.name;
            if (attachedFile.text) {
                text += `\n\n[첨부 문서 '${attachmentName}' 내용]\n${attachedFile.text}`;
            } else if (attachedFile.base64) {
                attachmentBase64 = attachedFile.base64;
            } else if (attachedFile.type && attachedFile.type.startsWith("image/")) {
                const reader = new FileReader();
                attachmentBase64 = await new Promise((resolve) => {
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(attachedFile);
                });
            }
        }

        sendToFlutter("user_message", {
            id,
            text,
            attachment: attachmentName,
            attachmentBase64: attachmentBase64,
            source: inputSourceRef.current, // "text" | "voice" | "spen" — Llama API/옵시디언 쪽에서 구분해 쓸 수 있게
        });
        inputSourceRef.current = "text";

        // 에러 / 캘린더 / 음악 on-off는 더 이상 사용자 문장을 정규식으로
        // 흉내내서 처리하지 않는다. 셋 다 실제 AI 응답을 거쳐서 결정된다:
        //  - 에러: llm_service.dart가 진짜로 실패했을 때만 "Error: ..."로
        //    시작하는 문자열을 돌려주고, 그건 아래 llmResultEvent 이펙트에서
        //    감지해서 알림을 띄운다.
        //  - 캘린더: AI가 <update_calendar> 태그를 응답에 붙이면 Flutter가
        //    calendar.json에 실제로 반영한 뒤 "calendar_sync" 네이티브 이벤트로
        //    돌려주고, 그걸 handleNativeEvent에서 받아 calendarMd를 갱신한다.
        //  - 음악: AI가 정확히 "music_start" / "music_off"를 응답으로 낼 때만
        //    (llmResultEvent 이펙트에서) 실제로 음악을 켜고 끈다.
        //  - 음악: AI가 정확히 "music_start" / "music_off"를 응답으로 낼 때만
        //    (llmResultEvent 이펙트에서) 실제로 음악을 켜고 끈다.
        //  - 문서/슬라이드: "슬라이드 만들어줘" 같은 요청도 더 이상 가짜 진행바로
        //    흉내내지 않는다. AI가 <generate_document> 태그를 응답에 붙이면
        //    Flutter가 실제 reveal.js HTML + PDF 파일을 만들어서 llm_result에
        //    document 정보를 실어 보내주고, 그건 llmResultEvent 이펙트에서 처리한다.

        const wantsSearch = false; // 일시적으로막아봄

        if (wantsSearch) {
            setLog((prev) => [
                ...prev,
                { id, user: text || "(파일 첨부)", kind: "search", phase: "searching", sources: [], assistant: "", streaming: true, attachment: attachedFile },
            ]);
            setInput("");
            setAttachedFile(null);
            setTimeout(() => {
                setLog((prev) => prev.map((e) => (e.id === id ? { ...e, phase: "done", sources: MOCK_SOURCES } : e)));
                onAlert("success");
                setTimeout(() => {
                    streamText(id, "위 출처들을 확인했어. 요약하면, 핵심 내용은 최신 자료 기준으로 정리돼 있고 세부 항목은 각 출처 링크에서 바로 확인할 수 있어.");
                }, 350);
            }, 1600);
            return;
        }

        setLog((prev) => [...prev, { id, user: text, kind: "chat", assistant: "", streaming: true, attachment: attachedFile }]);
        setInput("");
        setAttachedFile(null);
        // 실제 응답은 Flutter가 NVIDIA NIM API를 호출한 뒤 "llm_result"
        // 이벤트로 돌려주면 아래 llmResultEvent 훅에서 streamText로 출력한다.
    };

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) attachDroppedFile(f);
        e.target.value = "";
    };

    // 복사한 이미지/텍스트를 입력창에 붙여넣기(Ctrl+V)로 바로 업로드.
    // 이미지가 있으면 첨부파일로, 없으면 기본 텍스트 붙여넣기 동작에 맡긴다.
    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.kind === "file" && item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    attachDroppedFile(file);
                }
                return;
            }
        }
    };

    // 파일이나 텍스트를 화면 위로 드래그해서 놓으면 업로드된다.
    // 카운터로 자식 요소를 넘나들 때 깜빡이는 걸 막는다.
    const handleDragEnter = (e) => {
        e.preventDefault();
        if (!e.dataTransfer) return;
        dragCounterRef.current += 1;
        setDragActive(true);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current <= 0) {
            dragCounterRef.current = 0;
            setDragActive(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        dragCounterRef.current = 0;
        setDragActive(false);
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            attachDroppedFile(files[0]);
            return;
        }
        const text = e.dataTransfer?.getData("text/plain");
        if (text) {
            setInput((prev) => (prev ? `${prev} ${text}` : text));
            sendToFlutter("text_captured", { text, source: "drop" });
        }
    };

    const handleExportPdf = (entry) => sendToFlutter("export_pdf", { id: entry.id });
    const handleExportSlide = (entry) => sendToFlutter("export_slide", { id: entry.id });
    const handleExportImages = (entry) => sendToFlutter("export_images", { id: entry.id });

    const coreSize = (isLandscape ? 72 : 110) * scale;
    const textMaxWidth = isLandscape ? "62%" : "88%";
    const bodyFontSize = (isLandscape ? 14 : 15.5) * Math.min(scale, 1.25);

    const showWebLoader = latest && latest.kind === "search" && latest.phase === "searching";

    return (
        <div
            className="flex flex-col h-full relative"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <StatusBar onMenu={onMenu} />

            {/* 스크롤 가능한 대화 영역 — 지난 턴들은 위에 그대로 쌓여 있고,
          위아래로 넉넉한 여백을 둬서 최신 턴이 화면 중앙에 오도록 자연스럽게
          스크롤된다. 퍼센트 높이(min-h-full)에 기대지 않는 방식이라, 충분히
          위로 스크롤하면 원형 코어가 화면 밖으로 나가더라도 예전 대화들은
          항상 그대로 남아 있다. */}
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col items-center px-6" style={{ paddingTop: "34vh", paddingBottom: "34vh", gap: isLandscape ? 28 : 44 }}>
                    {visible.length === 0 && (
                        <span style={{ ...mono, color: C.slate, fontSize: 11, letterSpacing: 1 }}>SESSION READY</span>
                    )}

                    {older.map((entry) => (
                        <div key={entry.id} className="w-full flex flex-col items-center gap-2" style={{ opacity: 0.42 }}>
                            <span style={{ ...mono, color: C.blue, fontSize: 9, letterSpacing: 1 }}>{entry.user}</span>

                            {entry.kind === "search" && (
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 size={11} color={C.lime} />
                                    <span style={{ ...mono, color: C.lime, fontSize: 9.5, letterSpacing: 0.5 }}>
                                        검색 완료 · 출처 {entry.sources?.length || 0}건
                                    </span>
                                </div>
                            )}

                            {entry.kind === "file" && (
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 size={11} color={C.lime} />
                                    <span style={{ ...mono, color: C.lime, fontSize: 9.5, letterSpacing: 0.5 }}>문서 생성 완료</span>
                                </div>
                            )}

                            <AssistantMessage
                                text={entry.assistant}
                                streaming={false}
                                isLatest={false}
                                textMaxWidth={textMaxWidth}
                            />

                            {entry.kind === "file" && (
                                <div style={{ opacity: 0.75, transform: "scale(0.92)" }}>
                                    <ExportButtons onExportPdf={() => handleExportPdf(entry)} onExportSlide={() => handleExportSlide(entry)} onExportImages={() => handleExportImages(entry)} />
                                </div>
                            )}
                        </div>
                    ))}

                    {latest && (
                        <div ref={latestRef} className="w-full flex flex-col items-center gap-6">
                            {showWebLoader ? (
                                <WebNodeLoader size={coreSize} tone={C.accent} />
                            ) : (
                                <CircularCore active={latest.streaming} size={coreSize} />
                            )}

                            <div className="flex flex-col items-center gap-2" style={{ maxWidth: textMaxWidth }}>
                                <span style={{ ...mono, color: C.slate, fontSize: 10, letterSpacing: 0.5 }}>{latest.user}</span>

                                {latest.kind === "search" && <SearchStatus phase={latest.phase} sources={latest.sources} />}

                                {latest.kind === "file" && !latest.streaming && (
                                    <div className="flex flex-col items-center gap-2.5">
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircle2 size={12} color={C.lime} />
                                            <span style={{ ...mono, color: C.lime, fontSize: 10, letterSpacing: 1 }}>문서 생성 완료</span>
                                        </div>
                                        <ExportButtons onExportPdf={() => handleExportPdf(latest)} onExportSlide={() => handleExportSlide(latest)} onExportImages={() => handleExportImages(latest)} />
                                    </div>
                                )}

                                <AssistantMessage
                                    text={latest.assistant}
                                    streaming={latest.streaming}
                                    isLatest={true}
                                    textMaxWidth={textMaxWidth}
                                    bodyFontSize={bodyFontSize}
                                    searchStatus={searchEngineStatus}
                                />
                            </div>

                            {latest.streaming && latest.kind === "chat" && (
                                <div className="flex items-center gap-4">
                                    <FloatingReadout label="TRACE" value="LIVE" />
                                    <FloatingReadout label="NODE" value="E.V.-07" delay={0.12} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {synced && (
                    <motion.div
                        className="absolute bottom-20 left-1/2"
                        style={{ transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, border: `1px solid ${C.lime}`, background: C.panel }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.span
                            style={{ width: 6, height: 6, borderRadius: 99, background: C.lime, display: "inline-block" }}
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        />
                        <span style={{ ...mono, color: C.lime, fontSize: 10 }}>MEMORY SYNCED</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {attachedFile && (
                    <motion.div className="px-4 pb-1" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
                        <div className="inline-flex items-center gap-1.5 px-2 py-1" style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
                            <Paperclip size={11} color={C.accent} />
                            <span style={{ ...mono, color: C.slate, fontSize: 10 }} className="truncate max-w-[160px]">
                                {attachedFile.name}
                            </span>
                            <button onClick={() => setAttachedFile(null)} style={{ color: C.slate }}>
                                <X size={11} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <VoiceWaveform active={micActive} />

            <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: C.panelBorder }}>
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
                    title="스크린샷 첨부 질문"
                >
                    <ImageIcon size={17} style={{ filter: "hue-rotate(120deg)" }} />
                </button>
                <button onClick={() => sendToFlutter("perform_ocr", {})} style={{ color: C.accent, flexShrink: 0 }} title="텍스트 스캔(OCR)">
                    <FileText size={18} />
                </button>
                <input
                    value={input}
                    onChange={(e) => {
                        inputSourceRef.current = "text";
                        setInput(e.target.value);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    onPaste={handlePaste}
                    placeholder="메시지 입력, 혹은 이미지를 붙여넣기/드래그"
                    className="flex-1 bg-transparent outline-none py-2 text-center"
                    style={{ ...sans, color: C.text, fontSize: 14 }}
                />
                <button
                    onClick={() => {
                        sendToFlutter(micActive ? "stop_voice_chat" : "start_voice_chat", {});
                    }}
                    style={{ color: micActive ? C.lime : C.slate, flexShrink: 0, marginRight: 8 }}
                    title="음성 대화"
                >
                    <Mic size={18} style={micActive ? { filter: `drop-shadow(0 0 4px ${C.lime})` } : {}} />
                </button>
                <button onClick={handleSend} disabled={activelyStreaming} style={{ color: C.accent, opacity: activelyStreaming ? 0.4 : 1, flexShrink: 0 }}>
                    <Send size={18} />
                </button>
            </div>

            <SidePanel open={menuOpen} onClose={onCloseMenu} onNavigate={onNavigate} historyOn={historyOn} onToggleHistory={onToggleHistory} />

            {/* 드래그 오버 시 뜨는 업로드 오버레이 — 파일/텍스트를 놓을 곳을 명확히 보여준다 */}
            <AnimatePresence>
                {dragActive && (
                    <motion.div
                        className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                        style={{ background: "rgba(5,7,10,0.85)", border: `1.5px dashed ${C.accent}` }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <Paperclip size={26} color={C.accent} />
                            <span style={{ ...mono, color: C.accent, fontSize: 12, letterSpacing: 1 }}>여기에 놓아서 업로드</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-1: API 키 입력 (카드형 레이아웃 개선)                         */
/* ------------------------------------------------------------------ */
function ApiKeyScreen({ onBack }) {
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
    const [footballDataKey, setFootballDataKey] = useState(() => localStorage.getItem("FOOTBALL_DATA_KEY") || "");

    useEffect(() => {
        const handleSettingsSync = (e) => {
            const payload = e.detail;
            if (payload?.type === "settings_sync") {
                if (payload.llmKey) setKey(payload.llmKey);
                if (payload.exaKey) setSearchKey(payload.exaKey);
                if (payload.kmaKey) setKmaKey(payload.kmaKey);
                if (payload.llmEndpoint) setEndpoint(payload.llmEndpoint);
                if (payload.llmModel) setModel(payload.llmModel);
                if (payload.visionModel) setVisionModel(payload.visionModel);
            }
        };
        window.addEventListener("ev-native-event", handleSettingsSync);
        return () => window.removeEventListener("ev-native-event", handleSettingsSync);
    }, []);

    const handleSave = () => {
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
    };

    const Section = ({ title, children }) => (
        <div className="flex flex-col gap-3 p-4 mb-4 rounded-lg" style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)" }}>
            <span style={{ ...mono, color: C.lime, fontSize: 11 * scale }}>{title}</span>
            {children}
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="API / 모델 설정" />
            <div className="flex-1 px-4 py-5 flex flex-col">
                <Section title="1. AI 모델 설정 (NVIDIA, Groq, OpenAI)">
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>API KEY</span>
                    <input
                        value={key} onChange={(e) => setKey(e.target.value)} placeholder="API Key 입력..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>API Endpoint URL</span>
                    <input
                        value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>텍스트 전용 모델명 (Main Model)</span>
                    <input
                        value={model} onChange={(e) => setModel(e.target.value)} placeholder="llama-3.3-70b-instruct"
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />

                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>비전 전용 모델명 (Vision Model - 사진/오답 분석 시 자동 전환)</span>
                    <input
                        value={visionModel} onChange={(e) => setVisionModel(e.target.value)} placeholder="meta/llama-3.2-11b-vision-instruct"
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />

                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                        <div className="flex flex-col">
                            <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>AI 시각(Vision) / 이미지 전송</span>
                            <span style={{ ...mono, color: C.slate, opacity: 0.6, fontSize: 8.5 * scale }}>텍스트 전용 모델(Llama 등) 사용 시 OFF</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setVisionEnabled(!visionEnabled)}
                            style={{
                                padding: `${4 * scale}px ${10 * scale}px`,
                                border: `1px solid ${visionEnabled ? C.lime : C.slate}`,
                                color: visionEnabled ? C.lime : C.slate,
                                borderRadius: 4,
                                ...mono,
                                fontSize: 9.5 * scale
                            }}
                        >
                            {visionEnabled ? "ON (Vision 전송)" : "OFF (텍스트 전용)"}
                        </button>
                    </div>
                </Section>

                <Section title="2. 실시간 웹 검색 (네이버 & Tavily 교차 검색)">
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>네이버 Search Client ID</span>
                    <input
                        value={naverClientId} onChange={(e) => setNaverClientId(e.target.value)} placeholder="Naver Client ID..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>네이버 Search Client Secret</span>
                    <input
                        type="password"
                        value={naverClientSecret} onChange={(e) => setNaverClientSecret(e.target.value)} placeholder="Naver Client Secret..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>Tavily Search API KEY</span>
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
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale, marginTop: 4 }}>Football-Data.org API KEY (축구 경기 정보)</span>
                    <input
                        value={footballDataKey} onChange={(e) => setFootballDataKey(e.target.value)} placeholder="Football-Data.org Token..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.blue, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </Section>

                <Section title="3. 기상청 날씨">
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>기상청 단기예보조회 API KEY (Encoding)</span>
                    <input
                        value={kmaKey} onChange={(e) => setKmaKey(e.target.value)} placeholder="KMA API Key..."
                        className="w-full bg-transparent outline-none"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </Section>

                <button
                    onClick={handleSave}
                    className="flex items-center justify-center mt-2"
                    style={{ padding: `${12 * scale}px`, border: `1px solid ${C.accent}`, color: C.accent, ...mono, fontSize: 12 * scale, letterSpacing: 1, gap: 8 * scale }}
                >
                    <Save size={14 * scale} /> 설정 저장하기
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-1-B: 시간표 관리 (schedule.json)                             */
/* ------------------------------------------------------------------ */
function ScheduleScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [rawJson, setRawJson] = useState("");
    
    useEffect(() => {
        sendToFlutter("get_schedule", {});
        const handleSync = (e) => {
            const payload = e.detail;
            if (payload?.type === "schedule_sync" && payload.schedule) {
                setRawJson(JSON.stringify(payload.schedule, null, 2));
            }
        };
        window.addEventListener("ev-native-event", handleSync);
        return () => window.removeEventListener("ev-native-event", handleSync);
    }, []);

    const handleSave = () => {
        try {
            const parsed = JSON.parse(rawJson);
            sendToFlutter("write_schedule", { schedule: parsed });
            alert("시간표가 저장되었습니다.");
        } catch (e) {
            alert("JSON 형식이 잘못되었습니다.");
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="시간표 관리" />
            <div className="flex-1 px-4 py-5 flex flex-col gap-3">
                <span style={{ ...mono, color: C.slate, fontSize: 11 * scale }}>학원, 학교 시간표 등을 JSON 배열로 입력하세요. 앱 재빌드 없이 AI가 이 시간표를 인식합니다.</span>
                <textarea
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    className="w-full flex-1 bg-transparent outline-none resize-none"
                    style={{ ...mono, color: C.text, fontSize: 11 * scale, padding: `${10 * scale}px`, border: `1px solid ${C.panelBorder}`, minHeight: '300px' }}
                />
                <button
                    onClick={handleSave}
                    className="flex items-center justify-center mt-2"
                    style={{ padding: `${12 * scale}px`, border: `1px solid ${C.lime}`, color: C.lime, ...mono, fontSize: 12 * scale, letterSpacing: 1, gap: 8 * scale }}
                >
                    <Save size={14 * scale} /> 파일에 저장 (schedule.json)
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-2: 경로 설정 (옵시디언 / 플레이리스트)                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
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

function PathSettingsScreen({ onBack }) {
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
}

/* ------------------------------------------------------------------ */
/* 화면 2-1-C: 오늘의 할 일 (Todo)                                     */
/* ------------------------------------------------------------------ */
function TodoScreen({ onBack, items, content }) {
    const { scale } = useResponsiveLayout();
    const [viewMode, setViewMode] = useState("list"); // "list" | "raw"
    const [newTodoText, setNewTodoText] = useState("");
    const [rawContent, setRawContent] = useState(content || "");

    useEffect(() => {
        sendToFlutter("get_todo", {});
    }, []);

    useEffect(() => {
        if (content !== undefined) setRawContent(content);
    }, [content]);

    const todoList = items || [];
    const totalCount = todoList.length;
    const completedCount = todoList.filter(t => t.completed).length;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const handleAdd = () => {
        const trimmed = newTodoText.trim();
        if (!trimmed) return;
        sendToFlutter("add_todo", { text: trimmed });
        setNewTodoText("");
    };

    const handleToggle = (index) => {
        sendToFlutter("toggle_todo", { index });
    };

    const handleDelete = (index) => {
        sendToFlutter("delete_todo", { index });
    };

    const handleSaveRaw = () => {
        sendToFlutter("save_todo_raw", { content: rawContent });
        alert("todo.md 파일이 저장되었습니다.");
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <StatusBar showBack onBack={onBack} title="오늘의 할 일 (Todo)" />

            {/* 상단 통계 & 모드 토글 바 */}
            <div className="px-5 pt-4 pb-3 flex flex-col gap-3 border-b" style={{ borderColor: C.panelBorder }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ListTodo size={16 * scale} color={C.lime} />
                        <span style={{ ...mono, color: C.text, fontSize: 13 * scale, fontWeight: 600 }}>
                            진행 현황: {completedCount} / {totalCount}
                        </span>
                    </div>
                    <span style={{ ...mono, color: progressPct === 100 ? C.lime : C.accent, fontSize: 13 * scale, fontWeight: 700 }}>
                        {progressPct}%
                    </span>
                </div>

                {/* 게이지 바 */}
                <div
                    className="w-full h-2 rounded-full overflow-hidden relative"
                    style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.panelBorder}` }}
                >
                    <motion.div
                        className="h-full rounded-full"
                        style={{
                            background: progressPct === 100
                                ? `linear-gradient(90deg, ${C.blue}, ${C.lime})`
                                : `linear-gradient(90deg, ${C.accentOrange}, ${C.accent})`,
                            boxShadow: `0 0 8px ${progressPct === 100 ? C.lime : C.accent}aa`,
                        }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                </div>

                {/* 모드 전환 탭 */}
                <div className="flex gap-2 pt-1">
                    <button
                        onClick={() => setViewMode("list")}
                        className="flex-1 py-1.5 rounded transition-all text-center"
                        style={{
                            ...mono,
                            fontSize: 11 * scale,
                            border: `1px solid ${viewMode === "list" ? C.accent : C.panelBorder}`,
                            background: viewMode === "list" ? "rgba(255,59,46,0.12)" : "transparent",
                            color: viewMode === "list" ? C.accent : C.slate,
                        }}
                    >
                        체크리스트 모드
                    </button>
                    <button
                        onClick={() => setViewMode("raw")}
                        className="flex-1 py-1.5 rounded transition-all text-center"
                        style={{
                            ...mono,
                            fontSize: 11 * scale,
                            border: `1px solid ${viewMode === "raw" ? C.lime : C.panelBorder}`,
                            background: viewMode === "raw" ? "rgba(107,255,194,0.12)" : "transparent",
                            color: viewMode === "raw" ? C.lime : C.slate,
                        }}
                    >
                        마크다운 직접 편집 (todo.md)
                    </button>
                </div>
            </div>

            {/* 본문 영역 */}
            {viewMode === "list" ? (
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                    {/* 새 항목 입력창 */}
                    <div
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{
                            border: `1px solid ${C.accent}`,
                            background: "rgba(255,59,46,0.04)",
                        }}
                    >
                        <input
                            type="text"
                            value={newTodoText}
                            onChange={(e) => setNewTodoText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            placeholder="새로운 할 일을 입력하세요..."
                            className="flex-1 bg-transparent outline-none px-2"
                            style={{ ...sans, color: C.text, fontSize: 13 * scale }}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newTodoText.trim()}
                            className="flex items-center justify-center p-2 rounded"
                            style={{
                                background: newTodoText.trim() ? C.accent : "rgba(255,255,255,0.05)",
                                color: newTodoText.trim() ? "#fff" : C.slate,
                                transition: "all 0.2s",
                            }}
                            title="할 일 추가"
                        >
                            <Plus size={16 * scale} />
                        </button>
                    </div>

                    {/* 목록이 비어있을 때 */}
                    {todoList.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                            <CheckSquare size={32 * scale} color={C.slate} opacity={0.4} />
                            <span style={{ ...sans, color: C.slate, fontSize: 13 * scale }}>
                                오늘 등록된 할 일이 없습니다.
                            </span>
                            <span style={{ ...mono, color: C.slate, fontSize: 10.5 * scale, opacity: 0.6 }}>
                                채팅창에서 "오늘 할 일에 OOO 추가해줘"라고 말해도 자동 등록됩니다.
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {todoList.map((item, idx) => (
                                <motion.div
                                    key={item.id || idx}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between p-3 rounded-lg transition-all"
                                    style={{
                                        border: `1px solid ${item.completed ? "rgba(107,255,194,0.3)" : C.panelBorder}`,
                                        background: item.completed ? "rgba(107,255,194,0.03)" : "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    <button
                                        onClick={() => handleToggle(idx)}
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                                    >
                                        <div
                                            className="flex items-center justify-center rounded flex-shrink-0"
                                            style={{
                                                width: 20 * scale,
                                                height: 20 * scale,
                                                border: `1.5px solid ${item.completed ? C.lime : C.slate}`,
                                                background: item.completed ? C.lime : "transparent",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            {item.completed && <Check size={13 * scale} color="#000" strokeWidth={3} />}
                                        </div>
                                        <span
                                            className="truncate"
                                            style={{
                                                ...sans,
                                                fontSize: 13.5 * scale,
                                                color: item.completed ? C.slate : C.text,
                                                textDecoration: item.completed ? "line-through" : "none",
                                                opacity: item.completed ? 0.6 : 1,
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            {item.text}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(idx)}
                                        className="p-1.5 rounded hover:bg-white/5 ml-2 flex-shrink-0"
                                        style={{ color: C.slate }}
                                        title="삭제"
                                    >
                                        <Trash2 size={15 * scale} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* 마크다운 원본 편집기 */
                <div className="flex-1 px-5 py-4 flex flex-col gap-3 overflow-hidden">
                    <span style={{ ...mono, color: C.slate, fontSize: 10.5 * scale }}>
                        todo.md 파일 원본을 직접 편집합니다. (- [ ] 또는 - [x] 형식 지원)
                    </span>
                    <textarea
                        value={rawContent}
                        onChange={(e) => setRawContent(e.target.value)}
                        className="flex-1 bg-transparent outline-none resize-none p-3 rounded"
                        style={{
                            ...mono,
                            color: C.text,
                            fontSize: 12 * scale,
                            lineHeight: 1.7,
                            border: `1px solid ${C.panelBorder}`,
                        }}
                    />
                    <button
                        onClick={handleSaveRaw}
                        className="flex items-center justify-center gap-2 py-3 rounded"
                        style={{ border: `1px solid ${C.lime}`, color: C.lime, ...mono, fontSize: 12 * scale, letterSpacing: 1 }}
                    >
                        <Save size={14 * scale} /> 파일에 저장 (todo.md)
                    </button>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-2: memories.md 열람/수정                                      */
/* ------------------------------------------------------------------ */
function MemoriesScreen({ onBack, content }) {
    const [text, setText] = useState(content || "");

    useEffect(() => {
        if (content) setText(content);
    }, [content]);

    return (
        <div className="flex flex-col h-full">
            <StatusBar showBack onBack={onBack} title="memories.md" />
            <div className="flex-1 px-5 py-4 flex flex-col gap-3">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 bg-transparent outline-none resize-none p-3"
                    style={{ ...mono, color: C.text, fontSize: 13, lineHeight: 1.7, border: `1px solid ${C.panelBorder}` }}
                />
                <button
                    onClick={() => sendToFlutter("write_memories_file", { content: text })}
                    className="flex items-center justify-center gap-2 py-3"
                    style={{ border: `1px solid ${C.lime}`, color: C.lime, ...mono, fontSize: 12, letterSpacing: 1 }}
                >
                    <Save size={14} /> 파일에 저장
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면: 이전 대화 — "새 대화 시작"으로 아카이브된 지난 대화 목록.        */
/* Dart의 LocalStorageService.listArchives()가 돌려주는 목록을 받아서    */
/* 보여주고, 하나를 고르면 load_archive로 그 대화를 복원해 메인으로      */
/* 돌아간다.                                                             */
/* ------------------------------------------------------------------ */
function HistoryScreen({ onBack, archives, onSelect }) {
    const { scale } = useResponsiveLayout();
    const [editingPath, setEditingPath] = useState(null);
    const [editTitle, setEditTitle] = useState("");

    useEffect(() => {
        sendToFlutter("get_archives", {});
    }, []);

    const formatDate = (iso) => {
        try {
            const d = new Date(iso);
            const pad = (n) => String(n).padStart(2, "0");
            return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (e) {
            return iso || "";
        }
    };

    const startRename = (e, item) => {
        e.stopPropagation();
        setEditingPath(item.path);
        setEditTitle(item.title || "");
    };

    const handleSaveRename = (e, item) => {
        e.stopPropagation();
        const trimmed = editTitle.trim();
        if (trimmed) {
            sendToFlutter("rename_archive", { path: item.path, title: trimmed });
        }
        setEditingPath(null);
    };

    const handleCancelRename = (e) => {
        e.stopPropagation();
        setEditingPath(null);
    };

    return (
        <div className="flex flex-col h-full">
            <StatusBar showBack onBack={onBack} title="이전 대화 (히스토리)" />
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {archives === null && (
                    <div className="flex items-center justify-center h-full">
                        <span style={{ ...mono, color: C.slate, fontSize: 12 * (scale || 1) }}>대화 기록을 불러오는 중...</span>
                    </div>
                )}
                {archives !== null && archives.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <span style={{ ...mono, color: C.slate, fontSize: 12 * (scale || 1) }}>보관된 이전 대화가 없습니다</span>
                    </div>
                )}
                {archives !== null && archives.length > 0 && (
                    <div className="flex flex-col gap-2.5">
                        {archives.map((a) => {
                            const isEditing = editingPath === a.path;
                            return (
                                <div
                                    key={a.path}
                                    onClick={() => {
                                        if (!isEditing) onSelect(a);
                                    }}
                                    className="flex flex-col p-3.5 cursor-pointer rounded-lg transition-colors"
                                    style={{
                                        border: `1px solid ${C.panelBorder}`,
                                        background: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            {isEditing ? (
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleSaveRename(e, a);
                                                            if (e.key === "Escape") handleCancelRename(e);
                                                        }}
                                                        autoFocus
                                                        className="w-full bg-transparent outline-none px-2 py-1"
                                                        style={{
                                                            ...sans,
                                                            color: C.accent,
                                                            fontSize: 13 * (scale || 1),
                                                            border: `1px solid ${C.accent}`,
                                                            borderRadius: 4,
                                                        }}
                                                    />
                                                    <button
                                                        onClick={(e) => handleSaveRename(e, a)}
                                                        className="p-1 rounded"
                                                        style={{ color: C.lime, border: `1px solid ${C.lime}` }}
                                                        title="저장"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelRename}
                                                        className="p-1 rounded"
                                                        style={{ color: C.slate, border: `1px solid ${C.panelBorder}` }}
                                                        title="취소"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <span
                                                        className="font-medium truncate"
                                                        style={{
                                                            ...sans,
                                                            color: C.text,
                                                            fontSize: 13.5 * (scale || 1),
                                                        }}
                                                    >
                                                        {a.title || "새로운 대화"}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <History size={12} color={C.slate} />
                                                        <span style={{ ...mono, color: C.slate, fontSize: 10.5 * (scale || 1) }}>
                                                            {formatDate(a.date)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {!isEditing && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                    onClick={(e) => startRename(e, a)}
                                                    className="p-1.5 rounded hover:bg-white/5"
                                                    style={{ color: C.slate }}
                                                    title="대화 제목 바꾸기"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <ChevronRight size={14} color={C.slate} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-3: 캘린더 — calendar.md를 파싱해서 월간 뷰로 렌더링             */
/* 대화에서 "OO월 OO일에 XX 추가해줘"라고 말하면 이 md가 갱신된다.        */
/* ------------------------------------------------------------------ */
function CalendarScreen({ onBack, calendarMd }) {
    const [viewDate, setViewDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const eventsByDate = useMemo(() => parseCalendarMd(calendarMd), [calendarMd]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const cells = useMemo(() => getMonthMatrix(year, month), [year, month]);

    const pad = (n) => String(n).padStart(2, "0");
    const dateStrFor = (d) => `${year}-${pad(month + 1)}-${pad(d)}`;

    const todayStr = useMemo(() => {
        const t = new Date();
        return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    }, []);

    const activeDateStr = selectedDate || (eventsByDate[todayStr] ? todayStr : null);
    const activeEvents = activeDateStr ? eventsByDate[activeDateStr] || [] : [];

    const changeMonth = (delta) => {
        setSelectedDate(null);
        setViewDate(new Date(year, month + delta, 1));
    };

    return (
        <div className="flex flex-col h-full">
            <StatusBar showBack onBack={onBack} title="캘린더" />
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <button onClick={() => changeMonth(-1)} style={{ color: C.slate }}>
                        <ChevronLeft size={18} />
                    </button>
                    <span style={{ ...mono, color: C.text, fontSize: 13, letterSpacing: 1 }}>
                        {year}년 {month + 1}월
                    </span>
                    <button onClick={() => changeMonth(1)} style={{ color: C.slate }}>
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
                        <div key={w} className="flex items-center justify-center py-1">
                            <span style={{ ...mono, color: C.slate, fontSize: 9.5 }}>{w}</span>
                        </div>
                    ))}
                    {cells.map((d, i) => {
                        if (d === null) return <div key={i} />;
                        const ds = dateStrFor(d);
                        const hasEvents = !!eventsByDate[ds]?.length;
                        const isSelected = activeDateStr === ds;
                        const isToday = ds === todayStr;
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(ds)}
                                className="flex flex-col items-center justify-center gap-0.5 aspect-square"
                                style={{
                                    border: `1px solid ${isSelected ? C.accent : C.panelBorder}`,
                                    background: isSelected ? "rgba(255,59,46,0.1)" : "transparent",
                                }}
                            >
                                <span style={{ ...mono, color: isToday ? C.accent : C.text, fontSize: 11 }}>{d}</span>
                                {hasEvents && (
                                    <span style={{ width: 3, height: 3, borderRadius: 99, background: C.lime, display: "inline-block" }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: C.panelBorder }}>
                    <span style={{ ...mono, color: C.blue, fontSize: 10, letterSpacing: 1 }}>
                        {activeDateStr ? `${activeDateStr} 일정` : "날짜를 선택해줘"}
                    </span>
                    {activeDateStr && activeEvents.length === 0 && (
                        <span style={{ ...sans, color: C.slate, fontSize: 12 }}>등록된 일정이 없어.</span>
                    )}
                    {activeEvents.map((ev, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 px-2.5 py-2"
                            style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}
                        >
                            <span style={{ width: 4, height: 4, borderRadius: 99, background: C.lime, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ ...sans, color: C.text, fontSize: 12.5 }}>{ev}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-4: 오답 노트 — wrong.json 로드하여 과목별로 카드식 렌더링          */
/* ------------------------------------------------------------------ */
function WrongNotesScreen({ onBack, notes, onAddNote, processing }) {
    const { scale } = useResponsiveLayout();
    const [activeSubject, setActiveSubject] = useState("전체");
    const [expandedNoteId, setExpandedNoteId] = useState(null);

    // 'active' (빌런 도감) vs 'prison' (래프트 수감)
    const activeNotes = notes.filter(n => n.status !== 'prison');
    const prisonNotes = notes.filter(n => n.status === 'prison');

    const isPrisonTab = activeSubject === "🔒 래프트";

    const subjects = useMemo(() => {
        const set = new Set();
        activeNotes.forEach((n) => {
            if (n.subject) set.add(n.subject);
        });
        return ["전체", ...Array.from(set), "🔒 래프트"];
    }, [activeNotes]);

    const filteredNotes = useMemo(() => {
        if (activeSubject === "🔒 래프트") return prisonNotes;
        if (activeSubject === "전체") return activeNotes;
        return activeNotes.filter((n) => n.subject === activeSubject);
    }, [activeNotes, prisonNotes, activeSubject]);

    const handleArrest = (id) => {
        sendToFlutter("arrest_villain", { id });
        setExpandedNoteId(null);
    };

    const handleRehabilitate = (id) => {
        sendToFlutter("delete_villain", { id });
        setExpandedNoteId(null);
    };

    return (
        <div className="flex flex-col h-full relative" style={{ background: "radial-gradient(ellipse at top, #1a0f14 0%, #05070A 100%)" }}>
            <StatusBar showBack onBack={onBack} title="빌런 도감 (Bounty)" />
            
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                {/* 상단 액션 바 */}
                <div className="flex items-center justify-between">
                    <span style={{ ...mono, color: C.slate, fontSize: 11, letterSpacing: 0.5 }}>
                        {isPrisonTab ? `수감된 빌런: ${filteredNotes.length}명` : `수배 중인 빌런: ${filteredNotes.length}명`}
                    </span>
                    {!isPrisonTab && (
                        <button
                            onClick={onAddNote}
                            disabled={processing}
                            className="flex items-center gap-1.5 px-3 py-1.5"
                            style={{ border: `1px solid ${C.danger}`, background: "rgba(255,59,46,0.15)", color: C.danger, ...mono, fontSize: 11, borderRadius: 4 }}
                        >
                            <Paperclip size={12} /> 새로운 빌런 등록
                        </button>
                    )}
                </div>

                {/* 탭 */}
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {subjects.map((sub) => {
                        const isActive = activeSubject === sub;
                        const isPrison = sub === "🔒 래프트";
                        return (
                            <button
                                key={sub}
                                onClick={() => {
                                    setActiveSubject(sub);
                                    setExpandedNoteId(null);
                                }}
                                className="px-3 py-1.5 flex-shrink-0"
                                style={{
                                    border: `1px solid ${isActive ? C.accent : C.panelBorder}`,
                                    background: isActive ? "rgba(255,59,46,0.1)" : "transparent",
                                    color: isActive ? C.accent : C.slate,
                                    ...sans,
                                    fontSize: 12,
                                }}
                            >
                                {sub}
                            </button>
                        );
                    })}
                </div>

                {/* 오답 리스트 */}
                {filteredNotes.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2">
                        <BookOpen size={24} color={C.panelBorder} />
                        <span style={{ ...sans, color: C.slate, fontSize: 12 }}>등록된 오답이 없습니다.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredNotes.map((note) => {
                            const isExpanded = expandedNoteId === note.id;
                            return (
                                <div
                                    key={note.id}
                                    className="flex flex-col transition-all duration-200"
                                    style={{
                                        border: `1px solid ${isExpanded ? C.accent : C.panelBorder}`,
                                        background: isExpanded ? "rgba(255,255,255,0.01)" : "transparent",
                                        borderRadius: 8,
                                    }}
                                >
                                    {/* 카드 헤더 (문제 요약) */}
                                    <button
                                        onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                                        className="w-full text-left p-4 flex flex-col gap-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className="px-2 py-0.5"
                                                style={{ border: `1px solid ${C.lime}`, color: C.lime, ...mono, fontSize: 9.5 }}
                                            >
                                                {note.subject || "미분류"}
                                            </span>
                                            <span style={{ ...mono, color: C.slate, fontSize: 9.5 }}>
                                                {note.created_at ? note.created_at.substring(0, 10) : ""}
                                            </span>
                                        </div>
                                        <div
                                            style={{ ...sans, color: C.text, fontSize: 13, lineHeight: 1.5 }}
                                            className={isExpanded ? "" : "line-clamp-2"}
                                        >
                                            {note.problem}
                                        </div>
                                    </button>

                                    {/* 카드 바디 (정답 및 해설) */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t overflow-hidden relative z-10"
                                                style={{ borderColor: isPrisonTab ? "rgba(46,138,255,0.2)" : "rgba(255,59,46,0.2)" }}
                                            >
                                                <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,0,0,0.4)" }}>
                                                    {/* 해설 */}
                                                    <div className="flex flex-col gap-2">
                                                        <span style={{ ...mono, color: C.lime, fontSize: 10, letterSpacing: 0.5 }}>CLASSIFIED INTEL (해설)</span>
                                                        <div style={{ ...sans, color: C.text, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 6 }}>
                                                            {note.solution}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* 양심 격파 버튼 */}
                                                    {!isPrisonTab ? (
                                                        <div className="flex flex-col gap-2 mt-2">
                                                            <span style={{ ...sans, color: C.slate, fontSize: 11, textAlign: "center" }}>정답을 맞혔다면 스스로 격파하세요!</span>
                                                            <button
                                                                onClick={() => handleArrest(note.id)}
                                                                className="w-full py-3 flex items-center justify-center gap-2 font-bold transition-colors"
                                                                style={{ background: C.danger, color: "#fff", borderRadius: 6, ...sans, fontSize: 14 }}
                                                            >
                                                                <Crosshair size={18} /> 이 빌런 격파 (래프트 수감)
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2 mt-2">
                                                            <span style={{ ...sans, color: C.slate, fontSize: 11, textAlign: "center" }}>완벽히 마스터했다면 영구 삭제합니다 (오프라인 작동)</span>
                                                            <button
                                                                onClick={() => handleRehabilitate(note.id)}
                                                                className="w-full py-3 flex items-center justify-center gap-2 font-bold transition-colors"
                                                                style={{ background: C.lime, color: "#000", borderRadius: 6, ...sans, fontSize: 14 }}
                                                            >
                                                                <BookOpen size={18} /> 완전히 갱생시키기 (영구 삭제)
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* AI 분석 중 로딩 오버레이 */}
            {processing && (
                <div
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
                    style={{ background: "rgba(5,7,10,0.85)" }}
                >
                    <CircularCore active={true} size={80 * scale} />
                    <div className="flex flex-col items-center gap-1">
                        <span style={{ ...mono, color: C.accent, fontSize: 12, letterSpacing: 1 }}>E.V. AI ANALYZING</span>
                        <span style={{ ...sans, color: C.slate, fontSize: 11.5 }}>오답 사진에서 문제와 해설을 복원하고 있어...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-5: 데일리 뷰글 (Daily Bugle) 오늘의 브리핑                    */
/* ------------------------------------------------------------------ */
function DailyBugleScreen({ onBack }) {
    const [headline, setHeadline] = useState("LOADING BREAKING NEWS...");
    const [isRead, setIsRead] = useState(false);

    useEffect(() => {
        const handleSync = (e) => {
            const payload = e.detail;
            if (payload?.type === "daily_bugle_result") {
                setHeadline(payload.headline?.replace(/\[|\]/g, '').trim() || "NO NEWS TODAY");
            }
        };
        window.addEventListener("ev-native-event", handleSync);
        sendToFlutter("generate_daily_bugle", {});
        
        return () => window.removeEventListener("ev-native-event", handleSync);
    }, []);

    // 더미 텍스트 (기사 본문 미생성)
    const dummyBody = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi.

Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque. Aliquam faucibus, elit ut dictum aliquet, felis nisl adipiscing sapien, sed malesuada diam lacus eget erat. Cras mollis scelerisque nunc. Nullam arcu. Aliquam consequat.`;

    return (
        <div className="flex flex-col h-full relative" style={{ background: "#F5F5F0" /* 신문지 색상 */ }}>
            <StatusBar showBack onBack={onBack} title="오늘의 브리핑" darkText />
            
            <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 items-center">
                
                {/* 신문사 로고 */}
                <div className="flex flex-col items-center border-b-4 border-black pb-3 w-full">
                    <span style={{ fontFamily: "serif", fontWeight: 900, fontSize: 32, letterSpacing: -1, color: "#111" }}>
                        THE DAILY BUGLE
                    </span>
                    <div className="flex justify-between w-full mt-1 px-1 border-t border-b border-black py-0.5">
                        <span style={{ fontFamily: "serif", fontSize: 10, color: "#333", fontWeight: 600 }}>VOL. 1</span>
                        <span style={{ fontFamily: "serif", fontSize: 10, color: "#333", fontWeight: 600 }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                        </span>
                        <span style={{ fontFamily: "serif", fontSize: 10, color: "#333", fontWeight: 600 }}>PRICE: FREE</span>
                    </div>
                </div>

                {/* 헤드라인 */}
                <div className="flex flex-col w-full px-2">
                    <h1 style={{ fontFamily: "serif", fontWeight: 900, fontSize: 28, lineHeight: 1.1, color: "#000", textAlign: "center", textTransform: "uppercase" }}>
                        {headline}
                    </h1>
                </div>

                {/* 본문 (블러 처리된 기사) */}
                <div 
                    className="w-full text-justify px-2 relative"
                    style={{ columnCount: 2, columnGap: 16 }}
                >
                    <p 
                        style={{ 
                            fontFamily: "serif", 
                            fontSize: 12, 
                            lineHeight: 1.6, 
                            color: "#222",
                            filter: isRead ? "none" : "blur(4px)",
                            transition: "filter 0.5s ease"
                        }}
                    >
                        {/* 첫 글자 드롭 캡 */}
                        <span style={{ float: "left", fontSize: 36, lineHeight: 0.8, paddingTop: 4, paddingRight: 4, fontWeight: "bold" }}>
                            {dummyBody.charAt(0)}
                        </span>
                        {dummyBody.substring(1)}
                    </p>
                    
                    {!isRead && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <button
                                onClick={() => setIsRead(true)}
                                className="px-4 py-2 font-bold shadow-lg"
                                style={{ background: C.danger, color: "#fff", ...sans, fontSize: 12, borderRadius: 0, textTransform: "uppercase", border: "2px solid #000" }}
                            >
                                READ FULL ARTICLE
                            </button>
                        </div>
                    )}
                </div>

                {/* 하단 데코레이션 선 */}
                <div className="w-full border-t border-black mt-auto pt-2 text-center">
                    <span style={{ fontFamily: "serif", fontSize: 10, color: "#666" }}>Exclusive report provided by E.V. Intelligence</span>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 문제 풀이 페이스 계산기                                             */
/* ------------------------------------------------------------------ */
function PaceCalculatorScreen({ onBack }) {
    const [startTime, setStartTime] = useState(() => new Date());

    const [targetEndTime, setTargetEndTime] = useState(() => {
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        return d;
    });

    const [totalQuestions, setTotalQuestions] = useState(46);
    const [completedQuestions, setCompletedQuestions] = useState(0);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const elapsedSec = Math.max(0, Math.floor((now - startTime) / 1000));
    const remainingSec = Math.max(0, Math.floor((targetEndTime - now) / 1000));
    const remainQuestions = Math.max(0, totalQuestions - completedQuestions);

    const formatPace = (secPerQuestion) => {
        if (!isFinite(secPerQuestion) || secPerQuestion <= 0) return "-";
        const m = Math.floor(secPerQuestion / 60);
        const s = Math.floor(secPerQuestion % 60);
        return `${m}분 ${s}초 / 문제`;
    };

    const currentPace = completedQuestions > 0 ? elapsedSec / completedQuestions : 0;
    const requiredPace = remainQuestions > 0 ? remainingSec / remainQuestions : 0;

    let statusMsg = "";
    let statusColor = C.slate;
    if (remainQuestions === 0) {
        statusMsg = "목표 달성 완료!";
        statusColor = C.lime;
    } else if (completedQuestions > 0) {
        if (currentPace <= requiredPace) {
            statusMsg = "목표 달성 가능 (여유)";
            statusColor = C.lime;
        } else {
            statusMsg = "페이스 업 필요";
            statusColor = C.danger;
        }
    } else {
        statusMsg = "문제 풀이를 시작하세요";
        statusColor = C.accent;
    }

    const formatTimeForInput = (d) => {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    };

    const handleTargetTimeChange = (e) => {
        const [h, m] = e.target.value.split(':');
        if (h && m) {
            const newD = new Date(targetEndTime);
            newD.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
            setTargetEndTime(newD);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto w-full">
            <StatusBar showBack onBack={onBack} title="페이스 계산기" />
            <div className="flex flex-col px-6 py-6 gap-6 w-full">

                <div className="flex flex-col gap-4 p-4 rounded-lg" style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex justify-between items-center">
                        <span style={{ ...sans, color: C.slate, fontSize: 13 }}>목표 마감 시간</span>
                        <input
                            type="time"
                            value={formatTimeForInput(targetEndTime)}
                            onChange={handleTargetTimeChange}
                            style={{ background: "transparent", color: C.accent, border: `1px solid ${C.panelBorder}`, padding: "2px 6px", borderRadius: 4 }}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <span style={{ ...sans, color: C.slate, fontSize: 13 }}>목표 문제 수</span>
                        <input
                            type="number"
                            value={totalQuestions}
                            onChange={(e) => setTotalQuestions(Number(e.target.value))}
                            style={{ background: "transparent", color: C.accent, border: `1px solid ${C.panelBorder}`, padding: "2px 6px", borderRadius: 4, width: 60, textAlign: "right" }}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <span style={{ ...sans, color: C.slate, fontSize: 13 }}>진행 상황</span>
                        <span style={{ ...mono, color: C.text, fontSize: 14 }}>{completedQuestions} / {totalQuestions}</span>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 p-6 rounded-lg" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${statusColor}` }}>
                    <span style={{ ...mono, color: statusColor, fontSize: 12, letterSpacing: 1 }}>{statusMsg}</span>
                    <div className="flex flex-col items-center mt-4 gap-1">
                        <span style={{ ...sans, color: C.slate, fontSize: 12 }}>현재 평균 페이스</span>
                        <span style={{ ...mono, color: C.text, fontSize: 16 }}>{formatPace(currentPace)}</span>
                    </div>
                    <div className="flex flex-col items-center mt-2 gap-1">
                        <span style={{ ...sans, color: C.slate, fontSize: 12 }}>필요 페이스</span>
                        <span style={{ ...mono, color: C.text, fontSize: 16 }}>{formatPace(requiredPace)}</span>
                    </div>
                    <div className="flex flex-col items-center mt-4 gap-1">
                        <span style={{ ...sans, color: C.slate, fontSize: 11 }}>남은 시간: {Math.floor(remainingSec / 3600)}시간 {Math.floor((remainingSec % 3600) / 60)}분</span>
                        <span style={{ ...sans, color: C.slate, fontSize: 11 }}>남은 문제: {remainQuestions}문제</span>
                    </div>
                </div>

                <div className="flex gap-4 justify-center mt-4">
                    <button
                        onClick={() => setCompletedQuestions(prev => prev + 1)}
                        className="px-6 py-3 rounded-lg"
                        style={{ border: `1px solid ${C.accent}`, color: C.accent, background: "rgba(255,59,46,0.1)" }}
                    >
                        <span style={{ ...mono, fontSize: 16 }}>+1</span>
                    </button>
                    <button
                        onClick={() => setCompletedQuestions(prev => prev + 2)}
                        className="px-6 py-3 rounded-lg"
                        style={{ border: `1px solid ${C.blue}`, color: C.blue, background: "rgba(76,134,255,0.1)" }}
                    >
                        <span style={{ ...mono, fontSize: 16 }}>+2</span>
                    </button>
                    <button
                        onClick={() => setCompletedQuestions(Math.max(0, completedQuestions - 1))}
                        className="px-4 py-3 rounded-lg"
                        style={{ border: `1px solid ${C.panelBorder}`, color: C.slate }}
                    >
                        <span style={{ ...mono, fontSize: 14 }}>-1</span>
                    </button>
                </div>

                <div className="flex justify-center mt-2">
                    <button
                        onClick={() => {
                            if (window.confirm("시작 시간을 현재 시간으로 리셋하고 완료 수를 0으로 초기화하시겠습니까?")) {
                                setStartTime(new Date());
                                setCompletedQuestions(0);
                            }
                        }}
                        style={{ color: C.danger, fontSize: 11, textDecoration: "underline" }}
                    >
                        초기화 (리셋)
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function EVApp() {
    const [screen, setScreen] = useState("welcome");
    const [menuOpen, setMenuOpen] = useState(false);
    const [historyOn, setHistoryOn] = useState(true);
    const [alertPulse, setAlertPulse] = useState(null);
    const [toast, setToast] = useState(null);
    const [calendarMd, setCalendarMd] = useState(DEFAULT_CALENDAR_MD);
    const [newChatSignal, setNewChatSignal] = useState(0);
    const [musicOn, setMusicOn] = useState(false);
    const [musicCollapsed, setMusicCollapsed] = useState(false);
    const [musicFullScreen, setMusicFullScreen] = useState(false);
    const [musicTrack, setMusicTrack] = useState({ title: "무제 (SIGNAL_07)", artist: "발신자 미상" });
    const [micActive, setMicActive] = useState(false);
    const [textInjectEvent, setTextInjectEvent] = useState(null); // { id, text, source } — STT/S펜 텍스트를 MainScreen 입력창으로 흘려보낸다
    const [llmResultEvent, setLlmResultEvent] = useState(null); // { id, text } — Flutter가 실제 NVIDIA NIM API 응답을 돌려줄 때
    const [conversationHistoryEvent, setConversationHistoryEvent] = useState(null); // { history } — 앱 시작 시 conversation.json에서 복원된 대화
    const [memoriesContent, setMemoriesContent] = useState("");
    const [todoContent, setTodoContent] = useState("");
    const [todoItems, setTodoItems] = useState([]);
    const [archivesList, setArchivesList] = useState(null); // [{ path, name, date }, ...] — "이전 대화" 탭용
    const [wrongNotes, setWrongNotes] = useState([]);
    const [wrongOcrProcessing, setWrongOcrProcessing] = useState(false);
    const [sharedOcrData, setSharedOcrData] = useState(null);
    const [searchEngineStatus, setSearchEngineStatus] = useState(null);
    const [attachedFile, setAttachedFile] = useState(null);
    const { maxWidth } = useResponsiveLayout();

    useEffect(() => {
        let attempts = 0;
        const check = setInterval(() => {
            if (window.EV_Channel && window.EV_Channel.postMessage) {
                sendToFlutter("app_ready", {});
                clearInterval(check);
            } else if (attempts > 50) {
                clearInterval(check); // timeout
            }
            attempts++;
        }, 100);
        return () => clearInterval(check);
    }, []);

    const goto = (key) => {
        if (key === "newchat") {
            setMenuOpen(false);
            setNewChatSignal((n) => n + 1);
            // MainScreen의 log뿐 아니라, 여기 보관 중인 복원용 이력도 같이
            // 비워야 한다. 안 그러면 다른 탭 갔다가 돌아올 때 MainScreen이
            // 리마운트되면서 이 낡은 conversationHistoryEvent로 log를 다시
            // 채워버린다(대화가 "부활"하는 것처럼 보이는 원인).
            setConversationHistoryEvent({ history: [] });
            sendToFlutter("new_chat", {});
            return;
        }
        setMenuOpen(false);
        setScreen(key);
    };

    const toggleHistory = (val) => {
        setHistoryOn(val);
        sendToFlutter("set_history_enabled", { enabled: val });
    };

    // 스파이디 센스 트리거 — 작업 완료/에러를 팝업 대신 테두리 파동으로 알림
    const triggerAlert = (type) => {
        let color = C.lime;
        if (type === "error") color = C.danger;
        else if (type === "notification") color = "rgba(255, 255, 255, 0.85)";
        
        setAlertPulse({ type, color, key: Date.now() });
        setTimeout(() => setAlertPulse(null), 1000);
    };

    // 상단 토스트 트리거 — 푸시 알림 / 와이파이 연결 / 블루투스 연결이 모두
    // 같은 배너를 공유한다. 실제 서비스에선 Flutter 쪽에서 FCM 수신, OS
    // 와이파이/블루투스 연결 이벤트를 postMessage로 넘겨주면 이 함수를 그대로
    // 호출하면 된다.
    const triggerToast = (config) => {
        const key = Date.now();
        setToast({ key, ...config });
        setTimeout(() => {
            setToast((cur) => (cur?.key === key ? null : cur));
        }, 2600);
    };

    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    /* ------------------------------------------------------------------ */
    /* 1) Flutter ➔ React 수신기 (Custom Event)                            */
    /* Flutter가 window.EV_receiveNativeEvent(payload)를 evaluateJavascript */
    /* 로 호출해주면, 그걸 커스텀 이벤트로 바꿔서 한곳(handleNativeEvent)에서 */
    /* 받는다. payload.type으로 알림 / 미디어 상태 / 와이파이 장소 변경 /    */
    /* 배터리 경고 / 음성입력(S펜·볼륨키) / S펜 텍스트를 구분해서 처리한다.   */
    /*                                                                      */
    /* payload 예시:                                                       */
    /*  { type:"notification",  id, title, body }                          */
    /*  { type:"media_state",   state:"playing"|"paused"|"stopped", title, artist } */
    /*  { type:"wifi_change",   name }                                     */
    /*  { type:"battery_warning", level, message }                         */
    /*  { type:"voice_input",   state:"start"|"end" }                      */
    /*  { type:"voice_result" | "spen_text", text }                        */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        const handleNativeEvent = (payload) => {
            if (!payload || !payload.type) return;
            switch (payload.type) {
                case "notification":
                    triggerToast({
                        id: payload.id,
                        eyebrow: "푸시 알림",
                        message: payload.body || payload.title || "새 알림이 도착했어",
                        icon: BellRing,
                        color: C.accent,
                    });
                    triggerAlert("notification");
                    break;

                case "media_state":
                    if (payload.state === "playing") {
                        setMusicTrack((prev) => ({
                            title: payload.title || prev.title,
                            artist: payload.artist || prev.artist,
                            artUrl: prev.artUrl // keep existing artUrl if not provided
                        }));
                        setMusicOn(true);
                        setMusicCollapsed(false);
                    } else if (payload.state === "paused" || payload.state === "stopped") {
                        setMusicOn(false);
                    }
                    break;
                case "music_metadata":
                    setMusicTrack((prev) => ({
                        title: payload.title || prev.title,
                        artist: payload.artist || prev.artist,
                        album: payload.album || prev.album,
                        artUrl: payload.artUrl || prev.artUrl
                    }));
                    setMusicOn(true);
                    setMusicCollapsed(false);
                    break;

                case "wifi_change":
                    triggerToast({ eyebrow: "WI-FI", message: `${payload.name} 연결됨`, icon: Wifi, color: C.accent });
                    break;

                // 앱 시작 시 Flutter가 calendar.json 원본을 한 번 보내주는 경우.
                // 이건 사용자가 시킨 변경이 아니라 그냥 초기 로딩이라 알림은 안 띄운다.
                case "calendar_sync_init":
                    setCalendarMd(eventsToCalendarMd(payload.events));
                    break;

                // 앱 시작 시 Flutter가 conversation.json에 저장돼있던 이전 대화를
                // 복원해서 한 번 보내주는 경우. MainScreen의 log를 이걸로 채운다.
                case "conversation_sync_init":
                    setConversationHistoryEvent({ history: payload.history || [] });
                    break;

                case "memories_sync_init":
                    setMemoriesContent(payload.content || "");
                    break;
                case "memories_sync":
                    if (payload.success) {
                        setMemoriesContent(payload.content || "");
                        triggerToast({ eyebrow: "MEMORY", message: "memories.md가 성공적으로 저장되었습니다.", icon: Save, color: C.lime });
                    }
                    break;

                case "todo_sync_init":
                    if (payload.content !== undefined) setTodoContent(payload.content);
                    if (payload.items) setTodoItems(payload.items);
                    break;
                case "todo_sync":
                    if (payload.content !== undefined) setTodoContent(payload.content);
                    if (payload.items) setTodoItems(payload.items);
                    if (payload.success) {
                        triggerToast({ eyebrow: "TODO", message: "할 일이 업데이트되었습니다.", icon: Save, color: C.lime });
                    }
                    break;

                // AI가 <update_calendar> 태그로 실제 일정을 추가/수정했을 때.
                // payload.events는 calendar.json에 반영된 전체 목록이라, 그걸
                // 그대로 md로 변환해서 캘린더 화면을 실제 데이터로 맞춘다.
                case "calendar_sync":
                    setCalendarMd(eventsToCalendarMd(payload.events));
                    triggerAlert("success");
                    break;

                case "battery_warning":
                    triggerAlert("error");
                    triggerToast({
                        eyebrow: "배터리 경고",
                        message: payload.message || `배터리 ${payload.level ?? "?"}% 남음`,
                        icon: BellRing,
                        color: C.danger,
                    });
                    break;

                case "voice_input":
                    setMicActive(payload.state === "start");
                    break;

                case "chat_image_picked":
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
                    break;

                case "voice_result":
                case "spen_text":
                case "ocr_result":
                    if (payload.text) {
                        setTextInjectEvent({
                            id: Date.now(),
                            text: payload.text,
                            source: payload.type === "spen_text" ? "spen" : (payload.type === "ocr_result" ? "ocr" : "voice"),
                        });
                    }
                    break;

                case "search_status":
                    if (payload.status === "searching") {
                        setSearchEngineStatus(payload.engine || "웹");
                    } else {
                        setSearchEngineStatus(null);
                    }
                    break;

                case "llm_result":
                    setSearchEngineStatus(null);
                    // main.dart의 llm_service.dart(NVIDIA NIM) 호출 결과.
                    // { id: 원래 메시지 id, result: 응답 문자열, document: 객체 }
                    setLlmResultEvent({ id: payload.id, text: payload.result, document: payload.document });
                    break;

                // "이전 대화" 탭 진입 시 get_archives 응답으로 온다.
                // { archives: [{ path, name, date }, ...] }
                case "archives_list":
                    setArchivesList(payload.archives || []);
                    break;

                case "settings_sync":
                    // 전역 localStorage에 강제 업데이트 (자식 컴포넌트들도 useEffect로 잡을 수 있게 e.detail 활용)
                    if (payload.llmKey) localStorage.setItem("LLM_KEY", payload.llmKey);
                    if (payload.exaKey) localStorage.setItem("EXA_KEY", payload.exaKey);
                    if (payload.kmaKey) localStorage.setItem("KMA_API_KEY", payload.kmaKey);
                    if (payload.llmEndpoint) localStorage.setItem("LLM_ENDPOINT", payload.llmEndpoint);
                    if (payload.llmModel) localStorage.setItem("LLM_MODEL", payload.llmModel);
                    if (payload.visionModel) localStorage.setItem("LLM_VISION_MODEL", payload.visionModel);
                    if (payload.naverClientId) localStorage.setItem("NAVER_CLIENT_ID", payload.naverClientId);
                    if (payload.naverClientSecret) localStorage.setItem("NAVER_CLIENT_SECRET", payload.naverClientSecret);
                    if (payload.tavilyKey) localStorage.setItem("TAVILY_KEY", payload.tavilyKey);
                    if (payload.firecrawlKey) localStorage.setItem("FIRECRAWL_KEY", payload.firecrawlKey);
                    if (payload.footballDataKey) localStorage.setItem("FOOTBALL_DATA_KEY", payload.footballDataKey);
                    if (payload.visionEnabled !== undefined) localStorage.setItem("VISION_ENABLED", String(payload.visionEnabled));
                    if (payload.obsidianVaultPath) localStorage.setItem("OBSIDIAN_VAULT_PATH", payload.obsidianVaultPath);
                    if (payload.obsidianInboxPath) localStorage.setItem("OBSIDIAN_INBOX_PATH", payload.obsidianInboxPath);
                    if (payload.obsidianPath) localStorage.setItem("OBSIDIAN_PATH", payload.obsidianPath);
                    if (payload.playlistPath) localStorage.setItem("PLAYLIST_PATH", payload.playlistPath);
                    if (payload.footballTeams) localStorage.setItem("FOOTBALL_TEAMS", payload.footballTeams);
                    if (payload.baseballTeams) localStorage.setItem("BASEBALL_TEAMS", payload.baseballTeams);
                    break;

                case "wrong_notes_sync":
                    setWrongNotes(payload.notes || []);
                    break;

                case "wrong_ocr_result":
                    setWrongOcrProcessing(false);
                    if (payload.success) {
                        triggerToast({ eyebrow: "오답 노트", message: "새로운 오답이 등록되었습니다.", icon: Save, color: C.lime });
                    } else {
                        triggerToast({ eyebrow: "오답 등록 실패", message: payload.error || "분석에 실패했습니다.", icon: BellRing, color: C.danger });
                    }
                    break;

                case "shared_image_processing":
                    if (payload.state === "start") {
                        setWrongOcrProcessing(true);
                    }
                    break;

                case "shared_image_result":
                    setWrongOcrProcessing(false);
                    if (payload.success) {
                        setSharedOcrData(payload);
                    } else {
                        triggerToast({ eyebrow: "캡처 분석 실패", message: payload.error || "분석에 실패했습니다.", icon: BellRing, color: C.danger });
                    }
                    break;

                case "save_shared_result":
                    if (payload.success) {
                        triggerToast({
                            eyebrow: payload.type === "obsidian" ? "옵시디언" : "오답 노트",
                            message: payload.type === "obsidian" ? "옵시디언 메모로 저장 완료!" : "오답 노트로 저장 완료!",
                            icon: Save,
                            color: C.lime
                        });
                        setSharedOcrData(null);
                    } else {
                        triggerToast({ eyebrow: "저장 실패", message: payload.error || "저장에 실패했습니다.", icon: BellRing, color: C.danger });
                    }
                    break;

                default:
                    break;
            }
        };

        // Flutter 쪽에서 부를 진입점. evaluateJavascript로
        // `window.EV_receiveNativeEvent(${jsonPayload})` 형태로 호출하면 된다.
        window.EV_receiveNativeEvent = (payload) => {
            window.dispatchEvent(new CustomEvent("ev-native-event", { detail: payload }));
        };
        const listener = (e) => handleNativeEvent(e.detail);
        window.addEventListener("ev-native-event", listener);
        return () => {
            window.removeEventListener("ev-native-event", listener);
            delete window.EV_receiveNativeEvent;
        };
    }, []);

    // 알림 클릭 = PendingIntent 리모컨 버튼. 알림 고유 ID를 EV_Channel에
    // 그대로 쏴주면, 그걸 받은 Flutter/네이티브가 PendingIntent를 실행해서
    // 알맞은 화면으로 이동시켜준다. React는 "이거 눌렀어!"라고 소리치고
    // 토스트를 닫는 것까지만 책임진다.
    const handleNotificationOpen = (id) => {
        sendToFlutter("notification_clicked", { id });
        setToast(null);
    };

    // Ctrl+A — 푸시 알림 테스트 (알림 고유 id를 함께 실어서, 탭하면 클릭
    // 신호가 나가는 실제 알림처럼 동작하게 한다)
    usePushNotificationHotkey(() => {
        const id = `notif_${Date.now()}`;
        triggerToast({ id, eyebrow: "푸시 알림", message: "새로운 알림이 도착했어", icon: BellRing, color: C.accent });
    });

    // Ctrl+W — 와이파이 연결 테스트 (임의의 이름으로 "OOO 연결됨")
    useWifiHotkey(() => {
        const name = pickRandom(WIFI_NAMES);
        sendToFlutter("wifi_connected", { name });
        triggerToast({ eyebrow: "WI-FI", message: `${name} 연결됨`, icon: Wifi, color: C.accent });
    });

    // Ctrl+B — 블루투스 연결 테스트 (임의의 기기명으로 "OOO 연결됨")
    useBluetoothHotkey(() => {
        const name = pickRandom(BT_DEVICES);
        sendToFlutter("bluetooth_connected", { name });
        triggerToast({ eyebrow: "BLUETOOTH", message: `${name} 연결됨`, icon: Bluetooth, color: C.blue });
    });

    // Ctrl+S — 볼륨 단축키/S펜으로 음성 입력이 켜지는 상황 테스트용 토글.
    // 실제로는 Flutter가 payload {type:"voice_input", state:"start"|"end"}를
    // 커스텀 이벤트로 보내주면 위 handleNativeEvent가 알아서 처리한다.
    useVoiceInputHotkey(() => {
        sendToFlutter(micActive ? "stop_voice_chat" : "start_voice_chat", {});
    });

    // 음악 플레이어 테스트 토글 — 나중에 대화에서 "musicstart"가 오면
    // setMusicOn(true) / setMusicCollapsed(false)를, "music_off"가 오면
    // setMusicOn(false)를 그 시점에 호출하도록 바꿔주면 된다. 지금은
    // Ctrl+M으로 켜고 끄거나, MainScreen에서 대화 문장으로도 켜고 끌 수 있다.
    useMusicPlayerHotkey(() => {
        setMusicOn((prev) => {
            const next = !prev;
            if (next) setMusicCollapsed(false);
            return next;
        });
    });

    return (
        <div className="app-shell w-full flex justify-center items-center" style={{ background: C.bg }}>
            <div className="w-full h-full" style={{ maxWidth, margin: "0 auto" }}>
                <HUDFrame alertPulse={alertPulse}>
                    {screen === "welcome" && <WelcomeScreen onLogin={() => setScreen("main")} />}
                    {screen === "main" && (
                        <MainScreen
                            onMenu={() => setMenuOpen(true)}
                            menuOpen={menuOpen}
                            onCloseMenu={() => setMenuOpen(false)}
                            onNavigate={goto}
                            historyOn={historyOn}
                            onToggleHistory={toggleHistory}
                            onAlert={triggerAlert}
                            calendarMd={calendarMd}
                            newChatSignal={newChatSignal}
                            onMusicOn={() => {
                                setMusicOn(true);
                                setMusicCollapsed(false);
                                sendToFlutter("play_music", {});
                            }}
                            onMusicOff={() => {
                                setMusicOn(false);
                                sendToFlutter("pause_music", {});
                            }}
                            micActive={micActive}
                            textInjectEvent={textInjectEvent}
                            llmResultEvent={llmResultEvent}
                            conversationHistoryEvent={conversationHistoryEvent}
                            attachedFileFromNative={attachedFile}
                            searchEngineStatusFromParent={searchEngineStatus}
                        />
                    )}
                    {screen === "masking" && <MaskingSettingsScreen onBack={() => goto("main")} />}
                    {screen === "todo" && (
                        <TodoScreen
                            onBack={() => goto("main")}
                            items={todoItems}
                            content={todoContent}
                        />
                    )}
                    {screen === "sports" && <SportsSettingsScreen onBack={() => goto("main")} />}
                    {screen === "apikey" && <ApiKeyScreen onBack={() => goto("main")} />}
                    {screen === "schedule" && <ScheduleScreen onBack={() => goto("main")} />}
                    {screen === "paths" && <PathSettingsScreen onBack={() => goto("main")} />}
                    {screen === "memories" && (
                        <MemoriesScreen
                            onBack={() => goto("main")}
                            content={memoriesContent}
                        />
                    )}
                    {screen === "calendar" && <CalendarScreen onBack={() => goto("main")} calendarMd={calendarMd} />}
                    {screen === "wrong" && (
                        <WrongNotesScreen
                            onBack={() => goto("main")}
                            notes={wrongNotes}
                            onAddNote={() => {
                                setWrongOcrProcessing(true);
                                sendToFlutter("perform_wrong_ocr", {});
                            }}
                            processing={wrongOcrProcessing}
                        />
                    )}
                    {screen === "bugle" && (
                        <DailyBugleScreen 
                            onBack={() => goto("main")} 
                            history={conversationHistoryEvent?.history || []} 
                        />
                    )}
                    {screen === "pace" && <PaceCalculatorScreen onBack={() => goto("main")} />}
                    {screen === "history" && (
                        <HistoryScreen
                            onBack={() => goto("main")}
                            archives={archivesList}
                            onSelect={(a) => {
                                sendToFlutter("load_archive", { path: a.path });
                                goto("main");
                            }}
                        />
                    )}
                    <TopToast toast={toast} onOpen={handleNotificationOpen} />
                    <MusicPlayerBar
                        open={musicOn && !musicFullScreen}
                        collapsed={musicCollapsed}
                        track={musicTrack}
                        onCollapse={() => setMusicCollapsed(true)}
                        onExpand={() => setMusicCollapsed(false)}
                        onFullScreen={() => setMusicFullScreen(true)}
                    />
                    <AnimatePresence>
                        {musicFullScreen && (
                            <FullScreenMusicPlayer
                                track={musicTrack}
                                onClose={() => setMusicFullScreen(false)}
                            />
                        )}
                    </AnimatePresence>
                    <AnimatePresence>
                        {sharedOcrData && (
                            <motion.div
                                className="absolute inset-0 z-50 flex items-center justify-center p-6"
                                style={{ background: "rgba(5,7,10,0.8)" }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="w-full max-w-[340px] flex flex-col p-5"
                                    style={{ background: C.panel, border: `1.5px solid ${C.accent}`, borderRadius: 12 }}
                                    initial={{ scale: 0.95, y: 10 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.95, y: 10 }}
                                >
                                    <span style={{ ...mono, color: C.accent, fontSize: 13, letterSpacing: 1, marginBottom: 12 }}>
                                        S펜 캡처 분석 완료 ({sharedOcrData.subject})
                                    </span>
                                    
                                    <div className="flex-1 overflow-y-auto mb-5 max-h-[220px]" style={{ ...sans, color: C.text, fontSize: 13, lineHeight: 1.6 }}>
                                        <div style={{ ...mono, color: C.slate, fontSize: 10, marginBottom: 4 }}>[인식된 문제]</div>
                                        <div className="mb-4">{sharedOcrData.problem}</div>
                                        
                                        <div style={{ ...mono, color: C.slate, fontSize: 10, marginBottom: 4 }}>[AI 풀이 및 해설]</div>
                                        <div>{sharedOcrData.solution}</div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => sendToFlutter("save_shared_to_obsidian", {
                                                title: `S펜_캡처_${Date.now()}`,
                                                content: `---\ntags: [spen-capture]\ndate: ${new Date().toISOString().split('T')[0]}\n---\n\n### 문제\n${sharedOcrData.problem}\n\n### 풀이\n${sharedOcrData.solution}`
                                            })}
                                            className="w-full py-2.5"
                                            style={{ border: `1px solid ${C.lime}`, color: C.lime, ...mono, fontSize: 12 }}
                                        >
                                            📁 옵시디언 메모로 저장
                                        </button>
                                        <button
                                            onClick={() => sendToFlutter("save_shared_to_wrong", {
                                                subject: sharedOcrData.subject,
                                                problem: sharedOcrData.problem,
                                                solution: sharedOcrData.solution
                                            })}
                                            className="w-full py-2.5"
                                            style={{ border: `1px solid ${C.accent}`, color: C.accent, ...mono, fontSize: 12 }}
                                        >
                                            ✏️ 오답 노트에 등록
                                        </button>
                                        <button
                                            onClick={() => setSharedOcrData(null)}
                                            className="w-full py-2"
                                            style={{ color: C.slate, ...mono, fontSize: 12 }}
                                        >
                                            취소
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </HUDFrame>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<EVApp />);