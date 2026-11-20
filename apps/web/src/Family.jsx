import React, { useState } from "react";
import { ChevronRight, ChevronLeft, Ruler, Users, Settings, Trash2 } from "lucide-react";
import { checkedBody, measures, reference, referenceUrl } from "../../../packages/domain/core.mjs";
import { fitBody, silhouette } from "../../../packages/domain/silhouette.mjs";
import { Action, Segments, api, photoData } from "./ui";
export function Family({ member, edit, notify, page, go, members, add, select }) {
  const [name, setName] = useState(""),
    [status, setStatus] = useState("");
  return (
    <>
      <div className="heading">
        <h1>
          {{
            "family/members": "家庭成员",
            "family/body": "人体档案",
            "family/model": "模型服务",
            "family/privacy": "隐私与数据",
          }[page] || "我的"}
        </h1>
        {page !== "family" && (
          <button className="icon" aria-label="返回我的" onClick={() => go("family")}>
            <ChevronLeft />
          </button>
        )}
      </div>
      {page === "family" ? (
        <div className="list">
          {[
            ["members", "家庭成员", Users],
            ["body", "人体档案", Ruler],
            ["model", "模型服务", Settings],
            ["privacy", "隐私与数据", Trash2],
          ].map(([path, label, Icon]) => (
            <button className="row" key={path} onClick={() => go("family/" + path)}>
              <span>
                <Icon size={18} />
                {label}
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      ) : page === "family/members" ? (
        <div className="form">
          {members.map((item) => (
            <button key={item.id} className="row" onClick={() => select(item.id)}>
              {item.name}
              <b>{item.id === member.id ? "当前" : ""}</b>
            </button>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim() && add(name.trim())) setName("");
            }}
          >
            <label>
              家人称呼
              <input
                required
                maxLength={24}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <Action type="submit">添加家人</Action>
          </form>
        </div>
      ) : page === "family/body" ? (
        <Body member={member} edit={edit} notify={notify} />
      ) : page === "family/model" ? (
        <div className="form">
          <p>模型地址与密钥由本机服务配置，不随衣橱备份。</p>
          <Action
            onClick={async () => {
              try {
                const result = await api("status");
                setStatus(result.ai ? "已配置模型连接，生成搭配时验证供应商" : "尚未配置模型连接");
              } catch (error) {
                setStatus(error.message);
              }
            }}
          >
            检查连接配置
          </Action>
          <output>{status}</output>
        </div>
      ) : (
        <div className="form">
          <p>量体照片只在本机内存中处理。家庭档案共用此设备，不是独立登录账户。</p>
          <Action
            secondary
            onClick={() => {
              if (confirm("删除「" + member.name + "」的量体值和参考尺码？")) {
                edit((old) => ({
                  ...old,
                  body: {},
                  bodySource: {},
                  referenceSize: null,
                  rings: null,
                }));
                notify("已删除人体数据");
              }
            }}
          >
            删除本成员人体数据
          </Action>
        </div>
      )}
    </>
  );
}
function Body({ member, edit, notify }) {
  const [mode, setMode] = useState("手动"),
    [values, setValues] = useState({ ...member.body }),
    [size, setSize] = useState(member.referenceSize || "M"),
    [frames, setFrames] = useState({}),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [height, setHeight] = useState(member.body.height || ""),
    [included, setIncluded] = useState({}),
    [processing, setProcessing] = useState(false);
  async function take(angle, file) {
    if (!file) return;
    setProcessing(true);
    setError("");
    setResult(null);
    setFrames((old) => ({ ...old, [angle]: null }));
    try {
      const canvas = await photoData(file, 450);
      const ctx = canvas.getContext("2d");
      const bands = silhouette(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height
      );
      setFrames((old) => ({
        ...old,
        [angle]: { bands, preview: canvas.toDataURL("image/jpeg", 0.5) },
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }
  function saveManual(event) {
    event.preventDefault();
    try {
      const body = checkedBody(values);
      edit((old) => ({
        ...old,
        body,
        bodySource: Object.fromEntries(
          Object.keys(body).map((key) => [
            key,
            Number(old.body[key]) === body[key] ? old.bodySource[key] || "手动" : "手动",
          ])
        ),
      }));
      setError("");
      notify("已保存" + member.name + "的量体值");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <div className="profile">
      <Segments
        value={mode}
        onChange={(value) => {
          setMode(value);
          setError("");
          setFrames({});
          setResult(null);
          setAccepted(false);
        }}
        options={["手动", "照片建模", "参考数据"]}
      />
      {mode === "手动" ? (
        <form className="form" onSubmit={saveManual}>
          <div className="pair">
            {Object.entries(measures).map(([key, label]) => (
              <label key={key}>
                {label} · {key === "weight" ? "kg" : "cm"}
                <input
                  type="number"
                  step=".1"
                  min=".1"
                  max="500"
                  value={values[key] ?? ""}
                  onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                />
                {member.bodySource[key] && <small>{member.bodySource[key]}</small>}
              </label>
            ))}
          </div>
          <Action type="submit">保存测量值</Action>
        </form>
      ) : mode === "参考数据" ? (
        <div className="form">
          <label>
            成人男款 · Nike Team
            <select value={size} onChange={(event) => setSize(event.target.value)}>
              {Object.keys(reference).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {Object.entries(reference[size]).map(([field, bounds]) => (
            <div className="row" key={field}>
              {measures[field]}
              <b>{bounds.join("–")} cm</b>
            </div>
          ))}
          <small>品牌尺码参考，不是实测值；不适用于儿童。</small>
          <a className="link" target="_blank" rel="noreferrer" href={referenceUrl}>
            查看原始尺码表 ↗
          </a>
          <Action
            onClick={() => {
              edit((old) => ({ ...old, referenceSize: size }));
              notify("已保存参考尺码，未更改实测值");
            }}
          >
            保存参考尺码
          </Action>
        </div>
      ) : (
        <div className="form">
          <p>穿贴身衣物，在纯色背景前拍摄完整全身。三视角轮廓仅作粗估，不用于精确量体。</p>
          <label className="check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => {
                setAccepted(event.target.checked);
                setFrames({});
                setResult(null);
              }}
            />
            本人或家人已同意本机处理
          </label>
          <label>
            校准身高 · cm
            <input
              type="number"
              value={height}
              onChange={(event) => {
                setHeight(event.target.value);
                setResult(null);
              }}
            />
          </label>
          <div className="angles">
            {["正面", "侧面", "背面"].map((angle) => (
              <label key={angle}>
                {angle}
                {frames[angle]?.preview && <img alt={angle + "预览"} src={frames[angle].preview} />}
                <input
                  aria-label={angle + "照片"}
                  type="file"
                  accept="image/*"
                  disabled={!accepted || processing}
                  onChange={(event) => take(angle, event.target.files[0])}
                />
              </label>
            ))}
          </div>
          <Action
            isDisabled={
              !accepted || processing || !["正面", "侧面", "背面"].every((angle) => frames[angle])
            }
            onClick={() => {
              try {
                const fit = fitBody(
                  ...["正面", "侧面", "背面"].map((angle) => frames[angle].bands),
                  Number(height)
                );
                setResult(fit);
                setIncluded({});
                setError("");
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            提取轮廓估测值
          </Action>
          {result && (
            <>
              <p>只勾选愿意保存的估测值</p>
              {Object.entries(result.values).map(([field, value]) => (
                <label className="check" key={field}>
                  <input
                    type="checkbox"
                    checked={!!included[field]}
                    onChange={(event) =>
                      setIncluded({ ...included, [field]: event.target.checked })
                    }
                  />
                  {measures[field]} · 约 {value} cm
                </label>
              ))}
              <Action
                isDisabled={!Object.values(included).some(Boolean)}
                onClick={() => {
                  const patch = Object.fromEntries(
                    Object.entries(result.values).filter(([field]) => included[field])
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
                  setFrames({});
                  setResult(null);
                  notify("已保存选中估测值，原图未保存");
                }}
              >
                确认测量值
              </Action>
            </>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
