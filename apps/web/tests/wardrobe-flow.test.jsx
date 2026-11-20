import React from "react";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { get, clear } from "idb-keyval";
import { App } from "../src/App";
beforeEach(async () => {
  await clear();
  location.hash = "/journal";
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
function tab(name) {
  fireEvent.click(within(screen.getByRole("navigation")).getByRole("link", { name, exact: true }));
}
test("离线图库→记穿→本地持久化；新增家人后衣物、日期记录和量体值不串用", async () => {
  render(<App />);
  await screen.findByRole("navigation");
  expect(screen.getByRole("navigation").textContent).toBe("");
  tab("衣橱");
  fireEvent.click(screen.getByRole("button", { name: /海军蓝绞花针织衫.*添加到衣橱/ }));
  fireEvent.submit(screen.getByRole("dialog").querySelector("form"));
  fireEvent.click(screen.getByRole("button", { name: "添加衣物" }));
  fireEvent.click(screen.getByRole("button", { name: "选用象牙白斜纹长裤" }));
  fireEvent.submit(screen.getByRole("dialog").querySelector("form"));
  tab("搭配");
  fireEvent.click(screen.getByRole("button", { name: "今天穿了" }));
  await screen.findByRole("button", { name: "导出穿搭图" });
  await waitFor(async () => expect((await get("eknow-v1")).members[0].wears).toHaveLength(1));
  tab("我的");
  fireEvent.click(screen.getByRole("button", { name: "家庭成员" }));
  fireEvent.change(screen.getByLabelText("家人称呼"), { target: { value: "测试成员" } });
  fireEvent.submit(screen.getByLabelText("家人称呼").closest("form"));
  await waitFor(async () => {
    const state = await get("eknow-v1");
    expect(state.members[1].wears).toEqual([]);
    expect(state.members[1].items).toEqual([]);
    expect(state.members[1].body).toEqual({});
    expect(state.active).toBe(state.members[1].id);
  });
  cleanup();
  render(<App />);
  await screen.findByRole("navigation");
  tab("衣橱");
  expect(screen.getByRole("heading", { name: "从图库添加" })).toBeTruthy();
}, 20000);
