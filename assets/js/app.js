class Crypto {
  static ENCRYPTED_PREFIX = "<<ENC>>";

  static async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  static async encrypt(message, password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encoder.encode(message)
    );

    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return this.ENCRYPTED_PREFIX + btoa(String.fromCharCode(...combined));
  }

  static async decrypt(encryptedData, password) {
    if (!encryptedData.startsWith(this.ENCRYPTED_PREFIX)) {
      return encryptedData;
    }

    const data = encryptedData.slice(this.ENCRYPTED_PREFIX.length);
    const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await this.deriveKey(password, salt);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encrypted
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      throw new Error("Incorrect password or corrupted data");
    }
  }

  static isEncrypted(message) {
    return message.startsWith(this.ENCRYPTED_PREFIX);
  }

  static async hash(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

class Steganography {
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

class AudioSteganography {
  static HEADER_BITS = 32;
  static DELIMITER = "<<END>>";

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

  static async encode(audioBuffer, message) {
    const fullMessage = message + this.DELIMITER;
    const binaryMessage = this.textToBinary(fullMessage);
    const messageLength = binaryMessage.length;

    const binaryLength = messageLength
      .toString(2)
      .padStart(this.HEADER_BITS, "0");
    const fullBinary = binaryLength + binaryMessage;

    const view = new DataView(audioBuffer);
    const dataStart = 44;
    const bytesPerSample = view.getUint16(34, true) / 8;
    const numSamples = (audioBuffer.byteLength - dataStart) / bytesPerSample;

    if (fullBinary.length > numSamples) {
      throw new Error(
        `Audio too short. Need ${fullBinary.length} samples, but only ${numSamples} available.`
      );
    }

    const result = new Uint8Array(audioBuffer.slice(0));

    for (let i = 0; i < fullBinary.length; i++) {
      const sampleIndex = dataStart + i * bytesPerSample;
      const bit = parseInt(fullBinary[i], 10);
      result[sampleIndex] = (result[sampleIndex] & 0xfe) | bit;
    }

    return result.buffer;
  }

  static async decode(audioBuffer) {
    const view = new DataView(audioBuffer);
    const dataStart = 44;
    const bytesPerSample = view.getUint16(34, true) / 8;
    const data = new Uint8Array(audioBuffer);

    let binaryLength = "";
    let bitIndex = 0;

    while (bitIndex < this.HEADER_BITS) {
      const sampleIndex = dataStart + bitIndex * bytesPerSample;
      binaryLength += (data[sampleIndex] & 1).toString();
      bitIndex++;
    }

    const messageLength = parseInt(binaryLength, 2);

    if (messageLength <= 0 || messageLength > 10000000) {
      throw new Error("No hidden message found in this audio.");
    }

    let binaryMessage = "";
    const totalBitsNeeded = this.HEADER_BITS + messageLength;

    while (bitIndex < totalBitsNeeded) {
      const sampleIndex = dataStart + bitIndex * bytesPerSample;
      if (sampleIndex >= data.length) break;
      binaryMessage += (data[sampleIndex] & 1).toString();
      bitIndex++;
    }

    const message = this.binaryToText(binaryMessage);
    const delimiterIndex = message.indexOf(this.DELIMITER);

    if (delimiterIndex === -1) {
      throw new Error("No hidden message found in this audio.");
    }

    return message.substring(0, delimiterIndex);
  }
}

class Steganalysis {
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

class MetadataScanner {
  static async scan(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const findings = [];
    const details = {};

    if (view.getUint16(0) === 0xffd8) {
      let offset = 2;
      while (offset < view.byteLength) {
        if (view.getUint8(offset) !== 0xff) break;
        const marker = view.getUint8(offset + 1);
        const length = view.getUint16(offset + 2);

        if (marker === 0xe1) {
          findings.push("Exif Metadata (APP1)");
          const exifData = this.parseExif(view, offset + 4);
          if (exifData) Object.assign(details, exifData);
        }
        if (marker === 0xe0) findings.push("JFIF Header (APP0)");
        if (marker === 0xfe) findings.push("JPEG Comment");
        if (marker === 0xed) findings.push("Photoshop Metadata");

        offset += 2 + length;
      }
    }

    if (view.getUint32(0) === 0x89504e47) {
      let offset = 8;
      while (offset < view.byteLength) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(
          view.getUint8(offset + 4),
          view.getUint8(offset + 5),
          view.getUint8(offset + 6),
          view.getUint8(offset + 7)
        );

        if (["tEXt", "zTXt", "iTXt"].includes(type))
          findings.push(`Text Data (${type})`);
        if (type === "pHYs") findings.push("Physical Dimensions (pHYs)");
        if (type === "tIME") findings.push("Modification Time (tIME)");
        if (type === "eXIf") findings.push("Raw Exif (eXIf)");

        offset += 12 + length;
      }
    }

    return {
      findings: findings.length > 0 ? findings : ["No hidden metadata found"],
      details,
    };
  }

  static parseExif(view, start) {
    const tiffStart = start + 6;
    if (
      String.fromCharCode(
        view.getUint8(start),
        view.getUint8(start + 1),
        view.getUint8(start + 2),
        view.getUint8(start + 3)
      ) !== "Exif"
    )
      return null;

    const littleEndian = view.getUint16(tiffStart) === 0x4949;
    const firstIFDOffset = view.getUint32(tiffStart + 4, littleEndian);
    if (firstIFDOffset < 8) return null;

    const tags = {};
    const ifdOffset = tiffStart + firstIFDOffset;
    const entries = view.getUint16(ifdOffset, littleEndian);

    for (let i = 0; i < entries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      const tag = view.getUint16(entryOffset, littleEndian);
      const type = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);
      const valueOffset = view.getUint32(entryOffset + 8, littleEndian);

      const dataOffset =
        count * (type === 3 ? 2 : type === 5 || type === 10 ? 8 : 1) > 4
          ? tiffStart + valueOffset
          : entryOffset + 8;

      if (tag === 0x0110) tags.model = this.readString(view, dataOffset, count);
      if (tag === 0x010f) tags.make = this.readString(view, dataOffset, count);
      if (tag === 0x0132 || tag === 0x9003)
        tags.date = this.readString(view, dataOffset, count);
      if (tag === 0x0131)
        tags.software = this.readString(view, dataOffset, count);
      if (tag === 0x013b)
        tags.artist = this.readString(view, dataOffset, count);
      if (tag === 0x8298)
        tags.copyright = this.readString(view, dataOffset, count);
      if (tag === 0x010e) tags.desc = this.readString(view, dataOffset, count);

      if (tag === 0x8825 && type === 4) {
        const gpsIfdOffset = tiffStart + valueOffset;
        try {
          Object.assign(
            tags,
            this.parseGPS(view, gpsIfdOffset, littleEndian, tiffStart)
          );
        } catch (e) {
          console.warn("GPS parsing failed:", e);
        }
      }

      // Check EXIF sub-IFD for GPS pointer
      if (tag === 0x8769 && type === 4) {
        const exifIfdOffset = tiffStart + valueOffset;
        try {
          const exifEntries = view.getUint16(exifIfdOffset, littleEndian);
          for (let j = 0; j < exifEntries; j++) {
            const exifEntryOffset = exifIfdOffset + 2 + j * 12;
            const exifTag = view.getUint16(exifEntryOffset, littleEndian);
            const exifType = view.getUint16(exifEntryOffset + 2, littleEndian);
            const exifValOffset = view.getUint32(
              exifEntryOffset + 8,
              littleEndian
            );
            if (exifTag === 0x8825 && exifType === 4) {
              const gpsIfdOffset = tiffStart + exifValOffset;
              Object.assign(
                tags,
                this.parseGPS(view, gpsIfdOffset, littleEndian, tiffStart)
              );
            }
          }
        } catch (e) {
          console.warn("EXIF sub-IFD parsing failed:", e);
        }
      }
    }
    return tags;
  }

  static parseGPS(view, offset, littleEndian, tiffStart) {
    const entries = view.getUint16(offset, littleEndian);
    let lat = [],
      lon = [],
      latRef = "",
      lonRef = "";

    for (let i = 0; i < entries; i++) {
      const entryOffset = offset + 2 + i * 12;
      const tag = view.getUint16(entryOffset, littleEndian);
      const type = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);
      const valueOffset = view.getUint32(entryOffset + 8, littleEndian);

      const typeSize = type === 5 || type === 10 ? 8 : 1;
      const dataOffset =
        count * typeSize > 4 ? tiffStart + valueOffset : entryOffset + 8;

      if (tag === 1) latRef = this.readString(view, dataOffset, count);
      if (tag === 2)
        lat = [
          this.readRational(view, dataOffset, littleEndian),
          this.readRational(view, dataOffset + 8, littleEndian),
          this.readRational(view, dataOffset + 16, littleEndian),
        ];
      if (tag === 3) lonRef = this.readString(view, dataOffset, count);
      if (tag === 4)
        lon = [
          this.readRational(view, dataOffset, littleEndian),
          this.readRational(view, dataOffset + 8, littleEndian),
          this.readRational(view, dataOffset + 16, littleEndian),
        ];
    }

    if (lat.length && lon.length) {
      const latMult = latRef && latRef.toUpperCase().startsWith("S") ? -1 : 1;
      const lonMult = lonRef && lonRef.toUpperCase().startsWith("W") ? -1 : 1;

      const latDec = (lat[0] + lat[1] / 60 + lat[2] / 3600) * latMult;
      const lonDec = (lon[0] + lon[1] / 60 + lon[2] / 3600) * lonMult;

      return { gps: `${latDec.toFixed(6)}, ${lonDec.toFixed(6)}` };
    }
    return {};
  }

  static readRational(view, offset, littleEndian) {
    const num = view.getUint32(offset, littleEndian);
    const den = view.getUint32(offset + 4, littleEndian);
    return den === 0 ? 0 : num / den;
  }

  static readString(view, offset, length) {
    let str = "";
    for (let i = 0; i < length; i++) {
      const char = view.getUint8(offset + i);
      if (char === 0) break;
      str += String.fromCharCode(char);
    }
    return str.trim();
  }
}

class StegoraApp {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.encodeImage = null;
    this.decodeImage = null;
    this.audioEncodeBuffer = null;
    this.audioDecodeBuffer = null;

    this.initTabs();
    this.initEncode();
    this.initDecode();
    this.initPasswordToggles();
    this.initModal();
    this.initHashCopy();
    this.initAudio();
    this.initAnalyze();
  }

  initTabs() {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        document
          .querySelectorAll(".panel")
          .forEach((p) => p.classList.remove("active"));
        document
          .getElementById(`${tab.dataset.tab}-panel`)
          .classList.add("active");
      });
    });
  }

  initPasswordToggles() {
    const toggles = [
      { btn: "toggle-encode-password", input: "encode-password" },
      { btn: "toggle-decode-password", input: "decode-password" },
    ];

    toggles.forEach(({ btn, input }) => {
      const button = document.getElementById(btn);
      const passwordInput = document.getElementById(input);

      if (button && passwordInput) {
        button.addEventListener("click", () => {
          const isPassword = passwordInput.type === "password";
          passwordInput.type = isPassword ? "text" : "password";
          button.classList.toggle("active", isPassword);
        });
      }
    });
  }

  initModal() {
    const modal = document.getElementById("image-modal");
    const modalImage = document.getElementById("modal-image");
    const modalClose = document.getElementById("modal-close");
    const backdrop = modal.querySelector(".modal-backdrop");

    document.querySelectorAll(".preview-view").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetId = btn.dataset.target;
        const img = document.getElementById(targetId);
        if (img && img.src) {
          modalImage.src = img.src;
          modal.hidden = false;
          document.body.style.overflow = "hidden";
        }
      });
    });

    const closeModal = () => {
      modal.hidden = true;
      document.body.style.overflow = "";
    };

    modalClose.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });
  }

  initEncode() {
    const dropzone = document.getElementById("encode-dropzone");
    const input = document.getElementById("encode-image-input");
    const preview = document.getElementById("encode-preview");
    const previewImg = document.getElementById("encode-preview-img");
    const removeBtn = document.getElementById("encode-remove");
    const messageInput = document.getElementById("secret-message");
    const charCount = document.getElementById("char-count");
    const maxCharsDisplay = document.getElementById("max-chars");
    const submitBtn = document.getElementById("submit-btn");
    const modal = document.getElementById("submit-modal");
    const modalClose = document.getElementById("submit-modal-close");
    const sanitizeBtn = document.getElementById("sanitize-btn");
    const confirmEncodeBtn = document.getElementById("confirm-encode-btn");

    let maxAllowedChars = 0;

    this.setupDropzone(dropzone, input, (file) => {
      this.encodeFile = file;
      this.loadImage(file)
        .then((img) => {
          this.encodeImage = img;

          const totalPixels =
            (img.width || img.naturalWidth) * (img.height || img.naturalHeight);
          maxAllowedChars = Math.floor((totalPixels * 3 - 88) / 8);

          if (maxAllowedChars < 0) maxAllowedChars = 0;
          maxCharsDisplay.textContent = maxAllowedChars.toLocaleString();

          previewImg.src = URL.createObjectURL(file);
          preview.hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;
          this.updateEncodeButton(maxAllowedChars);
        })
        .catch((err) => {
          this.showToast(err.message, "error");
        });
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.encodeImage = null;
      this.encodeFile = null;
      maxAllowedChars = 0;
      maxCharsDisplay.textContent = "0";
      charCount.textContent = "0";
      preview.hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      input.value = "";

      document.getElementById("secret-message").value = "";
      document.getElementById("encode-password").value = "";
      document.getElementById("encode-hash-display").hidden = true;
      document.getElementById("encode-hash-value").textContent = "";

      this.updateEncodeButton(maxAllowedChars);
    });

    messageInput.addEventListener("input", () => {
      const len = messageInput.value.length;
      charCount.textContent = len.toLocaleString();

      if (len > maxAllowedChars && maxAllowedChars > 0) {
        charCount.style.color = "red";
      } else {
        charCount.style.color = "inherit";
      }

      this.updateEncodeButton(maxAllowedChars);
    });

    submitBtn.addEventListener("click", () => {
      const password = document.getElementById("encode-password").value.trim();
      const scrambleBtn = document.getElementById("scramble-btn");
      if (scrambleBtn) {
        scrambleBtn.disabled = !password;
      }
      this.updateEncodeButton(maxAllowedChars);
      modal.hidden = false;
    });

    modalClose.addEventListener("click", () => {
      modal.hidden = true;
    });

    sanitizeBtn.addEventListener("click", () => {
      modal.hidden = true;
      this.sanitize();
    });

    confirmEncodeBtn.addEventListener("click", () => {
      modal.hidden = true;
      this.encode();
    });

    const scrambleBtn = document.getElementById("scramble-btn");
    scrambleBtn.addEventListener("click", () => {
      modal.hidden = true;
      this.scramble();
    });

    const passwordInput = document.getElementById("encode-password");
    passwordInput.addEventListener("input", () => {
      this.updateEncodeButton(maxAllowedChars);
    });
  }

  initDecode() {
    const dropzone = document.getElementById("decode-dropzone");
    const input = document.getElementById("decode-image-input");
    const preview = document.getElementById("decode-preview");
    const previewImg = document.getElementById("decode-preview-img");
    const removeBtn = document.getElementById("decode-remove");
    const decodeBtn = document.getElementById("decode-btn");
    const unscrambleBtn = document.getElementById("unscramble-btn");
    const copyBtn = document.getElementById("copy-btn");
    const passwordInput = document.getElementById("decode-password");

    const updateUnscrambleBtn = () => {
      const hasImage = !!this.decodeImage;
      const hasPassword = !!passwordInput.value.trim();
      const isScrambledFile =
        this.decodeFile && this.decodeFile.name.startsWith("scramble_");
      unscrambleBtn.disabled = !hasImage || !hasPassword || !isScrambledFile;
      if (hasImage && !isScrambledFile) {
        unscrambleBtn.title = "Only scrambled images can be unscrambled";
      } else if (!hasPassword) {
        unscrambleBtn.title = "Password required";
      } else {
        unscrambleBtn.title = "";
      }
    };

    this.setupDropzone(dropzone, input, (file) => {
      this.loadImage(file)
        .then((img) => {
          this.decodeImage = img;
          this.decodeFile = file;
          previewImg.src = URL.createObjectURL(file);
          preview.hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;

          const isScrambledFile = file.name.startsWith("scramble_");
          decodeBtn.disabled = isScrambledFile;
          if (isScrambledFile) {
            decodeBtn.title =
              "Scrambled images cannot be decoded. Use Unscramble instead.";
          } else {
            decodeBtn.title = "";
          }

          updateUnscrambleBtn();
          document.getElementById("result-box").hidden = true;
        })
        .catch((err) => {
          this.showToast(err.message, "error");
        });
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.decodeImage = null;
      this.decodeFile = null;
      preview.hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      input.value = "";
      passwordInput.value = "";
      decodeBtn.disabled = true;
      unscrambleBtn.disabled = true;
      document.getElementById("result-box").hidden = true;
    });

    passwordInput.addEventListener("input", updateUnscrambleBtn);

    decodeBtn.addEventListener("click", () => this.decode());
    unscrambleBtn.addEventListener("click", () => this.unscramble());

    copyBtn.addEventListener("click", () => {
      const message = document.getElementById("result-message").textContent;
      navigator.clipboard.writeText(message).then(() => {
        this.showToast("Copied to clipboard!", "success");
      });
    });
  }

  setupDropzone(dropzone, input, onFile) {
    dropzone.addEventListener("click", () => input.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        onFile(file);
      } else {
        this.showToast("Please drop a valid image file", "error");
      }
    });

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) onFile(file);
    });
  }

  async loadImage(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please select a valid image file");
    }

    try {
      return await createImageBitmap(file, {
        colorSpaceConversion: "none",
        imageOrientation: "none",
        premultiplyAlpha: "none",
      });
    } catch (e) {
      console.error("createImageBitmap failed, falling back:", e);
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = URL.createObjectURL(file);
      });
    }
  }

  updateEncodeButton(maxChars = 0) {
    const message = document.getElementById("secret-message").value;
    const hasImage = !!this.encodeImage;
    const hasMessage = !!message.trim();
    const isWithinLimit = maxChars > 0 ? message.length <= maxChars : true;

    const submitBtn = document.getElementById("submit-btn");
    const confirmEncodeBtn = document.getElementById("confirm-encode-btn");
    const scrambleBtn = document.getElementById("scramble-btn");
    const password = document.getElementById("encode-password").value.trim();
    const hasPassword = !!password;

    if (submitBtn) {
      submitBtn.disabled = !hasImage;
    }

    if (confirmEncodeBtn) {
      confirmEncodeBtn.disabled = !hasMessage || !isWithinLimit;
      if (!isWithinLimit && hasMessage) {
        confirmEncodeBtn.title = "Message too long for this image";
      } else if (!hasMessage) {
        confirmEncodeBtn.title = "Enter a secret message first";
      } else {
        confirmEncodeBtn.title = "";
      }
    }

    if (scrambleBtn) {
      scrambleBtn.disabled = !hasPassword;
      scrambleBtn.title = hasPassword ? "" : "Password required for scramble";
    }
  }

  async sanitize() {
    if (!this.encodeImage) {
      this.showToast("Please provide an image first", "error");
      return;
    }

    this.showToast("Sanitizing image...", "");

    this.canvas.width = this.encodeImage.width || this.encodeImage.naturalWidth;
    this.canvas.height =
      this.encodeImage.height || this.encodeImage.naturalHeight;
    this.ctx.drawImage(this.encodeImage, 0, 0);

    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = this.encodeFile
        ? this.encodeFile.name.replace(/\.[^/.]+$/, "")
        : "image";
      a.download = `sanitize_${baseName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast("Metadata removed & saved!", "success");
    }, "image/png");
  }

  mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  async hashToSeed(password) {
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

  async scramble() {
    const password = document.getElementById("encode-password").value.trim();

    if (!this.encodeImage) {
      this.showToast("Please provide an image first", "error");
      return;
    }

    if (!password) {
      this.showToast("Password required for scramble", "error");
      return;
    }

    this.showToast("Scrambling image...", "");

    await new Promise((r) => setTimeout(r, 50));

    this.canvas.width = this.encodeImage.width || this.encodeImage.naturalWidth;
    this.canvas.height =
      this.encodeImage.height || this.encodeImage.naturalHeight;
    this.ctx.drawImage(this.encodeImage, 0, 0);

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const data = imageData.data;

    const seed = await this.hashToSeed(password);
    const prng = this.mulberry32(seed);

    const chunkSize = 500000;
    const totalPixels = data.length;

    const processChunk = (start) => {
      return new Promise((resolve) => {
        const end = Math.min(start + chunkSize, totalPixels);
        for (let i = start; i < end; i += 4) {
          data[i] ^= (prng() * 256) | 0;
          data[i + 1] ^= (prng() * 256) | 0;
          data[i + 2] ^= (prng() * 256) | 0;
        }
        requestAnimationFrame(resolve);
      });
    };

    for (let i = 0; i < totalPixels; i += chunkSize) {
      await processChunk(i);
    }

    this.ctx.putImageData(imageData, 0, 0);

    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = this.encodeFile
        ? this.encodeFile.name.replace(/\.[^/.]+$/, "")
        : "image";
      a.download = `scramble_${baseName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast(
        "Image scrambled! Use same password to restore.",
        "success"
      );
    }, "image/png");
  }

  async unscramble() {
    const password = document.getElementById("decode-password").value.trim();

    if (!this.decodeImage) {
      this.showToast("Please provide an image first", "error");
      return;
    }

    if (!password) {
      this.showToast("Password required for unscramble", "error");
      return;
    }

    this.showToast("Unscrambling image...", "");

    await new Promise((r) => setTimeout(r, 50));

    this.canvas.width = this.decodeImage.width || this.decodeImage.naturalWidth;
    this.canvas.height =
      this.decodeImage.height || this.decodeImage.naturalHeight;
    this.ctx.drawImage(this.decodeImage, 0, 0);

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const data = imageData.data;

    const seed = await this.hashToSeed(password);
    const prng = this.mulberry32(seed);

    const chunkSize = 500000;
    const totalPixels = data.length;

    const processChunk = (start) => {
      return new Promise((resolve) => {
        const end = Math.min(start + chunkSize, totalPixels);
        for (let i = start; i < end; i += 4) {
          data[i] ^= (prng() * 256) | 0;
          data[i + 1] ^= (prng() * 256) | 0;
          data[i + 2] ^= (prng() * 256) | 0;
        }
        requestAnimationFrame(resolve);
      });
    };

    for (let i = 0; i < totalPixels; i += chunkSize) {
      await processChunk(i);
    }

    this.ctx.putImageData(imageData, 0, 0);

    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = this.decodeFile
        ? this.decodeFile.name
            .replace(/\.[^/.]+$/, "")
            .replace(/^scramble_/, "")
        : "image";
      a.download = `unscramble_${baseName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast("Image restored!", "success");
    }, "image/png");
  }

  async encode() {
    const message = document.getElementById("secret-message").value.trim();
    const password = document.getElementById("encode-password").value.trim();
    const decoyMessage = "Who are you?";

    if (!this.encodeImage || !message) {
      this.showToast("Please provide an image and message", "error");
      return;
    }

    try {
      let finalMessage = message;

      if (password) {
        this.showToast("Securing message...", "");
        const encryptedReal = await Crypto.encrypt(message, password);
        finalMessage =
          "<<DECOY>>" +
          JSON.stringify({
            real: encryptedReal,
            decoy: decoyMessage,
          });
      }

      this.canvas.width =
        this.encodeImage.width || this.encodeImage.naturalWidth;
      this.canvas.height =
        this.encodeImage.height || this.encodeImage.naturalHeight;
      this.ctx.drawImage(this.encodeImage, 0, 0);

      const imageData = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      const encodedData = await Steganography.encode(
        imageData,
        finalMessage,
        null
      );
      this.ctx.putImageData(encodedData, 0, 0);

      const messageHash = await Crypto.hash(message);
      document.getElementById("encode-hash-value").textContent = messageHash;
      document.getElementById("encode-hash-display").hidden = false;

      this.canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const baseName = this.encodeFile
          ? this.encodeFile.name.replace(/\.[^/.]+$/, "")
          : "image";
        a.download = `stegora_${baseName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const successMsg = password
          ? "Sanitized, Secured with decoy & Encoded!"
          : "Sanitized & Encoded!";
        this.showToast(successMsg, "success");
      }, "image/png");
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  async decode() {
    if (!this.decodeImage) {
      this.showToast("Please provide an image", "error");
      return;
    }

    const password = document.getElementById("decode-password").value.trim();

    try {
      this.canvas.width =
        this.decodeImage.width || this.decodeImage.naturalWidth;
      this.canvas.height =
        this.decodeImage.height || this.decodeImage.naturalHeight;
      this.ctx.drawImage(this.decodeImage, 0, 0);

      const imageData = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      let message;
      let usedScrambling = false;

      try {
        message = await Steganography.decode(imageData, null);
      } catch (sequentialError) {
        if (password) {
          try {
            message = await Steganography.decode(imageData, password);
            usedScrambling = true;
          } catch (scrambledError) {
            throw new Error("No hidden message found or wrong password.");
          }
        } else {
          throw new Error("No hidden message found.");
        }
      }

      if (message.startsWith("<<DECOY>>")) {
        const jsonPart = message.slice(9);
        try {
          const data = JSON.parse(jsonPart);

          if (!password) {
            message = data.decoy;
            this.showToast("Message decoded (Decoy Mode)", "success");
          } else {
            try {
              message = await Crypto.decrypt(data.real, password);
              this.showToast("Message decoded!", "success");
            } catch {
              message = data.decoy;
              this.showToast("Message decoded (Decoy Mode)", "success");
            }
          }
        } catch {
          this.showToast("Failed to parse message structure", "error");
          return;
        }
      } else if (Crypto.isEncrypted(message)) {
        if (!password) {
          this.showToast(
            "This message is encrypted. Please enter the password.",
            "error"
          );
          return;
        }
        try {
          message = await Crypto.decrypt(message, password);
        } catch (e) {
          throw new Error("Wrong password.");
        }
      }

      const messageHash = await Crypto.hash(message);
      document.getElementById("decode-hash-value").textContent = messageHash;

      if (
        !message.startsWith("<<DECOY>>") &&
        !usedScrambling &&
        !Crypto.isEncrypted(message)
      ) {
        this.showToast("Message decoded!", "success");
      }

      document.getElementById("result-message").textContent = message;
      document.getElementById("result-box").hidden = false;
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  initHashCopy() {
    const copyEncodeHash = document.getElementById("copy-encode-hash");
    const copyDecodeHash = document.getElementById("copy-decode-hash");

    if (copyEncodeHash) {
      copyEncodeHash.addEventListener("click", () => {
        const hash = document.getElementById("encode-hash-value").textContent;
        navigator.clipboard.writeText(hash).then(() => {
          this.showToast("Hash copied!", "success");
        });
      });
    }

    if (copyDecodeHash) {
      copyDecodeHash.addEventListener("click", () => {
        const hash = document.getElementById("decode-hash-value").textContent;
        navigator.clipboard.writeText(hash).then(() => {
          this.showToast("Hash copied!", "success");
        });
      });
    }
  }

  initAudio() {
    const modeButtons = document.querySelectorAll(".audio-mode");
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        modeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const mode = btn.dataset.mode;
        document.getElementById("audio-encode-section").hidden =
          mode !== "encode";
        document.getElementById("audio-decode-section").hidden =
          mode !== "decode";
      });
    });

    const encodeDropzone = document.getElementById("audio-encode-dropzone");
    const encodeInput = document.getElementById("audio-encode-input");
    const encodePreview = document.getElementById("audio-encode-preview");
    const encodeFilename = document.getElementById("audio-encode-filename");
    const encodeRemove = document.getElementById("audio-encode-remove");
    const audioMessage = document.getElementById("audio-secret-message");
    const audioEncodeBtn = document.getElementById("audio-encode-btn");

    this.setupAudioDropzone(encodeDropzone, encodeInput, (file) => {
      file.arrayBuffer().then((buffer) => {
        this.audioEncodeBuffer = buffer;
        encodeFilename.textContent = file.name;
        encodePreview.hidden = false;
        encodeDropzone.querySelector(".upload-content").hidden = true;
        this.updateAudioEncodeButton();
      });
    });

    encodeRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      this.audioEncodeBuffer = null;
      encodePreview.hidden = true;
      encodeDropzone.querySelector(".upload-content").hidden = false;
      encodeInput.value = "";
      audioMessage.value = "";
      document.getElementById("audio-encode-password").value = "";
      this.updateAudioEncodeButton();
    });

    audioMessage.addEventListener("input", () => {
      this.updateAudioEncodeButton();
    });

    audioEncodeBtn.addEventListener("click", () => this.encodeAudio());

    const decodeDropzone = document.getElementById("audio-decode-dropzone");
    const decodeInput = document.getElementById("audio-decode-input");
    const decodePreview = document.getElementById("audio-decode-preview");
    const decodeFilename = document.getElementById("audio-decode-filename");
    const decodeRemove = document.getElementById("audio-decode-remove");
    const audioDecodeBtn = document.getElementById("audio-decode-btn");
    const audioCopyBtn = document.getElementById("audio-copy-btn");

    this.setupAudioDropzone(decodeDropzone, decodeInput, (file) => {
      file.arrayBuffer().then((buffer) => {
        this.audioDecodeBuffer = buffer;
        decodeFilename.textContent = file.name;
        decodePreview.hidden = false;
        decodeDropzone.querySelector(".upload-content").hidden = true;
        audioDecodeBtn.disabled = false;
        document.getElementById("audio-result-box").hidden = true;
      });
    });

    decodeRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      this.audioDecodeBuffer = null;
      decodePreview.hidden = true;
      decodeDropzone.querySelector(".upload-content").hidden = false;
      decodeInput.value = "";
      document.getElementById("audio-decode-password").value = "";
      audioDecodeBtn.disabled = true;
      document.getElementById("audio-result-box").hidden = true;
    });

    audioDecodeBtn.addEventListener("click", () => this.decodeAudio());

    audioCopyBtn.addEventListener("click", () => {
      const message = document.getElementById(
        "audio-result-message"
      ).textContent;
      navigator.clipboard.writeText(message).then(() => {
        this.showToast("Copied to clipboard!", "success");
      });
    });

    const audioPasswordToggles = [
      { btn: "toggle-audio-encode-password", input: "audio-encode-password" },
      { btn: "toggle-audio-decode-password", input: "audio-decode-password" },
    ];

    audioPasswordToggles.forEach(({ btn, input }) => {
      const button = document.getElementById(btn);
      const passwordInput = document.getElementById(input);
      if (button && passwordInput) {
        button.addEventListener("click", () => {
          const isPassword = passwordInput.type === "password";
          passwordInput.type = isPassword ? "text" : "password";
        });
      }
    });
  }

  setupAudioDropzone(dropzone, input, onFile) {
    dropzone.addEventListener("click", () => input.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".wav")) {
        onFile(file);
      } else {
        this.showToast("Please drop a WAV file", "error");
      }
    });

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) onFile(file);
    });
  }

  updateAudioEncodeButton() {
    const message = document.getElementById("audio-secret-message").value;
    document.getElementById("audio-encode-btn").disabled =
      !this.audioEncodeBuffer || !message.trim();
  }

  async encodeAudio() {
    const message = document
      .getElementById("audio-secret-message")
      .value.trim();
    const password = document
      .getElementById("audio-encode-password")
      .value.trim();

    if (!this.audioEncodeBuffer || !message) {
      this.showToast("Please provide an audio file and message", "error");
      return;
    }

    try {
      let finalMessage = message;

      if (password) {
        this.showToast("Encrypting message...", "");
        finalMessage = await Crypto.encrypt(message, password);
      }

      const encodedBuffer = await AudioSteganography.encode(
        this.audioEncodeBuffer,
        finalMessage
      );

      const blob = new Blob([encodedBuffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stegora_encoded.wav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast("Audio encoded and downloaded!", "success");
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  async decodeAudio() {
    if (!this.audioDecodeBuffer) {
      this.showToast("Please provide an audio file", "error");
      return;
    }

    const password = document
      .getElementById("audio-decode-password")
      .value.trim();

    try {
      let message = await AudioSteganography.decode(this.audioDecodeBuffer);

      if (Crypto.isEncrypted(message)) {
        if (!password) {
          this.showToast(
            "This message is encrypted. Please enter the password.",
            "error"
          );
          return;
        }
        message = await Crypto.decrypt(message, password);
      }

      this.showToast("Message decoded!", "success");
      const resultBox = document.getElementById("audio-result-box");
      const resultMsg = document.getElementById("audio-result-message");

      resultMsg.textContent = message;
      resultBox.hidden = false;
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  initAnalyze() {
    const dropzone = document.getElementById("analyze-dropzone");
    const input = document.getElementById("analyze-input");
    const preview = document.getElementById("analyze-preview");
    const previewImg = document.getElementById("analyze-preview-img");
    const removeBtn = document.getElementById("analyze-remove");
    const analyzeBtn = document.getElementById("analyze-btn");
    const results = document.getElementById("analysis-results");

    this.setupDropzone(dropzone, input, (file) => {
      this.loadImage(file)
        .then((img) => {
          this.analyzeImage = img;
          this.analyzeFile = file;
          previewImg.src = URL.createObjectURL(file);
          preview.hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;
          analyzeBtn.disabled = false;
          results.hidden = true;
        })
        .catch((err) => {
          this.showToast(err.message, "error");
        });
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      previewImg.src = "";
      preview.hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      input.value = "";
      analyzeBtn.disabled = true;
      results.hidden = true;
      this.analyzeFile = null;
    });

    analyzeBtn.addEventListener("click", async () => {
      if (!this.analyzeImage) return;

      try {
        const img = this.analyzeImage;
        this.canvas.width = img.width || img.naturalWidth;
        this.canvas.height = img.height || img.naturalHeight;
        this.ctx.drawImage(img, 0, 0);

        const imageData = this.ctx.getImageData(
          0,
          0,
          this.canvas.width,
          this.canvas.height
        );
        const analysis = Steganalysis.analyze(imageData);

        document.getElementById("verdict-value").textContent = analysis.verdict;
        document.getElementById("lsb-score").textContent = analysis.lsbScore;
        document.getElementById("chi-value").textContent = analysis.chiSquare;
        document.getElementById("noise-value").textContent =
          analysis.bitPlaneNoise;

        if (this.analyzeFile) {
          const elType = document.getElementById("meta-type");
          if (elType) elType.textContent = this.analyzeFile.type || "Unknown";

          const elSize = document.getElementById("meta-size");
          if (elSize)
            elSize.textContent =
              (this.analyzeFile.size / 1024).toFixed(2) + " KB";

          const elDims = document.getElementById("meta-dims");
          if (elDims)
            elDims.textContent = `${this.canvas.width} x ${this.canvas.height}`;

          const { findings, details } = await MetadataScanner.scan(
            this.analyzeFile
          );
          const metaHidden = document.getElementById("meta-hidden");

          if (metaHidden) {
            const hasPrivacyRisk = findings.some(
              (f) =>
                !f.includes("JFIF Header") &&
                !f.includes("Physical Dimensions") &&
                !f.includes("No hidden metadata")
            );

            if (!hasPrivacyRisk) {
              metaHidden.style.color = "#4ade80";
              metaHidden.textContent = findings.join(", ") + " (Safe)";
            } else {
              metaHidden.style.color = "#ef4444";
              metaHidden.textContent = findings.join(", ");
            }
          }

          const rowCamera = document.getElementById("row-camera");
          const rowDate = document.getElementById("row-date");
          const rowGPS = document.getElementById("row-gps");

          if (rowCamera) rowCamera.hidden = true;
          if (rowDate) rowDate.hidden = true;
          if (rowGPS) rowGPS.hidden = true;

          if ((details.make || details.model) && rowCamera) {
            const metaCamera = document.getElementById("meta-camera");
            if (metaCamera) {
              metaCamera.textContent = [details.make, details.model]
                .filter(Boolean)
                .join(" ");
              rowCamera.hidden = false;
            }
          }
          if (details.date && rowDate) {
            const metaDate = document.getElementById("meta-date");
            if (metaDate) {
              metaDate.textContent = details.date;
              rowDate.hidden = false;
            }
          }
          if (details.gps && rowGPS) {
            const metaGPS = document.getElementById("meta-gps");
            if (metaGPS) {
              metaGPS.textContent = details.gps;
              rowGPS.hidden = false;
            }
          }

          const rowSoftware = document.getElementById("row-software");
          const rowOther = document.getElementById("row-other");
          if (rowSoftware) rowSoftware.hidden = true;
          if (rowOther) rowOther.hidden = true;

          if (details.software && rowSoftware) {
            const metaSoftware = document.getElementById("meta-software");
            if (metaSoftware) {
              metaSoftware.textContent = details.software;
              rowSoftware.hidden = false;
            }
          }

          const otherInfo = [details.artist, details.copyright, details.desc]
            .filter(Boolean)
            .join("; ");
          if (otherInfo && rowOther) {
            const metaOther = document.getElementById("meta-other");
            if (metaOther) {
              metaOther.textContent = otherInfo;
              rowOther.hidden = false;
            }
          }
        }

        const verdictItem = document.getElementById("analysis-verdict");
        verdictItem.className = "analysis-item";
        if (analysis.verdict === "Clean")
          verdictItem.classList.add("verdict-clean");
        else if (analysis.verdict === "Suspicious")
          verdictItem.classList.add("verdict-suspicious");
        else verdictItem.classList.add("verdict-detected");

        results.hidden = false;
        this.showToast("Analysis complete!", "success");
      } catch (error) {
        this.showToast(error.message, "error");
      }
    });
  }

  showToast(message, type = "") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast" + (type ? ` ${type}` : "");
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new StegoraApp();
});
