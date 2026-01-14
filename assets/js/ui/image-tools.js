import { MetadataScanner, Steganalysis } from "../core/steganalysis.js";

export const ImageToolsMixin = {
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
          document.getElementById("exif-actions").hidden = false;
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
      document.getElementById("exif-actions").hidden = true;
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
  },

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
          document.getElementById("scramble-actions").hidden = false;
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
        document.getElementById("scramble-actions").hidden = true;
        document.getElementById("scramble-password").value = "";
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
          document.getElementById("unscramble-actions").hidden = false;
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
        document.getElementById("unscramble-actions").hidden = true;
        document.getElementById("unscramble-password").value = "";
        this.updateUnscrambleBtn();
      });

    document
      .getElementById("unscramble-password")
      ?.addEventListener("input", () => this.updateUnscrambleBtn());
    document
      .getElementById("unscramble-action-btn")
      ?.addEventListener("click", () => this.doUnscramble());
  },

  updateScrambleBtn() {
    const btn = document.getElementById("scramble-action-btn");
    const password = document.getElementById("scramble-password")?.value.trim();
    btn.disabled = !this.scrambleImage || !password;
  },

  updateUnscrambleBtn() {
    const btn = document.getElementById("unscramble-action-btn");
    const password = document
      .getElementById("unscramble-password")
      ?.value.trim();
    btn.disabled = !this.unscrambleImage || !password;
  },

  async doScramble() {
    const password = document.getElementById("scramble-password").value.trim();
    if (!this.scrambleImage || !password) return;

    this.showToast("Scrambling image...", "");
    await new Promise((r) => setTimeout(r, 50));

    this.ctx.imageSmoothingEnabled = false;

    const width = this.scrambleImage.naturalWidth;
    const height = this.scrambleImage.naturalHeight;
    this.canvas.width = width;
    this.canvas.height = height + 1;

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
    headerBytes.set([0x53, 0x54, 0x45, 0x47], 0);
    headerBytes.set(salt, 4);
    headerBytes.set(passHash, 20);

    let pixelIdx = 0;
    for (let i = 0; i < headerBytes.length; i++) {
      const offset = pixelIdx * 4 + (i % 3);
      data[offset] = headerBytes[i];
      if (i % 3 === 2) pixelIdx++;
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

    const startOffset = width * 4;
    for (let i = startOffset; i < data.length; i += 4) {
      data[i] ^= (prng() * 256) | 0;
      data[i + 1] ^= (prng() * 256) | 0;
      data[i + 2] ^= (prng() * 256) | 0;
      data[i + 3] = 255;
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
  },

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
  },

  buffersEqual(a, b) {
    if (a.byteLength !== b.byteLength) return false;
    for (let i = 0; i < a.byteLength; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  },

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
      const salt = headerBytes.slice(4, 20);
      const storedHash = headerBytes.slice(20, 52);

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

    const _this = this;
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
  },

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
          document.getElementById("sanitize-actions").hidden = false;
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
        document.getElementById("sanitize-actions").hidden = true;
        document.getElementById("sanitize-action-btn").disabled = true;
      });

    document
      .getElementById("sanitize-action-btn")
      ?.addEventListener("click", () => this.doSanitize());
  },

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
  },

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
        document.getElementById("steg-results").hidden = true;
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
        document.getElementById("steg-results").hidden = true;
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
  },

  updateStegCompareBtn() {
    const btn = document.getElementById("steg-compare-btn");
    const actions = document.getElementById("steg-actions");
    const hasAny = this.stegOrigImage || this.stegSuspImage;
    if (actions) actions.hidden = !hasAny;
    if (btn) btn.disabled = !this.stegOrigImage || !this.stegSuspImage;
  },

  doSteganalysis() {
    if (!this.stegOrigImage || !this.stegSuspImage) return;

    // Check if same file
    if (
      this.stegOrigFile &&
      this.stegSuspFile &&
      this.stegOrigFile.name === this.stegSuspFile.name &&
      this.stegOrigFile.size === this.stegSuspFile.size &&
      this.stegOrigFile.lastModified === this.stegSuspFile.lastModified
    ) {
      this.showToast("Cannot compare identical files!", "error");
      return;
    }

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
        outData[i + 3] = 255;
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
  },

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
          document.getElementById("lsb-actions").hidden = false;
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
      document.getElementById("lsb-actions").hidden = true;
      document.getElementById("lsb-analyze-btn").disabled = true;
      document.getElementById("lsb-results").hidden = true;
    });

    document
      .getElementById("lsb-analyze-btn")
      ?.addEventListener("click", () => {
        this.doLSBAnalysis();
      });
  },

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

    document.getElementById("lsb-chi").textContent = result.chiSquare;
    document.getElementById("lsb-entropy").textContent = result.entropy;

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
      verdictDesc.textContent = `${result.suspicionLevel} indicator(s) detected. Image may contain hidden data.`;
    } else {
      verdictBox.style.background = "rgba(239, 68, 68, 0.15)";
      verdictBox.style.border = "1px solid rgba(239, 68, 68, 0.3)";
      verdictDesc.textContent = `${result.suspicionLevel} indicators detected! Strong evidence of steganographic manipulation.`;
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
  },

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
  },

  updateRedactToolbar(activeBtn) {
    document
      .querySelectorAll("#redact-editor .tool-group .btn")
      .forEach((b) => b.classList.remove("active"));
    activeBtn.classList.add("active");
  },

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
  },

  setupRedactEvents(canvas) {
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const handleStart = (e) => {
      e.preventDefault();
      this.isDragging = true;
      const pos = getPos(e);
      this.startX = pos.x;
      this.startY = pos.y;
      this.tempSnapshot = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height);
    };

    const handleMove = (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const pos = getPos(e);
      const ctx = canvas.getContext("2d");

      ctx.putImageData(this.tempSnapshot, 0, 0);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2 * (canvas.width / canvas.getBoundingClientRect().width);
      ctx.setLineDash([5, 5]);
      const w = pos.x - this.startX;
      const h = pos.y - this.startY;
      ctx.strokeRect(this.startX, this.startY, w, h);

      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.setLineDash([0, 0]);
      ctx.strokeRect(this.startX - 1, this.startY - 1, w + 2, h + 2);
    };

    const handleEnd = (e) => {
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

    const handleCancel = () => {
      if (this.isDragging) {
        this.isDragging = false;
        const ctx = canvas.getContext("2d");
        ctx.putImageData(this.tempSnapshot, 0, 0);
      }
    };

    // Mouse events
    canvas.onmousedown = handleStart;
    canvas.onmousemove = handleMove;
    canvas.onmouseup = handleEnd;
    canvas.onmouseout = handleCancel;

    // Touch events for mobile
    canvas.ontouchstart = handleStart;
    canvas.ontouchmove = handleMove;
    canvas.ontouchend = handleEnd;
    canvas.ontouchcancel = handleCancel;
  },

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
      finalCtx.imageSmoothingQuality = "medium";
      finalCtx.drawImage(smallCanvas, 0, 0, w, h);

      ctx.drawImage(finalCanvas, x, y);
    }

    const newSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.redactUndoStack.push(newSnapshot);
    if (this.redactUndoStack.length > 10) this.redactUndoStack.shift();
    this.updateUndoBtn();
  },

  undoRedact() {
    if (this.redactUndoStack.length <= 1) return;
    this.redactUndoStack.pop();
    const prev = this.redactUndoStack[this.redactUndoStack.length - 1];
    const canvas = document.getElementById("redact-canvas");
    canvas.getContext("2d").putImageData(prev, 0, 0);
    this.updateUndoBtn();
  },

  updateUndoBtn() {
    const btn = document.getElementById("redact-undo");
    if (btn) btn.disabled = this.redactUndoStack.length <= 1;
  },

  initColorPicker() {
    const dropzone = document.getElementById("color-dropzone");
    const input = document.getElementById("color-input");

    if (!dropzone || !input) return;

    this.setupDropzone(dropzone, input, (file) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        document.getElementById("color-preview-img").src = img.src;
        document.getElementById("color-preview").hidden = false;
        dropzone.querySelector(".upload-content").hidden = true;

        this.extractColors(img);
      };
    });

    document.getElementById("color-remove")?.addEventListener("click", () => {
      document.getElementById("color-preview").hidden = true;
      dropzone.querySelector(".upload-content").hidden = false;
      input.value = "";
      document.getElementById("color-results").hidden = true;
    });
  },

  extractColors(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const MAX_SIZE = 100;
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    if (w > MAX_SIZE || h > MAX_SIZE) {
      if (w > h) {
        h = Math.round((h * MAX_SIZE) / w);
        w = MAX_SIZE;
      } else {
        w = Math.round((w * MAX_SIZE) / h);
        h = MAX_SIZE;
      }
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h).data;
    const colorCounts = {};
    const quantization = 5;

    for (let i = 0; i < imageData.length; i += 4) {
      const r = Math.floor(imageData[i] / quantization) * quantization;
      const g = Math.floor(imageData[i + 1] / quantization) * quantization;
      const b = Math.floor(imageData[i + 2] / quantization) * quantization;
      const a = imageData[i + 3];

      if (a < 128) continue;

      const key = `${r},${g},${b}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key]) => {
        const [r, g, b] = key.split(",").map(Number);
        return this.rgbToHex(r, g, b);
      });

    this.renderPalette(sortedColors);
  },

  rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  },

  renderPalette(colors) {
    const paletteContainer = document.getElementById("color-palette");
    const listContainer = document.getElementById("color-list");

    if (!paletteContainer || !listContainer) return;

    paletteContainer.innerHTML = "";
    listContainer.innerHTML = "";

    colors.forEach((color) => {
      const swatch = document.createElement("div");
      swatch.style.width = "40px";
      swatch.style.height = "40px";
      swatch.style.borderRadius = "8px";
      swatch.style.backgroundColor = color;
      swatch.style.cursor = "pointer";
      swatch.style.border = "1px solid var(--border-color)";
      swatch.title = `Copy ${color}`;
      swatch.onclick = () => {
        navigator.clipboard.writeText(color);
        this.showToast(`Copied ${color}`, "success");
      };
      paletteContainer.appendChild(swatch);

      const item = document.createElement("div");
      item.className = "color-item";
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "8px";
      item.style.padding = "8px";
      item.style.background = "var(--bg-tertiary)";
      item.style.borderRadius = "8px";
      item.style.cursor = "pointer";
      item.onclick = () => {
        navigator.clipboard.writeText(color);
        this.showToast(`Copied ${color}`, "success");
      };

      item.innerHTML = `
        <div style="width: 20px; height: 20px; border-radius: 4px; background: ${color}; border: 1px solid var(--border-color);"></div>
        <span style="font-family: monospace; font-size: 13px; color: var(--text-primary);">${color}</span>
      `;
      listContainer.appendChild(item);
    });

    document.getElementById("color-results").hidden = false;
  },
};
