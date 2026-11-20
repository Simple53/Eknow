import React, { useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Storage from "expo-sqlite/kv-store";
import { randomUUID } from "expo-crypto";
import { CalendarDays, Shirt, Layers, Clapperboard, UserRound } from "lucide-react-native";
import { dateKey, emptyMember, initial } from "../../../packages/domain/core.mjs";
import { accent, ink, Btn, Field, s, say, gateway } from "./native-ui";
import { FamilyBody, MobileJournal } from "./NativeMedia";
import { TryOn } from "./NativeTryOn";
import { Wardrobe, Compose } from "./NativeWardrobe";
const tabs = [
  ["衣橱", Shirt],
  ["搭配", Layers],
  ["视频", Clapperboard],
  ["日历", CalendarDays],
  ["我的", UserRound],
];
export default function ClosetApp() {
  const [state, setState] = useState(null),
    [failure, setFailure] = useState(""),
    latest = useRef(null),
    [tab, setTab] = useState("日历"),
    [sub, setSub] = useState(""),
    [day, setDay] = useState(dateKey);
  useEffect(() => {
    Storage.getItemAsync("eknow-v1")
      .then((raw) => {
        const next = raw ? JSON.parse(raw) : initial();
        if (next.version !== 1 || !next.members.some((item) => item.id === next.active))
          throw Error("记录版本无效");
        latest.current = next;
        setState(next);
      })
      .catch((err) => setFailure(err.message));
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sub) {
        setSub("");
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [sub]);
  function change(operation) {
    const next = operation(latest.current);
    Storage.setItemSync("eknow-v1", JSON.stringify(next));
    latest.current = next;
    setState(next);
  }
  if (!state)
    return (
      <SafeAreaView style={s.paper}>
        <Text>{failure || "正在打开手记…"}</Text>
      </SafeAreaView>
    );
  const member = state.members.find((item) => item.id === state.active);
  const go = (title) => {
    setTab(title);
    setSub("");
  };
  const edit = (operation) =>
    change((old) => ({
      ...old,
      members: old.members.map((item) => (item.id === member.id ? operation(item) : item)),
    }));
  function select(id) {
    change((old) => ({ ...old, active: id }));
    setDay(dateKey());
    setSub("");
  }
  return (
    <SafeAreaView style={s.paper}>
      <View style={s.header}>
        <Text style={s.brand}>Eknow</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="切换成员"
          onPress={() => {
            setTab("我的");
            setSub("家庭成员");
          }}
        >
          <Text>{member.name} ﹀</Text>
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
        key={member.id + tab + sub}
      >
        <Text style={s.title}>{sub || tab}</Text>
        {sub !== "" && (
          <Btn muted press={() => setSub("")}>
            返回
          </Btn>
        )}
        {tab === "日历" ? (
          <MobileJournal {...{ member, day, setDay, edit, go }} />
        ) : tab === "衣橱" ? (
          <Wardrobe member={member} edit={edit} />
        ) : tab === "搭配" ? (
          <Compose {...{ member, edit, day, go }} />
        ) : tab === "视频" ? (
          <TryOn member={member} />
        ) : sub === "人体档案" ? (
          <FamilyBody member={member} edit={edit} />
        ) : sub === "家庭成员" ? (
          <Members
            {...{ state, select }}
            add={(name) => {
              if (state.members.some((item) => item.name === name)) return say("已有同名成员");
              const id = randomUUID();
              change((old) => ({
                ...old,
                active: id,
                members: [...old.members, emptyMember(id, name)],
              }));
              setDay(dateKey());
              setSub("");
            }}
          />
        ) : sub === "模型服务" ? (
          <Btn
            press={async () => {
              try {
                say((await gateway("status")).ai ? "已配置模型服务" : "模型服务未配置");
              } catch (err) {
                say(err.message);
              }
            }}
          >
            检查模型连接
          </Btn>
        ) : (
          ["家庭成员", "人体档案", "模型服务"].map((title) => (
            <Btn key={title} muted press={() => setSub(title)}>
              {title}
            </Btn>
          ))
        )}
      </ScrollView>
      <View style={s.dock}>
        {tabs.map(([title, Icon]) => (
          <Pressable
            key={title}
            accessibilityRole="tab"
            accessibilityLabel={title}
            accessibilityState={{ selected: title === tab }}
            style={[s.tab, title === tab && s.active]}
            onPress={() => go(title)}
          >
            <Icon size={24} strokeWidth={1.6} color={title === tab ? accent : ink} />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
function Members({ state, select, add }) {
  const [name, setName] = useState("");
  return (
    <View style={s.stack}>
      {state.members.map((item) => (
        <Btn key={item.id} muted={item.id !== state.active} press={() => select(item.id)}>
          {item.name}
        </Btn>
      ))}
      <Field label="家人称呼" value={name} change={setName} maxLength={24} />
      <Btn disabled={!name.trim()} press={() => add(name.trim())}>
        添加家人
      </Btn>
    </View>
  );
}
