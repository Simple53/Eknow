import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import { stageLayers } from "../../../packages/domain/tryon.mjs";
import { Btn, s } from "./native-ui";
import { SelectVideo } from "./NativeMedia";
const cuts = {
  "/media/knit-cut.webp": require("../assets/media/knit-cut.webp"),
  "/media/trousers-cut.webp": require("../assets/media/trousers-cut.webp"),
};
export function TryOn({ member }) {
  const [video, setVideo] = useState(true),
    [choice, setChoice] = useState([]),
    layers = stageLayers(member.items, choice, member.body);
  return (
    <View style={s.stack}>
      <View style={s.row}>
        <Btn muted={!video} press={() => setVideo(true)}>
          视频
        </Btn>
        <Btn muted={video} press={() => setVideo(false)}>
          模拟人物
        </Btn>
      </View>
      {video ? (
        <SelectVideo />
      ) : (
        <>
          <View
            style={{ width: "80%", maxWidth: 350, alignSelf: "center", aspectRatio: 450 / 740 }}
          >
            <Image
              source={require("../assets/media/form.webp")}
              style={{ width: "100%", height: "100%" }}
              resizeMode="stretch"
            />
            {[...layers]
              .reverse()
              .map(
                (layer) =>
                  layer.asset && (
                    <Image
                      key={layer.item.id}
                      accessibilityLabel={layer.item.name}
                      source={cuts[layer.asset] || { uri: layer.asset }}
                      resizeMode="stretch"
                      style={{
                        position: "absolute",
                        width: layer.width * 100 + "%",
                        height: layer.height * 100 + "%",
                        left: (1 - layer.width) * 50 + "%",
                        top: layer.top * 100 + "%",
                      }}
                    />
                  )
              )}
          </View>
          {layers.map((layer, index) => (
            <Btn
              muted
              key={index}
              disabled={layer.options.length < 2}
              press={() => {
                const position = layer.options.findIndex((item) => item.id === layer.item.id);
                setChoice(
                  layers.map((old, pos) =>
                    pos === index
                      ? layer.options[(position + 1) % layer.options.length].id
                      : old.item?.id
                  )
                );
              }}
            >
              {(index ? "下装：" : "上装：") + (layer.item?.name || "尚无衣物")}
            </Btn>
          ))}
          <Text style={s.hint}>二维轮廓预览，不判断合身</Text>
        </>
      )}
    </View>
  );
}
