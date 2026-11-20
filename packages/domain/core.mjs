export const catalog = [
  { key: "knit", name: "海军蓝绞花针织衫", type: "上装", image: "/media/knit.webp" },
  { key: "trousers", name: "象牙白斜纹长裤", type: "下装", image: "/media/trousers.webp" },
];
export const measures = {
  height: "身高",
  weight: "体重",
  shoulder: "肩宽",
  chest: "胸围",
  waist: "腰围",
  hip: "臀围",
  sleeve: "臂长",
  inseam: "腿内长",
};
export const reference = {
  S: { chest: [88, 96], waist: [73, 81], hip: [88, 96] },
  M: { chest: [96, 104], waist: [81, 89], hip: [96, 104] },
  L: { chest: [104, 112], waist: [89, 97], hip: [104, 112] },
};
export const referenceUrl =
  "https://niketeam.nike.com/niketeamsports/content/pdf/catalog_thumbs/NTS_Tee_Fleece.pdf";
export function dateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
export function emptyMember(id, name) {
  return {
    id,
    name,
    items: [],
    wears: [],
    looks: [],
    body: {},
    bodySource: {},
    referenceSize: null,
  };
}
export function initial() {
  return { version: 1, active: "self", members: [emptyMember("self", "本人")] };
}
export function record(member, ids, date, id) {
  const pieces = [...new Set(ids)].map((key) => member.items.find((item) => item.id === key));
  if (!pieces.length || pieces.some((item) => !item)) throw Error("请选择当前成员的衣物");
  if (member.wears.some((entry) => entry.id === id)) return member;
  return {
    ...member,
    wears: [...member.wears, { id, date, pieces: pieces.map((item) => ({ ...item })) }],
  };
}
export function costs(item, wears, today = dateKey()) {
  const count = new Set(
    wears
      .filter((entry) => entry.date <= today && entry.pieces.some((piece) => piece.id === item.id))
      .map((entry) => entry.date)
  ).size;
  const days = item.bought ? 1 + (Date.parse(today) - Date.parse(item.bought)) / 86400000 : NaN;
  const price = item.cents == null ? null : item.cents / 100;
  return {
    count,
    holding: price != null && days > 0 ? price / days : null,
    worn: price != null && count ? price / count : null,
  };
}
export function validLook(items, ids) {
  return (
    Array.isArray(ids) &&
    ids.length === 2 &&
    ["上装", "下装"].every((type) =>
      ids.some((id) => items.some((item) => item.id === id && item.type === type))
    )
  );
}
export function checkedBody(values) {
  const result = {};
  for (const field of Object.keys(measures)) {
    if (values[field] == null || values[field] === "") continue;
    const number = Number(values[field]);
    if (!Number.isFinite(number) || number <= 0 || number > 500)
      throw Error(measures[field] + "超出可录入范围");
    result[field] = Math.round(number * 10) / 10;
  }
  return result;
}
