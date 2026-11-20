import React, { useEffect, useRef } from "react";
import { Button } from "@heroui/react";
import { X, ImagePlus } from "lucide-react";
export function Action({ children, onClick, secondary = false, ...rest }) {
  return (
    <Button className={"action " + (secondary ? "secondary" : "")} onPress={onClick} {...rest}>
      {children}
    </Button>
  );
}
export function Segments({ value, onChange, options }) {
  return (
    <div className="segments">
      {options.map((option) => (
        <button key={option} aria-pressed={value === option} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  );
}
export function Dialog({ title, close, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog ref={dialog} aria-label={title} onCancel={close}>
      <div className="dialoghead">
        <h2>{title}</h2>
        <button className="icon" onClick={close} aria-label="关闭">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Picture({ item }) {
  return item?.image ? (
    <img src={item.image} alt={item.name || ""} />
  ) : (
    <div className="placeholder">
      <ImagePlus size={34} />
    </div>
  );
}
export async function loadImage(src) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}
export async function photoData(file, max = 1100) {
  if (!file?.type.startsWith("image/") || file.size > 18 * 1024 * 1024)
    throw Error("请选择小于 18 MB 的图片");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url),
      scale = Math.min(1, max / Math.max(img.width, img.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function api(path, body) {
  const response = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw Error("服务未连接");
  const json = await response.json();
  if (!response.ok) throw Error(json.error || "连接失败");
  return json;
}
export const uid = () => crypto.randomUUID();
