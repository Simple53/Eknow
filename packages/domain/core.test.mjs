import test from "node:test";
import assert from "node:assert/strict";
import { emptyMember, record, costs, validLook, checkedBody } from "./core.mjs";
const member = {
  ...emptyMember("one", "本人"),
  items: [
    { id: "shirt", type: "上装", cents: 30000, bought: "2026-01-01" },
    { id: "pants", type: "下装" },
  ],
};
test("同日多套不重复计天；撤销后重算；不修改衣物快照", () => {
  let state = member;
  for (let index = 1; index <= 5; index++)
    state = record(state, ["shirt", "pants"], "2026-01-0" + index, String(index));
  state = record(state, ["shirt"], "2026-01-05", "repeat");
  assert.deepEqual(costs(member.items[0], state.wears, "2026-01-30"), {
    count: 5,
    holding: 10,
    worn: 60,
  });
  assert.equal(record(state, ["shirt"], "2026-01-05", "repeat"), state);
  assert.equal(
    costs(
      member.items[0],
      state.wears.filter((entry) => entry.date !== "2026-01-05"),
      "2026-01-30"
    ).worn,
    75
  );
  assert.notEqual(state.wears[0].pieces[0], member.items[0]);
});
test("切换成员不可引用旧衣物；未知价与免费分开；不接受无效尺寸", () => {
  assert.throws(() => record(emptyMember("two", "家人"), ["shirt"], "2026-01-01", "x"));
  assert.equal(costs(member.items[1], []).holding, null);
  assert.equal(costs({ ...member.items[0], cents: 0 }, [], "2026-01-01").holding, 0);
  assert.equal(validLook(member.items, ["pants", "shirt"]), true);
  assert.equal(validLook(member.items, ["shirt", "foreign"]), false);
  assert.deepEqual(checkedBody({ waist: "", height: "169.99" }), { height: 170 });
  assert.throws(() => checkedBody({ waist: "-1" }));
});
