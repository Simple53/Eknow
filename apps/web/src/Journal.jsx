import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { dateKey } from "../../../packages/domain/core.mjs";
import { Action, Picture, loadImage } from "./ui";
export function Flatlay({ pieces }) {
  return (
    <div className={"flatlay " + (pieces?.length ? "pieces" : "")}>
      {pieces?.length ? (
        pieces.map((item) => <Picture key={item.id} item={item} />)
      ) : (
        <img src="/media/outfit.webp" alt="样册：海军蓝针织衫与象牙白长裤" />
      )}
    </div>
  );
}
async function exportPng(entry) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f6f2eb";
  ctx.fillRect(0, 0, 1080, 1280);
  ctx.fillStyle = "#282721";
  ctx.font = "52px Georgia";
  ctx.fillText("Eknow", 56, 94);
  ctx.font = "29px sans-serif";
  ctx.fillText(entry.date, 775, 92);
  const width = 960 / entry.pieces.length;
  for (const [index, item] of entry.pieces.entries()) {
    if (item.image) {
      const img = await loadImage(item.image),
        scale = Math.min(width / img.width, 850 / img.height);
      ctx.drawImage(
        img,
        60 + index * width + (width - img.width * scale) / 2,
        568 - (img.height * scale) / 2,
        img.width * scale,
        img.height * scale
      );
    }
    ctx.fillText(item.name, 60 + index * width, 1080, width - 14);
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw Error("图片导出失败");
  const href = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = href;
  link.download = "Eknow-" + entry.date + ".png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}
export function Journal({ member, edit, go, selected, setSelected, notify }) {
  const date = new Date(selected + "T12:00:00"),
    year = date.getFullYear(),
    month = date.getMonth(),
    first = new Date(year, month, 1),
    offset = (first.getDay() + 6) % 7,
    total = new Date(year, month + 1, 0).getDate();
  const [index, setIndex] = useState(0);
  const entries = member.wears.filter((entry) => entry.date === selected),
    entry = entries[Math.min(index, entries.length - 1)];
  function choose(day) {
    setIndex(0);
    setSelected(day);
  }
  return (
    <div className="spread">
      <section className="calendar">
        <div className="month">
          <h1>
            {month + 1}
            <em>月</em>
          </h1>
          <div className="monthnav">
            <button
              className="icon"
              aria-label="上个月"
              onClick={() => choose(dateKey(new Date(year, month - 1, 1)))}
            >
              <ChevronLeft />
            </button>
            <span>{year} 年</span>
            <button
              className="icon"
              aria-label="下个月"
              onClick={() => choose(dateKey(new Date(year, month + 1, 1)))}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
        <details className="week-toggle">
          <summary>月视图</summary>
        </details>
        <div className="days">
          {"一二三四五六日".split("").map((label) => (
            <small key={label}>{label}</small>
          ))}
          {Array.from({ length: offset }, (_, index) => (
            <span key={"pad" + index} />
          ))}
          {Array.from({ length: total }, (_, index) => {
            const day = dateKey(new Date(year, month, index + 1));
            return (
              <button
                key={day}
                aria-label={day}
                aria-pressed={day === selected}
                data-week={
                  Math.floor((offset + index) / 7) === Math.floor((offset + date.getDate() - 1) / 7)
                }
                data-worn={member.wears.some((entry) => entry.date === day)}
                onClick={() => choose(day)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <div className="calendarfoot">
          <span>{member.name} · 本月穿着</span>
          <strong>
            {
              new Set(
                member.wears
                  .filter((entry) => entry.date.startsWith(selected.slice(0, 7)))
                  .map((entry) => entry.date)
              ).size
            }{" "}
            天
          </strong>
        </div>
      </section>
      <section className="look">
        <Flatlay pieces={entry?.pieces} />
        <div className="lookcaption">
          <span>{entry ? "穿着记录" : "图库样册"}</span>
          <span>
            {month + 1}月{date.getDate()}日 · 星期{"日一二三四五六"[date.getDay()]}
          </span>
        </div>
        {entry ? (
          <>
            <div className="tools">
              {entries.length > 1 && (
                <select
                  aria-label="当日搭配"
                  value={entry.id}
                  onChange={(event) =>
                    setIndex(entries.findIndex((item) => item.id === event.target.value))
                  }
                >
                  {entries.map((item, index) => (
                    <option value={item.id} key={item.id}>
                      第 {index + 1} 套
                    </option>
                  ))}
                </select>
              )}
              <Action onClick={() => exportPng(entry).catch((error) => notify(error.message))}>
                <Download size={16} />
                导出穿搭图
              </Action>
              <button
                onClick={() => {
                  edit((old) => ({
                    ...old,
                    wears: old.wears.filter((item) => item.id !== entry.id),
                  }));
                  setIndex(0);
                }}
              >
                撤销记穿
              </button>
            </div>
          </>
        ) : (
          <Action onClick={() => go("outfit")}>
            搭配并记穿 <ChevronRight size={16} />
          </Action>
        )}
      </section>
    </div>
  );
}
export function Rail({ category, items, id, setId }) {
  const start = useRef(null),
    candidates = items.filter((item) => item.type === category),
    index = Math.max(
      0,
      candidates.findIndex((item) => item.id === id)
    );
  const change = (step) => {
    if (candidates.length)
      setId(candidates[(index + step + candidates.length) % candidates.length].id);
  };
  return (
    <div
      className="rail"
      onTouchStart={(event) => (start.current = event.touches[0].clientX)}
      onTouchEnd={(event) => {
        if (start.current != null) {
          const diff = event.changedTouches[0].clientX - start.current;
          if (Math.abs(diff) > 40) change(diff > 0 ? -1 : 1);
        }
        start.current = null;
      }}
    >
      <div className="railhead">
        <b>{category}</b>
        <span>
          {candidates.length ? index + 1 : 0} / {candidates.length}
        </span>
      </div>
      {candidates[index] ? (
        <div className="railbody">
          <button aria-label={"上一件" + category} onClick={() => change(-1)}>
            <ChevronLeft />
          </button>
          <Picture item={candidates[index]} />
          <button aria-label={"下一件" + category} onClick={() => change(1)}>
            <ChevronRight />
          </button>
        </div>
      ) : (
        <p>还没有{category}</p>
      )}
      <small>{candidates[index]?.name}</small>
    </div>
  );
}
