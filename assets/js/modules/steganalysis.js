export default class Steganalysis {
  static analyze(imageData) {
    const data = imageData.data;
    const totalPixels = data.length / 4;

    let transitions = 0;
    let ones = 0;

    for (let i = 0; i < totalPixels * 3; i++) {
      const bit = data[i] & 1;
      if (bit === 1) ones++;
      if (i > 0) {
        const prevBit = data[i - 1] & 1;
        if (bit !== prevBit) transitions++;
      }
    }

    const totalBits = totalPixels * 3;
    const onesRatio = ones / totalBits;
    const transitionsRatio = transitions / totalBits;

    const lsbScore =
      1 - (Math.abs(0.5 - onesRatio) + Math.abs(0.5 - transitionsRatio));

    let chiSquare = 0;
    const bins = new Array(256).fill(0);

    for (let i = 0; i < totalPixels * 3; i += 3) {
      bins[data[i]]++;
    }

    for (let i = 0; i < 254; i += 2) {
      const avg = (bins[i] + bins[i + 1]) / 2;
      if (avg > 0) {
        chiSquare += Math.pow(bins[i] - avg, 2) / avg;
        chiSquare += Math.pow(bins[i + 1] - avg, 2) / avg;
      }
    }

    let lsbComplexity = 0;
    let secondBitComplexity = 0;

    for (let i = 1; i < totalPixels * 3; i++) {
      const lsb1 = data[i] & 1;
      const lsbPrev = data[i - 1] & 1;
      if (lsb1 !== lsbPrev) lsbComplexity++;

      const second1 = (data[i] >> 1) & 1;
      const secondPrev = (data[i - 1] >> 1) & 1;
      if (second1 !== secondPrev) secondBitComplexity++;
    }

    const bitPlaneRatio = lsbComplexity / (secondBitComplexity || 1);

    let verdict = "Clean";
    let suspicionLevel = 0;

    if (lsbScore > 0.88) suspicionLevel++;
    if (chiSquare < 200) suspicionLevel++;
    if (bitPlaneRatio > 1.15) suspicionLevel++;

    if (suspicionLevel >= 2) verdict = "Detected";
    else if (suspicionLevel === 1) verdict = "Suspicious";

    return {
      verdict,
      lsbScore: (lsbScore * 100).toFixed(1) + "%",
      chiSquare: chiSquare.toFixed(2),
      bitPlaneNoise: bitPlaneRatio.toFixed(2),
    };
  }
}
