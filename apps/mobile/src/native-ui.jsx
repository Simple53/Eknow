import React from "react";
import { Alert, Image, Text, TextInput, View, StyleSheet } from "react-native";
import { Button } from "heroui-native";
export const ink = "#25241f",
  accent = "#373669",
  paper = "#f7f3ed",
  rule = "#d7d1c7";
export const art = {
  "/media/knit.webp": require("../assets/media/knit.webp"),
  "/media/trousers.webp": require("../assets/media/trousers.webp"),
  "/media/outfit.webp": require("../assets/media/outfit.webp"),
};
export const say = (message) => Alert.alert("Eknow", String(message));
export function Btn({ children, press, muted, disabled }) {
  return (
    <Button
      isDisabled={disabled}
      onPress={press}
      style={{
        backgroundColor: muted ? paper : accent,
        borderColor: muted ? rule : accent,
        borderWidth: 1,
        borderRadius: 6,
        opacity: disabled ? 0.5 : 1,
        minHeight: 44,
      }}
    >
      <Text style={{ color: muted ? ink : "white", fontWeight: "600" }}>{children}</Text>
    </Button>
  );
}
export function Field({ label, value, change, numeric = false, ...rest }) {
  return (
    <View style={{ gap: 5 }}>
      <Text>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={String(value ?? "")}
        onChangeText={change}
        keyboardType={numeric ? "decimal-pad" : "default"}
        style={s.input}
        {...rest}
      />
    </View>
  );
}
export function Pic({ item, style }) {
  return item?.image ? (
    <Image
      accessibilityLabel={item.name}
      style={[s.photo, style]}
      resizeMode="cover"
      source={art[item.image] || { uri: item.image }}
    />
  ) : (
    <View style={[s.photo, style]} />
  );
}
export const s = StyleSheet.create({
  paper: { flex: 1, backgroundColor: paper },
  header: {
    paddingHorizontal: 20,
    height: 60,
    borderBottomWidth: 1,
    borderColor: rule,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontFamily: "serif", fontSize: 30, color: ink },
  page: { padding: 18, paddingBottom: 32, gap: 16 },
  title: { fontSize: 36, color: ink, fontFamily: "serif" },
  stack: { gap: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  line: { paddingVertical: 12, borderBottomWidth: 1, borderColor: rule },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: rule,
    borderRadius: 6,
    color: ink,
  },
  dock: {
    borderTopWidth: 1,
    borderColor: rule,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  photo: { height: 170, width: "100%", backgroundColor: "#e6dfd3" },
  hint: { fontSize: 13, color: "#625e57" },
  active: { borderBottomWidth: 2, borderColor: accent },
  tab: { alignItems: "center", justifyContent: "center", height: 50, width: "17%" },
});
export async function gateway(path, body) {
  const base = process.env.EXPO_PUBLIC_API_BASE;
  if (!base) throw Error("尚未连接本机服务");
  const response = await fetch(base.replace(/\/$/, "") + "/api/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "请求失败");
  return data;
}
