import React, { useState } from "react";
import { dateKey, record, validLook } from "../../../packages/domain/core.mjs";
import { Action, Segments, api, uid } from "./ui";
import { Rail } from "./Journal";
export function Outfit({ member, edit, go, notify, selected }) {
  const [mode, setMode] = useState("自由搭配"),
    [choice, setChoice] = useState([]),
    [scene, setScene] = useState("通勤"),
    [weather, setWeather] = useState("晴"),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false);
  const ids = ["上装", "下装"].map(
    (type, index) =>
      member.items.find((item) => item.type === type && item.id === choice[index])?.id ||
      member.items.find((item) => item.type === type)?.id
  );
  const complete = validLook(member.items, ids);
  async function recommend() {
    setBusy(true);
    setReason("");
    try {
      const out = await api("recommend", {
        items: member.items.map(({ id, name, type }) => ({ id, name, type })),
        scene,
        weather,
      });
      if (!validLook(member.items, out.ids)) throw Error("推荐不属于此成员");
      setChoice(
        ["上装", "下装"].map((type) =>
          out.ids.find((id) => member.items.some((item) => item.id === id && item.type === type))
        )
      );
      setReason(out.reason);
    } catch (error) {
      setReason(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="heading">
        <h1>搭配</h1>
        <Segments value={mode} onChange={setMode} options={["自由搭配", "AI 搭配"]} />
      </div>
      <div className="twocol">
        <div>
          {["上装", "下装"].map((category, index) => (
            <Rail
              key={category}
              category={category}
              items={member.items}
              id={ids[index]}
              setId={(id) => setChoice(ids.map((old, pos) => (index === pos ? id : old)))}
            />
          ))}
        </div>
        <div className="sidepanel">
          {mode === "AI 搭配" && (
            <>
              <label>
                场景
                <select value={scene} onChange={(event) => setScene(event.target.value)}>
                  {["通勤", "休闲", "运动", "晚餐"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                天气
                <input
                  value={weather}
                  onChange={(event) => setWeather(event.target.value)}
                  maxLength={60}
                />
              </label>
              <Action isDisabled={!complete || busy} onClick={recommend}>
                {busy ? "正在推荐…" : "生成 AI 搭配"}
              </Action>
              {reason && <p role="status">{reason}</p>}
            </>
          )}
          {!complete ? (
            <Action onClick={() => go("closet")}>去衣橱添加单品</Action>
          ) : (
            <>
              <Action
                isDisabled={selected > dateKey()}
                onClick={() => {
                  const id = uid();
                  edit((old) => record(old, ids, selected, id));
                  go("journal");
                  notify("已记入 " + selected);
                }}
              >
                {selected === dateKey() ? "今天穿了" : "记入 " + selected}
              </Action>
              <Action
                secondary
                onClick={() => {
                  if (!member.looks.some((look) => look.ids.join("|") === ids.join("|"))) {
                    edit((old) => ({ ...old, looks: [...old.looks, { id: uid(), ids }] }));
                  }
                  notify("已保存搭配");
                }}
              >
                保存搭配
              </Action>
            </>
          )}
          {!!member.looks.length && (
            <label>
              已存搭配
              <select
                defaultValue=""
                onChange={(event) => {
                  const look = member.looks.find((item) => item.id === event.target.value);
                  if (look) setChoice(look.ids);
                }}
              >
                <option value="">选择搭配</option>
                {member.looks.map((look, index) => (
                  <option key={look.id} value={look.id}>
                    搭配 {index + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="link" onClick={() => go("video")}>
            打开视频试穿 ↗
          </button>
        </div>
      </div>
    </>
  );
}
