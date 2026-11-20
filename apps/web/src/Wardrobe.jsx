import React, { useState } from "react";
import { ArrowUpRight, Plus, Search } from "lucide-react";
import { catalog, costs, dateKey } from "../../../packages/domain/core.mjs";
import { Action, Segments, Dialog, Picture, api, photoData, uid } from "./ui";
export function Wardrobe({ member, edit, notify }) {
  const [scope, setScope] = useState("我的衣橱"),
    [query, setQuery] = useState(""),
    [type, setType] = useState("全部"),
    [panel, setPanel] = useState(null),
    [list, setList] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const pieces = member.items.filter(
    (item) => (type === "全部" || item.type === type) && item.name.includes(query.trim())
  );
  const lookup = async () => {
    setBusy(true);
    setList([]);
    setMessage("");
    try {
      const { items } = await api("catalog?q=" + encodeURIComponent(query.trim()));
      setList(items);
      if (!items.length) setMessage("没有找到商品");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="heading">
        <h1>衣橱</h1>
        <Action onClick={() => setPanel({ kind: "add" })}>
          <Plus size={17} />
          添加衣物
        </Action>
      </div>
      <div className="tools">
        <Segments value={scope} onChange={setScope} options={["我的衣橱", "电商市场"]} />
        <form
          className="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (scope === "电商市场" && query.trim() && !busy) lookup();
          }}
        >
          <Search size={17} />
          <input
            aria-label="搜索关键词"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setList([]);
              setMessage("");
            }}
            placeholder={scope === "电商市场" ? "搜索第三方商品" : "搜索衣物"}
          />
          {scope === "电商市场" && <button disabled={busy || !query.trim()}>搜索</button>}
        </form>
      </div>
      {scope === "我的衣橱" ? (
        <>
          <div className="filters">
            <Segments value={type} onChange={setType} options={["全部", "上装", "下装", "其他"]} />
            <span>{pieces.length} 件</span>
          </div>
          <div className="grid">
            {pieces.map((item) => (
              <button
                className="tile"
                key={item.id}
                onClick={() => setPanel({ kind: "detail", item })}
              >
                <Picture item={item} />
                <strong>{item.name}</strong>
                <small>{item.type}</small>
              </button>
            ))}
          </div>
          {!member.items.length && (
            <div className="catalog">
              <h2>从图库添加</h2>
              <div className="grid">
                {catalog.map((item) => (
                  <button
                    className="tile"
                    key={item.key}
                    onClick={() => setPanel({ kind: "add", item })}
                  >
                    <Picture item={item} />
                    <strong>{item.name}</strong>
                    <small>添加到衣橱 ↗</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {member.items.length > 0 && !pieces.length && <p>没有符合条件的衣物</p>}
        </>
      ) : (
        <section className="list">
          <p role="status">{busy ? "正在搜索…" : message}</p>
          {query.trim() && (
            <div className="links">
              {[
                ["淘宝", "https://s.taobao.com/search?q="],
                ["京东", "https://search.jd.com/Search?keyword="],
                ["eBay", "https://www.ebay.com/sch/i.html?_nkw="],
              ].map(([name, url]) => (
                <a
                  key={name}
                  href={url + encodeURIComponent(query.trim())}
                  target="_blank"
                  rel="noreferrer"
                >
                  {name}搜索 <ArrowUpRight size={15} />
                </a>
              ))}
            </div>
          )}
          {list.map((item) => (
            <div className="row" key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.name} · {item.price} {item.currency}
              </a>
              <button onClick={() => setPanel({ kind: "add", item })}>导入</button>
            </div>
          ))}
        </section>
      )}
      {panel?.kind === "add" && (
        <AddItem
          preset={panel.item}
          close={() => setPanel(null)}
          save={(item) => {
            edit((old) => ({ ...old, items: [...old.items, item] }));
            setPanel(null);
            notify("已添加到" + member.name + "的衣橱");
          }}
        />
      )}
      {panel?.kind === "detail" && (
        <Dialog title={panel.item.name} close={() => setPanel(null)}>
          <Picture item={panel.item} />
          {Object.entries(costs(panel.item, member.wears)).map(([key, value]) => (
            <div className="row" key={key}>
              <span>{{ count: "穿着天数", holding: "持有日均", worn: "穿着日均" }[key]}</span>
              <b>
                {key === "count" ? value + " 天" : value == null ? "—" : "¥" + value.toFixed(2)}
              </b>
            </div>
          ))}
        </Dialog>
      )}
    </>
  );
}
function AddItem({ preset, save, close }) {
  const [name, setName] = useState(preset?.name || ""),
    [type, setType] = useState(preset?.type || "上装"),
    [price, setPrice] = useState(""),
    [bought, setBought] = useState(dateKey()),
    [image, setImage] = useState(preset?.image || ""),
    [link, setLink] = useState(preset?.url || ""),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function fromLink() {
    setPending(true);
    try {
      const item = await api("import", { url: link });
      setName(item.name);
      setError(
        item.currency
          ? "商品标价 " + item.price + " " + item.currency + "，请填写实际人民币付款金额"
          : "已读取商品名称"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }
  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (link && !/^https?:\/\//i.test(link)) {
      setError("请输入商品网页链接");
      return;
    }
    save({
      id: uid(),
      name: name.trim(),
      type,
      image,
      bought,
      cents: price === "" ? null : Math.round(Number(price) * 100),
      source: link,
    });
  };
  return (
    <Dialog title="添加衣物" close={close}>
      <form className="form" onSubmit={submit}>
        <div className="minipics">
          {catalog.map((item) => (
            <button
              type="button"
              key={item.key}
              aria-label={"选用" + item.name}
              onClick={() => {
                setName(item.name);
                setType(item.type);
                setImage(item.image);
              }}
            >
              <Picture item={item} />
            </button>
          ))}
        </div>
        <label>
          名称
          <input
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          类别
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {["上装", "下装", "其他"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          图片
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setPending(true);
              try {
                setImage((await photoData(file)).toDataURL("image/webp", 0.82));
                setError("");
              } catch (err) {
                setError(err.message);
              } finally {
                setPending(false);
              }
            }}
          />
        </label>
        <div className="pair">
          <label>
            实付价（元）
            <input
              type="number"
              min="0"
              step=".01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <label>
            购买日
            <input
              type="date"
              max={dateKey()}
              value={bought}
              onChange={(event) => setBought(event.target.value)}
            />
          </label>
        </div>
        <label>
          商品来源
          <input
            type="url"
            placeholder="https://"
            value={link}
            onChange={(event) => setLink(event.target.value)}
          />
        </label>
        {link && (
          <Action secondary type="button" isDisabled={pending} onClick={fromLink}>
            读取商品链接
          </Action>
        )}
        {error && <p role="alert">{error}</p>}
        <Action type="submit" isDisabled={pending}>
          保存衣物
        </Action>
      </form>
    </Dialog>
  );
}
