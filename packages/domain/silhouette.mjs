const median = (values) =>
  [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];

export function silhouette(pixels, width, height) {
  const border = [[], [], []];
  for (let row = 0; row < height; row += 3)
    for (const column of [0, 1, width - 2, width - 1]) {
      for (let channel = 0; channel < 3; channel++)
        border[channel].push(pixels[(row * width + column) * 4 + channel]);
    }
  const background = border.map(median);
  if (
    border.some(
      (values, index) => median(values.map((value) => Math.abs(value - background[index]))) > 18
    )
  )
    throw Error("背景不均匀，请换纯色背景重拍");
  const rows = [];
  for (let row = 0; row < height; row++) {
    let first = width,
      last = -1,
      count = 0;
    for (let column = 1; column < width - 1; column++) {
      const offset = 4 * (row * width + column);
      const distance = background.reduce(
        (sum, value, channel) => sum + (pixels[offset + channel] - value) ** 2,
        0
      );
      if (distance > 52 ** 2) {
        first = Math.min(first, column);
        last = column;
        count++;
      }
    }
    rows.push(
      count >= Math.max(3, width * 0.025) ? { width: last - first + 1, first, last } : null
    );
  }
  const top = rows.findIndex(Boolean),
    bottom = rows.findLastIndex(Boolean),
    length = bottom - top + 1;
  if (
    top < 2 ||
    bottom >= height - 2 ||
    length < height * 0.55 ||
    rows.slice(top, bottom + 1).filter(Boolean).length < length * 0.9
  )
    throw Error("未找到完整轮廓，请让头顶和双脚完整入镜");
  const bands = [0.29, 0.43, 0.55].map((fraction) => {
    const center = top + Math.round(length * fraction);
    const strip = rows.slice(center - 2, center + 3).filter(Boolean);
    if (strip.length < 3 || strip.some((row) => row.first <= 2 || row.last >= width - 3))
      throw Error("轮廓接触边缘，请留出边距");
    return median(strip.map((row) => row.width)) / length;
  });
  return bands;
}
export function fitBody(front, side, back, height) {
  if (!Number.isFinite(height) || height < 50 || height > 250)
    throw Error("请输入用于校准的真实身高");
  const values = {},
    rings = [];
  ["chest", "waist", "hip"].forEach((key, index) => {
    const face = front[index],
      rear = back[index],
      depth = side[index];
    if (
      ![face, rear, depth].every(
        (value) => Number.isFinite(value) && value > 0.055 && value < 0.45
      ) ||
      Math.abs(face - rear) / Math.max(face, rear) > 0.18 ||
      depth > Math.max(face, rear) * 1.12
    )
      throw Error("三个角度轮廓不一致，请检查角度、贴身衣物及背景");
    const horizontal = ((face + rear) * height) / 4,
      vertical = (depth * height) / 2;
    values[key] = Math.round(
      Math.PI *
        (3 * (horizontal + vertical) -
          Math.sqrt((3 * horizontal + vertical) * (horizontal + 3 * vertical)))
    );
    rings.push({
      height: height * (1 - [0.29, 0.43, 0.55][index]),
      width: horizontal * 2,
      depth: vertical * 2,
    });
  });
  return { values, rings };
}
