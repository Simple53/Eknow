import React, { useEffect, useRef, useState } from "react";
import { Action, Segments } from "./ui";
import { TryOn } from "./TryOn";
export function Video({ member }) {
  const [mode, setMode] = useState("视频");
  return (
    <>
      <div className="heading">
        <h1>试穿</h1>
        <Segments options={["模拟人物", "视频"]} value={mode} onChange={setMode} />
      </div>
      {mode === "模拟人物" ? <TryOn member={member} /> : <LocalVideo />}
    </>
  );
}
function LocalVideo() {
  const [file, setFile] = useState(""),
    [live, setLive] = useState(false),
    [error, setError] = useState("");
  const stream = useRef(),
    alive = useRef(false),
    video = useRef(),
    fileRef = useRef();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stream.current?.getTracks().forEach((track) => track.stop());
      if (fileRef.current) URL.revokeObjectURL(fileRef.current);
    };
  }, []);
  function stop() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setLive(false);
  }
  async function camera() {
    try {
      stop();
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (!alive.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      video.current.srcObject = media;
      await video.current.play();
      setLive(true);
      setError("");
    } catch {
      stop();
      setError("相机不可用，请允许相机权限或选择本地视频");
    }
  }
  return (
    <div className="twocol">
      <video
        ref={video}
        src={file || undefined}
        poster="/media/outfit.webp"
        controls={!live}
        muted={live}
        playsInline
      />
      <div className="sidepanel">
        <Action onClick={live ? stop : camera}>{live ? "关闭相机" : "打开相机预览"}</Action>
        <label>
          打开本地试穿视频
          <input
            type="file"
            accept="video/*"
            onChange={(event) => {
              const choice = event.target.files[0];
              if (!choice) return;
              stop();
              if (fileRef.current) URL.revokeObjectURL(fileRef.current);
              fileRef.current = URL.createObjectURL(choice);
              setFile(fileRef.current);
              setError("");
            }}
          />
        </label>
        <small>仅本机预览 · 未启用视频生成服务</small>
        {error && <p role="status">{error}</p>}
      </div>
    </div>
  );
}
