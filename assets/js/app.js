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

  // Seeded PRNG (Mulberry32)
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

  // Generate seed from password
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

  // Generate scrambled pixel indices
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

  // Compress string using LZW-like compression
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

    // Convert to base64
    const bytes = [];
    for (const code of result) {
      bytes.push((code >> 8) & 0xff);
      bytes.push(code & 0xff);
    }

    return btoa(String.fromCharCode(...bytes));
  }

  // Decompress LZW
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

  // Add random padding
  static addPadding(str, minPadding = 16, maxPadding = 64) {
    const paddingLength =
      minPadding + Math.floor(Math.random() * (maxPadding - minPadding));
    const padding = Array.from({ length: paddingLength }, () =>
      String.fromCharCode(Math.floor(Math.random() * 94) + 33)
    ).join("");

    return str + "<<PAD>>" + padding;
  }

  // Remove padding
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

  // Secure encode with scrambling
  static async encode(imageData, message, password = null) {
    let processedMessage = message;

    // If password provided, use scrambling
    if (password) {
      // Compress and add padding
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
      // Scrambled mode: use PRNG to get random pixel positions
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

        // Force alpha to 255 (opaque) to ensure data persistence
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
      // Sequential mode (no password)
      for (let bitIndex = 0; bitIndex < fullBinary.length; bitIndex++) {
        const pixelIndex = Math.floor(bitIndex / 3) * 4;
        const channelOffset = bitIndex % 3;
        const bit = parseInt(fullBinary[bitIndex], 10);

        // Force alpha to 255 (opaque) to ensure data persistence
        data[pixelIndex + 3] = 255;

        data[pixelIndex + channelOffset] =
          (data[pixelIndex + channelOffset] & 0xfe) | bit;
      }
    }

    return imageData;
  }

  // Secure decode with descrambling
  static async decode(imageData, password = null) {
    const data = imageData.data;
    const totalPixels = imageData.width * imageData.height;

    let binaryLength = "";
    let bitIndex = 0;

    // First, try to read header
    if (password) {
      // Scrambled mode
      const seed = await this.passwordToSeed(password);
      const prng = this.createPRNG(seed);

      // We need at least enough pixels for header
      const headerPixels = Math.ceil(this.HEADER_BITS / 3);
      const pixelIndices = this.generateScrambledIndices(
        totalPixels,
        totalPixels,
        prng
      );

      // Read header
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

      // Read message
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

      // Check if scrambled and decompress
      if (message.startsWith(this.SCRAMBLE_MARKER)) {
        message = message.slice(this.SCRAMBLE_MARKER.length);
        message = this.removePadding(message);
        message = this.decompress(message);
      }

      return message;
    } else {
      // Sequential mode (no password)
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

    // Parse WAV header
    const view = new DataView(audioBuffer);
    const dataStart = 44; // Standard WAV header size
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

    // Read header
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

    // 1. LSB Randomness Analysis
    let transitions = 0;
    let ones = 0;

    for (let i = 0; i < totalPixels * 3; i++) {
      // Check R, G, B channels
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

    // Ideal random data has ~0.5 ones ratio and ~0.5 transitions ratio
    // Encrypted/Compressed data looks random
    const lsbScore =
      1 - (Math.abs(0.5 - onesRatio) + Math.abs(0.5 - transitionsRatio));

    // 2. Chi-Square Attack (Simplified)
    // Checks if frequency of PoVs (Pairs of Values) suggests embedding
    let chiSquare = 0;
    const bins = new Array(256).fill(0);

    for (let i = 0; i < totalPixels * 3; i += 3) {
      // Sample mostly Red channel for speed
      bins[data[i]]++;
    }

    for (let i = 0; i < 254; i += 2) {
      const avg = (bins[i] + bins[i + 1]) / 2;
      if (avg > 0) {
        chiSquare += Math.pow(bins[i] - avg, 2) / avg;
        chiSquare += Math.pow(bins[i + 1] - avg, 2) / avg;
      }
    }

    // 3. Bit Plane Noise Level
    // Compare LSB plane complexity vs 2nd LSB plane
    // If LSB is much more complex than 2nd bit plane, it's suspicious
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

    // Verdict Logic
    let verdict = "Clean";
    let suspicionLevel = 0;

    // Adjusted thresholds for balanced sensitivity
    if (lsbScore > 0.88) suspicionLevel++; // Was > 0.85 (Too sensitive) vs 0.95 (Too loose)
    if (chiSquare < 200) suspicionLevel++; // Was < 300 (Too sensitive) vs 100 (Too loose)
    if (bitPlaneRatio > 1.15) suspicionLevel++; // Was > 1.05 (Too sensitive) vs 1.2 (Too loose)

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
    const encodeBtn = document.getElementById("encode-btn");

    let maxAllowedChars = 0;

    this.setupDropzone(dropzone, input, (file) => {
      this.loadImage(file)
        .then((img) => {
          this.encodeImage = img;

          // Calculate max capacity
          // 3 bits per pixel (RGB), minus 32 bits header and 56 bits delimiter (7 chars * 8)
          // Formula: (TotalPixels * 3 - 88) / 8
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
      maxAllowedChars = 0;
      maxCharsDisplay.textContent = "0";
      charCount.textContent = "0";
      preview.hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      input.value = "";

      // Clear hash display
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

    encodeBtn.addEventListener("click", () => this.encode());
  }

  initDecode() {
    const dropzone = document.getElementById("decode-dropzone");
    const input = document.getElementById("decode-image-input");
    const preview = document.getElementById("decode-preview");
    const previewImg = document.getElementById("decode-preview-img");
    const removeBtn = document.getElementById("decode-remove");
    const decodeBtn = document.getElementById("decode-btn");
    const copyBtn = document.getElementById("copy-btn");

    this.setupDropzone(dropzone, input, (file) => {
      this.loadImage(file)
        .then((img) => {
          this.decodeImage = img;
          previewImg.src = URL.createObjectURL(file);
          preview.hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;
          decodeBtn.disabled = false;
          document.getElementById("result-box").hidden = true;
        })
        .catch((err) => {
          this.showToast(err.message, "error");
        });
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.decodeImage = null;
      preview.hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      input.value = "";
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

    const btn = document.getElementById("encode-btn");
    btn.disabled = !hasImage || !hasMessage || !isWithinLimit;

    // Optional: Visual feedback on button
    if (!isWithinLimit && hasImage && hasMessage) {
      btn.title = "Message too long for this image";
    } else {
      btn.title = "";
    }
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

      // Pass null for password to force sequential encoding (no scrambling)
      // This is crucial so that the decoy text is retrievable without the correct password.
      const encodedData = await Steganography.encode(
        imageData,
        finalMessage,
        null
      );
      this.ctx.putImageData(encodedData, 0, 0);

      // Calculate and display hash
      const messageHash = await Crypto.hash(message);
      document.getElementById("encode-hash-value").textContent = messageHash;
      document.getElementById("encode-hash-display").hidden = false;

      this.canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "stegora_encoded.png";
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

      // TOP PRIORITY: Try sequential read first (how new decoy messages are stored)
      try {
        message = await Steganography.decode(imageData, null);
      } catch (sequentialError) {
        // If sequential read fails (e.g. legacy scrambled image), try with password if provided
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

      // Check for decoy message format
      if (message.startsWith("<<DECOY>>")) {
        const jsonPart = message.slice(9);
        try {
          const data = JSON.parse(jsonPart);

          // Always show something. If password works, show real. If not, show decoy.
          if (!password) {
            message = data.decoy;
            this.showToast("Message decoded (Decoy Mode)", "success");
          } else {
            try {
              // Try to decrypt real message
              message = await Crypto.decrypt(data.real, password);
              this.showToast("Message decoded!", "success");
            } catch {
              // Wrong password - show decoy
              message = data.decoy;
              this.showToast("Message decoded (Decoy Mode)", "success");
            }
          }
        } catch {
          this.showToast("Failed to parse message structure", "error");
          return;
        }
      } else if (Crypto.isEncrypted(message)) {
        // Standard encrypted message (legacy or direct encrypt)
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

      // Calculate and display hash
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
    // Mode toggle
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

    // Audio encode
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
      this.updateAudioEncodeButton();
    });

    audioMessage.addEventListener("input", () => {
      this.updateAudioEncodeButton();
    });

    audioEncodeBtn.addEventListener("click", () => this.encodeAudio());

    // Audio decode
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

    // Password toggles for audio
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
      this.loadImage(file).then((img) => {
        this.analyzeImage = img;
        previewImg.src = URL.createObjectURL(file);
        preview.hidden = false;
        dropzone.querySelector(".upload-content").hidden = true;
        analyzeBtn.disabled = false;
        results.hidden = true;
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
    });

    analyzeBtn.addEventListener("click", () => {
      if (!this.analyzeImage) return;

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

      // Update styling based on verdict
      const verdictItem = document.getElementById("analysis-verdict");
      verdictItem.className = "analysis-item"; // reset
      if (analysis.verdict === "Clean")
        verdictItem.classList.add("verdict-clean");
      else if (analysis.verdict === "Suspicious")
        verdictItem.classList.add("verdict-suspicious");
      else verdictItem.classList.add("verdict-detected");

      results.hidden = false;
      this.showToast("Analysis complete!", "success");
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
