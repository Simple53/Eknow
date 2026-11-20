import assert from "node:assert/strict";
import test from "node:test";
import { api } from "./handler.mjs";
const items = [
  { id: "top", name: "衬衣", type: "上装", height: 168 },
  { id: "bottom", name: "长裤", type: "下装" },
];
const env = {
  MODEL_URL: "https://example.invalid/test",
  MODEL_NAME: "test-model",
  MODEL_KEY: "test",
};
const completion = (ids) => ({
  ok: true,
  json: async () => ({
    choices: [{ message: { content: JSON.stringify({ ids, reason: "测试" }) } }],
  }),
});
test("无凭据不会发送数据或伪造结果", async () => {
  const never = () => assert.fail("不得发送");
  await assert.rejects(api("/api/catalog?q=x", "GET", {}, {}, never), /授权/);
  await assert.rejects(api("/api/recommend", "POST", { items }, {}, never), /未配置/);
});
test("模型不收到人体字段，虚构衣物被拒绝", async () => {
  const result = await api(
    "/api/recommend",
    "POST",
    { items, scene: "通勤", body: { height: 170 } },
    env,
    async (url, opts) => {
      assert.equal(url, env.MODEL_URL);
      assert.ok(!opts.body.includes("height"));
      return completion(["bottom", "top"]);
    }
  );
  assert.equal(result.ids.length, 2);
  await assert.rejects(
    api("/api/recommend", "POST", { items }, env, async () => completion(["other", "top"])),
    /无效衣物/
  );
});
test("授权市场请求正确编码，来源和币种得到保留", async () => {
  const result = await api(
    "/api/catalog?q=a%26b",
    "GET",
    {},
    { EBAY_TOKEN: "test" },
    async (url, opts) => {
      assert.ok(url.endsWith("q=a%26b"));
      assert.equal(opts.headers.Authorization, "Bearer test");
      return {
        ok: true,
        json: async () => ({
          itemSummaries: [
            {
              title: "上装",
              itemWebUrl: "https://www.ebay.com/itm/1",
              price: { value: "9.99", currency: "USD" },
            },
          ],
        }),
      };
    }
  );
  assert.equal(result.items[0].currency, "USD");
});
test("商品来源仅映射为官方商品 ID，不读取任意目标链接", async () => {
  const never = () => assert.fail("不得发送");
  await assert.rejects(
    api(
      "/api/import",
      "POST",
      { url: "https://example.org/itm/123456789" },
      { EBAY_TOKEN: "test" },
      never
    ),
    /手动填写/
  );
  const result = await api(
    "/api/import",
    "POST",
    { url: "https://www.ebay.com/itm/test-item/123456789012?ref=ignored" },
    { EBAY_TOKEN: "test" },
    async (url) => {
      assert.equal(
        url,
        "https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=123456789012"
      );
      return {
        ok: true,
        json: async () => ({ title: "针织衫", price: { currency: "USD", value: "10" } }),
      };
    }
  );
  assert.equal(result.name, "针织衫");
  assert.equal(result.currency, "USD");
});
