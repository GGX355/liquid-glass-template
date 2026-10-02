import React from "react";
import { createRoot } from "react-dom/client";
import {
  createRouter,
  createRootRoute,
  createRoute,
  createHashHistory,
  RouterProvider,
  Outlet,
  Link,
} from "@tanstack/react-router";
import { QueryProvider } from "../src/components/query-provider";
import { NativeShell } from "../src/components/native-glass/shell";
import { LivePollView } from "../src/components/poll/live-poll";
import { DrawView } from "../src/components/poll/draw-view";
import { CreatePollForm } from "../src/components/poll/create-poll";
import { fetchLivePoll, fetchPollById, fetchPollList, getPreviewDraw } from "./api";
import "../src/styles.css";
import "./preview.css";

const root = createRootRoute({
  component: () => (
    <QueryProvider>
      <div className="preview-notice">
        <span>UI 预览 · 示例数据，仅本页体验</span>
        <button onClick={() => location.reload()}>重新体验 ↺</button>
      </div>
      <NativeShell>
        <Outlet />
      </NativeShell>
    </QueryProvider>
  ),
  notFoundComponent: () => (
    <p>
      这个页面不在视觉预览范围内。<Link to="/vote">回到投票</Link>
    </p>
  ),
  errorComponent: ({ error }) => <p role="alert">{error.message}</p>,
});
const vote = createRoute({
  getParentRoute: () => root,
  path: "/vote",
  loader: fetchLivePoll,
  component: () => <LivePollView initialData={vote.useLoaderData()} />,
});
const home = createRoute({
  getParentRoute: () => root,
  path: "/",
  loader: fetchLivePoll,
  component: () => <LivePollView initialData={home.useLoaderData()} />,
});
const detail = createRoute({
  getParentRoute: () => root,
  path: "/poll/$pollId",
  loader: ({ params }) => fetchPollById({ data: params }),
  component: () => {
    const p = detail.useLoaderData();
    return p ? (
      <LivePollView key={p.id} initialData={p} pollId={p.id} />
    ) : (
      <p>预览已重置，请从活动记录打开示例。</p>
    );
  },
});
const draw = createRoute({
  getParentRoute: () => root,
  path: "/draw",
  component: () => <DrawView initialData={getPreviewDraw()} pollId="preview-draw" />,
});
const history = createRoute({
  getParentRoute: () => root,
  path: "/polls",
  loader: fetchPollList,
  component: () => (
    <>
      <h1>每一次心意，都在这里。</h1>
      <p className="text-sm text-muted mt-3 mb-8">预览中的投票记录</p>
      <div className="preview-history">
        {history.useLoaderData().map((p) => (
          <Link key={p.id} to="/poll/$pollId" params={{ pollId: p.id }}>
            <span>
              {p.question}
              <small>
                {p.closed ? "已结束" : "进行中"} · {p.total} 票
              </small>
            </span>
            <span>↗</span>
          </Link>
        ))}
      </div>
      <Link to="/new" className="native-chip mt-8">
        发起一场新投票 ↗
      </Link>
    </>
  ),
});
const create = createRoute({
  getParentRoute: () => root,
  path: "/new",
  component: () => <CreatePollForm />,
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  component: () => (
    <>
      <h1>这是独立的视觉预览</h1>
      <p className="mt-4">预览不接入账号或真实活动。可以用示例发起人体验创建表单。</p>
      <Link to="/new" className="native-chip mt-6">
        体验创建活动 ↗
      </Link>
    </>
  ),
});
const router = createRouter({
  routeTree: root.addChildren([home, vote, detail, draw, history, create, login]),
  history: createHashHistory(),
});
createRoot(document.getElementById("root")).render(<RouterProvider router={router} />);
