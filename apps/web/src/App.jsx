import React, { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, Shirt, Layers, Clapperboard, UserRound } from "lucide-react";
import { get, set } from "idb-keyval";
import { dateKey, emptyMember, initial } from "../../../packages/domain/core.mjs";
import { Wardrobe } from "./Wardrobe";
import { Outfit } from "./Outfit";
import { Journal } from "./Journal";
import { Video } from "./Video";
import { Family } from "./Family";
import { uid } from "./ui";
const tabs = [
  ["closet", "衣橱", Shirt],
  ["outfit", "搭配", Layers],
  ["video", "视频试穿", Clapperboard],
  ["journal", "日历", CalendarDays],
  ["family", "我的", UserRound],
];
const pages = new Set([
  ...tabs.map((tab) => tab[0]),
  ...["members", "body", "model", "privacy"].map((key) => "family/" + key),
]);
function route() {
  const key = location.hash.slice(2);
  return pages.has(key) ? key : "journal";
}
export function App() {
  const [state, setState] = useState(null),
    [failure, setFailure] = useState(""),
    [page, setPage] = useState(route),
    [selected, setSelected] = useState(dateKey),
    [note, setNote] = useState("");
  const queue = useRef(Promise.resolve()),
    timer = useRef(),
    latest = useRef();
  const notify = useCallback((text) => {
    setNote(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(""), 4000);
  }, []);
  useEffect(() => {
    let active = true;
    get("eknow-v1")
      .then((saved) => {
        if (active) {
          const next = saved ?? initial();
          if (next.version !== 1 || !next.members?.some((member) => member.id === next.active))
            throw Error("衣橱版本或记录无效，未覆盖原数据");
          latest.current = next;
          setState(next);
        }
      })
      .catch((error) => {
        if (active) setFailure(error.message);
      });
    const update = () => setPage(route());
    window.addEventListener("hashchange", update);
    return () => {
      active = false;
      window.removeEventListener("hashchange", update);
      clearTimeout(timer.current);
    };
  }, []);
  function update(change) {
    const next = change(latest.current);
    latest.current = next;
    setState(next);
    queue.current = queue.current
      .catch(() => {})
      .then(() => set("eknow-v1", next))
      .catch(() => setFailure("本机存储失败，数据未保存。请检查浏览器存储空间。"));
  }
  function go(key) {
    location.hash = "/" + key;
    setPage(key);
  }
  if (!state || failure)
    return (
      <main className="opening">
        <h1>Eknow</h1>
        <p role="status">{failure || "正在打开手记…"}</p>
      </main>
    );
  const member = state.members.find((item) => item.id === state.active),
    tab = page.split("/")[0];
  const edit = (operation) =>
    update((old) => ({
      ...old,
      members: old.members.map((item) => (item.id === member.id ? operation(item) : item)),
    }));
  const select = (id) => {
    update((old) => ({ ...old, active: id }));
    setSelected(dateKey());
    setNote("");
  };
  const add = (name) => {
    if (state.members.some((item) => item.name === name)) {
      notify("已有同名成员");
      return false;
    }
    const id = uid();
    update((old) => ({ ...old, active: id, members: [...old.members, emptyMember(id, name)] }));
    setSelected(dateKey());
    notify("已添加家人");
    return true;
  };
  const props = { member, edit, notify, go, selected, setSelected };
  return (
    <>
      <header className="mast">
        <a href="#/journal" className="brand">
          <BookOpen strokeWidth={1.4} />
          <span>Eknow</span>
        </a>
        <i />
        <span className="wordmark">穿着手记</span>
        <div className="member">
          <UserRound size={16} />
          <select
            aria-label="当前成员"
            value={member.id}
            onChange={(event) =>
              event.target.value === "+" ? go("family/members") : select(event.target.value)
            }
          >
            {state.members.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            <option value="+">添加家人…</option>
          </select>
        </div>
      </header>
      <main className="content" key={member.id}>
        <section hidden={tab !== "journal"}>
          <Journal {...props} />
        </section>
        <section hidden={tab !== "closet"}>
          <Wardrobe {...props} />
        </section>
        <section hidden={tab !== "outfit"}>
          <Outfit {...props} />
        </section>
        {tab === "video" && <Video member={member} />}
        {tab === "family" && (
          <Family {...props} page={page} members={state.members} add={add} select={select} />
        )}
      </main>
      {note && (
        <div className="toast" role="status">
          {note}
        </div>
      )}
      <nav aria-label="主导航" className="dock">
        {tabs.map(([key, label, Icon]) => (
          <a
            href={"#/" + key}
            onClick={(event) => {
              event.preventDefault();
              go(key);
            }}
            key={key}
            aria-label={label}
            title={label}
            aria-current={key === tab ? "page" : undefined}
          >
            <Icon size={25} strokeWidth={1.55} />
          </a>
        ))}
      </nav>
    </>
  );
}
