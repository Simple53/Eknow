export function stageLayers(items, choice = [], body = {}) {
  const limit = (value, min, max) => Math.max(min, Math.min(max, value));
  const ratio = (key, fallback) =>
    body.height && body[key] ? limit(body[key] / body.height / fallback, 0.8, 1.2) : 1;
  return ["上装", "下装"].map((type, index) => {
    const options = items.filter((item) => item.type === type);
    const item = options.find((item) => item.id === choice[index]) || options[0];
    const cut = ["knit", "trousers"].find((key) => item?.image === "/media/" + key + ".webp");
    const width = index ? 0.3 * ratio("hip", 0.56) : 0.5 * ratio("chest", 0.54);
    return {
      item,
      options,
      asset: cut ? "/media/" + cut + "-cut.webp" : item?.image,
      top: index ? 0.48 : 0.17,
      width,
      height: index ? 0.45 : 0.36,
    };
  });
}
