import Steganography from "./steganography.js";
import Crypto from "./crypto.js";

export default class ImageController {
  constructor(ui, canvas, ctx) {
    this.ui = ui;
    this.canvas = canvas;
    this.ctx = ctx;
    this.encodeImage = null;
    this.decodeImage = null;
    this.scrambleImage = null;
    this.unscrambleImage = null;
    this.sanitizeImage = null;
    // Redact state
    this.redactImage = null;
    this.isRedacting = false;
    this.redactStart = null;
    this.redactions = [];
    this.history = [];
  }

  init() {
    this.initEncode();
    this.initDecode();
    this.initScramblePanel();
    this.initSanitizePanel();
    this.initRedact();
    this.initColorPicker();
    this.initHashCopy();
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

    if (dropzone && input) {
      this.ui.setupDropzone(
        dropzone,
        input,
        (file) => {
          this.encodeFile = file;
          this.loadImage(file).then((img) => {
            this.encodeImage = img;
            const totalPixels =
              (img.width || img.naturalWidth) *
              (img.height || img.naturalHeight);
            maxAllowedChars = Math.floor((totalPixels * 3 - 88) / 8);
            if (maxAllowedChars < 0) maxAllowedChars = 0;
            maxCharsDisplay.textContent = maxAllowedChars.toLocaleString();

            previewImg.src = img.src;
            preview.hidden = false;
            dropzone.querySelector(".upload-content").hidden = true;
            this.updateEncodeButton(maxAllowedChars);
          });
        },
        "image"
      );

      removeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.encodeImage = null;
        this.encodeFile = null;
        preview.hidden = true;
        dropzone.querySelector(".upload-content").hidden = false;
        input.value = "";
        messageInput.value = "";
        charCount.innerText = "0";
        this.updateEncodeButton();
      });
    }

    messageInput?.addEventListener("input", () => {
      charCount.innerText = messageInput.value.length.toLocaleString();
      this.updateEncodeButton(maxAllowedChars);
    });

    submitBtn?.addEventListener("click", () => this.encode());
  }

  updateEncodeButton(maxChars = 0) {
    const btn = document.getElementById("submit-btn");
    const msg = document.getElementById("secret-message").value;
    const count = msg.length;
    if (btn) {
      if (this.encodeImage && count > 0 && count <= maxChars) {
        btn.disabled = false;
      } else {
        btn.disabled = true;
      }
    }
  }

  async encode() {
    if (!this.encodeImage) return;

    this.canvas.width = this.encodeImage.width || this.encodeImage.naturalWidth;
    this.canvas.height =
      this.encodeImage.height || this.encodeImage.naturalHeight;
    this.ctx.drawImage(this.encodeImage, 0, 0);

    let imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const message = document.getElementById("secret-message").value;
    const password = document.getElementById("encode-password").value;

    try {
      imageData = await Steganography.encode(imageData, message, password);
      this.ctx.putImageData(imageData, 0, 0);

      this.canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "stegora_image.png";
        a.click();
        URL.revokeObjectURL(url);
        this.ui.showToast("Image encoded & downloaded!", "success");
      }, "image/png");
    } catch (err) {
      console.error(err);
      this.ui.showToast(err.message || "Encoding failed", "error");
    }
  }

  initDecode() {
    const dropzone = document.getElementById("decode-dropzone");
    const input = document.getElementById("decode-image-input");
    const preview = document.getElementById("decode-preview");
    const previewImg = document.getElementById("decode-preview-img");
    const removeBtn = document.getElementById("decode-remove");
    const decodeBtn = document.getElementById("decode-btn");

    if (dropzone && input) {
      this.ui.setupDropzone(
        dropzone,
        input,
        (file) => {
          this.loadImage(file).then((img) => {
            this.decodeImage = img;
            previewImg.src = img.src;
            preview.hidden = false;
            dropzone.querySelector(".upload-content").hidden = true;
            document.getElementById("decode-actions").hidden = false;
            decodeBtn.disabled = false;
          });
        },
        "image"
      );

      removeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.decodeImage = null;
        preview.hidden = true;
        dropzone.querySelector(".upload-content").hidden = false;
        document.getElementById("decode-actions").hidden = true;
        input.value = "";
        document.getElementById("decode-password").value = "";
        decodeBtn.disabled = true;
        document.getElementById("decoded-message").value = "";
        document.getElementById("result-section").hidden = true;
      });
    }

    decodeBtn?.addEventListener("click", () => this.decode());
  }

  async decode() {
    if (!this.decodeImage) return;

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
    const password = document.getElementById("decode-password").value;

    try {
      const message = await Steganography.decode(imageData, password);
      document.getElementById("decoded-message").value = message;
      document.getElementById("result-section").hidden = false;
      this.ui.showToast("Message decoded!", "success");
    } catch (err) {
      console.error(err);
      this.ui.showToast(err.message || "Decoding failed", "error");
    }
  }

  initScramblePanel() {
    const dropzone = document.getElementById("scramble-dropzone");
    const input = document.getElementById("scramble-input");
    const btn = document.getElementById("btn-scramble");
    const passInput = document.getElementById("scramble-password");
    const previewBox = document.getElementById("scramble-preview-box");
    const previewImg = document.getElementById("scramble-preview-img");

    if (dropzone) {
      this.ui.setupDropzone(
        dropzone,
        input,
        (file) => {
          this.loadImage(file).then((img) => {
            this.scrambleImage = img;
            previewImg.src = img.src;
            previewBox.hidden = false;
            dropzone.querySelector(".upload-content").hidden = true;
            this.updateScrambleBtn();
          });
        },
        "image"
      );

      document
        .getElementById("scramble-remove")
        ?.addEventListener("click", (e) => {
          e.stopPropagation();
          this.scrambleImage = null;
          previewBox.hidden = true;
          dropzone.querySelector(".upload-content").hidden = false;
          input.value = "";
          this.updateScrambleBtn();
        });
    }

    passInput?.addEventListener("input", () => this.updateScrambleBtn());
    btn?.addEventListener("click", () => this.doScramble());

    const uDropzone = document.getElementById("unscramble-dropzone");
    const uInput = document.getElementById("unscramble-input");
    const uBtn = document.getElementById("btn-unscramble");
    const uPass = document.getElementById("unscramble-password");
    const uPreviewBox = document.getElementById("unscramble-preview-box");
    const uPreviewImg = document.getElementById("unscramble-preview-img");

    if (uDropzone) {
      this.ui.setupDropzone(
        uDropzone,
        uInput,
        (file) => {
          this.loadImage(file).then((img) => {
            this.unscrambleImage = img;
            uPreviewImg.src = img.src;
            uPreviewBox.hidden = false;
            uDropzone.querySelector(".upload-content").hidden = true;
            this.updateUnscrambleBtn();
          });
        },
        "image"
      );

      document
        .getElementById("unscramble-remove")
        ?.addEventListener("click", (e) => {
          e.stopPropagation();
          this.unscrambleImage = null;
          uPreviewBox.hidden = true;
          uDropzone.querySelector(".upload-content").hidden = false;
          uInput.value = "";
          this.updateUnscrambleBtn();
        });
    }

    uPass?.addEventListener("input", () => this.updateUnscrambleBtn());
    uBtn?.addEventListener("click", () => this.doUnscramble());
  }

  updateScrambleBtn() {
    const btn = document.getElementById("btn-scramble");
    const pass = document.getElementById("scramble-password");
    if (btn) btn.disabled = !(this.scrambleImage && pass.value);
  }

  updateUnscrambleBtn() {
    const btn = document.getElementById("btn-unscramble");
    const pass = document.getElementById("unscramble-password");
    if (btn) btn.disabled = !(this.unscrambleImage && pass.value);
  }

  mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  hashToSeed(password) {
    let h = 0xdeadbeef;
    for (let i = 0; i < password.length; i++) {
      h = Math.imul(h ^ password.charCodeAt(i), 2654435761);
    }
    return (h ^ (h >>> 16)) >>> 0;
  }

  async doScramble() {
    const password = document.getElementById("scramble-password").value.trim();
    if (!this.scrambleImage || !password) return;

    this.ui.showToast("Scrambling... please wait", "info");

    await new Promise((r) => setTimeout(r, 50));

    this.canvas.width = this.scrambleImage.width;
    this.canvas.height = this.scrambleImage.height;
    this.ctx.drawImage(this.scrambleImage, 0, 0);

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const blockSize = 32;

    const seed = this.hashToSeed(password);
    const random = this.mulberry32(seed);

    const blocksX = Math.ceil(width / blockSize);
    const blocksY = Math.ceil(height / blockSize);
    const totalBlocks = blocksX * blocksY;

    const indices = Array.from({ length: totalBlocks }, (_, i) => i);
    for (let i = totalBlocks - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const resultBuffer = new Uint8ClampedArray(data.length);

    const salt = new Uint8Array(16);
    const passHash = await this.generatePasswordHash(password, salt);

    const processChunk = (start) => {
      const end = Math.min(start + 100, totalBlocks);
      for (let i = start; i < end; i++) {
        const srcIdx = i;
        const dstIdx = indices[i];

        const sx = (srcIdx % blocksX) * blockSize;
        const sy = Math.floor(srcIdx / blocksX) * blockSize;

        const dx = (dstIdx % blocksX) * blockSize;
        const dy = Math.floor(dstIdx / blocksX) * blockSize;

        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            if (sx + x >= width || sy + y >= height) continue;
            if (dx + x >= width || dy + y >= height) continue;

            const sPos = ((sy + y) * width + (sx + x)) * 4;
            const dPos = ((dy + y) * width + (dx + x)) * 4;

            resultBuffer[dPos] = data[sPos];
            resultBuffer[dPos + 1] = data[sPos + 1];
            resultBuffer[dPos + 2] = data[sPos + 2];
            resultBuffer[dPos + 3] = data[sPos + 3];
          }
        }
      }

      if (end < totalBlocks) {
        requestAnimationFrame(() => processChunk(end));
      } else {
        this.ctx.putImageData(resImageData, 0, 0);
        this.canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "scrambled_image.png";
          a.click();
          URL.revokeObjectURL(url);
          this.ui.showToast("Scrambled and downloaded!", "success");
        }, "image/png");
      }
    };

    processChunk(0);
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
      256
    );
    return new Uint8Array(derivedBits);
  }

  async doUnscramble() {
    const password = document
      .getElementById("unscramble-password")
      .value.trim();
    if (!this.unscrambleImage || !password) return;

    this.ui.showToast("Unscrambling... please wait", "info");
    await new Promise((r) => setTimeout(r, 50));
    this.canvas.height = this.unscrambleImage.height;
    this.ctx.drawImage(this.unscrambleImage, 0, 0);

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const blockSize = 32;

    const seed = this.hashToSeed(password);
    const random = this.mulberry32(seed);

    const blocksX = Math.ceil(width / blockSize);
    const blocksY = Math.ceil(height / blockSize);
    const totalBlocks = blocksX * blocksY;

    const indices = Array.from({ length: totalBlocks }, (_, i) => i);
    for (let i = totalBlocks - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const resultBuffer = new Uint8ClampedArray(data.length);

    const processChunk = (start) => {
      const end = Math.min(start + 100, totalBlocks);
      for (let i = start; i < end; i++) {
        const targetOriginalBlockIdx = i;
        const currentScrambledBlockLoc = indices[i];

        const dstIdx = targetOriginalBlockIdx;
        const srcIdx = currentScrambledBlockLoc;

        const sx = (srcIdx % blocksX) * blockSize;
        const sy = Math.floor(srcIdx / blocksX) * blockSize;

        const dx = (dstIdx % blocksX) * blockSize;
        const dy = Math.floor(dstIdx / blocksX) * blockSize;

        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            if (sx + x >= width || sy + y >= height) continue;
            if (dx + x >= width || dy + y >= height) continue;

            const sPos = ((sy + y) * width + (sx + x)) * 4;
            const dPos = ((dy + y) * width + (dx + x)) * 4;

            resultBuffer[dPos] = data[sPos];
            resultBuffer[dPos + 1] = data[sPos + 1];
            resultBuffer[dPos + 2] = data[sPos + 2];
            resultBuffer[dPos + 3] = data[sPos + 3];
          }
        }
      }

      if (end < totalBlocks) {
        requestAnimationFrame(() => processChunk(end));
      } else {
        const resImageData = new ImageData(resultBuffer, width, height);
        this.ctx.putImageData(resImageData, 0, 0);
        this.canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "unscrambled_image.png";
          a.click();
          URL.revokeObjectURL(url);
          this.ui.showToast("Unscrambled!", "success");
        }, "image/png");
      }
    };
    processChunk(0);
  }

  initSanitizePanel() {
    const dropzone = document.getElementById("sanitize-dropzone");
    const input = document.getElementById("sanitize-input");
    const preview = document.getElementById("sanitize-preview");
    const previewImg = document.getElementById("sanitize-preview-img");
    const removeBtn = document.getElementById("sanitize-remove");
    const btn = document.getElementById("btn-sanitize");

    if (dropzone) {
      this.ui.setupDropzone(
        dropzone,
        input,
        (file) => {
          this.loadImage(file).then((img) => {
            this.sanitizeImage = img;
            previewImg.src = img.src;
            preview.hidden = false;
            dropzone.querySelector(".upload-content").hidden = true;
            btn.disabled = false;
          });
        },
        "image"
      );

      removeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.sanitizeImage = null;
        preview.hidden = true;
        dropzone.querySelector(".upload-content").hidden = false;
        input.value = "";
        btn.disabled = true;
      });
    }

    btn?.addEventListener("click", () => this.doSanitize());
  }

  doSanitize() {
    if (!this.sanitizeImage) return;
    const img = this.sanitizeImage;
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);
    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sanitized_image.png";
      a.click();
      URL.revokeObjectURL(url);
      this.ui.showToast("Metadata cleaned & downloaded!", "success");
    }, "image/png");
  }

  initRedact() {
    const dropzone = document.getElementById("redact-dropzone");
    const input = document.getElementById("redact-input");

    if (dropzone) {
      this.ui.setupDropzone(
        dropzone,
        input,
        (file) => {
          this.loadImage(file).then((img) => {
            this.startRedactSession(img);
          });
        },
        "image"
      );
    }
    document
      .getElementById("btn-redact-undo")
      ?.addEventListener("click", () => this.undoRedact());
    document
      .getElementById("btn-redact-save")
      ?.addEventListener("click", () => this.saveRedact());
  }

  startRedactSession(img) {
    const canvas = document.getElementById("redact-canvas");
    if (!canvas) return;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    this.redactImage = img;
    this.history = [ctx.getImageData(0, 0, canvas.width, canvas.height)];

    canvas.hidden = false;
    document.getElementById("redact-dropzone").hidden = true;
    document.getElementById("redact-toolbar").hidden = false;
    document.getElementById("redact-instructions").hidden = false;

    let startX,
      startY,
      isDown = false;

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
      isDown = true;
      const pos = getPos(e);
      startX = pos.x;
      startY = pos.y;
    };

    canvas.onmouseup = (e) => {
      if (!isDown) return;
      isDown = false;
      const pos = getPos(e);
      this.applyRedact(canvas, startX, startY, pos.x - startX, pos.y - startY);
    };

    canvas.onmousemove = (e) => {
      if (!isDown) return;
    };
  }

  applyRedact(canvas, x, y, w, h) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, w, h);
    this.history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    this.ui.showToast("Redacted area", "info");
  }

  undoRedact() {
    if (this.history.length > 1) {
      this.history.pop();
      const canvas = document.getElementById("redact-canvas");
      const ctx = canvas.getContext("2d");
      ctx.putImageData(this.history[this.history.length - 1], 0, 0);
    }
  }

  saveRedact() {
    const canvas = document.getElementById("redact-canvas");
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "redacted.png";
      a.click();
    });
  }

  initColorPicker() {
    const dropzone = document.getElementById("picker-dropzone");
    const input = document.getElementById("picker-input");
    if (dropzone) {
      this.ui.setupDropzone(
        dropzone,
        input,
        (file) => {
          this.loadImage(file).then((img) => {
            this.extractColors(img);
          });
        },
        "image"
      );
    }
  }

  extractColors(img) {
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);
    const data = this.ctx.getImageData(0, 0, img.width, img.height).data;
    const colors = {};
    for (let i = 0; i < data.length; i += 400) {
      const rgb = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      colors[rgb] = (colors[rgb] || 0) + 1;
    }
    this.ui.showToast("Colors extracted!", "success");
    document.getElementById("picker-results").hidden = false;
  }

  initHashCopy() {
    document.querySelectorAll(".copy-icon").forEach((icon) => {
      icon.addEventListener("click", () => {
        const text = icon.previousElementSibling.textContent;
        navigator.clipboard.writeText(text);
        this.ui.showToast("Copied!", "success");
      });
    });
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}
