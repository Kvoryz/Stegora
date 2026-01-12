import Steganalysis from "./steganalysis.js";
import MetadataScanner from "./metadata-scanner.js";

export default class AnalysisController {
  constructor(ui, canvas, ctx) {
    this.ui = ui;
    this.canvas = canvas;
    this.ctx = ctx;
    this.analysisImage = null;
  }

  init() {
    this.initAnalyze();
    this.initSteganalysis();
    this.initLSBAnalysis();
  }

  initAnalyze() {
    const dropzone = document.getElementById("analyze-dropzone");
    const input = document.getElementById("analyze-input");
    const preview = document.getElementById("analyze-preview");
    const previewImg = document.getElementById("analyze-preview-img");
    const removeBtn = document.getElementById("analyze-remove");
    const metaList = document.getElementById("metadata-list");

    if (dropzone && input) {
      this.ui.setupDropzone(
        dropzone,
        input,
        async (file) => {
          previewImg.src = URL.createObjectURL(file);
          preview.hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;

          // Metadata Scan
          metaList.innerHTML = "<p>Scanning...</p>";
          try {
            const result = await MetadataScanner.scan(file);
            metaList.innerHTML = "";
            result.findings.forEach((f) => {
              const div = document.createElement("div");
              div.className = "meta-item";
              div.textContent = f;
              metaList.appendChild(div);
            });

            // GPS
            if (result.details.gps) {
              const div = document.createElement("div");
              div.className = "meta-item warning";
              div.textContent = `📍 GPS Found: ${result.details.gps}`;
              metaList.appendChild(div);
            }
          } catch (e) {
            metaList.innerHTML = "<p>Error scanning</p>";
          }
        },
        "image"
      );

      removeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        preview.hidden = true;
        dropzone.querySelector(".upload-content").hidden = false;
        input.value = "";
        metaList.innerHTML = "";
      });
    }
  }

  initSteganalysis() {
    const dropzone = document.getElementById("steg-dropzone");
    const input = document.getElementById("steg-input");
    const compareInput = document.getElementById("steg-compare-input");
    const compareBtn = document.getElementById("btn-steg-compare");
    const analyzeBtn = document.getElementById("btn-steg-analyze");

    if (dropzone) {
      this.ui.setupDropzone(
        dropzone,
        input,
        (file) => {
          this.loadImage(file).then((img) => {
            this.analysisImage = img;
            document.getElementById("steg-preview-box").hidden = false;
            document.getElementById("steg-preview-img").src = img.src;
            dropzone.querySelector(".upload-content").hidden = true;
            analyzeBtn.disabled = false;
            this.updateStegCompareBtn();
          });
        },
        "image"
      );

      document.getElementById("steg-remove")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.analysisImage = null;
        document.getElementById("steg-preview-box").hidden = true;
        dropzone.querySelector(".upload-content").hidden = false;
        input.value = "";
        analyzeBtn.disabled = true;
        this.updateStegCompareBtn();
      });

      compareInput?.addEventListener("change", (e) => {
        this.updateStegCompareBtn();
      });

      analyzeBtn?.addEventListener("click", () => this.doSteganalysis());
    }
  }

  updateStegCompareBtn() {
    const btn = document.getElementById("btn-steg-compare");
    const compInput = document.getElementById("steg-compare-input");
    if (btn) {
      btn.disabled = !(this.analysisImage && compInput.files[0]);
    }
  }

  doSteganalysis() {
    if (!this.analysisImage) return;
    const img = this.analysisImage;
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height);

    const result = Steganalysis.analyze(imageData);

    document.getElementById("res-verdict").textContent = result.verdict;
    document.getElementById("res-lsb").textContent = result.lsbScore;
    document.getElementById("res-chi").textContent = result.chiSquare;
    document.getElementById("res-noise").textContent = result.bitPlaneNoise;

    document.getElementById("steganalysis-results").hidden = false;
  }

  initLSBAnalysis() {
    const dropzone = document.getElementById("lsb-dropzone");
    const input = document.getElementById("lsb-input");
    const btn = document.getElementById("btn-lsb-analyze");
    const bitSelect = document.getElementById("lsb-bit-plane");

    if (dropzone) {
      this.ui.setupDropzone(
        dropzone,
        input,
        (file) => {
          document.getElementById("lsb-preview-img").src =
            URL.createObjectURL(file);
          document.getElementById("lsb-preview-box").hidden = false;
          dropzone.querySelector(".upload-content").hidden = true;
          btn.disabled = false;
        },
        "image"
      );

      document.getElementById("lsb-remove")?.addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("lsb-preview-box").hidden = true;
        dropzone.querySelector(".upload-content").hidden = false;
        input.value = "";
        btn.disabled = true;
      });
    }

    btn?.addEventListener("click", () => {
      const img = document.getElementById("lsb-preview-img");
      this.doLSBAnalysis(img, parseInt(bitSelect.value));
    });
  }

  doLSBAnalysis(img, bit) {
    const resCanvas = document.getElementById("lsb-result-canvas");
    const resCtx = resCanvas.getContext("2d");
    resCanvas.width = img.naturalWidth;
    resCanvas.height = img.naturalHeight;

    this.canvas.width = img.naturalWidth;
    this.canvas.height = img.naturalHeight;
    this.ctx.drawImage(img, 0, 0);
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const data = imageData.data;
    const resData = resCtx.createImageData(resCanvas.width, resCanvas.height);
    const pixels = resData.data;

    for (let i = 0; i < data.length; i += 4) {
      const mask = 1 << bit;
      const val = data[i] & mask ? 255 : 0;
      const r = (data[i] >> bit) & 1;
      const g = (data[i + 1] >> bit) & 1;
      const b = (data[i + 2] >> bit) & 1;

      const v = (r | g | b) * 255;
      pixels[i] = v;
      pixels[i + 1] = v;
      pixels[i + 2] = v;
      pixels[i + 3] = 255;
    }
    resCtx.putImageData(resData, 0, 0);
    resCanvas.hidden = false;
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
