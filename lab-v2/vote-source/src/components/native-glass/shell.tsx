import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { initTheme } from "@/lib/theme";
import { createLiquidGlass } from "../../../vendor/liquid-glass-v17/liquid-glass.js";
import { pointerLight } from "../../../vendor/liquid-glass-v17/pointer-light.js";
import { labNavigation } from "../../../vendor/liquid-glass-v17/pulse-motion.js";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const nav = [
  { to: "/vote", label: "一起投票", icon: "◉" },
  { to: "/draw", label: "遇见好运", icon: "✳" },
  { to: "/polls", label: "活动记录", icon: "↗" },
] as const;
export function NativeShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUserState();
  const [palette, setPalette] = useState("aurora");
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const cycle = useRef<() => void>(() => {});
  const materials = useRef(new Map<HTMLElement, ReturnType<typeof createLiquidGlass>>());
  const navigation = useRef<ReturnType<typeof labNavigation> | null>(null);
  const mode = path.startsWith("/draw") ? 1 : path === "/polls" ? 2 : 0;
  const creating = path === "/new" || path === "/draw/new";
  useEffect(() => {
    const t = initTheme();
    cycle.current = t.cycle;
    return t.dispose;
  }, []);
  useLayoutEffect(() => {
    const abort = new AbortController();
    const elements = [...root.current!.querySelectorAll<HTMLElement>("[data-native-glass]")];
    const map = materials.current;
    for (const el of elements)
      map.set(
        el,
        createLiquidGlass(el, {
          radius: Number(el.dataset.nativeGlass),
          strength: el.classList.contains("nav-indicator") ? 22 : 40,
        }),
      );
    const light = pointerLight({
      elements,
      canAnimate: () => !reduced() && root.current?.dataset.paused !== "true",
      signal: abort.signal,
    });
    navigation.current = labNavigation({
      rail: rail.current!,
      canAnimate: () => !reduced() && root.current?.dataset.paused !== "true",
    });
    return () => {
      abort.abort();
      light.destroy();
      navigation.current?.destroy();
      for (const value of map.values()) value.destroy();
      map.clear();
    };
  }, []);
  useLayoutEffect(() => {
    navigation.current?.select(mode);
  }, [mode]);
  useEffect(() => {
    let height = body.current!.getBoundingClientRect().height,
      animation: Animation | null = null;
    const observer = new ResizeObserver(() => {
      const next = body.current!.getBoundingClientRect().height;
      if (Math.abs(next - height) < 1) return;
      const from = content.current!.getBoundingClientRect().height;
      animation?.cancel();
      if (!reduced())
        animation = content.current!.animate(
          [{ height: `${from}px` }, { height: `${Math.max(480, next)}px` }],
          { duration: 560, easing: "cubic-bezier(.22,1.12,.36,1)" },
        );
      height = next;
    });
    observer.observe(body.current!);
    return () => {
      observer.disconnect();
      animation?.cancel();
    };
  }, []);
  async function showInfo() {
    const dialog = modal.current!;
    dialog.style.visibility = "hidden";
    dialog.showModal();
    await materials.current
      .get(dialog.querySelector<HTMLElement>("[data-native-glass]")!)
      ?.refresh();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (!dialog.open) return;
    dialog.style.visibility = "";
    dialog.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    if (!reduced())
      dialog.animate(
        [
          { transform: "translateY(18px) scale(.9)" },
          { transform: "translateY(-2px) scale(1.015)", offset: 0.7 },
          { transform: "none" },
        ],
        { duration: 620, easing: "cubic-bezier(.2,.75,.3,1)" },
      );
  }
  function closeInfo() {
    const dialog = modal.current!;
    if (reduced()) {
      dialog.close();
      return;
    }
    const a = dialog.animate(
      [{ transform: "none" }, { transform: "translateY(14px) scale(.95)" }],
      { duration: 180, easing: "ease-in" },
    );
    void a.finished.then(() => dialog.close()).catch(() => {});
  }
  return (
    <div ref={root} className="native-ui" data-palette={palette} data-paused={paused}>
      <header className="native-header">
        <Link to="/" className="native-brand">
          pulse <span>✳</span>
        </Link>
        <span className="native-edition">SMALL CHOICES. SHARED MOMENTS.</span>
        <div className="native-account">
          <button
            className="theme-btn native-chip"
            aria-label="切换主题"
            onClick={() => cycle.current()}
          >
            ◐
          </button>
          {user ? (
            <>
              <Link to="/new" className="native-chip">
                发起活动 ↗
              </Link>
              {!import.meta.env.VITE_UI_PREVIEW && (
                <button className="native-chip" onClick={() => void signOut()}>
                  退出
                </button>
              )}
            </>
          ) : (
            <Link to="/login" className="native-chip">
              登录 ↗
            </Link>
          )}
        </div>
      </header>
      <section className="native-intro">
        <div>
          <p>每一次选择，都是一次相遇</p>
          <h1>
            让选择，<em>有了回响。</em>
          </h1>
        </div>
        <p>
          把想法聚在一起，
          <br />
          让日常多一点心动。
        </p>
      </section>
      <main className="native-stage">
        <div className="native-landscape" aria-hidden="true">
          <i className="native-ribbon native-ribbon-one" />
          <i className="native-ribbon native-ribbon-two" />
          <i className="native-sun" />
          <div className="native-grid" />
          <i className="native-orbit" />
        </div>
        <div className="native-top">
          <span className="native-index">
            {palette === "aurora"
              ? "01 / AURORA"
              : palette === "dune"
                ? "02 / DUNE"
                : "03 / BLUEPRINT"}
          </span>
          <nav ref={rail} className="native-nav lab-nav" aria-label="活动导航">
            <span className="nav-indicator" data-native-glass="30" aria-hidden="true" />
            {nav.map((item, index) => (
              <Link key={item.to} to={item.to} aria-current={mode === index ? "page" : undefined}>
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <button className="native-help" onClick={() => void showInfo()} aria-label="参与说明">
            ?
          </button>
        </div>
        <div className="native-layout">
          <aside className="native-story">
            <p className="native-eyebrow">
              ● &nbsp;{" "}
              {creating
                ? "MAKE A LITTLE CONNECTION"
                : mode === 1
                  ? "A LITTLE SERENDIPITY"
                  : mode === 2
                    ? "MOMENTS, COLLECTED"
                    : "YOUR VOICE MATTERS"}
            </p>
            <h2>
              {creating ? (
                <>
                  一个想法，
                  <br />
                  让大家相遇。
                </>
              ) : mode === 1 ? (
                <>
                  小惊喜，
                  <br />
                  让偶然发生。
                </>
              ) : mode === 2 ? (
                <>
                  每次选择，
                  <br />
                  都值得回味。
                </>
              ) : (
                <>
                  好时光，
                  <br />
                  由我们决定。
                </>
              )}
            </h2>
            <p className="native-copy">
              {creating
                ? "从一个问题开始，把期待变成下一次相聚。"
                : mode === 1
                  ? "给忙碌按下暂停，把期待交给未知。"
                  : mode === 2
                    ? "一起做过的决定，都留在这里。"
                    : "不用再说「随便」。选出心之所向，让每一份心意，都成为答案的一部分。"}
            </p>
            <button className="native-story-link" onClick={() => void showInfo()}>
              看看怎么玩 <span>↗</span>
            </button>
            <span className="native-story-foot">A LITTLE CONNECTION GOES A LONG WAY.</span>
          </aside>
          <div ref={content} className="native-content" data-native-glass="48">
            <div ref={body} className="native-content-body">
              <div className="native-card-label">
                <span>
                  {creating
                    ? "START SOMETHING GOOD"
                    : mode === 1
                      ? "JUST FOR THE JOY OF IT"
                      : "THE EVERYDAY EDIT"}
                </span>
                <span>
                  {creating
                    ? "创建"
                    : mode === 1
                      ? "02 / 抽签"
                      : mode === 2
                        ? "03 / 记录"
                        : "01 / 投票"}
                </span>
              </div>
              <div key={path} className="native-route">
                {children}
              </div>
              <div className="native-card-footer">
                <span>每个选择，都有回响。</span>
                <span>✳</span>
              </div>
            </div>
          </div>
        </div>
        <div className="native-stage-foot">
          <span>让心意流动，让好运发生。</span>
          <span>POWERED BY A LITTLE CURIOSITY ↗</span>
        </div>
      </main>
      <div className="native-controls">
        <span>换一种心情</span>
        {[
          ["aurora", "极光"],
          ["dune", "沙丘"],
          ["blueprint", "蓝图"],
        ].map(([id, label]) => (
          <button
            key={id}
            className="native-chip"
            aria-pressed={palette === id}
            onClick={() => setPalette(id)}
          >
            <i className={`native-swatch ${id}`} />
            {label}
          </button>
        ))}
        <button
          className="native-chip native-pause"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? "播放动效" : "暂停动效"}
        </button>
      </div>
      <footer className="native-footer">
        <span>pulse ✳</span>
        <span>小小的选择，连起我们。</span>
        <Link to="/polls">查看活动记录 ↗</Link>
      </footer>
      <dialog
        ref={modal}
        className="native-modal"
        onCancel={(e) => {
          e.preventDefault();
          closeInfo();
        }}
        onClick={(e) => {
          if (e.target === modal.current) closeInfo();
        }}
      >
        <section
          className="native-dialog"
          data-native-glass="42"
          aria-labelledby="native-info-title"
        >
          <button className="native-close" onClick={closeInfo} aria-label="关闭说明">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="m5 5 8 8M13 5l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <p className="native-eyebrow">A FEW LITTLE NOTES</p>
          <span className="native-dialog-star">✳</span>
          <h2 id="native-info-title">轻松参与，尽兴而归。</h2>
          <p>投票时选择心仪的选项；多选活动选好后确认。需要登记时，请先填写提示的信息。</p>
          <p>抽签可体验翻牌、刮奖和九宫格。活动是否截止、是否允许再次参与，以当前活动规则为准。</p>
          <button className="native-chip" onClick={closeInfo}>
            知道了，开始体验 ↗
          </button>
        </section>
      </dialog>
    </div>
  );
}
