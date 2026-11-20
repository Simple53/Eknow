import React, { useState, useRef } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { randomUUID } from "expo-crypto";
import { catalog, costs, dateKey, record, validLook } from "../../../packages/domain/core.mjs";
import { Btn, Field, Pic, s, say, gateway } from "./native-ui";
import { chooseGarmentImage } from "./NativeMedia";
export function Wardrobe({ member, edit }) {
  const [mode, setMode] = useState("衣橱"),
    [query, setQuery] = useState(""),
    [draft, setDraft] = useState(null),
    [found, setFound] = useState([]),
    [status, setStatus] = useState("");
  const start = (item) =>
    setDraft({
      name: "",
      type: "上装",
      image: "",
      price: "",
      source: "",
      bought: dateKey(),
      ...item,
    });
  if (draft) {
    const field = (key, value) => setDraft({ ...draft, [key]: value });
    return (
      <View style={s.stack}>
        <Field label="名称" value={draft.name} change={(value) => field("name", value)} />
        <View style={s.row}>
          {["上装", "下装", "其他"].map((type) => (
            <Btn key={type} muted={draft.type !== type} press={() => field("type", type)}>
              {type}
            </Btn>
          ))}
        </View>
        <Field
          numeric
          label="实付价（元）"
          value={draft.price}
          change={(value) => field("price", value)}
        />
        <Field
          label="购买日 YYYY-MM-DD"
          value={draft.bought}
          change={(value) => field("bought", value)}
        />
        <Field label="商品链接" value={draft.source} change={(value) => field("source", value)} />
        {!!draft.source && (
          <Btn
            muted
            press={async () => {
              try {
                const item = await gateway("import", { url: draft.source });
                field("name", item.name);
                say(
                  "商品标价 " +
                    (item.price ?? "—") +
                    " " +
                    (item.currency ?? "") +
                    "，请填写实际人民币付款金额"
                );
              } catch (err) {
                say(err.message);
              }
            }}
          >
            读取商品链接
          </Btn>
        )}
        <Btn
          muted
          press={async () => {
            try {
              const image = await chooseGarmentImage();
              if (image) field("image", image);
            } catch (err) {
              say(err.message);
            }
          }}
        >
          {draft.image ? "更换照片" : "选择衣物照片"}
        </Btn>
        <Btn
          disabled={!draft.name.trim()}
          press={() => {
            if (
              (draft.price !== "" &&
                (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0)) ||
              (draft.bought &&
                (!/^\d{4}-\d\d-\d\d$/.test(draft.bought) ||
                  !Number.isFinite(Date.parse(draft.bought)) ||
                  draft.bought > dateKey()))
            )
              return say("请检查价格与购买日期");
            edit((old) => ({
              ...old,
              items: [
                ...old.items,
                {
                  id: randomUUID(),
                  name: draft.name.trim(),
                  image: draft.image,
                  type: draft.type,
                  cents: draft.price === "" ? null : Math.round(Number(draft.price) * 100),
                  bought: draft.bought,
                  source: draft.source,
                },
              ],
            }));
            setDraft(null);
          }}
        >
          保存衣物
        </Btn>
        <Btn muted press={() => setDraft(null)}>
          取消
        </Btn>
      </View>
    );
  }
  return (
    <View style={s.stack}>
      <View style={s.row}>
        {["衣橱", "电商市场"].map((title) => (
          <Btn key={title} muted={mode !== title} press={() => setMode(title)}>
            {title}
          </Btn>
        ))}
      </View>
      <Field
        label="搜索关键词"
        value={query}
        change={(value) => {
          setQuery(value);
          setFound([]);
          setStatus("");
        }}
      />
      {mode === "电商市场" ? (
        <>
          <Btn
            disabled={!query.trim()}
            press={async () => {
              try {
                const data = await gateway("catalog?q=" + encodeURIComponent(query));
                setFound(data.items);
                setStatus(data.items.length ? "" : "没有找到商品");
              } catch (err) {
                setStatus(err.message);
              }
            }}
          >
            搜索商品
          </Btn>
          {!!status && <Text>{status}</Text>}
          {["淘宝", "京东"].map((name, index) => (
            <Btn
              key={name}
              muted
              disabled={!query.trim()}
              press={() =>
                Linking.openURL(
                  ["https://s.taobao.com/search?q=", "https://search.jd.com/Search?keyword="][
                    index
                  ] + encodeURIComponent(query)
                ).catch((err) => say(err.message))
              }
            >
              {"前往" + name + "搜索"}
            </Btn>
          ))}
          {found.map((item) => (
            <Btn key={item.url} muted press={() => start({ name: item.name, source: item.url })}>
              {item.name}
            </Btn>
          ))}
        </>
      ) : (
        <>
          <Btn press={() => start({})}>添加衣物</Btn>
          {member.items
            .filter((item) => item.name.includes(query))
            .map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  const result = costs(item, member.wears);
                  say(
                    "穿着 " +
                      result.count +
                      " 天 · 持有日均 " +
                      (result.holding?.toFixed(2) ?? "—") +
                      " 元 · 穿着日均 " +
                      (result.worn?.toFixed(2) ?? "—") +
                      " 元"
                  );
                }}
              >
                <Pic item={item} />
                <Text>{item.name}</Text>
              </Pressable>
            ))}
          <Text style={s.hint}>从图库添加</Text>
          {catalog.map((item) => (
            <Pressable key={item.key} onPress={() => start(item)}>
              <Pic item={item} />
              <Text>{item.name}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}
export function Compose({ member, edit, day, go }) {
  const [choice, setChoice] = useState([]),
    [scene, setScene] = useState("通勤"),
    [weather, setWeather] = useState("晴"),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState("");
  const startX = useRef(null);
  const lists = ["上装", "下装"].map((type) => member.items.filter((item) => item.type === type)),
    ids = lists.map(
      (list, index) => list.find((item) => item.id === choice[index])?.id || list[0]?.id
    ),
    ready = validLook(member.items, ids);
  function shift(index, step) {
    const list = lists[index];
    if (!list.length) return;
    const position = list.findIndex((item) => item.id === ids[index]);
    setChoice(
      ids.map((value, pos) =>
        pos === index ? list[(position + step + list.length) % list.length].id : value
      )
    );
  }
  return (
    <View style={s.stack}>
      {lists.map((list, index) => (
        <View
          key={index}
          style={s.stack}
          onTouchStart={(event) => (startX.current = event.nativeEvent.pageX)}
          onTouchEnd={(event) => {
            const diff = event.nativeEvent.pageX - startX.current;
            if (Math.abs(diff) > 50) shift(index, diff < 0 ? 1 : -1);
          }}
        >
          <Text>{index ? "下装" : "上装"}</Text>
          {list.length > 0 && (
            <Pic item={list.find((item) => item.id === ids[index])} style={{ height: 135 }} />
          )}
          <View style={s.row}>
            <Btn muted disabled={list.length < 2} press={() => shift(index, -1)}>
              上一件
            </Btn>
            <Btn muted disabled={list.length < 2} press={() => shift(index, 1)}>
              下一件
            </Btn>
          </View>
        </View>
      ))}
      <Field label="场景" value={scene} change={setScene} />
      <Field label="天气" value={weather} change={setWeather} />
      <Btn
        muted
        disabled={!ready || busy}
        press={async () => {
          setBusy(true);
          try {
            const data = await gateway("recommend", {
              scene,
              weather,
              items: member.items.map(({ id, name, type }) => ({ id, name, type })),
            });
            if (!validLook(member.items, data.ids)) throw Error("无效推荐");
            setChoice(
              lists.map((list) => data.ids.find((id) => list.some((item) => item.id === id)))
            );
            setReason(data.reason);
          } catch (err) {
            setReason(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "正在推荐…" : "AI 搭配"}
      </Btn>
      {!!reason && <Text>{reason}</Text>}
      <Btn
        disabled={!ready || day > dateKey()}
        press={() => {
          edit((old) => record(old, ids, day, randomUUID()));
          go("日历");
        }}
      >
        {day === dateKey() ? "今天穿了" : "记入 " + day}
      </Btn>
      <Btn muted press={() => go(ready ? "视频" : "衣橱")}>
        {ready ? "视频试穿" : "去添加衣物"}
      </Btn>
    </View>
  );
}
