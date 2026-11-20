import React, { useRef, useState } from "react";
import { Linking, Pressable, Switch, Text, View } from "react-native";
import * as Picker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { VideoView, useVideoPlayer } from "expo-video";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import jpeg from "jpeg-js";
import { toByteArray } from "base64-js";
import {
  checkedBody,
  dateKey,
  measures,
  reference,
  referenceUrl,
} from "../../../packages/domain/core.mjs";
import { fitBody, silhouette } from "../../../packages/domain/silhouette.mjs";
import { accent, Btn, Field, Pic, paper, s, say } from "./native-ui";
const angles = ["正面", "侧面", "背面"];
async function pickPhoto() {
  const result = await Picker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
  return result.canceled ? null : result.assets[0];
}
function clearCached(uri) {
  if (uri?.startsWith(Paths.cache.uri)) {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}
export async function chooseGarmentImage() {
  const asset = await pickPhoto();
  if (!asset) return null;
  const transparent = asset.mimeType === "image/png" || asset.mimeType === "image/webp";
  const sized = await manipulateAsync(
    asset.uri,
    [
      {
        resize:
          asset.width > asset.height
            ? { width: Math.min(1000, asset.width) }
            : { height: Math.min(1000, asset.height) },
      },
    ],
    { compress: 0.8, format: transparent ? SaveFormat.PNG : SaveFormat.JPEG }
  );
  try {
    const target = new File(Paths.document, randomUUID() + (transparent ? ".png" : ".jpg"));
    new File(sized.uri).copy(target);
    return target.uri;
  } finally {
    clearCached(sized.uri);
    clearCached(asset.uri);
  }
}
async function pickBands() {
  const asset = await pickPhoto();
  if (!asset) return null;
  let uri;
  try {
    const small = await manipulateAsync(
      asset.uri,
      [{ resize: asset.width > asset.height ? { width: 400 } : { height: 400 } }],
      { compress: 0.9, format: SaveFormat.JPEG, base64: true }
    );
    uri = small.uri;
    const { data, width, height } = jpeg.decode(toByteArray(small.base64), { useTArray: true });
    return silhouette(data, width, height);
  } finally {
    clearCached(uri);
    clearCached(asset.uri);
  }
}
export function FamilyBody({ member, edit }) {
  const [mode, setMode] = useState("手动"),
    [values, setValues] = useState(member.body),
    [size, setSize] = useState(member.referenceSize || "M"),
    [frames, setFrames] = useState({}),
    [result, setResult] = useState(null),
    [height, setHeight] = useState(member.body.height || ""),
    [ok, setOk] = useState(false),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState({});
  function reset() {
    setResult(null);
    setFrames({});
    setOk(false);
    setSelected({});
  }
  return (
    <View style={s.stack}>
      <View style={s.row}>
        {["手动", "照片建模", "参考数据"].map((option) => (
          <Btn
            key={option}
            muted={mode !== option}
            press={() => {
              setMode(option);
              reset();
            }}
          >
            {option}
          </Btn>
        ))}
      </View>
      {mode === "手动" ? (
        <>
          {Object.entries(measures).map(([key, label]) => (
            <Field
              key={key}
              label={
                label +
                " · " +
                (key === "weight" ? "kg" : "cm") +
                (member.bodySource[key] ? " · " + member.bodySource[key] : "")
              }
              numeric
              value={values[key]}
              change={(value) => setValues({ ...values, [key]: value })}
            />
          ))}
          <Btn
            press={() => {
              try {
                const body = checkedBody(values);
                edit((old) => ({
                  ...old,
                  body,
                  bodySource: Object.fromEntries(
                    Object.keys(body).map((key) => [
                      key,
                      old.body[key] === body[key] ? old.bodySource[key] || "手动" : "手动",
                    ])
                  ),
                }));
                say("已保存测量值");
              } catch (err) {
                say(err.message);
              }
            }}
          >
            保存测量值
          </Btn>
        </>
      ) : mode === "参考数据" ? (
        <>
          <Text>成人男款 · Nike Team</Text>
          <View style={s.row}>
            {Object.keys(reference).map((option) => (
              <Btn key={option} muted={option !== size} press={() => setSize(option)}>
                {option}
              </Btn>
            ))}
          </View>
          {Object.entries(reference[size]).map(([key, range]) => (
            <Text key={key}>
              {measures[key]} · {range.join("–")} cm
            </Text>
          ))}
          <Text style={s.hint}>仅作品牌尺码参考，不是本人实测，不适用于儿童。</Text>
          <Btn muted press={() => Linking.openURL(referenceUrl)}>
            查看原表
          </Btn>
          <Btn
            press={() => {
              edit((old) => ({ ...old, referenceSize: size }));
              say("已保存参考尺码");
            }}
          >
            保存参考尺码
          </Btn>
        </>
      ) : (
        <>
          <Text>纯色背景、贴身衣物、全身入镜。轮廓粗估不保证合身。</Text>
          <View style={s.row}>
            <Switch
              accessibilityLabel="同意本机处理照片"
              value={ok}
              onValueChange={(value) => {
                reset();
                setOk(value);
              }}
            />
            <Text>本人或家人已同意本机处理</Text>
          </View>
          <Field
            numeric
            label="校准身高 · cm"
            value={height}
            change={(value) => {
              setHeight(value);
              setResult(null);
            }}
          />
          {angles.map((angle) => (
            <Btn
              key={angle}
              muted
              disabled={!ok || busy}
              press={async () => {
                setBusy(true);
                setResult(null);
                try {
                  const bands = await pickBands();
                  if (bands) setFrames((old) => ({ ...old, [angle]: bands }));
                } catch (err) {
                  setFrames((old) => ({ ...old, [angle]: null }));
                  say(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {angle + (frames[angle] ? " · 已录入" : " · 选图")}
            </Btn>
          ))}
          <Btn
            disabled={busy || !ok || !angles.every((angle) => frames[angle])}
            press={() => {
              try {
                setResult(fitBody(...angles.map((angle) => frames[angle]), Number(height)));
                setSelected({});
              } catch (err) {
                say(err.message);
              }
            }}
          >
            提取轮廓估测值
          </Btn>
          {result && (
            <>
              {Object.entries(result.values).map(([key, value]) => (
                <View key={key} style={s.row}>
                  <Switch
                    value={!!selected[key]}
                    accessibilityLabel={"采用" + measures[key]}
                    onValueChange={(value) => setSelected({ ...selected, [key]: value })}
                  />
                  <Text>
                    {measures[key]} · 约 {value} cm
                  </Text>
                </View>
              ))}
              <Btn
                disabled={!Object.values(selected).some(Boolean)}
                press={() => {
                  const patch = Object.fromEntries(
                    Object.entries(result.values).filter(([key]) => selected[key])
                  );
                  edit((old) => ({
                    ...old,
                    body: { ...old.body, ...patch },
                    bodySource: {
                      ...old.bodySource,
                      ...Object.fromEntries(Object.keys(patch).map((key) => [key, "照片粗估"])),
                    },
                  }));
                  setValues({ ...values, ...patch });
                  reset();
                  say("已保存选中的估测值");
                }}
              >
                确认测量值
              </Btn>
            </>
          )}
        </>
      )}
    </View>
  );
}
function Player({ uri }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={{ width: "100%", height: 280 }} nativeControls />;
}
export function SelectVideo() {
  const [uri, setUri] = useState("");
  async function choose(camera) {
    try {
      if (camera && !(await Picker.requestCameraPermissionsAsync()).granted)
        return say("需要相机权限");
      const result = await (camera ? Picker.launchCameraAsync : Picker.launchImageLibraryAsync)({
        mediaTypes: ["videos"],
        videoMaxDuration: 30,
      });
      if (!result.canceled) setUri(result.assets[0].uri);
    } catch (err) {
      say(err.message);
    }
  }
  return (
    <View style={s.stack}>
      {uri ? (
        <Player key={uri} uri={uri} />
      ) : (
        <Pic item={{ image: "/media/outfit.webp", name: "图库样册" }} style={{ height: 280 }} />
      )}
      <Btn press={() => choose(true)}>拍摄试穿记录</Btn>
      <Btn muted press={() => choose(false)}>
        播放本地试穿视频
      </Btn>
      <Text style={s.hint}>未启用视频生成服务</Text>
    </View>
  );
}
export function MobileJournal({ member, edit, day, setDay, go }) {
  const date = new Date(day + "T12:00:00"),
    year = date.getFullYear(),
    month = date.getMonth(),
    offset = (new Date(year, month, 1).getDay() + 6) % 7,
    total = new Date(year, month + 1, 0).getDate();
  const entries = member.wears.filter((entry) => entry.date === day),
    [index, setIndex] = useState(0),
    entry = entries[Math.min(index, entries.length - 1)],
    sheet = useRef(null);
  async function share() {
    let uri;
    try {
      if (!(await isAvailableAsync())) throw Error("系统分享不可用");
      uri = await captureRef(sheet, { format: "png", quality: 1 });
      await shareAsync(uri, { mimeType: "image/png", dialogTitle: "导出 OOTD" });
    } catch (err) {
      say(err.message);
    } finally {
      if (uri) releaseCapture(uri);
    }
  }
  return (
    <View style={s.stack}>
      <View style={s.row}>
        <Btn muted press={() => setDay(dateKey(new Date(year, month - 1, 1)))}>
          上月
        </Btn>
        <Text>
          {year} 年 {month + 1} 月
        </Text>
        <Btn muted press={() => setDay(dateKey(new Date(year, month + 1, 1)))}>
          下月
        </Btn>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {[..."一二三四五六日"].map((label) => (
          <Text key={label} style={{ width: "14.28%", textAlign: "center" }}>
            {label}
          </Text>
        ))}
        {Array.from({ length: total + offset }, (_, position) => {
          const number = position - offset + 1,
            key = dateKey(new Date(year, month, number));
          return (
            <Pressable
              key={position}
              disabled={number <= 0}
              accessibilityLabel={key}
              style={{
                width: "14.28%",
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: key === day ? accent : paper,
              }}
              onPress={() => {
                setDay(key);
                setIndex(0);
              }}
            >
              <Text style={{ color: key === day ? "white" : "#25241f" }}>
                {number > 0 ? number : ""}
                {number > 0 && member.wears.some((entry) => entry.date === key) ? "·" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View ref={sheet} collapsable={false} style={{ backgroundColor: paper, padding: 8, gap: 8 }}>
        <Text>
          {day} · {entry ? "穿着记录" : "图库样册"}
        </Text>
        {entry ? (
          entry.pieces.map((item) => (
            <View key={item.id}>
              <Pic item={item} />
              <Text>{item.name}</Text>
            </View>
          ))
        ) : (
          <Pic item={{ image: "/media/outfit.webp" }} style={{ height: 245 }} />
        )}
      </View>
      {entries.length > 1 && (
        <Btn muted press={() => setIndex((index + 1) % entries.length)}>
          下一套
        </Btn>
      )}
      {entry && (
        <>
          <Btn press={share}>导出穿搭图</Btn>
          <Btn
            muted
            press={() =>
              edit((old) => ({ ...old, wears: old.wears.filter((item) => item.id !== entry.id) }))
            }
          >
            撤销记穿
          </Btn>
        </>
      )}
      <Btn muted={!!entry} press={() => go("搭配")}>
        搭配并记穿
      </Btn>
    </View>
  );
}
