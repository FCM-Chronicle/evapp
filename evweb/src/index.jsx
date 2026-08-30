import "./index.css";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
    MicOff,
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
    Activity,
    Radio,
    Cpu,
    Terminal,
    Zap,
    Compass,
    Volume2,
    Utensils,
    PenTool,
    Eraser,
    RotateCcw,
    Search,
    Building2,
    Target,
    Hourglass,
    Maximize2,
    Minimize2
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Flutter Webview 통신 스텁                                           */
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

/* ------------------------------------------------------------------ */
/* 반응형 레이아웃 훅                                                  */
/* ------------------------------------------------------------------ */
function useResponsiveLayout() {
    const compute = () => {
        const w = typeof window !== "undefined" ? window.innerWidth : 390;
        const h = typeof window !== "undefined" ? window.innerHeight : 844;
        const isLandscape = w > h;
        const shortSide = Math.min(w, h);
        const isTablet = shortSide >= 600;

        let maxWidth;
        if (isTablet) {
            maxWidth = isLandscape
                ? Math.min(w * 0.72, 980)
                : Math.min(w * 0.92, 760);
        } else {
            maxWidth = isLandscape ? 640 : 420;
        }

        const scale = Math.min(Math.max(maxWidth / 384, 1), 1.6);
        return { isLandscape, isTablet, maxWidth, scale, screenW: w, screenH: h };
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
/* 다크 사이버펑크 + 거미줄 테마 컬러 & 타이포그래피 토큰              */
/* ------------------------------------------------------------------ */
const C = {
    bg: "#050510",
    bgDark: "#050708",
    panel: "rgba(8, 16, 32, 0.72)",
    panelLight: "rgba(13, 25, 48, 0.65)",
    panelBorder: "rgba(63, 169, 245, 0.35)",
    panelBorderGlow: "rgba(63, 169, 245, 0.6)",
    panelBorderRed: "rgba(255, 59, 78, 0.45)",
    primary: "#3FA9F5",
    cyan: "#3FA9F5",
    cyanLight: "#4FC3F7",
    accent: "#FF3B4E",
    coral: "#FF4757",
    blue: "#3FA9F5",
    lime: "#00F5A0",
    amber: "#FFA24C",
    danger: "#FF3B4E",
    slate: "#7E8FA6",
    text: "#E0E6ED",
    textBright: "#FFFFFF",
    textMuted: "#5A6E85",
    textAccent: "#FF4757",
    textCyan: "#4FC3F7",
};

const orbitron = { fontFamily: "'Orbitron', 'JetBrains Mono', monospace" };
const rajdhani = { fontFamily: "'Rajdhani', 'Inter', sans-serif" };
const chakra = { fontFamily: "'Chakra Petch', 'JetBrains Mono', monospace" };
const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
const sans = { fontFamily: "'Inter', ui-sans-serif, system-ui" };

const GOOGLE_ICON_URI =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAA5FBMVEVHcEz9SlD/TkL/RUH/RUD/RkP4gyr/SUX/Rj//SE3/Yjb/UDn/Szz9TFb/Yi7/WTT8TVn/cyf/Zi7/iRz/fSL/lRb/SEjeuwX/qQ7/nhP/tgv9TFX6yQj/wwn/zAffugr8zgb+zwnzzQb4ywkvhv82qo79zgQek+ApjurzzAPlywIvhv0qifjRyQEth/y5yAKnxwAoivaMxQUak94fj+hzxAtawxdawhgLpa4OncYVltc8wCobvFIMuWgHqp0KorWaxQEnvz4bvUwPumUNumQMumgIr4wIqaIRvFoNu2MKtnRJwh6BPIl6AAAATHRSTlMAWZDK7P8Orf//Gv///+b/5P7////4dor///8qmP/9K0j/tu7/DeYwRP//HWr/rv///v/b///+HMT///+XTvD/5f//yGzw///////mXfQ9oAAAAWBJREFUeAF0z1UCgCAQRdEZ7O7u/W9STPr93oMCcENi2Y5jWwRBM9fz7zl0QeCFcidRHLMeJAkRj6dZdom/0+Uu62FRlpcQQILsfFVfIrqE/wPWoWleEXstYutdgO9dP9wi++/VCt0dx0dwL5u4DvNyiaFywbB1WS6ymfp+rJSMM5g2H7fYjOCsi5wOIAiCKNhRnG1bazv/fG7erFW/VcNezFEsKWVVZk2bOVi0BVuawE9GbcGOJrxoD3DEZD5ZtAcLdsX9vvWSW/ZM5g+H7JnHhFMcsI+CPpwXVOGSBsT8+Xy9VX5qfQerC77yDP94rEvB8/VCscO4z1f49+db8D9BFJEQ6N64/0hyqhVV03hxIo7+eMNLhmnZimLLjut6msCKZ3qhR+wN0/f9IAjD0PV4kV3rW/QoXF5sC4+KcEAShMkWzBeQ+QaFLX5rKrOWzcQjsHbUgCJbThA4lmwXVv8BPaBVEHC66TMAAAAASUVORK5CYII=";

/* ------------------------------------------------------------------ */
/* 공통 HUD 프레임 (스캔라인 + 비네트 + 코너 브라켓)                   */
/* ------------------------------------------------------------------ */
function HUDFrame({ children, alertPulse }) {
    return (
        <div
            className="relative w-full h-full overflow-hidden"
            style={{ background: C.bg, width: "100%", height: "100%" }}
        >
            {/* 스캔라인 */}
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    opacity: 0.04,
                    backgroundImage:
                        "repeating-linear-gradient(0deg, #3FA9F5 0px, #3FA9F5 1px, transparent 1px, transparent 6px)",
                }}
            />
            {/* 비네트 */}
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    background:
                        "radial-gradient(ellipse at center, transparent 50%, rgba(5,5,16,0.7) 100%)",
                }}
            />
            {/* 코너 브라켓 */}
            <div className="pointer-events-none absolute top-2.5 left-2.5 z-20">
                <CornerLegs />
            </div>
            <div className="pointer-events-none absolute top-2.5 right-2.5 z-20">
                <CornerLegs flipX />
            </div>
            <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-20">
                <CornerLegs flipY />
            </div>
            <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-20">
                <CornerLegs flipX flipY />
            </div>
            <div className="relative w-full h-full z-10">{children}</div>
            {/* 스파이디 센스 알림 */}
            <SpideySenseAlert pulse={alertPulse} />
        </div>
    );
}

function CornerLegs({ flipX, flipY }) {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            style={{ transform: `scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})` }}
        >
            <line x1="0" y1="0" x2="18" y2="0" stroke={C.cyan} strokeWidth="1.2" opacity="0.9" />
            <line x1="0" y1="0" x2="0" y2="18" stroke={C.cyan} strokeWidth="1.2" opacity="0.9" />
            <line x1="0" y1="0" x2="10" y2="10" stroke={C.accent} strokeWidth="1.2" opacity="0.6" />
            <circle cx="2" cy="2" r="1.2" fill={C.cyanLight} />
            <line x1="4" y1="0" x2="4" y2="8" stroke={C.cyan} strokeWidth="0.8" opacity="0.4" />
            <line x1="0" y1="4" x2="8" y2="4" stroke={C.cyan} strokeWidth="0.8" opacity="0.4" />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/* 거미 마스코트 아이콘                                                */
/* ------------------------------------------------------------------ */
function SpiderMascotIcon({ size = 22, color = C.accent, opacity = 1 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" style={{ opacity, flexShrink: 0, filter: `drop-shadow(0 0 6px ${color}88)` }}>
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
/* 스파이디 센스 알림 파동                                             */
/* ------------------------------------------------------------------ */
function SpideySenseAlert({ pulse }) {
    return (
        <AnimatePresence>
            {pulse && (
                <motion.div
                    key={pulse.key}
                    className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: [0, 1, 0.4, 0.95, 0],
                        x: [0, -2, 2, -1.5, 1, 0],
                        y: [0, 1.5, -1.5, 1, -1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.95, times: [0, 0.15, 0.4, 0.65, 1], ease: "easeInOut" }}
                    style={{
                        boxShadow: `inset 0 0 6px ${pulse.color}, inset 0 0 32px ${pulse.color}aa, inset 0 0 80px ${pulse.color}55`,
                        border: `1.5px solid ${pulse.color}`,
                    }}
                >
                    {pulse.type === "notification" && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-80">
                            {[1, 2, 3].map((i) => (
                                <motion.div
                                    key={`ripple-${i}`}
                                    className="absolute rounded-full border border-cyan-400"
                                    initial={{ width: 0, height: 0, opacity: 0.9 }}
                                    animate={{ width: "160vw", height: "160vw", opacity: 0 }}
                                    transition={{ duration: 1.2, delay: i * 0.15, ease: "easeOut" }}
                                    style={{
                                        boxShadow: `0 0 15px ${C.cyanLight}, inset 0 0 15px ${C.cyanLight}`
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
/* 푸시 알림 / 상단 토스트                                             */
/* ------------------------------------------------------------------ */
function TopToast({ toast, onOpen }) {
    const Icon = toast?.icon || BellRing;
    const tone = toast?.color || C.cyan;
    const clickable = !!(toast?.id && onOpen);
    return (
        <div
            className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center"
            style={{ paddingTop: 14, zIndex: 50 }}
        >
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key={toast.key}
                        onClick={clickable ? () => onOpen(toast.id) : undefined}
                        role={clickable ? "button" : undefined}
                        className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 hud-cut-corner"
                        style={{
                            background: "rgba(8, 16, 32, 0.92)",
                            border: `1px solid ${tone}`,
                            boxShadow: `0 0 16px ${tone}55, inset 0 0 10px ${tone}22`,
                            maxWidth: "88%",
                            backdropFilter: "blur(12px)",
                            cursor: clickable ? "pointer" : "default",
                        }}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.95 }}
                        transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
                    >
                        <motion.span
                            style={{ display: "inline-flex", color: tone, flexShrink: 0 }}
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Icon size={16} />
                        </motion.span>
                        <div className="flex flex-col">
                            <span style={{ ...orbitron, color: tone, fontSize: 9.5, letterSpacing: 1.5 }}>
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

/* ------------------------------------------------------------------ */
/* 핫키 훅                                                             */
/* ------------------------------------------------------------------ */
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
/* CD 앨범 커버 & 음악 플레이어                                         */
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
                background: artUrl ? `url(${artUrl}) center/cover no-repeat` : `conic-gradient(from 0deg, ${C.bg}, ${C.cyan}55, ${C.bg} 50%, ${C.accent}55, ${C.bg})`,
                border: `1px solid ${C.cyan}`,
                boxShadow: `0 0 12px ${C.cyan}44`,
                overflow: "hidden",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        >
            <div style={{ position: "absolute", inset: size * 0.1, borderRadius: "50%", border: `1px solid rgba(63,169,245,0.4)` }} />
            <div style={{ position: "absolute", inset: size * 0.22, borderRadius: "50%", border: `1px solid rgba(63,169,245,0.3)` }} />
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: size * 0.24,
                    height: size * 0.24,
                    borderRadius: "50%",
                    background: C.bg,
                    border: `1.5px solid ${C.accent}`,
                    transform: "translate(-50%,-50%)",
                }}
            />
        </motion.div>
    );
}

function FullScreenMusicPlayer({ track, onClose }) {
    return (
        <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center p-6"
            style={{ zIndex: 45, background: "rgba(5, 7, 16, 0.96)", backdropFilter: "blur(16px)" }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2.5 rounded-full hud-glass-panel"
                style={{ color: C.text }}
            >
                <X size={20} />
            </button>
            <div className="flex flex-col items-center w-full max-w-sm px-6">
                <div style={{ filter: `drop-shadow(0 0 24px ${C.cyan}66)` }}>
                    <SpinningCD size={220} artUrl={track.artUrl} />
                </div>
                <div className="mt-8 text-center w-full">
                    <span style={{ ...orbitron, color: C.accent, fontSize: 11, letterSpacing: 2 }}>AUDIO FEED // ACTIVE</span>
                    <h2 style={{ ...rajdhani, color: C.textBright, fontSize: 24, fontWeight: 700, marginTop: 4 }} className="truncate w-full">
                        {track.title || "무제 (SIGNAL_07)"}
                    </h2>
                    <p style={{ ...sans, color: C.slate, fontSize: 14, marginTop: 4 }} className="truncate w-full">
                        {track.artist || "발신자 미상"}
                    </p>
                    {track.album && (
                        <p style={{ ...mono, color: C.cyan, fontSize: 11, marginTop: 6, letterSpacing: 0.5 }} className="truncate w-full">
                            [{track.album}]
                        </p>
                    )}
                </div>
                <div className="w-full mt-8 flex flex-col items-center">
                    <div className="w-full h-1.5 rounded-full relative overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${C.panelBorder}` }}>
                        <motion.div
                            className="absolute top-0 left-0 h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${C.cyan}, ${C.accent})`, boxShadow: `0 0 10px ${C.accent}` }}
                            animate={{ width: ["0%", "100%"] }}
                            transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                    <div className="flex justify-between w-full mt-2" style={{ ...mono, fontSize: 10, color: C.slate }}>
                        <span style={{ ...orbitron, color: C.cyan }}>PLAYING</span>
                        <motion.span
                            animate={{ opacity: [1, 0.25, 1] }}
                            transition={{ duration: 0.9, repeat: Infinity }}
                            style={{ color: C.accent }}
                        >
                            ● LIVE FEED
                        </motion.span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function MusicPlayerBar({ open, collapsed, track, onCollapse, onExpand, onFullScreen }) {
    if (!open) return null;
    return (
        <AnimatePresence>
            <motion.div
                className="absolute bottom-20 left-4 right-4 z-30 flex items-center justify-between px-3.5 py-2.5 hud-cut-corner hud-glass-panel"
                style={{
                    boxShadow: `0 0 16px rgba(63,169,245,0.25), inset 0 0 10px rgba(63,169,245,0.08)`,
                }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={onFullScreen}>
                    <SpinningCD size={34} artUrl={track.artUrl} />
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span style={{ ...orbitron, color: C.accent, fontSize: 8.5, letterSpacing: 1 }}>AUDIO</span>
                            <span className="truncate" style={{ ...sans, color: C.textBright, fontSize: 12.5, fontWeight: 600 }}>
                                {track.title || "무제 (SIGNAL_07)"}
                            </span>
                        </div>
                        <span className="truncate" style={{ ...mono, color: C.slate, fontSize: 10 }}>
                            {track.artist || "발신자 미상"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onFullScreen} style={{ color: C.cyan }} className="p-1" title="전체화면">
                        <MonitorPlay size={16} />
                    </button>
                    <button onClick={collapsed ? onExpand : onCollapse} style={{ color: C.slate }} className="p-1">
                        {collapsed ? <ChevronRight size={16} /> : <X size={16} />}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/* 중앙 스파이더맨 와이어프레임 캔버스 (EVWireframeCanvas)              */
/* ------------------------------------------------------------------ */
const W = 400;
const H = 500;

// 좌표계 (원점: 상단 스파인 C0)
const ORIGIN = { x: W / 2, y: 54 };
const SCALE = 1.9;

const toPx = (x, y) => ({ x: ORIGIN.x + x * SCALE, y: ORIGIN.y + y * SCALE });
const mirrorPx = (p) => ({ x: 2 * ORIGIN.x - p.x, y: p.y });

const C0 = toPx(0, 0);
const C1 = toPx(0, 30);
const R1 = toPx(30, 20);
const R2 = toPx(52, 45);
const R3 = toPx(28, 55);
const R4 = toPx(60, 75);
const BACKBONE_TIP = toPx(85, 90);
const BRANCH1_TIP = toPx(42, 100);
const BRANCH2_TIP = toPx(78, 105);

const L1 = mirrorPx(R1);
const L2 = mirrorPx(R2);
const L3 = mirrorPx(R3);
const L4 = mirrorPx(R4);
const L_BACKBONE_TIP = mirrorPx(BACKBONE_TIP);
const L_BRANCH1_TIP = mirrorPx(BRANCH1_TIP);
const L_BRANCH2_TIP = mirrorPx(BRANCH2_TIP);

const APEX = { x: C0.x, y: C0.y - 13 };

const NODE_GLOW_COLOR = "#8fd4ff";
const LINE_COLOR = "#3fa9ff";

// 중앙 서클 패널
const CIRC = { x: W / 2, y: 352, r: 86 };

const BAR_COUNT = 46;
const BAR_ENVELOPE = Array.from({ length: BAR_COUNT }, (_, i) => {
    const t = (i / (BAR_COUNT - 1)) * 2 - 1;
    return Math.exp(-Math.pow(t * 1.6, 2));
});

// 결정론적 별자리 파티클
const STARS = Array.from({ length: 34 }, (_, i) => ({
    x: (i * 137.5) % W,
    y: (i * 71.3 + i * i * 3) % (H - 20),
    r: ((i * 13) % 3) * 0.5 + 0.6,
    op: 0.15 + ((i * 29) % 60) / 100,
}));

function strokeLine(ctx, p1, p2, { glow = 10, width = 1.2, color = LINE_COLOR, dashed = false, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    if (dashed) ctx.setLineDash([3, 5]);
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
}

function strokeCurve(ctx, p0, pc, p1, { glow = 10, width = 1.15, color = LINE_COLOR, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(pc.x, pc.y, p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
}

function drawNode(ctx, p, pulse) {
    ctx.save();
    ctx.fillStyle = NODE_GLOW_COLOR;
    ctx.shadowColor = NODE_GLOW_COLOR;
    ctx.shadowBlur = 14 + pulse * 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // 브라이트 코어
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#eaf6ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawXMark(ctx, p) {
    const s = 4.5;
    strokeLine(ctx, { x: p.x - s, y: p.y - s }, { x: p.x + s, y: p.y + s }, { width: 1.1, glow: 8 });
    strokeLine(ctx, { x: p.x - s, y: p.y + s }, { x: p.x + s, y: p.y - s }, { width: 1.1, glow: 8 });
}

function drawWireframe(ctx, pulse) {
    strokeLine(ctx, C0, C1, { dashed: true, width: 0.9, glow: 4, alpha: 0.5 });
    strokeLine(ctx, APEX, C0, { width: 1.1, glow: 8 });
    drawXMark(ctx, APEX);

    const TIP_EXTENSION_FACTOR = 0.35;
    const BACKBONE_EXTENSION_FACTOR = 0.55;

    const draw = (r1, r2, r3, r4, tipB, tip1, tip2) => {
        strokeLine(ctx, C0, r1);
        strokeLine(ctx, r1, r2);
        const backboneExt = {
            x: r2.x + (r2.x - r1.x) * BACKBONE_EXTENSION_FACTOR,
            y: r2.y + (r2.y - r1.y) * BACKBONE_EXTENSION_FACTOR,
        };
        strokeLine(ctx, r2, backboneExt, { width: 0.7, glow: 3, alpha: 0.35 });
        strokeLine(ctx, r1, r3);
        strokeLine(ctx, r3, tip1);
        strokeLine(ctx, r2, r4);
        strokeLine(ctx, r4, tip2);
        strokeLine(ctx, C0, r3);
        const extTip = {
            x: tipB.x + (tipB.x - r2.x) * TIP_EXTENSION_FACTOR,
            y: tipB.y + (tipB.y - r2.y) * TIP_EXTENSION_FACTOR,
        };
        strokeLine(ctx, tipB, extTip, { width: 0.7, glow: 3, alpha: 0.35 });
    };

    draw(R1, R2, R3, R4, BACKBONE_TIP, BRANCH1_TIP, BRANCH2_TIP);
    draw(L1, L2, L3, L4, L_BACKBONE_TIP, L_BRANCH1_TIP, L_BRANCH2_TIP);

    [C0, C1, R1, R2, R3, R4, L1, L2, L3, L4].forEach((p) => drawNode(ctx, p, pulse));
}

function drawCirclePanel(ctx) {
    const grad = ctx.createLinearGradient(CIRC.x - CIRC.r, CIRC.y - CIRC.r, CIRC.x + CIRC.r, CIRC.y + CIRC.r);
    grad.addColorStop(0, "#ff8fd8");
    grad.addColorStop(0.55, "#c084fc");
    grad.addColorStop(1, "#7c5cff");

    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = "#c084fc";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(CIRC.x, CIRC.y, CIRC.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(167,139,250,0.25)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(CIRC.x, CIRC.y, CIRC.r - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 이너 스파이더 아이콘
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#e9e9ff";
    ctx.fillStyle = "#e9e9ff";
    ctx.lineWidth = 0.7;
    const ix = CIRC.x;
    const iy = CIRC.y - 56;
    ctx.beginPath();
    ctx.arc(ix, iy, 2.2, 0, Math.PI * 2);
    ctx.fill();
    [-60, -35, -12, 12, 35, 60].forEach((a) => {
        const r = (a * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ix + Math.sin(r) * 8, iy + Math.cos(r) * 6);
        ctx.stroke();
    });
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawWaveform(ctx, levels, micActive) {
    const grad = ctx.createLinearGradient(0, CIRC.y - 40, 0, CIRC.y + 40);
    if (micActive) {
        grad.addColorStop(0, "#ff4757");
        grad.addColorStop(1, "#ff6b81");
    } else {
        grad.addColorStop(0, "#ff2d78");
        grad.addColorStop(1, "#c81d4a");
    }

    const spanWidth = 132;
    ctx.save();
    ctx.shadowColor = micActive ? "#ff4757" : "#ff2d78";
    ctx.shadowBlur = micActive ? 10 : 6;
    levels.forEach((lvl, i) => {
        const x = CIRC.x - spanWidth / 2 + (i / (BAR_COUNT - 1)) * spanWidth;
        const barH = 10 + lvl * 66;
        ctx.globalAlpha = 0.55 + lvl * 0.45;
        ctx.fillStyle = grad;
        const y = CIRC.y - barH / 2;
        const rw = 2.2;
        roundRect(ctx, x - rw / 2, y, rw, barH, 1.1);
        ctx.fill();
    });
    ctx.restore();
}

function drawWordmark(ctx) {
    const text = "E.V.";
    const y = CIRC.y + CIRC.r + 34;
    ctx.save();
    ctx.font = "700 16px 'Orbitron', 'JetBrains Mono', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ff3b4e";
    ctx.shadowColor = "#ff3b4e";
    ctx.shadowBlur = 14;

    const spacing = 6;
    let totalW = 0;
    const widths = [...text].map((ch) => {
        const w = ctx.measureText(ch).width;
        totalW += w + spacing;
        return w;
    });
    totalW -= spacing;

    let x = CIRC.x - totalW / 2;
    [...text].forEach((ch, i) => {
        ctx.fillText(ch, x, y);
        x += widths[i] + spacing;
    });
    ctx.restore();
}

function drawBackground(ctx) {
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = "rgba(63,169,245,0.12)";
    ctx.lineWidth = 0.6;
    const spokes = [
        [[C0.x, C0.y], [30, 210]],
        [[C0.x, C0.y], [W - 30, 210]],
        [[C0.x, C0.y], [5, 30]],
        [[C0.x, C0.y], [W - 5, 30]],
    ];
    spokes.forEach(([[x1, y1], [x2, y2]]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
    ctx.restore();

    // 별자리
    STARS.forEach((s) => {
        ctx.save();
        ctx.globalAlpha = s.op;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function EVWireframeCanvas({ active = false, micActive = false, scaleFactor = 1 }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const tRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
        ctx.scale(dpr, dpr);

        const levels = new Array(BAR_COUNT).fill(0.2);

        const render = () => {
            const speed = (micActive || active) ? 0.16 : 0.08;
            tRef.current += speed;
            const t = tRef.current;
            const pulse = Math.sin(t * ((micActive || active) ? 1.6 : 0.9)) * 0.5 + 0.5;

            for (let i = 0; i < BAR_COUNT; i++) {
                let jitter;
                if (micActive) {
                    jitter = Math.sin(t * 3.6 + i * 0.8) * 0.45 + Math.sin(t * 1.5 + i * 2.1) * 0.25;
                    levels[i] = Math.max(0.08, Math.min(1, BAR_ENVELOPE[i] * (0.88 + jitter)));
                } else if (active) {
                    jitter = Math.sin(t * 2.8 + i * 0.7) * 0.32 + Math.sin(t * 0.9 + i * 1.5) * 0.18;
                    levels[i] = Math.max(0.05, Math.min(1, BAR_ENVELOPE[i] * (0.78 + jitter)));
                } else {
                    jitter = Math.sin(t * 1.2 + i * 0.4) * 0.12 + Math.sin(t * 0.5 + i * 0.8) * 0.06;
                    levels[i] = Math.max(0.03, Math.min(0.4, BAR_ENVELOPE[i] * (0.28 + jitter)));
                }
            }

            ctx.clearRect(0, 0, W, H);
            drawBackground(ctx);
            drawWireframe(ctx, pulse);
            drawCirclePanel(ctx);
            drawWaveform(ctx, levels, micActive);
            drawWordmark(ctx);

            rafRef.current = requestAnimationFrame(render);
        };
        rafRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(rafRef.current);
    }, [active, micActive]);

    return (
        <div className="relative flex items-center justify-center select-none" style={{ transform: `scale(${scaleFactor})`, transformOrigin: "center center" }}>
            <canvas ref={canvasRef} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 웹 검색 레이더 로더 (WebNodeLoader)                                 */
/* ------------------------------------------------------------------ */
function WebNodeLoader({ size = 88, tone = C.cyan }) {
    const spokes = 8;
    return (
        <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
            <motion.div
                style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${tone}` }}
                animate={{ scale: [0.9, 1.35], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.svg
                viewBox="0 0 100 100"
                style={{ position: "absolute", inset: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            >
                {Array.from({ length: spokes }).map((_, i) => {
                    const angle = (360 / spokes) * i;
                    const rad = (angle * Math.PI) / 180;
                    return (
                        <line
                            key={i}
                            x1="50"
                            y1="50"
                            x2={50 + 46 * Math.cos(rad)}
                            y2={50 + 46 * Math.sin(rad)}
                            stroke={tone}
                            strokeWidth="0.8"
                            opacity="0.35"
                        />
                    );
                })}
                {[18, 32, 46].map((r, ri) => (
                    <polygon
                        key={ri}
                        points={Array.from({ length: spokes }).map((_, i) => {
                            const rad = ((360 / spokes) * i * Math.PI) / 180;
                            return `${50 + r * Math.cos(rad)},${50 + r * Math.sin(rad)}`;
                        }).join(" ")}
                        fill="none"
                        stroke={tone}
                        strokeWidth="0.8"
                        opacity={0.45 - ri * 0.1}
                    />
                ))}
            </motion.svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <SpiderMascotIcon size={size * 0.28} color={tone} />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* HUD 텔레메트리 뱃지 & 로더                                         */
/* ------------------------------------------------------------------ */
function FloatingReadout({ label, value, delay = 0 }) {
    return (
        <motion.div
            className="flex items-center gap-1.5 px-2.5 py-1 hud-cut-corner-sm"
            style={{
                background: "rgba(8, 16, 32, 0.8)",
                border: `1px solid ${C.panelBorder}`,
                boxShadow: `0 0 8px rgba(63,169,245,0.2)`,
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
        >
            <span style={{ ...orbitron, color: C.cyanLight, fontSize: 9, letterSpacing: 1 }}>{label}:</span>
            <span style={{ ...mono, color: C.textBright, fontSize: 9.5 }}>{value}</span>
        </motion.div>
    );
}

function Dots() {
    return (
        <span className="inline-flex items-center gap-1 ml-1">
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    style={{ width: 3.5, height: 3.5, borderRadius: "50%", background: C.cyanLight, display: "inline-block" }}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </span>
    );
}

function VoiceWaveform({ active }) {
    if (!active) return null;
    return (
        <div className="flex items-center justify-center gap-1 py-1.5">
            {Array.from({ length: 18 }).map((_, i) => (
                <motion.div
                    key={i}
                    style={{ width: 2.5, borderRadius: 1.5, background: C.accent }}
                    animate={{ height: [6, 22, 6] }}
                    transition={{
                        duration: 0.7,
                        repeat: Infinity,
                        delay: (i % 6) * 0.1,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

function HoloProgressBar({ progress, label, tone = C.cyan }) {
    const totalSegments = 16;
    const filledSegments = Math.round((progress / 100) * totalSegments);
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && (
                <div className="flex justify-between items-center px-0.5">
                    <span style={{ ...orbitron, color: tone, fontSize: 9, letterSpacing: 1 }}>{label}</span>
                    <span style={{ ...mono, color: tone, fontSize: 9.5 }}>{progress}%</span>
                </div>
            )}
            <div className="flex gap-1 w-full">
                {Array.from({ length: totalSegments }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 h-1.5 rounded-sm transition-all"
                        style={{
                            background: i < filledSegments ? tone : "rgba(255,255,255,0.06)",
                            boxShadow: i < filledSegments ? `0 0 6px ${tone}` : "none",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function SearchStatus({ phase, sources }) {
    let text = "검색 쿼리 생성 중";
    if (phase === "filtering") text = "관련 문서 필터링 중";
    if (phase === "synthesizing") text = "AI 응답 합성 중";

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 hud-cut-corner-sm hud-glass-panel">
            <Radio size={12} color={C.cyan} className="animate-pulse" />
            <span style={{ ...orbitron, color: C.cyan, fontSize: 10, letterSpacing: 1 }}>
                [ {phase?.toUpperCase() || "SEARCHING"} ]
            </span>
            <span style={{ ...sans, color: C.text, fontSize: 11 }}>{text}</span>
            <Dots />
        </div>
    );
}

function ExportButtons({ onExportPdf, onExportSlide, onExportImages }) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <button
                onClick={onExportPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 hud-cut-corner-sm hud-glass-panel"
                style={{ color: C.cyanLight, ...mono, fontSize: 10.5 }}
            >
                <FileDown size={13} /> PDF 내보내기
            </button>
            <button
                onClick={onExportSlide}
                className="flex items-center gap-1.5 px-3 py-1.5 hud-cut-corner-sm hud-glass-panel"
                style={{ color: C.lime, ...mono, fontSize: 10.5 }}
            >
                <MonitorUp size={13} /> 슬라이드 보기
            </button>
            <button
                onClick={onExportImages}
                className="flex items-center gap-1.5 px-3 py-1.5 hud-cut-corner-sm hud-glass-panel"
                style={{ color: C.coral, ...mono, fontSize: 10.5 }}
            >
                <ImageIcon size={13} /> 이미지 저장
            </button>
        </div>
    );
}

function Switch({ on, onChange }) {
    return (
        <button
            onClick={() => onChange(!on)}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{
                background: on ? "rgba(63,169,245,0.25)" : "rgba(255,255,255,0.08)",
                border: `1px solid ${on ? C.cyan : C.panelBorder}`,
                boxShadow: on ? `0 0 8px ${C.cyan}66` : "none",
                flexShrink: 0,
            }}
        >
            <motion.span
                className="absolute top-0.5 w-3.5 h-3.5 rounded-full"
                style={{ background: on ? C.cyanLight : C.slate }}
                animate={{ left: on ? 22 : 3 }}
                transition={{ type: "tween", duration: 0.15 }}
            />
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* 상단 상태바 (StatusBar)                                            */
/* ------------------------------------------------------------------ */
function StatusBar({ onMenu, showBack, onBack, title, darkText = false, pinnedDday, onDdayClick }) {
    return (
        <div
            className="flex items-center justify-between px-4 py-2.5 border-b select-none z-20"
            style={{
                borderColor: darkText ? "rgba(0,0,0,0.15)" : C.panelBorder,
                background: darkText ? "transparent" : "rgba(5, 7, 16, 0.45)",
                backdropFilter: "blur(8px)",
            }}
        >
            <div className="flex items-center gap-3">
                {showBack ? (
                    <button
                        onClick={onBack}
                        style={{ color: darkText ? "#111" : C.cyan }}
                        className="p-1 rounded hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <SpiderMascotIcon size={16} color={C.accent} opacity={0.9} />
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#FF3B4E] inline-block animate-pulse" style={{ boxShadow: "0 0 8px #FF3B4E" }} />
                            <span style={{ ...orbitron, color: C.accent, fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }}>
                                ONLINE
                            </span>
                        </div>
                    </div>
                )}
                {title && (
                    <span style={{ ...orbitron, color: darkText ? "#111" : C.textBright, fontSize: 11.5, letterSpacing: 1 }}>
                        [ {title.toUpperCase()} ]
                    </span>
                )}
            </div>
            {!showBack && (
                <div className="flex items-center gap-2.5">
                    {pinnedDday && (
                        <button
                            onClick={onDdayClick}
                            className="flex items-center gap-1.5 px-2 py-0.5 hud-cut-corner-sm transition-all"
                            style={{
                                border: `1px solid ${pinnedDday.color || C.accent}`,
                                background: "rgba(5,10,20,0.7)",
                                boxShadow: `0 0 10px ${pinnedDday.color || C.accent}44`,
                            }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: pinnedDday.color || C.accent }} />
                            <span style={{ ...orbitron, color: pinnedDday.color || C.accent, fontSize: 10, fontWeight: 700 }}>
                                {pinnedDday.dInfo.text}
                            </span>
                            <span className="truncate max-w-[80px]" style={{ ...sans, color: C.textBright, fontSize: 11 }}>
                                {pinnedDday.title}
                            </span>
                        </button>
                    )}
                    <span style={{ ...mono, color: C.slate, fontSize: 9.5, letterSpacing: 1 }} className="hidden sm:inline">
                        CORE_v2.4
                    </span>
                    <button onClick={onMenu} style={{ color: C.cyan }} className="p-1 hover:text-cyan-300 transition-colors">
                        <Menu size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 사이드 패널 (HUD Drawer)                                           */
/* ------------------------------------------------------------------ */
function SidePanel({ open, onClose, onNavigate, historyOn, onToggleHistory }) {
    const items = [
        { key: "newchat", label: "NEW SESSION // 새 대화", icon: MessageSquarePlus, tone: C.accent },
        { key: "spen", label: "T-PAD // S펜 풀이 캔버스", icon: PenTool, tone: C.cyanLight },
        { key: "meal", label: "NEIS MEAL // 학교 급식", icon: Utensils, tone: C.lime },
        { key: "dday", label: "D-DAY HUB // 디데이 관리", icon: Hourglass, tone: C.accent },
        { key: "todo", label: "TASKS // 오늘의 할 일", icon: CheckSquare, tone: C.lime },
        { key: "wrong", label: "VILLAIN LOG // 오답 노트", icon: BookOpen, tone: C.danger },
        { key: "calendar", label: "CALENDAR // 일정 매트릭스", icon: CalendarDays, tone: C.lime },
        { key: "schedule", label: "TIMETABLE // 시간표 관리", icon: Clock, tone: C.cyan },
        { key: "sports", label: "SPORTS // 스포츠 알림", icon: Trophy, tone: C.amber },
        { key: "apikey", label: "AI MODELS // API 설정", icon: KeyRound, tone: C.cyanLight },
        { key: "paths", label: "DIRECTORY // 경로 설정", icon: FolderOpen, tone: C.slate },
        { key: "bugle", label: "DAILY BUGLE // 일일 브리핑", icon: FileText, tone: C.accent },
        { key: "memories", label: "NEURAL MEMORY // Obsidian", icon: FileText, tone: C.cyan },
        { key: "history", label: "ARCHIVES // 이전 대화", icon: History, tone: C.slate },
        { key: "masking", label: "PRIVACY // 개인정보 마스킹", icon: Shield, tone: C.cyan },
        { key: "pace", label: "CHRONO PACE // 페이스 계산", icon: Timer, tone: C.lime },
    ];

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="absolute inset-0 z-40"
                        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="absolute top-0 right-0 h-full z-50 flex flex-col hud-glass-panel"
                        style={{
                            width: "82%",
                            maxWidth: 360,
                            borderLeft: `1.5px solid ${C.cyan}`,
                            boxShadow: `-8px 0 32px rgba(63,169,245,0.25)`,
                        }}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "tween", duration: 0.24 }}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.panelBorder }}>
                            <div className="flex items-center gap-2">
                                <SpiderMascotIcon size={18} color={C.accent} />
                                <span style={{ ...orbitron, color: C.cyanLight, fontSize: 11.5, letterSpacing: 1.5, fontWeight: 700 }}>
                                    SYSTEM NAVIGATION
                                </span>
                            </div>
                            <button onClick={onClose} style={{ color: C.slate }} className="p-1 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col p-3 gap-1.5 overflow-y-auto">
                            {items.map(({ key, label, icon: Icon, tone }) => (
                                <button
                                    key={key}
                                    onClick={() => onNavigate(key)}
                                    className="flex items-center justify-between px-3.5 py-3 text-left hud-cut-corner-sm transition-all"
                                    style={{
                                        border: `1px solid ${C.panelBorder}`,
                                        background: "rgba(10,20,38,0.5)",
                                        color: C.text,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = tone || C.cyan;
                                        e.currentTarget.style.boxShadow = `0 0 10px ${tone || C.cyan}44`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = C.panelBorder;
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon size={16} color={tone || C.cyan} />
                                        <span style={{ ...rajdhani, fontSize: 13.5, fontWeight: 600, letterSpacing: 0.5 }}>{label}</span>
                                    </div>
                                    <ChevronRight size={14} color={C.slate} />
                                </button>
                            ))}
                        </div>

                        <div className="p-3 border-t" style={{ borderColor: C.panelBorder }}>
                            <div
                                className="flex items-center justify-between px-3.5 py-2.5 hud-cut-corner-sm"
                                style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(10,20,38,0.4)" }}
                            >
                                <div className="flex flex-col">
                                    <span style={{ ...orbitron, color: C.cyanLight, fontSize: 10, letterSpacing: 1 }}>CHAT HISTORY</span>
                                    <span style={{ ...sans, color: C.slate, fontSize: 10.5, marginTop: 1 }}>
                                        {historyOn ? "이전 대화 연속 표시" : "최신 대화만 단독 표시"}
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
/* 화면 1: 환영 / 로그인 포탈                                          */
/* ------------------------------------------------------------------ */
function WelcomeScreen({ onLogin }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-6">
            <div className="flex flex-col items-center gap-1.5">
                <SpiderMascotIcon size={36} color={C.accent} opacity={0.95} />
                <span style={{ ...orbitron, color: C.accent, fontSize: 10.5, letterSpacing: 3, marginTop: 4 }}>
                    &gt; INITIALIZE E.V. CORE &lt;
                </span>
                <div className="inline-block" style={{ marginTop: 2 }}>
                    <span
                        style={{
                            ...orbitron,
                            fontSize: 48,
                            fontWeight: 900,
                            letterSpacing: "0.1em",
                            color: C.textBright,
                            textShadow: `0 0 20px ${C.cyan}, 0 0 40px ${C.accent}66`,
                        }}
                    >
                        E.V.
                    </span>
                </div>
                <span style={{ ...orbitron, color: C.cyanLight, fontSize: 10, letterSpacing: 2 }}>
                    ADVANCED CYBERNETIC ASSISTANT
                </span>
            </div>

            <div className="py-2" style={{ filter: "drop-shadow(0 0 16px rgba(63,169,245,0.4))" }}>
                <WebNodeLoader size={84} tone={C.cyan} />
            </div>

            <p style={{ ...sans, color: C.slate, fontSize: 13, lineHeight: 1.6, maxWidth: 280 }}>
                E.V. 피터 파커의 개인 AI 어시스턴트.
                <br />
                모든 신경망 및 센서 가동 준비 완료.
            </p>

            <button
                onClick={() => {
                    sendToFlutter("google_login", {});
                    onLogin();
                }}
                className="flex items-center justify-center gap-3 w-full max-w-xs py-3 hud-cut-corner hud-glass-panel transition-all"
                style={{
                    border: `1.5px solid ${C.cyan}`,
                    color: C.cyanLight,
                    ...orbitron,
                    fontSize: 11.5,
                    letterSpacing: 1.5,
                    boxShadow: `0 0 16px rgba(63,169,245,0.3)`,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.accent;
                    e.currentTarget.style.boxShadow = `0 0 22px rgba(255,59,78,0.5)`;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.cyan;
                    e.currentTarget.style.boxShadow = `0 0 16px rgba(63,169,245,0.3)`;
                }}
            >
                <img src={GOOGLE_ICON_URI} alt="" width={18} height={18} style={{ flexShrink: 0 }} />
                GOOGLE AUTHENTICATE
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 캘린더 파싱 헬퍼                                                    */
/* ------------------------------------------------------------------ */
const DEFAULT_CALENDAR_MD = `# calendar.md

## 2026-08-10
- 팀 회의 14:00
- 저녁 약속

## 2026-08-15
- 친구 생일파티
`;

function parseCalendarMd(md) {
    if (!md) return {};
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
/* AI 메시지 렌더러 (생각 과정 & 응답)                                 */
/* ------------------------------------------------------------------ */
function AssistantMessage({ text, streaming, isLatest, textMaxWidth, bodyFontSize, searchStatus }) {
    const [showThought, setShowThought] = useState(false);

    if (!text && streaming) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 hud-cut-corner-sm hud-glass-panel">
                <span style={{ ...orbitron, color: searchStatus ? C.lime : C.accent, fontSize: 10, letterSpacing: 1 }}>
                    {searchStatus ? `🔍 [${searchStatus}] SEARCHING` : "PROCESSING THOUGHT"}<Dots />
                </span>
            </div>
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
        thoughtProcess = text.replace(/<think>/g, "").trim();
        finalAnswer = "";
    }

    return (
        <div className="flex flex-col gap-2.5 w-full items-center" style={{ maxWidth: textMaxWidth }}>
            {thoughtProcess && (
                <div className="flex flex-col gap-1 w-full">
                    <button
                        onClick={() => setShowThought(!showThought)}
                        className="flex items-center gap-2 self-start px-2.5 py-1 hud-cut-corner-sm"
                        style={{
                            background: "rgba(63,169,245,0.08)",
                            border: `1px solid ${C.panelBorder}`,
                            color: C.cyanLight,
                        }}
                    >
                        <span style={{ ...orbitron, fontSize: 9.5, letterSpacing: 1 }}>
                            {showThought ? "▼ [ THOUGHT INTEL COLLAPSE ]" : "▶ [ THOUGHT INTEL VIEW ]"}
                        </span>
                        {streaming && !finalAnswer && <Dots />}
                    </button>
                    {showThought && (
                        <div
                            className="p-3 hud-cut-corner-sm text-left w-full"
                            style={{
                                background: "rgba(5,10,20,0.85)",
                                borderLeft: `2px solid ${C.accent}`,
                                color: C.slate,
                                fontSize: bodyFontSize ? bodyFontSize * 0.9 : 12,
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
                <div
                    className="w-full px-4 py-3 hud-cut-corner hud-glass-panel"
                    style={{
                        boxShadow: isLatest ? `0 0 16px rgba(63,169,245,0.2)` : "none",
                        borderColor: isLatest ? C.cyan : C.panelBorder,
                    }}
                >
                    <p
                        style={{
                            ...sans,
                            color: isLatest ? C.textBright : C.text,
                            fontSize: bodyFontSize || 13.5,
                            lineHeight: isLatest ? 1.8 : 1.6,
                            letterSpacing: 0.2,
                            whiteSpace: "pre-wrap",
                            textAlign: "left",
                        }}
                    >
                        {finalAnswer}
                    </p>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 메인 콘솔 화면 (MainScreen)                                         */
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
    pinnedDday,
    onDdayClick,
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

    useEffect(() => {
        setSearchEngineStatus(searchEngineStatusFromParent);
    }, [searchEngineStatusFromParent]);

    const idxRef = useRef(0);
    const fullReplyRef = useRef("");
    const latestRef = useRef(null);
    const [synced, setSynced] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const dragCounterRef = useRef(0);
    const inputSourceRef = useRef("text");
    const { isLandscape, scale } = useResponsiveLayout();

    useEffect(() => {
        setLog([]);
    }, [newChatSignal]);

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
                    restored.push({ id: `restored_${idx}`, user: "", assistant: msg.content, kind: "chat", streaming: false });
                }
            }
        });
        setLog(restored);
    }, [conversationHistoryEvent]);

    useEffect(() => {
        if (!textInjectEvent?.text) return;
        inputSourceRef.current = textInjectEvent.source || "voice";
        setInput((prev) => (prev ? `${prev} ${textInjectEvent.text}` : textInjectEvent.text));
    }, [textInjectEvent]);

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

    useEffect(() => {
        requestAnimationFrame(() => {
            latestRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
    }, [log.length, historyOn]);

    const streamText = (id, text) => {
        fullReplyRef.current = text;
        const total = text.length;
        let cur = 0;
        const step = Math.max(1, Math.floor(total / 60));
        const interval = setInterval(() => {
            cur += step;
            if (cur >= total) {
                cur = total;
                clearInterval(interval);
                setLog((prev) =>
                    prev.map((e) => (e.id === id ? { ...e, assistant: text, streaming: false } : e))
                );
            } else {
                setLog((prev) =>
                    prev.map((e) =>
                        e.id === id ? { ...e, assistant: text.substring(0, cur), streaming: true } : e
                    )
                );
            }
        }, 22);
    };

    useEffect(() => {
        if (!llmResultEvent) return;
        const { id, text } = llmResultEvent;
        streamText(id, text);
    }, [llmResultEvent]);

    const attachDroppedFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setAttachedFile({
                name: file.name,
                type: file.type,
                size: file.size,
                base64: reader.result,
            });
        };
        reader.readAsDataURL(file);
    };

    const handleSend = () => {
        const text = input.trim();
        if (!text && !attachedFile) return;

        const id = `turn_${Date.now()}`;
        idxRef.current += 1;

        sendToFlutter("send_message", {
            id,
            text,
            source: inputSourceRef.current,
            attachedFile: attachedFile ? { name: attachedFile.name, base64: attachedFile.base64 } : null,
        });
        inputSourceRef.current = "text";

        // 데모 / 로컬 목업 반응
        if (text.startsWith("/search ") || text.startsWith("검색 ")) {
            const query = text.replace(/^(\/search|검색)\s+/, "");
            setLog((prev) => [
                ...prev,
                { id, user: text, kind: "search", phase: "searching", assistant: "", streaming: true },
            ]);
            setInput("");
            setAttachedFile(null);
            setTimeout(() => {
                streamText(id, `[검색 완료] '${query}' 관련 분석 결과입니다.`);
            }, 1600);
            return;
        }

        setLog((prev) => [
            ...prev,
            { id, user: text, kind: "chat", assistant: "", streaming: true, attachment: attachedFile },
        ]);
        setInput("");
        setAttachedFile(null);
    };

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

    const textMaxWidth = isLandscape ? "72%" : "92%";
    const bodyFontSize = (isLandscape ? 13.5 : 14.5) * Math.min(scale, 1.25);
    const canvasScale = isLandscape ? 0.75 : 0.88;

    return (
        <div
            className="flex flex-col h-full relative"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <StatusBar onMenu={onMenu} pinnedDday={pinnedDday} onDdayClick={onDdayClick} />

            {/* 메인 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto">
                <div
                    className="flex flex-col items-center px-4"
                    style={{
                        paddingTop: "2vh",
                        paddingBottom: "24vh",
                        gap: isLandscape ? 24 : 32,
                    }}
                >
                    {/* 상단 스파이더맨 와이어프레임 캔버스 */}
                    <div className="flex flex-col items-center">
                        <EVWireframeCanvas
                            active={activelyStreaming}
                            micActive={micActive}
                            scaleFactor={canvasScale}
                        />
                        {/* 텔레메트리 칩스 */}
                        <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 hud-cut-corner-sm hud-glass-panel">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B4E]" style={{ boxShadow: "0 0 6px #FF3B4E" }} />
                                <span style={{ ...orbitron, color: C.accent, fontSize: 8.5, letterSpacing: 1 }}>ONLINE</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 hud-cut-corner-sm hud-glass-panel">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3FA9F5]" style={{ boxShadow: "0 0 6px #3FA9F5" }} />
                                <span style={{ ...orbitron, color: C.cyan, fontSize: 8.5, letterSpacing: 1 }}>LINK 100%</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 hud-cut-corner-sm hud-glass-panel">
                                <span style={{ ...orbitron, color: C.lime, fontSize: 8.5, letterSpacing: 1 }}>AWARENESS: LIVE</span>
                            </div>
                        </div>
                    </div>

                    {visible.length === 0 && (
                        <div className="flex flex-col items-center gap-1 mt-2">
                            <span style={{ ...orbitron, color: C.slate, fontSize: 10, letterSpacing: 2 }}>
                                SYSTEM STATUS: READY // ASK E.V.
                            </span>
                        </div>
                    )}

                    {/* 지난 대화 로그 */}
                    {older.map((entry) => (
                        <div key={entry.id} className="w-full flex flex-col items-center gap-2" style={{ opacity: 0.55 }}>
                            {entry.user && (
                                <div className="self-end mr-3 px-3 py-1.5 hud-cut-corner-sm" style={{ background: "rgba(63,169,245,0.12)", border: `1px solid ${C.cyan}` }}>
                                    <span style={{ ...sans, color: C.cyanLight, fontSize: 12.5 }}>{entry.user}</span>
                                </div>
                            )}

                            {entry.kind === "search" && (
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 size={11} color={C.lime} />
                                    <span style={{ ...orbitron, color: C.lime, fontSize: 9.5, letterSpacing: 0.5 }}>
                                        SEARCH COMPLETE · {entry.sources?.length || 0} SOURCES
                                    </span>
                                </div>
                            )}

                            <AssistantMessage
                                text={entry.assistant}
                                streaming={false}
                                isLatest={false}
                                textMaxWidth={textMaxWidth}
                            />

                            {entry.kind === "file" && (
                                <div style={{ opacity: 0.85, transform: "scale(0.92)" }}>
                                    <ExportButtons
                                        onExportPdf={() => handleExportPdf(entry)}
                                        onExportSlide={() => handleExportSlide(entry)}
                                        onExportImages={() => handleExportImages(entry)}
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* 최신 대화 로그 */}
                    {latest && (
                        <div ref={latestRef} className="w-full flex flex-col items-center gap-4">
                            {latest.user && (
                                <div className="self-end mr-3 px-3.5 py-2 hud-cut-corner" style={{ background: "rgba(63,169,245,0.18)", border: `1px solid ${C.cyanLight}`, boxShadow: `0 0 12px rgba(63,169,245,0.3)` }}>
                                    <span style={{ ...sans, color: C.textBright, fontSize: 13.5, fontWeight: 500 }}>{latest.user}</span>
                                </div>
                            )}

                            {latest.kind === "search" && <SearchStatus phase={latest.phase} sources={latest.sources} />}

                            <AssistantMessage
                                text={latest.assistant}
                                streaming={latest.streaming}
                                isLatest={true}
                                textMaxWidth={textMaxWidth}
                                bodyFontSize={bodyFontSize}
                                searchStatus={searchEngineStatus}
                            />

                            {latest.kind === "file" && !latest.streaming && (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 size={12} color={C.lime} />
                                        <span style={{ ...orbitron, color: C.lime, fontSize: 10, letterSpacing: 1 }}>DOCUMENT SYNTHESIZED</span>
                                    </div>
                                    <ExportButtons
                                        onExportPdf={() => handleExportPdf(latest)}
                                        onExportSlide={() => handleExportSlide(latest)}
                                        onExportImages={() => handleExportImages(latest)}
                                    />
                                </div>
                            )}

                            {latest.streaming && (
                                <div className="flex items-center gap-3">
                                    <FloatingReadout label="TRACE" value="ACTIVE" />
                                    <FloatingReadout label="NODE" value="E.V.-07" delay={0.1} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 첨부파일 태그 */}
            <AnimatePresence>
                {attachedFile && (
                    <motion.div className="px-6 pb-2" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 hud-cut-corner-sm" style={{ border: `1px solid ${C.cyan}`, background: "rgba(10,20,40,0.85)" }}>
                            <Paperclip size={12} color={C.cyan} />
                            <span style={{ ...mono, color: C.text, fontSize: 11 }} className="truncate max-w-[200px]">
                                {attachedFile.name}
                            </span>
                            <button onClick={() => setAttachedFile(null)} style={{ color: C.slate }} className="hover:text-white">
                                <X size={12} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <VoiceWaveform active={micActive} />

            {/* 하단 알약(Pill) 형태의 인풋바 */}
            <div className="p-4 z-20">
                <div className="hud-pill-input flex items-center gap-2 px-4 py-2.5 w-full">
                    {/* 문서 첨부 */}
                    <button
                        onClick={() => sendToFlutter("pick_file", {})}
                        style={{ color: C.cyanLight }}
                        className="p-1 hover:text-white transition-colors flex-shrink-0"
                        title="문서 첨부 (PDF, TXT)"
                    >
                        <Paperclip size={17} />
                    </button>
                    {/* 사진 첨부 (Vision) */}
                    <button
                        onClick={() => sendToFlutter("pick_image_for_chat", {})}
                        style={{ color: C.cyanLight }}
                        className="p-1 hover:text-white transition-colors flex-shrink-0"
                        title="사진 첨부 (Vision AI)"
                    >
                        <ImageIcon size={17} />
                    </button>
                    {/* 스크린샷 캡처 질의 */}
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
                                    stream.getTracks().forEach((t) => t.stop());
                                    const dataUrl = canvas.toDataURL("image/png");
                                    setAttachedFile({ name: "화면공유_캡처.png", base64: dataUrl });
                                } else {
                                    sendToFlutter("capture_screen_query", {});
                                }
                            } catch (e) {
                                sendToFlutter("capture_screen_query", {});
                            }
                        }}
                        style={{ color: C.lime }}
                        className="p-1 hover:text-white transition-colors flex-shrink-0"
                        title="화면 캡처 질의"
                    >
                        <MonitorPlay size={17} />
                    </button>
                    {/* OCR 텍스트 스캔 */}
                    <button
                        onClick={() => sendToFlutter("perform_ocr", {})}
                        style={{ color: C.coral }}
                        className="p-1 hover:text-white transition-colors flex-shrink-0"
                        title="텍스트 스캔 (OCR)"
                    >
                        <FileText size={17} />
                    </button>

                    {/* 중앙 텍스트 입력 */}
                    <input
                        value={input}
                        onChange={(e) => {
                            inputSourceRef.current = "text";
                            setInput(e.target.value);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        onPaste={handlePaste}
                        placeholder={micActive ? "Listening to your voice..." : "Ask E.V... (mic muted)"}
                        className="flex-1 bg-transparent outline-none px-2 text-center"
                        style={{
                            ...sans,
                            color: C.textBright,
                            fontSize: 13.5,
                        }}
                    />

                    {/* 마이크 토글 버튼 */}
                    <button
                        onClick={() => {
                            sendToFlutter(micActive ? "stop_voice_chat" : "start_voice_chat", {});
                        }}
                        style={{
                            color: micActive ? C.accent : C.slate,
                            filter: micActive ? `drop-shadow(0 0 8px ${C.accent})` : "none",
                        }}
                        className="p-1.5 transition-all flex-shrink-0"
                        title={micActive ? "마이크 끄기" : "음성 대화 시작"}
                    >
                        {micActive ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
                    </button>

                    {/* 전송 버튼 */}
                    <button
                        onClick={handleSend}
                        disabled={activelyStreaming}
                        style={{
                            color: activelyStreaming ? C.slate : C.cyanLight,
                            filter: !activelyStreaming ? `drop-shadow(0 0 6px ${C.cyan})` : "none",
                        }}
                        className="p-1.5 transition-all flex-shrink-0"
                        title="전송"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            <SidePanel
                open={menuOpen}
                onClose={onCloseMenu}
                onNavigate={onNavigate}
                historyOn={historyOn}
                onToggleHistory={onToggleHistory}
            />

            {/* 드래그 오버 업로드 오버레이 */}
            <AnimatePresence>
                {dragActive && (
                    <motion.div
                        className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                        style={{ background: "rgba(5,7,16,0.88)", border: `2px dashed ${C.cyan}` }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="flex flex-col items-center gap-3 hud-cut-corner p-6 hud-glass-panel">
                            <Paperclip size={32} color={C.cyan} />
                            <span style={{ ...orbitron, color: C.cyanLight, fontSize: 13, letterSpacing: 2 }}>
                                DROP FILE TO UPLOAD
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-1: API 키 및 모델 설정                                       */
/* ------------------------------------------------------------------ */
function ApiKeyScreen({ onBack }) {
    const { scale } = useResponsiveLayout();
    const [key, setKey] = useState(() => localStorage.getItem("LLM_KEY") || "");
    const [visionKey, setVisionKey] = useState(() => localStorage.getItem("VISION_KEY") || "");
    const [searchKey, setSearchKey] = useState(() => localStorage.getItem("EXA_KEY") || "");
    const [kmaKey, setKmaKey] = useState(() => localStorage.getItem("KMA_API_KEY") || "");
    const [endpoint, setEndpoint] = useState(() => localStorage.getItem("LLM_ENDPOINT") || "");
    const [visionEndpoint, setVisionEndpoint] = useState(() => localStorage.getItem("VISION_ENDPOINT") || "");
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
                if (payload.llmKey !== undefined) setKey(payload.llmKey);
                if (payload.visionKey !== undefined) setVisionKey(payload.visionKey);
                if (payload.exaKey !== undefined) setSearchKey(payload.exaKey);
                if (payload.kmaKey !== undefined) setKmaKey(payload.kmaKey);
                if (payload.llmEndpoint !== undefined) setEndpoint(payload.llmEndpoint);
                if (payload.visionEndpoint !== undefined) setVisionEndpoint(payload.visionEndpoint);
                if (payload.llmModel !== undefined) setModel(payload.llmModel);
                if (payload.visionModel !== undefined) setVisionModel(payload.visionModel);
            }
        };
        window.addEventListener("ev-native-event", handleSettingsSync);
        return () => window.removeEventListener("ev-native-event", handleSettingsSync);
    }, []);

    const handleSave = () => {
        localStorage.setItem("LLM_KEY", key);
        localStorage.setItem("VISION_KEY", visionKey);
        localStorage.setItem("EXA_KEY", searchKey);
        localStorage.setItem("KMA_API_KEY", kmaKey);
        localStorage.setItem("LLM_ENDPOINT", endpoint);
        localStorage.setItem("VISION_ENDPOINT", visionEndpoint);
        localStorage.setItem("LLM_MODEL", model);
        localStorage.setItem("LLM_VISION_MODEL", visionModel);
        localStorage.setItem("VISION_ENABLED", String(visionEnabled));
        localStorage.setItem("NAVER_CLIENT_ID", naverClientId);
        localStorage.setItem("NAVER_CLIENT_SECRET", naverClientSecret);
        localStorage.setItem("TAVILY_KEY", tavilyKey);
        localStorage.setItem("FIRECRAWL_KEY", firecrawlKey);
        localStorage.setItem("FOOTBALL_DATA_KEY", footballDataKey);
        sendToFlutter("save_api_key", {
            key, visionKey, searchKey, kmaKey, endpoint, visionEndpoint, model, visionModel,
            naverClientId, naverClientSecret, tavilyKey, firecrawlKey,
            visionEnabled, footballDataKey,
        });
        alert("시스템 설정이 저장되었습니다.");
    };

    const Section = ({ title, tone = C.cyan, children }) => (
        <div className="flex flex-col gap-3 p-4 mb-4 hud-cut-corner hud-glass-panel" style={{ borderColor: C.panelBorder }}>
            <span style={{ ...orbitron, color: tone, fontSize: 11 * scale, letterSpacing: 1 }}>[ {title} ]</span>
            {children}
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="API & MODEL MATRIX" />
            <div className="flex-1 px-4 py-5 flex flex-col">
                <Section title="MAIN TEXT MODEL (대화 & 분석)" tone={C.cyanLight}>
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>LLM API KEY</span>
                    <input
                        value={key} onChange={(e) => setKey(e.target.value)} placeholder="API Key (예: nvapi-...)"
                        type="password"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.cyanLight, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>ENDPOINT URL</span>
                    <input
                        value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://integrate.api.nvidia.com/v1/chat/completions"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.cyanLight, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>MAIN TEXT MODEL</span>
                    <input
                        value={model} onChange={(e) => setModel(e.target.value)} placeholder="meta/llama-3.3-70b-instruct"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.cyanLight, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </Section>

                <Section title="VISION AI MODEL (이미지 분석 & OCR)" tone={C.lime}>
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>VISION API KEY (미입력 시 기본 LLM KEY 사용)</span>
                    <input
                        value={visionKey} onChange={(e) => setVisionKey(e.target.value)} placeholder="Vision 전용 API Key (선택 사항)"
                        type="password"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>VISION ENDPOINT URL (미입력 시 기본 ENDPOINT 사용)</span>
                    <input
                        value={visionEndpoint} onChange={(e) => setVisionEndpoint(e.target.value)} placeholder="Vision 전용 URL (선택 사항: https://...)"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>VISION MODEL</span>
                    <input
                        value={visionModel} onChange={(e) => setVisionModel(e.target.value)} placeholder="meta/llama-3.2-11b-vision-instruct"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                        <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>AI VISION PIPELINE</span>
                        <button
                            type="button"
                            onClick={() => setVisionEnabled(!visionEnabled)}
                            className="px-3 py-1 hud-cut-corner-sm"
                            style={{
                                border: `1px solid ${visionEnabled ? C.lime : C.slate}`,
                                color: visionEnabled ? C.lime : C.slate,
                                ...mono,
                                fontSize: 10 * scale,
                            }}
                        >
                            {visionEnabled ? "ENABLED // ON" : "DISABLED // OFF"}
                        </button>
                    </div>
                </Section>

                <Section title="WEB SEARCH & CRAWLER" tone={C.cyan}>
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>NAVER CLIENT ID</span>
                    <input
                        value={naverClientId} onChange={(e) => setNaverClientId(e.target.value)} placeholder="Naver Client ID..."
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.cyanLight, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>NAVER CLIENT SECRET</span>
                    <input
                        type="password"
                        value={naverClientSecret} onChange={(e) => setNaverClientSecret(e.target.value)} placeholder="Naver Secret..."
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.cyanLight, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>TAVILY API KEY</span>
                    <input
                        type="password"
                        value={tavilyKey} onChange={(e) => setTavilyKey(e.target.value)} placeholder="tvly-..."
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.cyanLight, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>FIRECRAWL API KEY</span>
                    <input
                        type="password"
                        value={firecrawlKey} onChange={(e) => setFirecrawlKey(e.target.value)} placeholder="fc-..."
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>FOOTBALL-DATA.ORG TOKEN</span>
                    <input
                        type="password"
                        value={footballDataKey} onChange={(e) => setFootballDataKey(e.target.value)} placeholder="Token..."
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.coral, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </Section>

                <Section title="WEATHER SERVICE" tone={C.lime}>
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>KMA WEATHER API KEY</span>
                    <input
                        type="password"
                        value={kmaKey} onChange={(e) => setKmaKey(e.target.value)} placeholder="KMA API Key..."
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </Section>

                <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 mt-2 hud-cut-corner py-3 transition-all"
                    style={{
                        border: `1.5px solid ${C.cyan}`,
                        color: C.cyanLight,
                        ...orbitron,
                        fontSize: 11.5 * scale,
                        letterSpacing: 1.5,
                        boxShadow: `0 0 14px rgba(63,169,245,0.25)`,
                    }}
                >
                    <Save size={14 * scale} /> SAVE CONFIGURATION
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-1-B: 시간표 관리                                             */
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
            alert("JSON 형식이 올바르지 않습니다.");
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="TIMETABLE MATRIX" />
            <div className="flex-1 px-4 py-5 flex flex-col gap-3">
                <span style={{ ...mono, color: C.slate, fontSize: 11 * scale }}>
                    학원/학교 시간표 데이터를 JSON 배열로 관리합니다. AI가 실시간으로 일정을 인지합니다.
                </span>
                <textarea
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    className="w-full flex-1 bg-transparent outline-none resize-none hud-cut-corner-sm"
                    style={{
                        ...mono,
                        color: C.cyanLight,
                        fontSize: 11.5 * scale,
                        padding: `${12 * scale}px`,
                        border: `1px solid ${C.panelBorder}`,
                        background: "rgba(5,10,20,0.8)",
                        minHeight: "320px",
                    }}
                />
                <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 mt-2 hud-cut-corner py-3"
                    style={{
                        border: `1px solid ${C.lime}`,
                        color: C.lime,
                        ...orbitron,
                        fontSize: 11.5 * scale,
                        letterSpacing: 1.5,
                        boxShadow: `0 0 12px rgba(0,245,160,0.25)`,
                    }}
                >
                    <Save size={14 * scale} /> SAVE TIMETABLE (schedule.json)
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-1-C: 스포츠 알림 설정                                        */
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
            <StatusBar showBack onBack={onBack} title="SPORTS TELEMETRY" />
            <div className="flex-1 px-4 py-5 flex flex-col gap-4">
                <div className="flex flex-col gap-3 p-4 hud-cut-corner hud-glass-panel">
                    <span style={{ ...orbitron, color: C.cyanLight, fontSize: 11 * scale }}>⚽ FOOTBALL (Football-Data.org)</span>
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>응원팀 (쉼표 구분: 토트넘, 아스널, 레알)</span>
                    <input
                        value={footballTeams}
                        onChange={(e) => setFootballTeams(e.target.value)}
                        placeholder="토트넘, 아스널"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.cyanLight, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>API Token</span>
                    <input
                        value={footballDataKey}
                        onChange={(e) => setFootballDataKey(e.target.value)}
                        placeholder="API Token..."
                        type="password"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.cyanLight, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                </div>

                <div className="flex flex-col gap-3 p-4 hud-cut-corner hud-glass-panel">
                    <span style={{ ...orbitron, color: C.lime, fontSize: 11 * scale }}>⚾ BASEBALL (KBO · 네이버 스포츠)</span>
                    <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>응원팀 (쉼표 구분: KIA, 한화, 삼성)</span>
                    <input
                        value={baseballTeams}
                        onChange={(e) => setBaseballTeams(e.target.value)}
                        placeholder="KIA, 한화"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <span style={{ ...mono, color: C.slate, fontSize: 9.5 * scale }}>네이버 스포츠 오픈 게이트웨이 연동</span>
                </div>

                <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 hud-cut-corner py-3"
                    style={{
                        border: `1.5px solid ${C.accent}`,
                        color: C.accent,
                        ...orbitron,
                        fontSize: 11.5 * scale,
                        letterSpacing: 1.5,
                        boxShadow: `0 0 12px rgba(255,59,78,0.3)`,
                    }}
                >
                    <Save size={14 * scale} /> SAVE SPORTS CONFIG
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-1-D: 개인정보 마스킹 설정                                    */
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
            <StatusBar showBack onBack={onBack} title="PRIVACY SHIELD" />
            <div className="flex-1 px-4 py-5 flex flex-col gap-3">
                <span style={{ ...mono, color: C.slate, fontSize: 10.5 * scale }}>
                    AI에게 질의가 전송되기 전에 원본 텍스트를 마스킹 규칙에 맞춰 자동 치환합니다.
                </span>

                {rules.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3.5 py-2.5 hud-cut-corner-sm hud-glass-panel">
                        <span style={{ ...mono, color: C.accent, fontSize: 11.5 * scale, flex: 1 }}>{r.original}</span>
                        <span style={{ ...mono, color: C.slate, fontSize: 10 * scale }}>→</span>
                        <span style={{ ...mono, color: C.lime, fontSize: 11.5 * scale, flex: 1 }}>{r.replacement}</span>
                        <button onClick={() => removeRule(i)} style={{ color: C.danger, flexShrink: 0 }} className="p-1 hover:text-red-400">
                            ✕
                        </button>
                    </div>
                ))}

                <div className="flex flex-col gap-2.5 p-4 hud-cut-corner hud-glass-panel mt-2">
                    <span style={{ ...orbitron, color: C.cyanLight, fontSize: 10.5 * scale }}>ADD NEW PRIVACY RULE</span>
                    <input
                        value={newOriginal}
                        onChange={(e) => setNewOriginal(e.target.value)}
                        placeholder="원본 문자열 (예: 김진우)"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.accent, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <input
                        value={newReplacement}
                        onChange={(e) => setNewReplacement(e.target.value)}
                        placeholder="대체 문자열 (예: [사용자])"
                        className="w-full bg-transparent outline-none hud-cut-corner-sm"
                        style={{ ...mono, color: C.lime, fontSize: 12 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                    />
                    <button
                        onClick={addRule}
                        className="flex items-center justify-center gap-1 py-2.5 hud-cut-corner-sm"
                        style={{ border: `1px solid ${C.lime}`, color: C.lime, ...orbitron, fontSize: 11 * scale }}
                    >
                        + ADD RULE
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-1-E: 경로 설정                                               */
/* ------------------------------------------------------------------ */
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
            <StatusBar showBack onBack={onBack} title="STORAGE PATHS" />
            <div className="flex-1 px-4 py-5 flex flex-col gap-4">
                <div className="flex flex-col gap-3 p-4 hud-cut-corner hud-glass-panel">
                    <span style={{ ...orbitron, color: C.lime, fontSize: 11 * scale }}>1. OBSIDIAN VAULT ROOT</span>
                    <div className="flex w-full gap-2">
                        <input
                            value={obsidianVaultPath}
                            onChange={(e) => setObsidianVaultPath(e.target.value)}
                            className="flex-1 bg-transparent outline-none hud-cut-corner-sm"
                            style={{ ...mono, color: C.lime, fontSize: 11.5 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                        />
                        <button
                            onClick={() => sendToFlutter("pick_directory", { target: "obsidian_vault" })}
                            className="px-3 hud-cut-corner-sm flex items-center justify-center"
                            style={{ border: `1px solid ${C.lime}`, color: C.lime }}
                        >
                            <FolderOpen size={16 * scale} />
                        </button>
                    </div>

                    <span style={{ ...orbitron, color: C.cyanLight, fontSize: 11 * scale, marginTop: 6 }}>2. OBSIDIAN INBOX PATH</span>
                    <div className="flex w-full gap-2">
                        <input
                            value={obsidianInboxPath}
                            onChange={(e) => setObsidianInboxPath(e.target.value)}
                            className="flex-1 bg-transparent outline-none hud-cut-corner-sm"
                            style={{ ...mono, color: C.cyanLight, fontSize: 11.5 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                        />
                        <button
                            onClick={() => sendToFlutter("pick_directory", { target: "obsidian_inbox" })}
                            className="px-3 hud-cut-corner-sm flex items-center justify-center"
                            style={{ border: `1px solid ${C.cyanLight}`, color: C.cyanLight }}
                        >
                            <FolderOpen size={16 * scale} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 p-4 hud-cut-corner hud-glass-panel">
                    <span style={{ ...orbitron, color: C.coral, fontSize: 11 * scale }}>PLAYLIST DIRECTORY</span>
                    <div className="flex w-full gap-2">
                        <input
                            value={playlistPath}
                            onChange={(e) => setPlaylistPath(e.target.value)}
                            className="flex-1 bg-transparent outline-none hud-cut-corner-sm"
                            style={{ ...mono, color: C.coral, fontSize: 11.5 * scale, padding: `${8 * scale}px`, border: `1px solid ${C.panelBorder}` }}
                        />
                        <button
                            onClick={() => sendToFlutter("pick_directory", { target: "playlist" })}
                            className="px-3 hud-cut-corner-sm flex items-center justify-center"
                            style={{ border: `1px solid ${C.coral}`, color: C.coral }}
                        >
                            <FolderOpen size={16 * scale} />
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 hud-cut-corner py-3"
                    style={{
                        border: `1.5px solid ${C.cyan}`,
                        color: C.cyanLight,
                        ...orbitron,
                        fontSize: 11.5 * scale,
                        letterSpacing: 1.5,
                        boxShadow: `0 0 12px rgba(63,169,245,0.25)`,
                    }}
                >
                    <Save size={14 * scale} /> SAVE PATHS
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-1-F: 오늘의 할 일 (Todo)                                     */
/* ------------------------------------------------------------------ */
function TodoScreen({ onBack, items, content }) {
    const { scale } = useResponsiveLayout();
    const [viewMode, setViewMode] = useState("list");
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
    const completedCount = todoList.filter((t) => t.completed).length;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const handleAdd = () => {
        const trimmed = newTodoText.trim();
        if (!trimmed) return;
        sendToFlutter("add_todo", { text: trimmed });
        setNewTodoText("");
    };

    const handleToggle = (index) => sendToFlutter("toggle_todo", { index });
    const handleDelete = (index) => sendToFlutter("delete_todo", { index });
    const handleSaveRaw = () => {
        sendToFlutter("save_todo_raw", { content: rawContent });
        alert("todo.md 파일이 저장되었습니다.");
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <StatusBar showBack onBack={onBack} title="TASK MATRIX" />

            <div className="px-4 pt-3 pb-3 flex flex-col gap-2.5 border-b hud-glass-panel" style={{ borderColor: C.panelBorder }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ListTodo size={16 * scale} color={C.cyan} />
                        <span style={{ ...orbitron, color: C.textBright, fontSize: 12 * scale }}>
                            TASKS: {completedCount} / {totalCount}
                        </span>
                    </div>
                    <span style={{ ...orbitron, color: progressPct === 100 ? C.lime : C.cyanLight, fontSize: 13 * scale, fontWeight: 700 }}>
                        {progressPct}%
                    </span>
                </div>

                <HoloProgressBar progress={progressPct} tone={progressPct === 100 ? C.lime : C.cyan} />

                <div className="flex gap-2 pt-1">
                    <button
                        onClick={() => setViewMode("list")}
                        className="flex-1 py-1.5 hud-cut-corner-sm text-center transition-all"
                        style={{
                            ...orbitron,
                            fontSize: 10 * scale,
                            border: `1px solid ${viewMode === "list" ? C.cyan : C.panelBorder}`,
                            background: viewMode === "list" ? "rgba(63,169,245,0.18)" : "transparent",
                            color: viewMode === "list" ? C.cyanLight : C.slate,
                        }}
                    >
                        CHECKLIST
                    </button>
                    <button
                        onClick={() => setViewMode("raw")}
                        className="flex-1 py-1.5 hud-cut-corner-sm text-center transition-all"
                        style={{
                            ...orbitron,
                            fontSize: 10 * scale,
                            border: `1px solid ${viewMode === "raw" ? C.lime : C.panelBorder}`,
                            background: viewMode === "raw" ? "rgba(0,245,160,0.18)" : "transparent",
                            color: viewMode === "raw" ? C.lime : C.slate,
                        }}
                    >
                        MARKDOWN
                    </button>
                </div>
            </div>

            {viewMode === "list" ? (
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 p-2 hud-cut-corner-sm hud-glass-panel" style={{ borderColor: C.cyan }}>
                        <input
                            type="text"
                            value={newTodoText}
                            onChange={(e) => setNewTodoText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            placeholder="새로운 할 일 등록..."
                            className="flex-1 bg-transparent outline-none px-2"
                            style={{ ...sans, color: C.textBright, fontSize: 13 * scale }}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newTodoText.trim()}
                            className="p-1.5 hud-cut-corner-sm"
                            style={{
                                background: newTodoText.trim() ? C.cyan : "rgba(255,255,255,0.05)",
                                color: newTodoText.trim() ? "#050710" : C.slate,
                            }}
                        >
                            <Plus size={16 * scale} />
                        </button>
                    </div>

                    {todoList.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-16 gap-2">
                            <CheckSquare size={32 * scale} color={C.slate} opacity={0.4} />
                            <span style={{ ...sans, color: C.slate, fontSize: 13 * scale }}>등록된 할 일이 없습니다.</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {todoList.map((item, idx) => (
                                <motion.div
                                    key={item.id || idx}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between p-3 hud-cut-corner-sm hud-glass-panel"
                                    style={{
                                        borderColor: item.completed ? "rgba(0,245,160,0.35)" : C.panelBorder,
                                    }}
                                >
                                    <button
                                        onClick={() => handleToggle(idx)}
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                    >
                                        <div
                                            className="flex items-center justify-center rounded-sm flex-shrink-0"
                                            style={{
                                                width: 18 * scale,
                                                height: 18 * scale,
                                                border: `1.5px solid ${item.completed ? C.lime : C.slate}`,
                                                background: item.completed ? C.lime : "transparent",
                                            }}
                                        >
                                            {item.completed && <Check size={12 * scale} color="#050710" strokeWidth={3} />}
                                        </div>
                                        <span
                                            className="truncate"
                                            style={{
                                                ...sans,
                                                fontSize: 13.5 * scale,
                                                color: item.completed ? C.slate : C.textBright,
                                                textDecoration: item.completed ? "line-through" : "none",
                                            }}
                                        >
                                            {item.text}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(idx)}
                                        className="p-1.5 text-slate-500 hover:text-red-400"
                                    >
                                        <Trash2 size={14 * scale} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
                    <textarea
                        value={rawContent}
                        onChange={(e) => setRawContent(e.target.value)}
                        className="flex-1 bg-transparent outline-none resize-none p-3 hud-cut-corner-sm"
                        style={{
                            ...mono,
                            color: C.cyanLight,
                            fontSize: 12 * scale,
                            lineHeight: 1.7,
                            border: `1px solid ${C.panelBorder}`,
                            background: "rgba(5,10,20,0.8)",
                        }}
                    />
                    <button
                        onClick={handleSaveRaw}
                        className="flex items-center justify-center gap-2 py-3 hud-cut-corner"
                        style={{ border: `1px solid ${C.lime}`, color: C.lime, ...orbitron, fontSize: 11.5 * scale }}
                    >
                        <Save size={14 * scale} /> SAVE RAW (todo.md)
                    </button>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-2: memories.md 열람 및 수정                                  */
/* ------------------------------------------------------------------ */
function MemoriesScreen({ onBack, content }) {
    const [text, setText] = useState(content || "");

    useEffect(() => {
        if (content) setText(content);
    }, [content]);

    return (
        <div className="flex flex-col h-full">
            <StatusBar showBack onBack={onBack} title="NEURAL MEMORY" />
            <div className="flex-1 px-4 py-4 flex flex-col gap-3">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 bg-transparent outline-none resize-none p-3 hud-cut-corner-sm"
                    style={{ ...mono, color: C.cyanLight, fontSize: 12.5, lineHeight: 1.7, border: `1px solid ${C.panelBorder}`, background: "rgba(5,10,20,0.8)" }}
                />
                <button
                    onClick={() => sendToFlutter("write_memories_file", { content: text })}
                    className="flex items-center justify-center gap-2 py-3 hud-cut-corner"
                    style={{ border: `1px solid ${C.cyan}`, color: C.cyanLight, ...orbitron, fontSize: 11.5 }}
                >
                    <Save size={14} /> SAVE TO OBSIDIAN (memories.md)
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면: 이전 대화 아카이브                                             */
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
            <StatusBar showBack onBack={onBack} title="SESSION ARCHIVES" />
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {archives === null && (
                    <div className="flex items-center justify-center h-full">
                        <span style={{ ...orbitron, color: C.slate, fontSize: 11 * (scale || 1) }}>LOADING ARCHIVES...</span>
                    </div>
                )}
                {archives !== null && archives.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <span style={{ ...orbitron, color: C.slate, fontSize: 11 * (scale || 1) }}>NO ARCHIVED SESSIONS</span>
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
                                    className="flex flex-col p-3.5 cursor-pointer hud-cut-corner-sm hud-glass-panel transition-all"
                                    style={{
                                        borderColor: C.panelBorder,
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
                                                        className="w-full bg-transparent outline-none px-2 py-1 hud-cut-corner-sm"
                                                        style={{
                                                            ...sans,
                                                            color: C.cyanLight,
                                                            fontSize: 13 * (scale || 1),
                                                            border: `1px solid ${C.cyan}`,
                                                        }}
                                                    />
                                                    <button
                                                        onClick={(e) => handleSaveRename(e, a)}
                                                        className="p-1 rounded"
                                                        style={{ color: C.lime, border: `1px solid ${C.lime}` }}
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelRename}
                                                        className="p-1 rounded"
                                                        style={{ color: C.slate, border: `1px solid ${C.panelBorder}` }}
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
                                                            color: C.textBright,
                                                            fontSize: 13.5 * (scale || 1),
                                                        }}
                                                    >
                                                        {a.title || "새로운 대화"}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <History size={12} color={C.cyan} />
                                                        <span style={{ ...mono, color: C.slate, fontSize: 10 * (scale || 1) }}>
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
                                                    className="p-1.5 rounded hover:bg-white/5 text-slate-400"
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
/* 화면 2-3: 캘린더 매트릭스                                           */
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

    const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="TACTICAL CALENDAR" />

            <div className="flex-1 px-4 py-4 flex flex-col gap-4">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-2 py-1">
                    <button
                        onClick={() => setViewDate(new Date(year, month - 1, 1))}
                        className="p-1 text-cyan-400 hover:text-white"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span style={{ ...orbitron, color: C.textBright, fontSize: 14, letterSpacing: 1.5, fontWeight: 700 }}>
                        {year}.{pad(month + 1)}
                    </span>
                    <button
                        onClick={() => setViewDate(new Date(year, month + 1, 1))}
                        className="p-1 text-cyan-400 hover:text-white"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-1 text-center">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((w, i) => (
                        <span key={w} style={{ ...orbitron, color: i === 0 ? C.accent : C.slate, fontSize: 9.5 }}>
                            {w}
                        </span>
                    ))}
                </div>

                {/* 달력 그리드 */}
                <div className="grid grid-cols-7 gap-1">
                    {cells.map((d, i) => {
                        if (d === null) return <div key={`empty-${i}`} className="h-10" />;
                        const dateStr = dateStrFor(d);
                        const isToday = dateStr === todayStr;
                        const isSelected = dateStr === selectedDate;
                        const hasEvents = (eventsByDate[dateStr]?.length || 0) > 0;

                        return (
                            <button
                                key={dateStr}
                                onClick={() => setSelectedDate(dateStr)}
                                className="h-10 flex flex-col items-center justify-center relative hud-cut-corner-sm transition-all"
                                style={{
                                    border: `1px solid ${isSelected ? C.cyan : isToday ? C.accent : "rgba(255,255,255,0.06)"}`,
                                    background: isSelected ? "rgba(63,169,245,0.2)" : isToday ? "rgba(255,59,78,0.15)" : "rgba(8,16,32,0.4)",
                                    boxShadow: isSelected ? `0 0 10px ${C.cyan}66` : "none",
                                }}
                            >
                                <span style={{ ...mono, color: isToday ? C.accent : C.textBright, fontSize: 12 }}>{d}</span>
                                {hasEvents && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute bottom-1" style={{ boxShadow: `0 0 4px ${C.cyan}` }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 선택한 날짜 일정 */}
                {selectedDate && (
                    <div className="flex flex-col gap-2 p-4 hud-cut-corner hud-glass-panel mt-2">
                        <span style={{ ...orbitron, color: C.cyanLight, fontSize: 11, letterSpacing: 1 }}>
                            [ {selectedDate} EVENTS ]
                        </span>
                        {selectedEvents.length === 0 ? (
                            <span style={{ ...sans, color: C.slate, fontSize: 12 }}>등록된 일정이 없습니다.</span>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {selectedEvents.map((ev, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        <span style={{ ...sans, color: C.textBright, fontSize: 13 }}>{ev}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}


/* ------------------------------------------------------------------ */
/* D-Day 계산 유틸리티                                                 */
/* ------------------------------------------------------------------ */
function calculateDDay(targetDateStr) {
    if (!targetDateStr) return { diff: 0, text: "D-DAY", isPast: false, isToday: true };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = targetDateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { diff: 0, text: "D-DAY", isPast: false, isToday: true };
    if (diffDays > 0) return { diff: diffDays, text: `D-${diffDays}`, isPast: false, isToday: false };
    return { diff: diffDays, text: `D+${Math.abs(diffDays)}`, isPast: true, isToday: false };
}

/* ------------------------------------------------------------------ */
/* 화면 2-4: 오답 노트 (빌런 도감)                                     */
/* ------------------------------------------------------------------ */
function WrongNotesScreen({ onBack, notes, onAddNote, processing }) {
    const { scale } = useResponsiveLayout();
    const [activeSubject, setActiveSubject] = useState("전체");
    const [expandedNoteId, setExpandedNoteId] = useState(null);
    const [spenCanvasNoteId, setSpenCanvasNoteId] = useState(null);

    const activeNotes = notes.filter((n) => n.status !== "prison");
    const prisonNotes = notes.filter((n) => n.status === "prison");
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
        <div className="flex flex-col h-full relative">
            <StatusBar showBack onBack={onBack} title="VILLAIN ENCYCLOPEDIA" />

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span style={{ ...orbitron, color: C.cyanLight, fontSize: 10.5, letterSpacing: 1 }}>
                        {isPrisonTab ? `IMPRISONED: ${filteredNotes.length}` : `BOUNTY TARGETS: ${filteredNotes.length}`}
                    </span>
                    {!isPrisonTab && (
                        <button
                            onClick={onAddNote}
                            disabled={processing}
                            className="flex items-center gap-1.5 px-3 py-1.5 hud-cut-corner-sm"
                            style={{
                                border: `1px solid ${C.accent}`,
                                background: "rgba(255,59,78,0.15)",
                                color: C.accent,
                                ...orbitron,
                                fontSize: 10,
                                letterSpacing: 1,
                            }}
                        >
                            <Paperclip size={12} /> + REGISTER TARGET
                        </button>
                    )}
                </div>

                {/* 과목 탭 */}
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {subjects.map((sub) => {
                        const isActive = activeSubject === sub;
                        return (
                            <button
                                key={sub}
                                onClick={() => {
                                    setActiveSubject(sub);
                                    setExpandedNoteId(null);
                                }}
                                className="px-3 py-1.5 flex-shrink-0 hud-cut-corner-sm transition-all"
                                style={{
                                    border: `1px solid ${isActive ? C.cyan : C.panelBorder}`,
                                    background: isActive ? "rgba(63,169,245,0.18)" : "transparent",
                                    color: isActive ? C.cyanLight : C.slate,
                                    ...rajdhani,
                                    fontSize: 13,
                                    fontWeight: 600,
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
                        <BookOpen size={24} color={C.slate} opacity={0.4} />
                        <span style={{ ...sans, color: C.slate, fontSize: 12 }}>등록된 오답 노트가 없습니다.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredNotes.map((note) => {
                            const isExpanded = expandedNoteId === note.id;
                            return (
                                <div
                                    key={note.id}
                                    className="flex flex-col hud-cut-corner hud-glass-panel transition-all"
                                    style={{
                                        borderColor: isExpanded ? C.accent : C.panelBorder,
                                    }}
                                >
                                    <button
                                        onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                                        className="w-full text-left p-4 flex flex-col gap-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className="px-2 py-0.5 hud-cut-corner-sm"
                                                style={{ border: `1px solid ${C.lime}`, color: C.lime, ...mono, fontSize: 9.5 }}
                                            >
                                                {note.subject || "미분류"}
                                            </span>
                                            <span style={{ ...mono, color: C.slate, fontSize: 9.5 }}>
                                                {note.created_at ? note.created_at.substring(0, 10) : ""}
                                            </span>
                                        </div>
                                        <div
                                            style={{ ...sans, color: C.textBright, fontSize: 13, lineHeight: 1.5 }}
                                            className={isExpanded ? "" : "line-clamp-2"}
                                        >
                                            {note.problem}
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t overflow-hidden"
                                                style={{ borderColor: C.panelBorder }}
                                            >
                                                <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(5,10,20,0.7)" }}>
                                                    <div className="flex flex-col gap-2">
                                                        <span style={{ ...orbitron, color: C.lime, fontSize: 9.5, letterSpacing: 1 }}>
                                                            [ CLASSIFIED INTEL // SOLUTION ]
                                                        </span>
                                                        <div
                                                            style={{
                                                                ...sans,
                                                                color: C.text,
                                                                fontSize: 13,
                                                                lineHeight: 1.6,
                                                                whiteSpace: "pre-wrap",
                                                                background: "rgba(255,255,255,0.03)",
                                                                padding: 12,
                                                                border: `1px solid ${C.panelBorder}`,
                                                            }}
                                                            className="hud-cut-corner-sm"
                                                        >
                                                            {note.solution}
                                                        </div>
                                                    </div>

                                                    {/* S-Pen 풀이 캔버스 토글 */}
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={() => setSpenCanvasNoteId(spenCanvasNoteId === note.id ? null : note.id)}
                                                            className="w-full py-2 flex items-center justify-center gap-2 hud-cut-corner-sm font-bold"
                                                            style={{
                                                                border: `1px solid ${spenCanvasNoteId === note.id ? C.cyanLight : C.cyan}`,
                                                                background: spenCanvasNoteId === note.id ? "rgba(63,169,245,0.2)" : "rgba(63,169,245,0.08)",
                                                                color: C.cyanLight,
                                                                ...orbitron,
                                                                fontSize: 11,
                                                                letterSpacing: 1,
                                                            }}
                                                        >
                                                            <PenTool size={14} /> {spenCanvasNoteId === note.id ? "▲ S-PEN 풀이 캔버스 닫기" : "✏️ S-PEN 인터랙티브 풀이장 열기"}
                                                        </button>
                                                        {spenCanvasNoteId === note.id && (
                                                            <div className="mt-1">
                                                                <SPenCanvas initialHeight={280} problemText={note.problem} onClose={() => setSpenCanvasNoteId(null)} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!isPrisonTab ? (
                                                        <button
                                                            onClick={() => handleArrest(note.id)}
                                                            className="w-full py-3 flex items-center justify-center gap-2 hud-cut-corner font-bold"
                                                            style={{
                                                                background: C.accent,
                                                                color: "#fff",
                                                                ...orbitron,
                                                                fontSize: 12,
                                                                letterSpacing: 1.5,
                                                                boxShadow: `0 0 16px rgba(255,59,78,0.4)`,
                                                            }}
                                                        >
                                                            <Crosshair size={16} /> TARGET ELIMINATED (수감)
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRehabilitate(note.id)}
                                                            className="w-full py-3 flex items-center justify-center gap-2 hud-cut-corner font-bold"
                                                            style={{
                                                                background: C.lime,
                                                                color: "#050710",
                                                                ...orbitron,
                                                                fontSize: 12,
                                                                letterSpacing: 1.5,
                                                            }}
                                                        >
                                                            <BookOpen size={16} /> REHABILITATE (완전 삭제)
                                                        </button>
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

            {processing && (
                <div
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
                    style={{ background: "rgba(5,7,16,0.92)" }}
                >
                    <WebNodeLoader size={80 * scale} tone={C.accent} />
                    <div className="flex flex-col items-center gap-1">
                        <span style={{ ...orbitron, color: C.accent, fontSize: 12, letterSpacing: 2 }}>
                            ANALYZING INTEL OCR
                        </span>
                        <span style={{ ...sans, color: C.slate, fontSize: 12 }}>문제 및 풀이를 복원 중...</span>
                    </div>
                </div>
            )}
        </div>
    );
}


/* ------------------------------------------------------------------ */
/* S펜 인터랙티브 풀이 캔버스 (SPenCanvas)                               */
/* ------------------------------------------------------------------ */
function SPenCanvas({ initialHeight = 320, onClose, problemText }) {
    const canvasRef = useRef(null);
    const [tool, setTool] = useState("pen"); // 'pen' | 'eraser'
    const [color, setColor] = useState("#3FA9F5"); // Cyan
    const [strokeWidth, setStrokeWidth] = useState(3.5); // 2 | 3.5 | 6 (No pressure variation for crisp handwriting)
    const [eraserWidth, setEraserWidth] = useState(24);
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState([]);
    const [redoList, setRedoList] = useState([]);
    const isStylusButtonHeldRef = useRef(false);
    const pointsRef = useRef([]);

    // Canvas init
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }, []);

    const saveState = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => [...prev.slice(-15), imgData]);
        setRedoList([]);
    };

    const handleUndo = () => {
        if (history.length <= 1) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const lastState = history[history.length - 1];
        const prevState = history[history.length - 2];
        setRedoList((prev) => [...prev, lastState]);
        setHistory((prev) => prev.slice(0, -1));
        ctx.putImageData(prevState, 0, 0);
    };

    const handleRedo = () => {
        if (redoList.length === 0) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const nextState = redoList[redoList.length - 1];
        setRedoList((prev) => prev.slice(0, -1));
        setHistory((prev) => [...prev, nextState]);
        ctx.putImageData(nextState, 0, 0);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveState();
    };

    const getCanvasPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const onPointerDown = (e) => {
        if (e.target.setPointerCapture) {
            try { e.target.setPointerCapture(e.pointerId); } catch(err){}
        }

        // S-Pen Barrel button detection: (e.buttons & 32) != 0 or button === 2 / 5
        const isBarrel = (e.buttons & 32) !== 0 || e.button === 5 || (e.pointerType === "pen" && (e.button === 2 || e.buttons === 2));
        isStylusButtonHeldRef.current = isBarrel;

        setIsDrawing(true);
        const pos = getCanvasPos(e);
        pointsRef.current = [pos];

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const currentMode = isBarrel ? "eraser" : tool;

        ctx.beginPath();
        if (currentMode === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineWidth = eraserWidth;
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth; // Fixed crisp line width (no pressure variation)
        }
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const drawSegments = (events) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        for (const ev of events) {
            const pos = getCanvasPos(ev);
            const isBarrel = (ev.buttons & 32) !== 0 || ev.button === 5 || (ev.pointerType === "pen" && (ev.button === 2 || ev.buttons === 2));
            const currentMode = isBarrel ? "eraser" : tool;

            if (currentMode === "eraser") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.lineWidth = eraserWidth;
            } else {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = color;
                ctx.lineWidth = strokeWidth;
            }

            pointsRef.current.push(pos);
            const pts = pointsRef.current;

            if (pts.length >= 3) {
                const xc = (pts[pts.length - 2].x + pts[pts.length - 1].x) / 2;
                const yc = (pts[pts.length - 2].y + pts[pts.length - 1].y) / 2;
                ctx.beginPath();
                ctx.moveTo(pts[pts.length - 3].x, pts[pts.length - 3].y);
                ctx.quadraticCurveTo(pts[pts.length - 2].x, pts[pts.length - 2].y, xc, yc);
                ctx.stroke();
            } else if (pts.length === 2) {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                ctx.lineTo(pts[1].x, pts[1].y);
                ctx.stroke();
            }
        }
    };

    const onPointerMove = (e) => {
        if (!isDrawing) return;
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        drawSegments(events);
    };

    const onPointerUp = (e) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        pointsRef.current = [];
        saveState();
        if (e.target.releasePointerCapture) {
            try { e.target.releasePointerCapture(e.pointerId); } catch(err){}
        }
    };

    return (
        <div className="flex flex-col w-full hud-glass-panel hud-cut-corner p-3 border" style={{ borderColor: C.panelBorder, background: "rgba(5, 7, 16, 0.92)" }}>
            <div className="flex items-center justify-between pb-2 border-b mb-2" style={{ borderColor: C.panelBorder }}>
                <div className="flex items-center gap-1.5">
                    <PenTool size={13} color={C.cyanLight} />
                    <span style={{ ...orbitron, color: C.cyanLight, fontSize: 10.5, letterSpacing: 1 }}>
                        [ S-PEN SCRATCHPAD ]
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[8.5px]" style={{ ...mono, background: "rgba(63,169,245,0.15)", color: C.cyan }}>
                        S펜 버튼: 지우개 자동 전환
                    </span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
                        <X size={16} />
                    </button>
                )}
            </div>

            {problemText && (
                <div className="mb-2 p-2 hud-cut-corner-sm text-xs text-slate-300 max-h-20 overflow-y-auto" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.panelBorder}` }}>
                    <span style={{ ...orbitron, color: C.accent, fontSize: 9 }}>PROBLEM: </span>{problemText}
                </div>
            )}

            <div className="relative w-full rounded overflow-hidden" style={{ height: initialHeight, background: "#050811", border: `1px solid ${C.panelBorder}`, touchAction: "none" }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair"
                    style={{ touchAction: "none" }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onPointerLeave={onPointerUp}
                />
            </div>

            <div className="flex items-center justify-between mt-2.5 pt-2 border-t gap-2 flex-wrap" style={{ borderColor: C.panelBorder }}>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setTool("pen")}
                        className="px-2.5 py-1 flex items-center gap-1 hud-cut-corner-sm transition-all"
                        style={{
                            border: `1px solid ${tool === "pen" ? color : C.panelBorder}`,
                            background: tool === "pen" ? `${color}22` : "transparent",
                            color: tool === "pen" ? color : C.slate,
                            ...rajdhani,
                            fontWeight: 700,
                            fontSize: 12,
                        }}
                    >
                        <PenTool size={12} /> 펜
                    </button>
                    <button
                        onClick={() => setTool("eraser")}
                        className="px-2.5 py-1 flex items-center gap-1 hud-cut-corner-sm transition-all"
                        style={{
                            border: `1px solid ${tool === "eraser" ? C.accent : C.panelBorder}`,
                            background: tool === "eraser" ? "rgba(255,59,78,0.2)" : "transparent",
                            color: tool === "eraser" ? C.accent : C.slate,
                            ...rajdhani,
                            fontWeight: 700,
                            fontSize: 12,
                        }}
                    >
                        <Eraser size={12} /> 지우개
                    </button>
                </div>

                {tool === "pen" && (
                    <div className="flex items-center gap-1.5">
                        {["#3FA9F5", "#00F5A0", "#FF3B4E", "#FFA24C", "#FFFFFF"].map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className="w-4 h-4 rounded-full transition-transform"
                                style={{
                                    background: c,
                                    boxShadow: color === c ? `0 0 8px ${c}` : "none",
                                    transform: color === c ? "scale(1.25)" : "scale(1)",
                                    border: color === c ? "1.5px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                                }}
                            />
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-1">
                    {[
                        { label: "얇게", w: 2 },
                        { label: "보통", w: 3.5 },
                        { label: "굵게", w: 6 },
                    ].map((item) => (
                        <button
                            key={item.label}
                            onClick={() => (tool === "eraser" ? setEraserWidth(item.w * 6) : setStrokeWidth(item.w))}
                            className="px-2 py-0.5 text-[10px] hud-cut-corner-sm"
                            style={{
                                border: `1px solid ${(tool === "pen" ? strokeWidth === item.w : eraserWidth === item.w * 6) ? C.cyan : C.panelBorder}`,
                                color: (tool === "pen" ? strokeWidth === item.w : eraserWidth === item.w * 6) ? C.cyanLight : C.slate,
                                ...mono,
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 ml-auto">
                    <button
                        onClick={handleUndo}
                        disabled={history.length <= 1}
                        className="p-1.5 hud-cut-corner-sm text-slate-400 hover:text-white disabled:opacity-30"
                        title="실행 취소"
                    >
                        <RotateCcw size={13} />
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-2 py-1 text-[11px] hud-cut-corner-sm text-red-400 hover:bg-red-500/10"
                        style={{ border: `1px solid ${C.panelBorderRed}`, ...mono }}
                    >
                        지우기
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 독립 S펜 풀이 화면 (SPenScreen)                                    */
/* ------------------------------------------------------------------ */
function SPenScreen({ onBack }) {
    const { screenH } = useResponsiveLayout();
    return (
        <div className="flex flex-col h-full relative">
            <StatusBar showBack onBack={onBack} title="TACTICAL S-PEN CANVAS" />
            <div className="flex-1 p-3 flex flex-col">
                <SPenCanvas initialHeight={Math.max(screenH - 220, 360)} />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-6: NEIS 전국 학교 급식 (MealScreen)                          */
/* ------------------------------------------------------------------ */
function MealScreen({ onBack, schoolInfo }) {
    const [savedSchool, setSavedSchool] = useState(schoolInfo);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [dateOffset, setDateOffset] = useState(0); // 0 = today, 1 = tomorrow, -1 = yesterday
    const [mealData, setMealData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("전체"); // '전체' | '조식' | '중식' | '석식'

    const targetDateStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + dateOffset);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}${m}${day}`;
    }, [dateOffset]);

    const formattedDateTitle = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + dateOffset);
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        const dayName = days[d.getDay()];
        const tag = dateOffset === 0 ? "오늘" : dateOffset === 1 ? "내일" : dateOffset === -1 ? "어제" : "";
        return `${m}월 ${day}일 (${dayName}) ${tag}`;
    }, [dateOffset]);

    // Flutter 이벤트 리스너
    useEffect(() => {
        const handleSync = (e) => {
            const payload = e.detail;
            if (payload?.type === "school_search_result") {
                setSearchResults(payload.schools || []);
                setIsSearching(false);
            } else if (payload?.type === "school_info_sync") {
                if (payload.schoolCode) {
                    setSavedSchool(payload);
                    setShowSearchModal(false);
                }
            } else if (payload?.type === "school_meal_result") {
                setMealData(payload);
                setLoading(false);
            }
        };
        window.addEventListener("ev-native-event", handleSync);
        sendToFlutter("get_school_info", {});
        return () => window.removeEventListener("ev-native-event", handleSync);
    }, []);

    // 날짜나 학교 변경 시 급식 로드
    useEffect(() => {
        if (savedSchool?.schoolCode) {
            setLoading(true);
            sendToFlutter("get_school_meal", { date: targetDateStr });
        }
    }, [savedSchool, targetDateStr]);

    const handleSearch = () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        sendToFlutter("search_school", { query: searchQuery.trim() });
    };

    const handleSelectSchool = (sch) => {
        sendToFlutter("save_school_info", {
            schoolName: sch.schoolName,
            officeCode: sch.officeCode,
            schoolCode: sch.schoolCode,
        });
        setSavedSchool(sch);
        setShowSearchModal(false);
    };

    const filteredMeals = useMemo(() => {
        if (!mealData?.meals) return [];
        if (activeTab === "전체") return mealData.meals;
        return mealData.meals.filter((m) => m.typeName === activeTab);
    }, [mealData, activeTab]);

    return (
        <div className="flex flex-col h-full relative">
            <StatusBar showBack onBack={onBack} title="NEIS SCHOOL MEAL" />

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                {/* 상단 학교 정보 배너 */}
                <div className="flex items-center justify-between p-3.5 hud-cut-corner hud-glass-panel" style={{ borderColor: C.panelBorder }}>
                    <div className="flex items-center gap-2.5">
                        <Utensils size={18} color={C.lime} />
                        <div className="flex flex-col">
                            <span style={{ ...orbitron, color: C.lime, fontSize: 9.5, letterSpacing: 1 }}>REGISTERED SCHOOL</span>
                            <span style={{ ...rajdhani, color: C.textBright, fontSize: 16, fontWeight: 700 }}>
                                {savedSchool?.schoolName || "학교 등록 필요"}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="px-3 py-1.5 hud-cut-corner-sm flex items-center gap-1"
                        style={{ border: `1px solid ${C.cyan}`, color: C.cyanLight, ...mono, fontSize: 11 }}
                    >
                        <Search size={11} /> {savedSchool ? "학교 변경" : "학교 검색"}
                    </button>
                </div>

                {/* 날짜 선택 네비게이터 */}
                <div className="flex items-center justify-between p-2 hud-cut-corner-sm hud-glass-panel" style={{ borderColor: C.panelBorder }}>
                    <button
                        onClick={() => setDateOffset((prev) => prev - 1)}
                        className="p-1.5 text-slate-400 hover:text-white"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <CalendarDays size={14} color={C.cyan} />
                        <span style={{ ...rajdhani, color: C.textBright, fontSize: 15, fontWeight: 600 }}>
                            {formattedDateTitle}
                        </span>
                        {dateOffset !== 0 && (
                            <button
                                onClick={() => setDateOffset(0)}
                                className="px-2 py-0.5 text-[10px] hud-cut-corner-sm"
                                style={{ border: `1px solid ${C.lime}`, color: C.lime, ...mono }}
                            >
                                오늘
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setDateOffset((prev) => prev + 1)}
                        className="p-1.5 text-slate-400 hover:text-white"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* 조식 / 중식 / 석식 탭 */}
                <div className="flex gap-2">
                    {["전체", "조식", "중식", "석식"].map((tab) => {
                        const active = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className="flex-1 py-1.5 hud-cut-corner-sm transition-all"
                                style={{
                                    border: `1px solid ${active ? C.lime : C.panelBorder}`,
                                    background: active ? "rgba(0,245,160,0.15)" : "transparent",
                                    color: active ? C.lime : C.slate,
                                    ...rajdhani,
                                    fontWeight: 700,
                                    fontSize: 13,
                                }}
                            >
                                {tab}
                            </button>
                        );
                    })}
                </div>

                {/* 급식 식단 리스트 */}
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                        <WebNodeLoader size={60} tone={C.lime} />
                        <span style={{ ...orbitron, color: C.lime, fontSize: 11, letterSpacing: 1.5 }}>
                            FETCHING NEIS INTEL...
                        </span>
                    </div>
                ) : !savedSchool ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <Building2 size={36} color={C.slate} opacity={0.5} />
                        <span style={{ ...sans, color: C.slate, fontSize: 13 }}>
                            등록된 학교가 없습니다.<br />위의 [학교 검색] 버튼을 눌러 학교를 설정해 주세요.
                        </span>
                    </div>
                ) : filteredMeals.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 gap-2 text-center">
                        <Utensils size={32} color={C.slate} opacity={0.4} />
                        <span style={{ ...sans, color: C.slate, fontSize: 13 }}>
                            {mealData?.message || "해당 일자에는 등록된 급식 식단이 없습니다."}
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredMeals.map((meal, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col hud-cut-corner hud-glass-panel p-4"
                                style={{ borderColor: C.panelBorder, boxShadow: `0 0 16px rgba(0,245,160,0.08)` }}
                            >
                                <div className="flex items-center justify-between pb-2 border-b mb-3" style={{ borderColor: C.panelBorder }}>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 hud-cut-corner-sm" style={{ background: "rgba(0,245,160,0.18)", color: C.lime, ...orbitron, fontSize: 10, fontWeight: 700 }}>
                                            {meal.typeName}
                                        </span>
                                        <span style={{ ...rajdhani, color: C.textBright, fontSize: 14, fontWeight: 600 }}>
                                            {savedSchool.schoolName}
                                        </span>
                                    </div>
                                    {meal.calories && (
                                        <span style={{ ...mono, color: C.amber, fontSize: 11 }}>
                                            🔥 {meal.calories}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5 pl-1">
                                    {(meal.dishes || []).map((dish, dIdx) => (
                                        <div key={dIdx} className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0]" />
                                            <span style={{ ...sans, color: C.textBright, fontSize: 13.5 }}>
                                                {dish}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 학교 검색 모달 */}
            <AnimatePresence>
                {showSearchModal && (
                    <motion.div
                        className="absolute inset-0 z-50 flex flex-col p-4"
                        style={{ background: "rgba(5, 7, 16, 0.96)", backdropFilter: "blur(12px)" }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: C.panelBorder }}>
                            <span style={{ ...orbitron, color: C.cyanLight, fontSize: 12, letterSpacing: 1.5 }}>
                                [ NEIS 학교 검색 & 등록 ]
                            </span>
                            <button onClick={() => setShowSearchModal(false)} className="p-1 text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                placeholder="학교 이름 입력 (예: 서울고, 경기고, 대원외고)"
                                className="flex-1 bg-transparent px-3 py-2 hud-cut-corner-sm outline-none"
                                style={{ border: `1px solid ${C.panelBorder}`, color: C.cyanLight, ...sans, fontSize: 13 }}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="px-4 py-2 hud-cut-corner-sm flex items-center gap-1 font-bold"
                                style={{ background: C.cyan, color: "#050710", ...orbitron, fontSize: 11 }}
                            >
                                <Search size={14} /> 검색
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto mt-4 flex flex-col gap-2">
                            {isSearching ? (
                                <div className="flex-1 flex items-center justify-center py-10">
                                    <WebNodeLoader size={50} tone={C.cyan} />
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="py-10 text-center text-slate-500 text-xs">
                                    검색된 학교가 없습니다. 학교명을 입력하고 검색해 주세요.
                                </div>
                            ) : (
                                searchResults.map((sch, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectSchool(sch)}
                                        className="w-full text-left p-3 hud-cut-corner-sm hud-glass-panel hover:border-cyan-400 transition-all flex flex-col gap-1"
                                        style={{ borderColor: C.panelBorder }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span style={{ ...rajdhani, color: C.textBright, fontSize: 15, fontWeight: 700 }}>
                                                {sch.schoolName}
                                            </span>
                                            <span className="px-1.5 py-0.5 text-[9px] rounded" style={{ ...mono, background: "rgba(63,169,245,0.15)", color: C.cyan }}>
                                                {sch.schoolType || "학교"}
                                            </span>
                                        </div>
                                        <span style={{ ...sans, color: C.slate, fontSize: 11 }}>
                                            {sch.address}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-7: D-Day HUD 카운트다운 허브 (DDayScreen)                     */
/* ------------------------------------------------------------------ */
function DDayScreen({ onBack, ddays = [], onSaveDdays }) {
    const [items, setItems] = useState(ddays);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDate, setNewDate] = useState("");
    const [newColor, setNewColor] = useState("#FF3B4E");
    const [newPinned, setNewPinned] = useState(false);

    useEffect(() => {
        setItems(ddays);
    }, [ddays]);

    const handleAdd = () => {
        if (!newTitle.trim() || !newDate) {
            alert("일정 제목과 날짜를 입력해 주세요.");
            return;
        }
        const newItem = {
            id: `dday_${Date.now()}`,
            title: newTitle.trim(),
            targetDate: newDate,
            color: newColor,
            pinned: newPinned,
        };
        const updated = [...items, newItem];
        setItems(updated);
        onSaveDdays?.(updated);
        setNewTitle("");
        setNewDate("");
        setNewPinned(false);
        setShowAddModal(false);
    };

    const handleDelete = (id) => {
        const updated = items.filter((d) => d.id !== id);
        setItems(updated);
        onSaveDdays?.(updated);
    };

    const handleTogglePin = (id) => {
        const updated = items.map((d) => (d.id === id ? { ...d, pinned: !d.pinned } : d));
        setItems(updated);
        onSaveDdays?.(updated);
    };

    // D-Day 정렬: Pinned 우선 -> 임박한 순
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            const diffA = calculateDDay(a.targetDate).diff;
            const diffB = calculateDDay(b.targetDate).diff;
            return diffA - diffB;
        });
    }, [items]);

    return (
        <div className="flex flex-col h-full relative">
            <StatusBar showBack onBack={onBack} title="D-DAY TACTICAL HUB" />

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span style={{ ...orbitron, color: C.accent, fontSize: 10.5, letterSpacing: 1.5 }}>
                        [ ACTIVE COUNTDOWNS: {sortedItems.length} ]
                    </span>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 hud-cut-corner-sm"
                        style={{
                            border: `1px solid ${C.accent}`,
                            background: "rgba(255,59,78,0.18)",
                            color: C.accent,
                            ...orbitron,
                            fontSize: 10.5,
                            letterSpacing: 1,
                        }}
                    >
                        <Plus size={13} /> + ADD D-DAY
                    </button>
                </div>

                {sortedItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-center">
                        <Hourglass size={36} color={C.slate} opacity={0.4} />
                        <span style={{ ...sans, color: C.slate, fontSize: 13 }}>
                            등록된 D-Day 일정이 없습니다.<br />+ ADD D-DAY 버튼을 눌러 중요한 시험/일정을 등록하세요.
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {sortedItems.map((item) => {
                            const dInfo = calculateDDay(item.targetDate);
                            const tone = item.color || C.accent;
                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-4 hud-cut-corner hud-glass-panel relative overflow-hidden"
                                    style={{
                                        borderColor: item.pinned ? tone : C.panelBorder,
                                        boxShadow: item.pinned ? `0 0 16px ${tone}44, inset 0 0 8px ${tone}18` : "none",
                                    }}
                                >
                                    {/* Pinned Marker */}
                                    {item.pinned && (
                                        <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
                                            <div
                                                className="absolute transform rotate-45 text-[8px] font-bold text-center text-black py-0.5 w-12 top-1.5 -right-3"
                                                style={{ background: tone, ...orbitron }}
                                            >
                                                PIN
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                        {/* Spider-Web Reticle Badge */}
                                        <div
                                            className="w-14 h-14 rounded-full flex flex-col items-center justify-center flex-shrink-0 relative overflow-hidden"
                                            style={{
                                                border: `1.8px solid ${tone}`,
                                                background: "rgba(5,10,20,0.85)",
                                                boxShadow: `0 0 14px ${tone}55, inset 0 0 8px ${tone}22`,
                                            }}
                                        >
                                            {/* Spider Web Spoke Lines */}
                                            <div className="absolute inset-0 pointer-events-none opacity-25">
                                                <svg viewBox="0 0 56 56" className="w-full h-full">
                                                    <line x1="28" y1="0" x2="28" y2="56" stroke={tone} strokeWidth="0.8" strokeDasharray="2,2" />
                                                    <line x1="0" y1="28" x2="56" y2="28" stroke={tone} strokeWidth="0.8" strokeDasharray="2,2" />
                                                    <circle cx="28" cy="28" r="18" fill="none" stroke={tone} strokeWidth="0.6" opacity="0.6" />
                                                </svg>
                                            </div>
                                            <span style={{ ...orbitron, color: tone, fontSize: 13, fontWeight: 900, lineHeight: 1, zIndex: 2 }}>
                                                {dInfo.text}
                                            </span>
                                        </div>

                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="truncate" style={{ ...rajdhani, color: C.textBright, fontSize: 16, fontWeight: 700 }}>
                                                {item.title}
                                            </span>
                                            <span style={{ ...mono, color: C.slate, fontSize: 11 }}>
                                                목표일: {item.targetDate}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleTogglePin(item.id)}
                                            className="p-1.5 hud-cut-corner-sm transition-all"
                                            style={{
                                                border: `1px solid ${item.pinned ? tone : C.panelBorder}`,
                                                color: item.pinned ? tone : C.slate,
                                                fontSize: 10,
                                            }}
                                            title="상단 고정 (HUD 상시 표시)"
                                        >
                                            <Target size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                            title="삭제"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* D-Day 추가 모달 */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        className="absolute inset-0 z-50 flex flex-col p-4"
                        style={{ background: "rgba(5, 7, 16, 0.96)", backdropFilter: "blur(12px)" }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: C.panelBorder }}>
                            <span style={{ ...orbitron, color: C.accent, fontSize: 12, letterSpacing: 1.5 }}>
                                [ D-DAY TARGET REGISTRATION ]
                            </span>
                            <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 mt-5">
                            <div className="flex flex-col gap-1.5">
                                <span style={{ ...mono, color: C.slate, fontSize: 10.5 }}>일정 / 시험 제목</span>
                                <input
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="예: 2027 수능, 2학기 중간고사, 전국모의고사"
                                    className="bg-transparent px-3 py-2 hud-cut-corner-sm outline-none"
                                    style={{ border: `1px solid ${C.panelBorder}`, color: C.textBright, ...sans, fontSize: 13 }}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <span style={{ ...mono, color: C.slate, fontSize: 10.5 }}>목표 날짜 (YYYY-MM-DD)</span>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="bg-transparent px-3 py-2 hud-cut-corner-sm outline-none"
                                    style={{ border: `1px solid ${C.panelBorder}`, color: C.cyanLight, ...mono, fontSize: 13 }}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <span style={{ ...mono, color: C.slate, fontSize: 10.5 }}>네온 테마 컬러</span>
                                <div className="flex items-center gap-2">
                                    {["#FF3B4E", "#3FA9F5", "#00F5A0", "#FFA24C", "#C084FC"].map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewColor(c)}
                                            className="w-7 h-7 rounded-full transition-transform"
                                            style={{
                                                background: c,
                                                boxShadow: newColor === c ? `0 0 10px ${c}` : "none",
                                                transform: newColor === c ? "scale(1.2)" : "scale(1)",
                                                border: newColor === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 hud-cut-corner-sm" style={{ border: `1px solid ${C.panelBorder}`, background: "rgba(255,255,255,0.02)" }}>
                                <span style={{ ...sans, color: C.textBright, fontSize: 12.5 }}>메인 HUD 상단 고정 (PIN)</span>
                                <button
                                    type="button"
                                    onClick={() => setNewPinned(!newPinned)}
                                    className="px-3 py-1 hud-cut-corner-sm"
                                    style={{
                                        border: `1px solid ${newPinned ? C.accent : C.slate}`,
                                        color: newPinned ? C.accent : C.slate,
                                        ...mono,
                                        fontSize: 11,
                                    }}
                                >
                                    {newPinned ? "PINNED // ON" : "OFF"}
                                </button>
                            </div>

                            <button
                                onClick={handleAdd}
                                className="w-full py-3 mt-4 hud-cut-corner font-bold flex items-center justify-center gap-2"
                                style={{
                                    background: C.accent,
                                    color: "#fff",
                                    ...orbitron,
                                    fontSize: 12,
                                    letterSpacing: 1.5,
                                    boxShadow: `0 0 16px rgba(255,59,78,0.4)`,
                                }}
                            >
                                <Check size={16} /> REGISTER D-DAY TARGET
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
                setHeadline(payload.headline?.replace(/\[|\]/g, "").trim() || "NO NEWS TODAY");
            }
        };
        window.addEventListener("ev-native-event", handleSync);
        sendToFlutter("generate_daily_bugle", {});
        return () => window.removeEventListener("ev-native-event", handleSync);
    }, []);

    const dummyBody = `DAILY BUGLE EXCLUSIVE REPORT: The city awakens under the neon canopy of cyber surveillance. E.V. intelligence monitors all sector anomalies while citizens engage in neural synchronization. Investigations continue into unexplained web-node activity across downtown districts.`;

    return (
        <div className="flex flex-col h-full relative" style={{ background: "#F5F5F0" }}>
            <StatusBar showBack onBack={onBack} title="DAILY BUGLE" darkText />

            <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 items-center">
                <div className="flex flex-col items-center border-b-4 border-black pb-3 w-full">
                    <span style={{ fontFamily: "serif", fontWeight: 900, fontSize: 32, letterSpacing: -1, color: "#111" }}>
                        THE DAILY BUGLE
                    </span>
                    <div className="flex justify-between w-full mt-1 px-1 border-t border-b border-black py-0.5">
                        <span style={{ fontFamily: "serif", fontSize: 10, color: "#333", fontWeight: 600 }}>VOL. 1</span>
                        <span style={{ fontFamily: "serif", fontSize: 10, color: "#333", fontWeight: 600 }}>
                            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).toUpperCase()}
                        </span>
                        <span style={{ fontFamily: "serif", fontSize: 10, color: "#333", fontWeight: 600 }}>PRICE: FREE</span>
                    </div>
                </div>

                <div className="flex flex-col w-full px-2">
                    <h1 style={{ fontFamily: "serif", fontWeight: 900, fontSize: 26, lineHeight: 1.15, color: "#000", textAlign: "center", textTransform: "uppercase" }}>
                        {headline}
                    </h1>
                </div>

                <div className="w-full text-justify px-2 relative">
                    <p
                        style={{
                            fontFamily: "serif",
                            fontSize: 13,
                            lineHeight: 1.7,
                            color: "#222",
                            filter: isRead ? "none" : "blur(4px)",
                            transition: "filter 0.5s ease",
                        }}
                    >
                        <span style={{ float: "left", fontSize: 36, lineHeight: 0.8, paddingTop: 4, paddingRight: 4, fontWeight: "bold" }}>
                            {dummyBody.charAt(0)}
                        </span>
                        {dummyBody.substring(1)}
                    </p>

                    {!isRead && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <button
                                onClick={() => setIsRead(true)}
                                className="px-5 py-2.5 font-bold shadow-lg"
                                style={{ background: C.accent, color: "#fff", ...sans, fontSize: 12, border: "2px solid #000" }}
                            >
                                READ FULL DISPATCH
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-full border-t border-black mt-auto pt-2 text-center">
                    <span style={{ fontFamily: "serif", fontSize: 10, color: "#666" }}>Report synchronized by E.V. Cyber Intel</span>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 화면 2-6: 페이스 계산기 (PaceCalculatorScreen)                      */
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
        return `${m}m ${s}s / item`;
    };

    const currentPace = completedQuestions > 0 ? elapsedSec / completedQuestions : 0;
    const requiredPace = remainQuestions > 0 ? remainingSec / remainQuestions : 0;

    let statusMsg = "IN PROGRESS";
    let statusColor = C.cyan;
    if (remainQuestions === 0) {
        statusMsg = "TARGET ACCOMPLISHED!";
        statusColor = C.lime;
    } else if (completedQuestions > 0) {
        if (currentPace <= requiredPace) {
            statusMsg = "ON TRACK // STABLE PACE";
            statusColor = C.lime;
        } else {
            statusMsg = "ACCELERATION REQUIRED";
            statusColor = C.accent;
        }
    }

    const formatTimeForInput = (d) => {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
    };

    const handleTargetTimeChange = (e) => {
        const [h, m] = e.target.value.split(":");
        if (h && m) {
            const newD = new Date(targetEndTime);
            newD.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
            setTargetEndTime(newD);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <StatusBar showBack onBack={onBack} title="CHRONO PACE" />
            <div className="flex flex-col px-4 py-5 gap-4">
                <div className="flex flex-col gap-3 p-4 hud-cut-corner hud-glass-panel">
                    <div className="flex justify-between items-center">
                        <span style={{ ...orbitron, color: C.cyanLight, fontSize: 11 }}>TARGET DEADLINE</span>
                        <input
                            type="time"
                            value={formatTimeForInput(targetEndTime)}
                            onChange={handleTargetTimeChange}
                            className="bg-transparent hud-cut-corner-sm px-2 py-1"
                            style={{ color: C.cyanLight, border: `1px solid ${C.panelBorder}`, ...mono }}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <span style={{ ...orbitron, color: C.cyanLight, fontSize: 11 }}>TOTAL QUESTIONS</span>
                        <input
                            type="number"
                            value={totalQuestions}
                            onChange={(e) => setTotalQuestions(Number(e.target.value))}
                            className="bg-transparent hud-cut-corner-sm px-2 py-1 w-16 text-right"
                            style={{ color: C.cyanLight, border: `1px solid ${C.panelBorder}`, ...mono }}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <span style={{ ...orbitron, color: C.cyanLight, fontSize: 11 }}>PROGRESS</span>
                        <span style={{ ...mono, color: C.textBright, fontSize: 13 }}>
                            {completedQuestions} / {totalQuestions}
                        </span>
                    </div>
                </div>

                <div
                    className="flex flex-col items-center gap-3 p-6 hud-cut-corner hud-glass-panel"
                    style={{
                        borderColor: statusColor,
                        boxShadow: `0 0 16px ${statusColor}33`,
                    }}
                >
                    <span style={{ ...orbitron, color: statusColor, fontSize: 12, letterSpacing: 1.5, fontWeight: 700 }}>
                        {statusMsg}
                    </span>
                    <div className="flex flex-col items-center gap-1">
                        <span style={{ ...orbitron, color: C.slate, fontSize: 10 }}>CURRENT AVERAGE PACE</span>
                        <span style={{ ...mono, color: C.textBright, fontSize: 18 }}>{formatPace(currentPace)}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span style={{ ...orbitron, color: C.slate, fontSize: 10 }}>REQUIRED PACE</span>
                        <span style={{ ...mono, color: C.cyanLight, fontSize: 18 }}>{formatPace(requiredPace)}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 mt-2">
                        <span style={{ ...sans, color: C.slate, fontSize: 11 }}>
                            남은 시간: {Math.floor(remainingSec / 3600)}시간 {Math.floor((remainingSec % 3600) / 60)}분
                        </span>
                        <span style={{ ...sans, color: C.slate, fontSize: 11 }}>남은 문항: {remainQuestions}개</span>
                    </div>
                </div>

                <div className="flex gap-3 justify-center mt-2">
                    <button
                        onClick={() => setCompletedQuestions((prev) => prev + 1)}
                        className="px-6 py-3 hud-cut-corner-sm"
                        style={{ border: `1.5px solid ${C.cyan}`, color: C.cyanLight, background: "rgba(63,169,245,0.15)", ...orbitron, fontSize: 14 }}
                    >
                        +1
                    </button>
                    <button
                        onClick={() => setCompletedQuestions((prev) => prev + 2)}
                        className="px-6 py-3 hud-cut-corner-sm"
                        style={{ border: `1.5px solid ${C.lime}`, color: C.lime, background: "rgba(0,245,160,0.15)", ...orbitron, fontSize: 14 }}
                    >
                        +2
                    </button>
                    <button
                        onClick={() => setCompletedQuestions((prev) => Math.max(0, prev - 1))}
                        className="px-4 py-3 hud-cut-corner-sm"
                        style={{ border: `1px solid ${C.panelBorder}`, color: C.slate, ...orbitron, fontSize: 12 }}
                    >
                        -1
                    </button>
                </div>

                <div className="flex justify-center mt-1">
                    <button
                        onClick={() => {
                            if (window.confirm("시작 시간을 현재 시간으로 리셋하고 완료 수를 0으로 초기화하시겠습니까?")) {
                                setStartTime(new Date());
                                setCompletedQuestions(0);
                            }
                        }}
                        style={{ color: C.accent, fontSize: 11, textDecoration: "underline", ...mono }}
                    >
                        [ RESET SESSION ]
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 루트 앱 (EVApp)                                                     */
/* ------------------------------------------------------------------ */
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
    const [textInjectEvent, setTextInjectEvent] = useState(null);
    const [llmResultEvent, setLlmResultEvent] = useState(null);
    const [conversationHistoryEvent, setConversationHistoryEvent] = useState(null);
    const [memoriesContent, setMemoriesContent] = useState("");
    const [todoContent, setTodoContent] = useState("");
    const [todoItems, setTodoItems] = useState([]);
    const [archivesList, setArchivesList] = useState(null);
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
                clearInterval(check);
            }
            attempts++;
        }, 100);
        return () => clearInterval(check);
    }, []);

    const goto = (key) => {
        if (key === "newchat") {
            setMenuOpen(false);
            setNewChatSignal((n) => n + 1);
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

    const triggerAlert = (type) => {
        let color = C.cyan;
        if (type === "error") color = C.accent;
        else if (type === "notification") color = "rgba(63, 169, 245, 0.9)";
        setAlertPulse({ type, color, key: Date.now() });
        setTimeout(() => setAlertPulse(null), 1000);
    };

    const triggerToast = (config) => {
        const key = Date.now();
        setToast({ key, ...config });
        setTimeout(() => {
            setToast((cur) => (cur?.key === key ? null : cur));
        }, 2600);
    };

    const handleNotificationOpen = (id) => {
        sendToFlutter("open_notification", { id });
    };

    useEffect(() => {
        const handleNativeEvent = (payload) => {
            if (!payload || !payload.type) return;
            switch (payload.type) {
                case "notification":
                    triggerToast({
                        id: payload.id,
                        eyebrow: "PUSH NOTIFICATION",
                        message: payload.body || payload.title || "새 알림이 도착했습니다",
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
                            artUrl: prev.artUrl,
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
                        artUrl: payload.artUrl || prev.artUrl,
                    }));
                    setMusicOn(true);
                    setMusicCollapsed(false);
                    break;
                case "wifi_change":
                    triggerToast({ eyebrow: "WI-FI", message: `${payload.name} 연결됨`, icon: Wifi, color: C.cyan });
                    break;
                case "calendar_sync":
                case "calendar_sync_init":
                    if (payload.calendarMd) setCalendarMd(payload.calendarMd);
                    else if (payload.events) setCalendarMd(eventsToCalendarMd(payload.events));
                    break;
                case "todo_sync":
                case "todo_sync_init":
                    if (payload.items) setTodoItems(payload.items);
                    if (payload.content !== undefined) setTodoContent(payload.content);
                    break;
                case "memories_sync":
                case "memories_sync_init":
                    if (payload.content !== undefined) setMemoriesContent(payload.content);
                    break;
                case "archives_sync":
                case "archives_list":
                    setArchivesList(payload.archives || []);
                    break;
                case "wrong_notes_sync":
                    if (payload.notes) setWrongNotes(payload.notes);
                    break;
                case "wrong_note_added":
                    setWrongOcrProcessing(false);
                    if (payload.notes) setWrongNotes(payload.notes);
                    triggerAlert("done");
                    break;
                case "wrong_ocr_error":
                    setWrongOcrProcessing(false);
                    triggerAlert("error");
                    alert(`오답 분석 실패: ${payload.message || "알 수 없는 오류"}`);
                    break;
                case "shared_ocr_result":
                    setSharedOcrData({
                        subject: payload.subject || "미분류",
                        problem: payload.problem || "",
                        solution: payload.solution || "",
                    });
                    break;
                case "ocr_result":
                    if (payload.success === false || payload.error) {
                        triggerToast({ eyebrow: "OCR SCAN", message: payload.error || "텍스트 인식 실패", icon: FileText, color: C.coral });
                    } else if (payload.text) {
                        setTextInjectEvent({ text: payload.text, source: "ocr" });
                        triggerToast({ eyebrow: "OCR SCAN", message: "텍스트 인식 완료", icon: FileText, color: C.lime });
                        triggerAlert("done");
                    }
                    break;
                case "wrong_ocr_result":
                    setWrongOcrProcessing(false);
                    if (payload.success === false || payload.error) {
                        triggerAlert("error");
                        if (payload.error && payload.error !== "취소되었습니다.") {
                            alert(`오답 분석 실패: ${payload.error}`);
                        }
                    } else {
                        if (payload.notes) setWrongNotes(payload.notes);
                        triggerAlert("done");
                    }
                    break;
                case "bluetooth_connected":
                    triggerToast({ eyebrow: "BLUETOOTH", message: `${payload.name || "디바이스"} 연결됨`, icon: Bluetooth, color: C.cyanLight });
                    break;
                case "save_shared_result":
                    if (payload.success) {
                        triggerToast({
                            eyebrow: payload.type === "obsidian" ? "OBSIDIAN" : "VILLAIN LOG",
                            message: "성공적으로 저장되었습니다.",
                            icon: payload.type === "obsidian" ? FolderOpen : Pencil,
                            color: C.lime,
                        });
                        setSharedOcrData(null);
                        triggerAlert("done");
                    } else {
                        alert(`저장 실패: ${payload.error || "알 수 없는 오류"}`);
                        triggerAlert("error");
                    }
                    break;
                case "search_status":
                    setSearchEngineStatus(payload.engine || null);
                    break;
                case "spen_text":
                case "stt_text":
                case "text_inject":
                    setTextInjectEvent({ text: payload.text, source: payload.source || "voice" });
                    break;
                case "llm_result":
                    setLlmResultEvent({ id: payload.id, text: payload.text || payload.result });
                    break;
                case "conversation_history":
                case "conversation_sync_init":
                    setConversationHistoryEvent({ history: payload.history || [] });
                    break;
                case "file_picked":
                    if (payload.name && payload.base64) {
                        setAttachedFile({ name: payload.name, base64: payload.base64 });
                    }
                    break;
                case "voice_input":
                    setMicActive(payload.state === "start");
                    break;
                case "voice_state":
                    setMicActive(payload.active === true || payload.active === "true");
                    break;
                default:
                    break;
            }
        };

        window.EV_receiveNativeEvent = handleNativeEvent;
        const domListener = (e) => handleNativeEvent(e.detail);
        window.addEventListener("ev-native-event", domListener);
        return () => {
            window.removeEventListener("ev-native-event", domListener);
            if (window.EV_receiveNativeEvent === handleNativeEvent) {
                window.EV_receiveNativeEvent = undefined;
            }
        };
    }, []);

    usePushNotificationHotkey(() => {
        triggerToast({
            eyebrow: "NOTIF TEST",
            message: "신경망 동기화 테스트 알림",
            icon: BellRing,
            color: C.accent,
        });
        triggerAlert("notification");
    });

    useWifiHotkey(() => {
        triggerToast({ eyebrow: "WI-FI", message: "EV_CYBER_5G CONNECTED", icon: Wifi, color: C.cyan });
    });

    useBluetoothHotkey(() => {
        triggerToast({ eyebrow: "BLUETOOTH", message: "GALAXY BUDS PRO CONNECTED", icon: Bluetooth, color: C.cyanLight });
    });

    useVoiceInputHotkey(() => {
        sendToFlutter(micActive ? "stop_voice_chat" : "start_voice_chat", {});
    });

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
                            pinnedDday={pinnedDday}
                            onDdayClick={() => goto("dday")}

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
                    {screen === "spen" && <SPenScreen onBack={() => goto("main")} />}
                    {screen === "meal" && <MealScreen onBack={() => goto("main")} schoolInfo={schoolInfo} />}
                    {screen === "dday" && (
                        <DDayScreen
                            onBack={() => goto("main")}
                            ddays={ddays}
                            onSaveDdays={(list) => sendToFlutter("save_ddays", { ddays: list })}
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
                    {screen === "bugle" && <DailyBugleScreen onBack={() => goto("main")} />}
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

                    {/* S펜 캡처 공유 분석 다이얼로그 */}
                    <AnimatePresence>
                        {sharedOcrData && (
                            <motion.div
                                className="absolute inset-0 z-50 flex items-center justify-center p-6"
                                style={{ background: "rgba(5,7,16,0.85)", backdropFilter: "blur(8px)" }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="w-full max-w-[360px] flex flex-col p-5 hud-cut-corner hud-glass-panel"
                                    style={{ border: `1.5px solid ${C.cyan}` }}
                                    initial={{ scale: 0.95, y: 10 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.95, y: 10 }}
                                >
                                    <span style={{ ...orbitron, color: C.cyanLight, fontSize: 12, letterSpacing: 1, marginBottom: 12 }}>
                                        SPEN CAPTURE INTEL ({sharedOcrData.subject})
                                    </span>

                                    <div className="flex-1 overflow-y-auto mb-5 max-h-[220px]" style={{ ...sans, color: C.text, fontSize: 13, lineHeight: 1.6 }}>
                                        <div style={{ ...orbitron, color: C.slate, fontSize: 9.5, marginBottom: 4 }}>[ RECOGNIZED PROBLEM ]</div>
                                        <div className="mb-4">{sharedOcrData.problem}</div>

                                        <div style={{ ...orbitron, color: C.lime, fontSize: 9.5, marginBottom: 4 }}>[ AI SOLUTION ]</div>
                                        <div>{sharedOcrData.solution}</div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => sendToFlutter("save_shared_to_obsidian", {
                                                title: `S펜_캡처_${Date.now()}`,
                                                content: `---\ntags: [spen-capture]\ndate: ${new Date().toISOString().split('T')[0]}\n---\n\n### 문제\n${sharedOcrData.problem}\n\n### 풀이\n${sharedOcrData.solution}`,
                                            })}
                                            className="w-full py-2.5 hud-cut-corner-sm"
                                            style={{ border: `1px solid ${C.lime}`, color: C.lime, ...orbitron, fontSize: 11 }}
                                        >
                                            📁 SAVE TO OBSIDIAN
                                        </button>
                                        <button
                                            onClick={() => sendToFlutter("save_shared_to_wrong", {
                                                subject: sharedOcrData.subject,
                                                problem: sharedOcrData.problem,
                                                solution: sharedOcrData.solution,
                                            })}
                                            className="w-full py-2.5 hud-cut-corner-sm"
                                            style={{ border: `1px solid ${C.accent}`, color: C.accent, ...orbitron, fontSize: 11 }}
                                        >
                                            ✏️ REGISTER TO VILLAIN LOG
                                        </button>
                                        <button
                                            onClick={() => setSharedOcrData(null)}
                                            className="w-full py-2"
                                            style={{ color: C.slate, ...orbitron, fontSize: 10.5 }}
                                        >
                                            CANCEL
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

ReactDOM.createRoot(document.getElementById("root")).render(<EVApp />);
