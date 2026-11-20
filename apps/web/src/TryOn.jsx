import React, { useState } from "react";
import { stageLayers } from "../../../packages/domain/tryon.mjs";
export function TryOn({ member }) {
  const [choice, setChoice] = useState([]),
    layers = stageLayers(member.items, choice, member.body);
  return (
    <div className="twocol">
      <div className="figurestage">
        <img src="/media/form.webp" alt="模拟人物" />
        {[...layers]
          .reverse()
          .map(
            (layer) =>
              layer.asset && (
                <img
                  key={layer.item.id}
                  alt={layer.item.name}
                  className="overlay"
                  src={layer.asset}
                  style={{
                    top: layer.top * 100 + "%",
                    left: (1 - layer.width) * 50 + "%",
                    width: layer.width * 100 + "%",
                    height: layer.height * 100 + "%",
                  }}
                />
              )
          )}
      </div>
      <div className="sidepanel">
        {layers.map((layer, index) => (
          <label key={index}>
            {index ? "下装" : "上装"}
            <select
              value={layer.item?.id || ""}
              onChange={(event) =>
                setChoice(
                  layers.map((old, pos) => (pos === index ? event.target.value : old.item?.id))
                )
              }
            >
              {!layer.options.length && <option value="">尚无衣物</option>}
              {layer.options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <small>二维轮廓预览 · 不判断合身。自摄衣物建议使用透明底图片。</small>
      </div>
    </div>
  );
}
