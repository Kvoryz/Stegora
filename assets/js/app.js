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
        console.log(
          "GPS IFD found at:",
          gpsIfdOffset,
          "tiffStart:",
          tiffStart,
          "valueOffset:",
          valueOffset,
          "byteLength:",
          view.byteLength
        );
        if (gpsIfdOffset < view.byteLength) {
          try {
            const gpsData = this.parseGPS(
              view,
              gpsIfdOffset,
              littleEndian,
              tiffStart
            );
            console.log("GPS data parsed:", gpsData);
            Object.assign(tags, gpsData);
          } catch (e) {
            console.warn("GPS parsing failed:", e);
          }
        } else {
          console.warn("GPS IFD offset out of bounds:", gpsIfdOffset);
        }
      }

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
    let entries = view.getUint16(offset, littleEndian);

    if (entries === 0 || entries > 50) {
      const altEntries = view.getUint16(offset, !littleEndian);
      if (altEntries > 0 && altEntries < 50) {
        entries = altEntries;
        littleEndian = !littleEndian;
      }
    }

    if (entries === 0 || entries > 50) return {};

    let lat = [],
      lon = [],
      latRef = "",
      lonRef = "";

    for (let i = 0; i < entries; i++) {
      try {
        const entryOffset = offset + 2 + i * 12;
        if (entryOffset + 12 > view.byteLength) break;

        const tag = view.getUint16(entryOffset, littleEndian);
        const type = view.getUint16(entryOffset + 2, littleEndian);
        const count = view.getUint32(entryOffset + 4, littleEndian);
        const valueOffset = view.getUint32(entryOffset + 8, littleEndian);

        const typeSize = type === 5 || type === 10 ? 8 : 1;
        const totalSize = count * typeSize;
        const dataOffset =
          totalSize > 4 ? tiffStart + valueOffset : entryOffset + 8;

        if (dataOffset < 0 || dataOffset + totalSize > view.byteLength)
          continue;

        if (tag === 1 && type === 2)
          latRef = this.readString(view, dataOffset, count);
        if (tag === 2 && type === 5 && count === 3) {
          lat = [
            this.readRational(view, dataOffset, littleEndian),
            this.readRational(view, dataOffset + 8, littleEndian),
            this.readRational(view, dataOffset + 16, littleEndian),
          ];
        }
        if (tag === 3 && type === 2)
          lonRef = this.readString(view, dataOffset, count);
        if (tag === 4 && type === 5 && count === 3) {
          lon = [
            this.readRational(view, dataOffset, littleEndian),
            this.readRational(view, dataOffset + 8, littleEndian),
            this.readRational(view, dataOffset + 16, littleEndian),
          ];
        }
      } catch (e) {
        continue;
      }
    }

    if (lat.length === 3 && lon.length === 3) {
      if (
        lat.every((v) => !isNaN(v) && isFinite(v)) &&
        lon.every((v) => !isNaN(v) && isFinite(v))
      ) {
        const latMult = latRef && latRef.toUpperCase().startsWith("S") ? -1 : 1;
        const lonMult = lonRef && lonRef.toUpperCase().startsWith("W") ? -1 : 1;

        const latDec = (lat[0] + lat[1] / 60 + lat[2] / 3600) * latMult;
        const lonDec = (lon[0] + lon[1] / 60 + lon[2] / 3600) * lonMult;

        if (
          (latDec !== 0 || lonDec !== 0) &&
          Math.abs(latDec) <= 90 &&
          Math.abs(lonDec) <= 180
        ) {
          return { gps: `${latDec.toFixed(6)}, ${lonDec.toFixed(6)}` };
        }
      }
    }
    return {};
  }

  static readRational(view, offset, littleEndian) {
    try {
      if (offset + 8 > view.byteLength) return 0;
      const num = view.getUint32(offset, littleEndian);
      const den = view.getUint32(offset + 4, littleEndian);
      if (den === 0) return 0;
      return num / den;
    } catch (e) {
      return 0;
    }
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

    this.safeInit("initTabs");
    this.safeInit("initEncode");
    this.safeInit("initDecode");
    this.safeInit("initPasswordToggles");
    this.safeInit("initModal");
    this.safeInit("initHashCopy");
    this.safeInit("initAudio");
    this.safeInit("initAnalyze");
    this.safeInit("initScramblePanel");
    this.safeInit("initSanitizePanel");
    this.safeInit("initSteganalysis");
    this.safeInit("initLSBAnalysis");
    this.safeInit("initRedact");
  }

  safeInit(methodName) {
    if (typeof this[methodName] === "function") {
      try {
        console.log(`[Stegora] Initializing ${methodName}...`);
        this[methodName]();
        console.log(`[Stegora] ${methodName} success.`);
      } catch (err) {
        console.error(`[Stegora] Failed to initialize ${methodName}:`, err);
        // We do NOT re-throw, so subsequent inits can proceed
      }
    } else {
      console.warn(`[Stegora] Method ${methodName} does not exist.`);
    }
  }

  initTabs() {
    const categoryTabs = document.querySelectorAll(".category-tab");
    const subTabGroups = document.querySelectorAll(".sub-tabs");

    categoryTabs.forEach((catTab) => {
      catTab.addEventListener("click", () => {
        categoryTabs.forEach((t) => t.classList.remove("active"));
        catTab.classList.add("active");

        const category = catTab.dataset.category;
        subTabGroups.forEach((group) => {
          if (group.id === `sub-tabs-${category}`) {
            group.hidden = false;
            const firstSubTab = group.querySelector(".sub-tab:not(:disabled)");
            if (firstSubTab) {
              firstSubTab.click();
            }
          } else {
            group.hidden = true;
          }
        });
      });
    });

    const allSubTabs = document.querySelectorAll(".sub-tab");
    allSubTabs.forEach((subTab) => {
      subTab.addEventListener("click", () => {
        if (subTab.disabled) return;

        const parentGroup = subTab.closest(".sub-tabs");
        parentGroup
          .querySelectorAll(".sub-tab")
          .forEach((t) => t.classList.remove("active"));
        subTab.classList.add("active");

        document
          .querySelectorAll(".panel")
          .forEach((p) => p.classList.remove("active"));
        const panel = document.getElementById(`${subTab.dataset.tab}-panel`);
        if (panel) {
          panel.classList.add("active");
        }
      });
    });

    const innerTabs = document.querySelectorAll(".inner-tab");
    innerTabs.forEach((innerTab) => {
      innerTab.addEventListener("click", () => {
        const parentGroup = innerTab.closest(".inner-tabs");
        parentGroup
          .querySelectorAll(".inner-tab")
          .forEach((t) => t.classList.remove("active"));
        innerTab.classList.add("active");

        const parentPanel = innerTab.closest(".panel");
        parentPanel
          .querySelectorAll(".inner-panel")
          .forEach((p) => p.classList.remove("active"));

        let targetId = innerTab.dataset.target;
        if (!targetId && innerTab.dataset.inner) {
          targetId = `inner-${innerTab.dataset.inner}`;
        }

        const innerPanel = parentPanel.querySelector(`#${targetId}`);
        if (innerPanel) {
          innerPanel.classList.add("active");
        }
      });
    });
  }

  initPasswordToggles() {
    const toggles = [
      { btn: "toggle-encode-password", input: "encode-password" },
      { btn: "toggle-decode-password", input: "decode-password" },
      { btn: "toggle-scramble-password", input: "scramble-password" },
      { btn: "toggle-unscramble-password", input: "unscramble-password" },
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
      this.encode();
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
    const copyBtn = document.getElementById("copy-btn");
    const passwordInput = document.getElementById("decode-password");

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
              "Scrambled images cannot be decoded. Use Unscramble tab instead.";
          } else {
            decodeBtn.title = "";
          }

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
      document.getElementById("result-box").hidden = true;
    });

    decodeBtn.addEventListener("click", () => this.decode());

    copyBtn.addEventListener("click", () => {
      const message = document.getElementById("result-message").textContent;
      navigator.clipboard.writeText(message).then(() => {
        this.showToast("Copied to clipboard!", "success");
      });
    });
  }

  setupDropzone(dropzone, input, onFile) {
    console.log("setupDropzone called:", { dropzone, input });
    if (!dropzone || !input) {
      console.error("Dropzone or input not found:", { dropzone, input });
      return;
    }
    dropzone.addEventListener("click", () => {
      console.log("Dropzone clicked, triggering input.click()");
      input.click();
    });

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

  initScramblePanel() {
    const scrambleDropzone = document.getElementById("scramble-dropzone");
    const scrambleInput = document.getElementById("scramble-input");
    if (scrambleDropzone && scrambleInput) {
      this.setupDropzone(scrambleDropzone, scrambleInput, (file) => {
        this.scrambleFile = file;
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          this.scrambleImage = img;
          document.getElementById("scramble-preview-img").src = img.src;
          document.getElementById("scramble-preview").hidden = false;
          document.querySelector(
            "#scramble-dropzone .upload-content"
          ).hidden = true;
          this.updateScrambleBtn();
        };
      });
    }

    document
      .getElementById("scramble-remove")
      ?.addEventListener("click", () => {
        this.scrambleImage = null;
        this.scrambleFile = null;
        document.getElementById("scramble-preview").hidden = true;
        document.querySelector(
          "#scramble-dropzone .upload-content"
        ).hidden = false;
        this.updateScrambleBtn();
      });

    document
      .getElementById("scramble-password")
      ?.addEventListener("input", () => this.updateScrambleBtn());
    document
      .getElementById("scramble-action-btn")
      ?.addEventListener("click", () => this.doScramble());

    const unscrambleDropzone = document.getElementById("unscramble-dropzone");
    const unscrambleInput = document.getElementById("unscramble-input");
    if (unscrambleDropzone && unscrambleInput) {
      this.setupDropzone(unscrambleDropzone, unscrambleInput, (file) => {
        this.unscrambleFile = file;
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          this.unscrambleImage = img;
          document.getElementById("unscramble-preview-img").src = img.src;
          document.getElementById("unscramble-preview").hidden = false;
          document.querySelector(
            "#unscramble-dropzone .upload-content"
          ).hidden = true;
          this.updateUnscrambleBtn();
        };
      });
    }

    document
      .getElementById("unscramble-remove")
      ?.addEventListener("click", () => {
        this.unscrambleImage = null;
        this.unscrambleFile = null;
        document.getElementById("unscramble-preview").hidden = true;
        document.querySelector(
          "#unscramble-dropzone .upload-content"
        ).hidden = false;
        this.updateUnscrambleBtn();
      });

    document
      .getElementById("unscramble-password")
      ?.addEventListener("input", () => this.updateUnscrambleBtn());
    document
      .getElementById("unscramble-action-btn")
      ?.addEventListener("click", () => this.doUnscramble());
  }

  updateScrambleBtn() {
    const btn = document.getElementById("scramble-action-btn");
    const password = document.getElementById("scramble-password")?.value.trim();
    btn.disabled = !this.scrambleImage || !password;
  }

  updateUnscrambleBtn() {
    const btn = document.getElementById("unscramble-action-btn");
    const password = document
      .getElementById("unscramble-password")
      ?.value.trim();
    btn.disabled = !this.unscrambleImage || !password;
  }

  async doScramble() {
    const password = document.getElementById("scramble-password").value.trim();
    if (!this.scrambleImage || !password) return;

    this.showToast("Scrambling image...", "");
    await new Promise((r) => setTimeout(r, 50));

    this.ctx.imageSmoothingEnabled = false;

    const width = this.scrambleImage.naturalWidth;
    const height = this.scrambleImage.naturalHeight;
    this.canvas.width = width;
    this.canvas.height = height + 1; // Add 1px for header

    this.ctx.drawImage(this.scrambleImage, 0, 1);

    const imageData = this.ctx.getImageData(0, 0, width, height + 1);
    const data = imageData.data;

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const passHash = await this.generatePasswordHash(password, salt);

    const seedInput =
      password +
      Array.from(salt)
        .map((b) => String.fromCharCode(b))
        .join("");
    const seed = await this.hashToSeed(seedInput);
    const prng = this.mulberry32(seed);

    const headerBytes = new Uint8Array(4 + 16 + 32);
    headerBytes.set([0x53, 0x54, 0x45, 0x47], 0); // STEG
    headerBytes.set(salt, 4);
    headerBytes.set(passHash, 20);

    let pixelIdx = 0;
    for (let i = 0; i < headerBytes.length; i++) {
      const offset = pixelIdx * 4 + (i % 3);
      data[offset] = headerBytes[i];

      if (i % 3 === 2) pixelIdx++; // Move to next pixel after filling RGB
    }

    for (let i = 0; i <= pixelIdx; i++) {
      data[i * 4 + 3] = 255;
    }

    const row0Bytes = width * 4;
    const headerEndIndex = (pixelIdx + 1) * 4;
    for (let i = headerEndIndex; i < row0Bytes; i += 4) {
      data[i] = Math.floor(Math.random() * 256);
      data[i + 1] = Math.floor(Math.random() * 256);
      data[i + 2] = Math.floor(Math.random() * 256);
      data[i + 3] = 255;
    }

    const startOffset = width * 4; // Start at Row 1
    for (let i = startOffset; i < data.length; i += 4) {
      data[i] ^= (prng() * 256) | 0;
      data[i + 1] ^= (prng() * 256) | 0;
      data[i + 2] ^= (prng() * 256) | 0;
      data[i + 3] = 255; // Force opacity
    }

    this.ctx.putImageData(imageData, 0, 0);

    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = this.scrambleFile
        ? this.scrambleFile.name.replace(/\.[^/.]+$/, "")
        : "image";
      a.download = `scramble_${baseName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast(
        "Image scrambled! Header added for validation.",
        "success"
      );
    }, "image/png");
  }

  async generatePasswordHash(password, salt) {
    const enc = new TextEncoder();
    const passKey = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 1000,
        hash: "SHA-256",
      },
      passKey,
      256 // 32 bytes
    );
    return new Uint8Array(derivedBits);
  }

  buffersEqual(a, b) {
    if (a.byteLength !== b.byteLength) return false;
    for (let i = 0; i < a.byteLength; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  async doUnscramble() {
    const password = document
      .getElementById("unscramble-password")
      .value.trim();
    if (!this.unscrambleImage || !password) return;

    this.showToast("Unscrambling image...", "");
    await new Promise((r) => setTimeout(r, 50));

    this.ctx.imageSmoothingEnabled = false;
    const width = this.unscrambleImage.naturalWidth;
    const height = this.unscrambleImage.naturalHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(this.unscrambleImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const headerBytes = new Uint8Array(52);
    let pixelIdx = 0;
    let byteIdx = 0;

    const maxHeaderPixels = Math.ceil(52 / 3);

    if (width >= maxHeaderPixels) {
      for (let i = 0; i < 52; i++) {
        const offset = pixelIdx * 4 + (i % 3);
        headerBytes[i] = data[offset];
        if (i % 3 === 2) pixelIdx++;
      }
    }

    const isNewFormat =
      headerBytes[0] === 0x53 &&
      headerBytes[1] === 0x54 &&
      headerBytes[2] === 0x45 &&
      headerBytes[3] === 0x47;

    let seed;
    let contentStartOffset = 0;
    let outputHeight = height;

    if (isNewFormat) {
      const salt = headerBytes.slice(4, 20); // 16 bytes
      const storedHash = headerBytes.slice(20, 52); // 32 bytes

      const checkHash = await this.generatePasswordHash(password, salt);
      if (!this.buffersEqual(storedHash, checkHash)) {
        this.showToast("Incorrect Password! Access Denied.", "error");
        return;
      }

      const seedInput =
        password +
        Array.from(salt)
          .map((b) => String.fromCharCode(b))
          .join("");
      seed = await this.hashToSeed(seedInput);

      contentStartOffset = width * 4;
      outputHeight = height - 1;
    } else {
      seed = await this.hashToSeed(password);
      contentStartOffset = 0;
      outputHeight = height;
      this.showToast(
        "Legacy format detected (no validation). Unscrambling...",
        "info"
      );
    }

    const prng = this.mulberry32(seed);

    for (let i = contentStartOffset; i < data.length; i += 4) {
      data[i] ^= (prng() * 256) | 0;
      data[i + 1] ^= (prng() * 256) | 0;
      data[i + 2] ^= (prng() * 256) | 0;
    }

    if (isNewFormat) {
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = width;
      outputCanvas.height = outputHeight;
      const outputCtx = outputCanvas.getContext("2d");

      this.ctx.putImageData(imageData, 0, 0);

      outputCtx.drawImage(
        this.canvas,
        0,
        1,
        width,
        outputHeight,
        0,
        0,
        width,
        outputHeight
      );

      outputCanvas.toBlob(saveBlob, "image/png");
    } else {
      this.ctx.putImageData(imageData, 0, 0);
      this.canvas.toBlob(saveBlob, "image/png");
    }

    const _this = this; // Capture 'this' for saveBlob closure if needed, or use arrow
    function saveBlob(blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = _this.unscrambleFile
        ? _this.unscrambleFile.name
            .replace(/\.[^/.]+$/, "")
            .replace(/^scramble_/, "")
        : "image";
      a.download = `unscramble_${baseName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      _this.showToast("Image restored!", "success");
    }
  }

  initSanitizePanel() {
    const sanitizeDropzone = document.getElementById("sanitize-dropzone");
    const sanitizeInput = document.getElementById("sanitize-input");
    if (sanitizeDropzone && sanitizeInput) {
      this.setupDropzone(sanitizeDropzone, sanitizeInput, (file) => {
        this.sanitizeFile = file;
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          this.sanitizeImage = img;
          document.getElementById("sanitize-preview-img").src = img.src;
          document.getElementById("sanitize-preview").hidden = false;
          document.querySelector(
            "#sanitize-dropzone .upload-content"
          ).hidden = true;
          document.getElementById("sanitize-action-btn").disabled = false;
        };
      });
    }

    document
      .getElementById("sanitize-remove")
      ?.addEventListener("click", () => {
        this.sanitizeImage = null;
        this.sanitizeFile = null;
        document.getElementById("sanitize-preview").hidden = true;
        document.querySelector(
          "#sanitize-dropzone .upload-content"
        ).hidden = false;
        document.getElementById("sanitize-action-btn").disabled = true;
      });

    document
      .getElementById("sanitize-action-btn")
      ?.addEventListener("click", () => this.doSanitize());
  }

  initSteganalysis() {
    this.setupDropzone(
      document.getElementById("steg-orig-dropzone"),
      document.getElementById("steg-orig-input"),
      (file) => {
        this.stegOrigFile = file;
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          this.stegOrigImage = img;
          document.getElementById("steg-orig-img").src = img.src;
          document.getElementById("steg-orig-preview").hidden = false;
          document.querySelector(
            "#steg-orig-dropzone .upload-content"
          ).hidden = true;
          this.updateStegCompareBtn();
        };
      }
    );

    document
      .getElementById("steg-orig-remove")
      ?.addEventListener("click", () => {
        this.stegOrigImage = null;
        this.stegOrigFile = null;
        document.getElementById("steg-orig-preview").hidden = true;
        document.querySelector(
          "#steg-orig-dropzone .upload-content"
        ).hidden = false;
        this.updateStegCompareBtn();
      });

    this.setupDropzone(
      document.getElementById("steg-susp-dropzone"),
      document.getElementById("steg-susp-input"),
      (file) => {
        this.stegSuspFile = file;
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          this.stegSuspImage = img;
          document.getElementById("steg-susp-img").src = img.src;
          document.getElementById("steg-susp-preview").hidden = false;
          document.querySelector(
            "#steg-susp-dropzone .upload-content"
          ).hidden = true;
          this.updateStegCompareBtn();
        };
      }
    );

    document
      .getElementById("steg-susp-remove")
      ?.addEventListener("click", () => {
        this.stegSuspImage = null;
        this.stegSuspFile = null;
        document.getElementById("steg-susp-preview").hidden = true;
        document.querySelector(
          "#steg-susp-dropzone .upload-content"
        ).hidden = false;
        this.updateStegCompareBtn();
      });

    const slider = document.getElementById("diff-amp");
    const ampValue = document.getElementById("amp-value");
    slider?.addEventListener("input", (e) => {
      ampValue.textContent = `${e.target.value}x`;
      if (!document.getElementById("steg-results").hidden) {
        this.doSteganalysis();
      }
    });

    document
      .getElementById("steg-compare-btn")
      ?.addEventListener("click", () => this.doSteganalysis());
  }

  updateStegCompareBtn() {
    const btn = document.getElementById("steg-compare-btn");
    if (btn) btn.disabled = !this.stegOrigImage || !this.stegSuspImage;
  }

  doSteganalysis() {
    if (!this.stegOrigImage || !this.stegSuspImage) return;

    const w1 = this.stegOrigImage.naturalWidth;
    const h1 = this.stegOrigImage.naturalHeight;
    const w2 = this.stegSuspImage.naturalWidth;
    const h2 = this.stegSuspImage.naturalHeight;

    if (w1 !== w2 || h1 !== h2) {
      this.showToast(
        `Dimensions mismatch! ${w1}x${h1} vs ${w2}x${h2}`,
        "error"
      );
      return;
    }

    const canvas = document.getElementById("diff-canvas");
    canvas.width = w1;
    canvas.height = h1;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(this.stegOrigImage, 0, 0);
    const img1Data = ctx.getImageData(0, 0, w1, h1).data;

    ctx.drawImage(this.stegSuspImage, 0, 0);
    const img2Data = ctx.getImageData(0, 0, w1, h1).data;

    const output = ctx.createImageData(w1, h1);
    const outData = output.data;

    const amp = parseInt(document.getElementById("diff-amp").value, 10) || 10;
    let diffCount = 0;

    for (let i = 0; i < img1Data.length; i += 4) {
      const rDiff = Math.abs(img1Data[i] - img2Data[i]);
      const gDiff = Math.abs(img1Data[i + 1] - img2Data[i + 1]);
      const bDiff = Math.abs(img1Data[i + 2] - img2Data[i + 2]);
      const aDiff = Math.abs(img1Data[i + 3] - img2Data[i + 3]);

      if (rDiff > 0 || gDiff > 0 || bDiff > 0 || aDiff > 0) {
        diffCount++;
        outData[i] = Math.min(255, rDiff * amp);
        outData[i + 1] = Math.min(255, gDiff * amp);
        outData[i + 2] = Math.min(255, bDiff * amp);
        outData[i + 3] = 255; // Opaque
      } else {
        outData[i] = 0;
        outData[i + 1] = 0;
        outData[i + 2] = 0;
        outData[i + 3] = 255;
      }
    }

    ctx.putImageData(output, 0, 0);

    document.getElementById("steg-results").hidden = false;
    const diffPercent = ((diffCount / (w1 * h1)) * 100).toFixed(4);
    document.getElementById(
      "diff-stats"
    ).textContent = `${diffCount.toLocaleString()} pixels differ (${diffPercent}%)`;

    this.showToast("Comparison complete.", "success");
  }

  initLSBAnalysis() {
    this.setupDropzone(
      document.getElementById("lsb-dropzone"),
      document.getElementById("lsb-input"),
      (file) => {
        this.lsbFile = file;
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          this.lsbImage = img;
          document.getElementById("lsb-img").src = img.src;
          document.getElementById("lsb-filename").textContent = file.name;
          document.getElementById("lsb-preview").hidden = false;
          document.querySelector("#lsb-dropzone .upload-content").hidden = true;
          document.getElementById("lsb-analyze-btn").disabled = false;
          document.getElementById("lsb-results").hidden = true;
        };
      }
    );

    document.getElementById("lsb-remove")?.addEventListener("click", () => {
      this.lsbImage = null;
      this.lsbFile = null;
      document.getElementById("lsb-preview").hidden = true;
      document.querySelector("#lsb-dropzone .upload-content").hidden = false;
      document.getElementById("lsb-analyze-btn").disabled = true;
      document.getElementById("lsb-results").hidden = true;
    });

    document
      .getElementById("lsb-analyze-btn")
      ?.addEventListener("click", () => {
        this.doLSBAnalysis();
      });
  }

  doLSBAnalysis() {
    if (!this.lsbImage) return;

    const w = this.lsbImage.naturalWidth;
    const h = this.lsbImage.naturalHeight;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.lsbImage, 0, 0);
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const result = Steganalysis.analyze(imageData);

    let lsbBits = [];
    for (let i = 0; i < data.length; i += 4) {
      lsbBits.push(data[i + 2] & 1); // Blue channel LSB
    }
    const ones = lsbBits.filter((b) => b === 1).length;
    const zeros = lsbBits.length - ones;
    const p1 = ones / lsbBits.length;
    const p0 = zeros / lsbBits.length;
    const entropy =
      p1 > 0 && p0 > 0 ? -(p1 * Math.log2(p1) + p0 * Math.log2(p0)) : 0;

    document.getElementById("lsb-chi").textContent = result.chiSquare;
    document.getElementById("lsb-entropy").textContent = entropy.toFixed(3);

    const verdictBox = document.getElementById("lsb-verdict-box");
    const verdictEl = document.getElementById("lsb-verdict");
    const verdictDesc = document.getElementById("lsb-verdict-desc");

    verdictEl.textContent = result.verdict;

    if (result.verdict === "Clean") {
      verdictBox.style.background = "rgba(34, 197, 94, 0.15)";
      verdictBox.style.border = "1px solid rgba(34, 197, 94, 0.3)";
      verdictDesc.textContent =
        "No significant indicators of hidden data found.";
    } else if (result.verdict === "Suspicious") {
      verdictBox.style.background = "rgba(234, 179, 8, 0.15)";
      verdictBox.style.border = "1px solid rgba(234, 179, 8, 0.3)";
      verdictDesc.textContent =
        "Some statistical anomalies detected. May contain hidden data.";
    } else {
      verdictBox.style.background = "rgba(239, 68, 68, 0.15)";
      verdictBox.style.border = "1px solid rgba(239, 68, 68, 0.3)";
      verdictDesc.textContent =
        "Strong indicators of steganographic manipulation detected!";
    }

    const lsbCanvas = document.getElementById("lsb-canvas");
    lsbCanvas.width = w;
    lsbCanvas.height = h;
    const lsbCtx = lsbCanvas.getContext("2d");
    const lsbData = lsbCtx.createImageData(w, h);

    for (let i = 0; i < data.length; i += 4) {
      const rLSB = (data[i] & 1) * 255;
      const gLSB = (data[i + 1] & 1) * 255;
      const bLSB = (data[i + 2] & 1) * 255;

      lsbData.data[i] = rLSB;
      lsbData.data[i + 1] = gLSB;
      lsbData.data[i + 2] = bLSB;
      lsbData.data[i + 3] = 255;
    }

    lsbCtx.putImageData(lsbData, 0, 0);

    document.getElementById("lsb-results").hidden = false;
    this.showToast("LSB Analysis complete.", "success");
  }

  async doSanitize() {
    if (!this.sanitizeImage) return;

    this.showToast("Sanitizing image...", "");
    await new Promise((r) => setTimeout(r, 50));

    this.canvas.width =
      this.sanitizeImage.width || this.sanitizeImage.naturalWidth;
    this.canvas.height =
      this.sanitizeImage.height || this.sanitizeImage.naturalHeight;
    this.ctx.drawImage(this.sanitizeImage, 0, 0);

    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = this.sanitizeFile
        ? this.sanitizeFile.name.replace(/\.[^/.]+$/, "")
        : "image";
      a.download = `sanitized_${baseName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast("Image sanitized! All metadata removed.", "success");
    }, "image/png");
  }

  initRedact() {
    this.redactMode = "pixelate";
    this.redactUndoStack = [];
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.setupDropzone(
      document.getElementById("redact-dropzone"),
      document.getElementById("redact-input"),
      (file) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          this.redactImage = img;
          this.startRedactSession(img);
        };
      }
    );

    document.getElementById("tool-pixelate")?.addEventListener("click", (e) => {
      this.redactMode = "pixelate";
      this.updateRedactToolbar(e.target);
    });
    document.getElementById("tool-blur")?.addEventListener("click", (e) => {
      this.redactMode = "blur";
      this.updateRedactToolbar(e.target);
    });

    document
      .getElementById("redact-undo")
      ?.addEventListener("click", () => this.undoRedact());
    document.getElementById("redact-reset")?.addEventListener("click", () => {
      if (this.redactImage) this.startRedactSession(this.redactImage);
    });
    document.getElementById("redact-delete")?.addEventListener("click", () => {
      this.redactImage = null;
      this.redactUndoStack = [];
      document.getElementById("redact-editor").hidden = true;
      document.getElementById("redact-dropzone").hidden = false;
      document.getElementById("redact-input").value = "";
    });
    document
      .getElementById("redact-download")
      ?.addEventListener("click", () => {
        const canvas = document.getElementById("redact-canvas");
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "redacted_image.png";
          a.click();
          URL.revokeObjectURL(url);
        });
      });

    const intensityInput = document.getElementById("redact-strength");
    if (intensityInput) {
      intensityInput.addEventListener("input", (e) => {});
    }
  }

  updateRedactToolbar(activeBtn) {
    document
      .querySelectorAll("#redact-editor .tool-group .btn")
      .forEach((b) => b.classList.remove("active"));
    activeBtn.classList.add("active");
  }

  startRedactSession(img) {
    document.getElementById("redact-dropzone").hidden = true;
    document.getElementById("redact-editor").hidden = false;

    const canvas = document.getElementById("redact-canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    this.redactUndoStack = [
      ctx.getImageData(0, 0, canvas.width, canvas.height),
    ];
    this.updateUndoBtn();

    this.setupRedactEvents(canvas);
  }

  setupRedactEvents(canvas) {
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    canvas.onmousedown = (e) => {
      this.isDragging = true;
      const pos = getPos(e);
      this.startX = pos.x;
      this.startY = pos.y;
      this.tempSnapshot = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height);
    };

    canvas.onmousemove = (e) => {
      if (!this.isDragging) return;
      const pos = getPos(e);
      const ctx = canvas.getContext("2d");

      ctx.putImageData(this.tempSnapshot, 0, 0);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2 * (canvas.width / canvas.getBoundingClientRect().width); // Scale line width
      ctx.setLineDash([5, 5]);
      const w = pos.x - this.startX;
      const h = pos.y - this.startY;
      ctx.strokeRect(this.startX, this.startY, w, h);

      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.setLineDash([0, 0]);
      ctx.strokeRect(this.startX - 1, this.startY - 1, w + 2, h + 2);
    };

    canvas.onmouseup = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const pos = getPos(e);
      const w = pos.x - this.startX;
      const h = pos.y - this.startY;

      const ctx = canvas.getContext("2d");
      ctx.putImageData(this.tempSnapshot, 0, 0);

      if (Math.abs(w) > 5 && Math.abs(h) > 5) {
        this.applyRedact(this.startX, this.startY, w, h);
      }
    };

    canvas.onmouseout = () => {
      if (this.isDragging) {
        this.isDragging = false;
        const ctx = canvas.getContext("2d");
        ctx.putImageData(this.tempSnapshot, 0, 0);
      }
    };
  }

  applyRedact(x, y, w, h) {
    const canvas = document.getElementById("redact-canvas");
    const ctx = canvas.getContext("2d");
    const strength =
      parseInt(document.getElementById("redact-strength").value) || 8;

    if (w < 0) {
      x += w;
      w = -w;
    }
    if (h < 0) {
      y += h;
      h = -h;
    }

    x = Math.max(0, x);
    y = Math.max(0, y);
    w = Math.min(w, canvas.width - x);
    h = Math.min(h, canvas.height - y);

    if (w <= 0 || h <= 0) return;

    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;

    if (this.redactMode === "pixelate") {
      const pixelSize = Math.max(2, strength * 2);
      for (let py = 0; py < h; py += pixelSize) {
        for (let px = 0; px < w; px += pixelSize) {
          const i = (py * w + px) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          for (let by = 0; by < pixelSize && py + by < h; by++) {
            for (let bx = 0; bx < pixelSize && px + bx < w; bx++) {
              const ni = ((py + by) * w + (px + bx)) * 4;
              data[ni] = r;
              data[ni + 1] = g;
              data[ni + 2] = b;
            }
          }
        }
      }
      ctx.putImageData(imgData, x, y);
    } else if (this.redactMode === "blur") {
      const radius = Math.max(1, strength);
      const passes = 3; // Approximation of Gaussian

      const offCanvas = document.createElement("canvas");
      offCanvas.width = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext("2d");
      offCtx.putImageData(imgData, 0, 0);

      const sW = Math.max(1, Math.floor(w / radius));
      const sH = Math.max(1, Math.floor(h / radius));

      const smallCanvas = document.createElement("canvas");
      smallCanvas.width = sW;
      smallCanvas.height = sH;
      const smallCtx = smallCanvas.getContext("2d");
      smallCtx.imageSmoothingEnabled = true;
      smallCtx.imageSmoothingQuality = "medium";
      smallCtx.drawImage(offCanvas, 0, 0, sW, sH);

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = w;
      finalCanvas.height = h;
      const finalCtx = finalCanvas.getContext("2d");
      finalCtx.imageSmoothingEnabled = true;
      finalCtx.imageSmoothingQuality = "medium"; // Smooth blur
      finalCtx.drawImage(smallCanvas, 0, 0, w, h);

      ctx.drawImage(finalCanvas, x, y);
    }

    const newSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.redactUndoStack.push(newSnapshot);
    if (this.redactUndoStack.length > 10) this.redactUndoStack.shift(); // Limit
    this.updateUndoBtn();
  }

  undoRedact() {
    if (this.redactUndoStack.length <= 1) return;
    this.redactUndoStack.pop(); // Remove current state
    const prev = this.redactUndoStack[this.redactUndoStack.length - 1];
    const canvas = document.getElementById("redact-canvas");
    canvas.getContext("2d").putImageData(prev, 0, 0);
    this.updateUndoBtn();
  }

  updateUndoBtn() {
    const btn = document.getElementById("redact-undo");
    if (btn) btn.disabled = this.redactUndoStack.length <= 1;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new StegoraApp();
});
