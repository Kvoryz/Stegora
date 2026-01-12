export default class Steganography {
  static HEADER_BITS = 32;
  static DELIMITER = "<<END>>";
  static SCRAMBLE_MARKER = "<<SCR>>";

  static createPRNG(seed) {
    let state = seed;
    return function () {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  static async passwordToSeed(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    return (
      (hashArray[0] << 24) |
      (hashArray[1] << 16) |
      (hashArray[2] << 8) |
      hashArray[3]
    );
  }

  static generateScrambledIndices(totalPixels, count, prng) {
    const indices = [];
    const used = new Set();

    while (indices.length < count && indices.length < totalPixels) {
      const idx = Math.floor(prng() * totalPixels);
      if (!used.has(idx)) {
        used.add(idx);
        indices.push(idx);
      }
    }

    return indices;
  }

  static compress(str) {
    const dict = {};
    let dictSize = 256;
    let w = "";
    const result = [];

    for (let i = 0; i < 256; i++) {
      dict[String.fromCharCode(i)] = i;
    }

    for (const c of str) {
      const wc = w + c;
      if (dict.hasOwnProperty(wc)) {
        w = wc;
      } else {
        result.push(dict[w]);
        dict[wc] = dictSize++;
        w = c;
      }
    }

    if (w !== "") {
      result.push(dict[w]);
    }

    const bytes = [];
    for (const code of result) {
      bytes.push((code >> 8) & 0xff);
      bytes.push(code & 0xff);
    }

    return btoa(String.fromCharCode(...bytes));
  }

  static decompress(compressed) {
    try {
      const bytes = atob(compressed)
        .split("")
        .map((c) => c.charCodeAt(0));
      const codes = [];

      for (let i = 0; i < bytes.length; i += 2) {
        codes.push((bytes[i] << 8) | bytes[i + 1]);
      }

      const dict = {};
      let dictSize = 256;

      for (let i = 0; i < 256; i++) {
        dict[i] = String.fromCharCode(i);
      }

      let w = String.fromCharCode(codes[0]);
      let result = w;

      for (let i = 1; i < codes.length; i++) {
        const k = codes[i];
        let entry;

        if (dict.hasOwnProperty(k)) {
          entry = dict[k];
        } else if (k === dictSize) {
          entry = w + w.charAt(0);
        } else {
          throw new Error("Decompression error");
        }

        result += entry;
        dict[dictSize++] = w + entry.charAt(0);
        w = entry;
      }

      return result;
    } catch {
      throw new Error("Failed to decompress data");
    }
  }

  static addPadding(str, minPadding = 16, maxPadding = 64) {
    const paddingLength =
      minPadding + Math.floor(Math.random() * (maxPadding - minPadding));
    const padding = Array.from({ length: paddingLength }, () =>
      String.fromCharCode(Math.floor(Math.random() * 94) + 33)
    ).join("");

    return str + "<<PAD>>" + padding;
  }

  static removePadding(str) {
    const padIndex = str.indexOf("<<PAD>>");
    return padIndex !== -1 ? str.substring(0, padIndex) : str;
  }

  static textToBinary(text) {
    return text
      .split("")
      .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");
  }

  static binaryToText(binary) {
    const bytes = binary.match(/.{8}/g) || [];
    return bytes.map((byte) => String.fromCharCode(parseInt(byte, 2))).join("");
  }

  static async encode(imageData, message, password = null) {
    let processedMessage = message;

    if (password) {
      const compressed = this.compress(message);
      const padded = this.addPadding(compressed);
      processedMessage = this.SCRAMBLE_MARKER + padded;
    }

    const fullMessage = processedMessage + this.DELIMITER;
    const binaryMessage = this.textToBinary(fullMessage);
    const messageLength = binaryMessage.length;

    const binaryLength = messageLength
      .toString(2)
      .padStart(this.HEADER_BITS, "0");
    const fullBinary = binaryLength + binaryMessage;

    const totalPixels = imageData.width * imageData.height;
    const requiredBits = fullBinary.length;
    const requiredPixels = Math.ceil(requiredBits / 3);

    if (requiredPixels > totalPixels) {
      throw new Error(
        `Image too small. Need ${requiredPixels} pixels, but only ${totalPixels} available.`
      );
    }

    const data = imageData.data;

    if (password) {
      const seed = await this.passwordToSeed(password);
      const prng = this.createPRNG(seed);
      const pixelIndices = this.generateScrambledIndices(
        totalPixels,
        requiredPixels,
        prng
      );

      let bitIndex = 0;
      for (const pixelIdx of pixelIndices) {
        const dataOffset = pixelIdx * 4;

        data[dataOffset + 3] = 255;

        for (
          let channel = 0;
          channel < 3 && bitIndex < fullBinary.length;
          channel++
        ) {
          const bit = parseInt(fullBinary[bitIndex], 10);
          data[dataOffset + channel] =
            (data[dataOffset + channel] & 0xfe) | bit;
          bitIndex++;
        }
      }
    } else {
      for (let bitIndex = 0; bitIndex < fullBinary.length; bitIndex++) {
        const pixelIndex = Math.floor(bitIndex / 3) * 4;
        const channelOffset = bitIndex % 3;
        const bit = parseInt(fullBinary[bitIndex], 10);

        data[pixelIndex + 3] = 255;

        data[pixelIndex + channelOffset] =
          (data[pixelIndex + channelOffset] & 0xfe) | bit;
      }
    }

    return imageData;
  }

  static async decode(imageData, password = null) {
    const data = imageData.data;
    const totalPixels = imageData.width * imageData.height;

    let binaryLength = "";
    let bitIndex = 0;

    if (password) {
      const seed = await this.passwordToSeed(password);
      const prng = this.createPRNG(seed);

      const headerPixels = Math.ceil(this.HEADER_BITS / 3);
      const pixelIndices = this.generateScrambledIndices(
        totalPixels,
        totalPixels,
        prng
      );

      for (const pixelIdx of pixelIndices.slice(0, headerPixels)) {
        const dataOffset = pixelIdx * 4;
        for (
          let channel = 0;
          channel < 3 && bitIndex < this.HEADER_BITS;
          channel++
        ) {
          binaryLength += (data[dataOffset + channel] & 1).toString();
          bitIndex++;
        }
      }

      const messageLength = parseInt(binaryLength, 2);

      if (messageLength <= 0 || messageLength > 10000000) {
        throw new Error("No hidden message found or wrong password.");
      }

      let binaryMessage = "";
      const totalBitsNeeded = this.HEADER_BITS + messageLength;
      const requiredPixels = Math.ceil(totalBitsNeeded / 3);

      bitIndex = 0;
      for (const pixelIdx of pixelIndices.slice(0, requiredPixels)) {
        const dataOffset = pixelIdx * 4;
        for (
          let channel = 0;
          channel < 3 && bitIndex < totalBitsNeeded;
          channel++
        ) {
          if (bitIndex >= this.HEADER_BITS) {
            binaryMessage += (data[dataOffset + channel] & 1).toString();
          }
          bitIndex++;
        }
      }

      const rawMessage = this.binaryToText(binaryMessage);
      const delimiterIndex = rawMessage.indexOf(this.DELIMITER);

      if (delimiterIndex === -1) {
        throw new Error("No hidden message found or wrong password.");
      }

      let message = rawMessage.substring(0, delimiterIndex);

      if (message.startsWith(this.SCRAMBLE_MARKER)) {
        message = message.slice(this.SCRAMBLE_MARKER.length);
        message = this.removePadding(message);
        message = this.decompress(message);
      }

      return message;
    } else {
      while (bitIndex < this.HEADER_BITS) {
        const pixelIndex = Math.floor(bitIndex / 3) * 4;
        const channelOffset = bitIndex % 3;
        binaryLength += (data[pixelIndex + channelOffset] & 1).toString();
        bitIndex++;
      }

      const messageLength = parseInt(binaryLength, 2);

      if (messageLength <= 0 || messageLength > 10000000) {
        throw new Error("No hidden message found in this image.");
      }

      let binaryMessage = "";
      const totalBitsNeeded = this.HEADER_BITS + messageLength;

      while (bitIndex < totalBitsNeeded) {
        const pixelIndex = Math.floor(bitIndex / 3) * 4;
        const channelOffset = bitIndex % 3;

        if (pixelIndex >= data.length) break;

        binaryMessage += (data[pixelIndex + channelOffset] & 1).toString();
        bitIndex++;
      }

      const message = this.binaryToText(binaryMessage);
      const delimiterIndex = message.indexOf(this.DELIMITER);

      if (delimiterIndex === -1) {
        throw new Error("No hidden message found in this image.");
      }

      return message.substring(0, delimiterIndex);
    }
  }
}
