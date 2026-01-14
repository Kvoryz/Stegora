
import { ImagePanelMixin } from "./ui/image-panel.js";
import { AudioPanelMixin } from "./ui/audio-panel.js";
import { ImageToolsMixin } from "./ui/image-tools.js";
import { FilePanelMixin } from "./ui/file-panel.js";
import { CryptoPanelMixin } from "./ui/crypto-panel.js";

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
    this.safeInit("initColorPicker");
    this.safeInit("initFileUtilities");
    this.safeInit("initMorseCode");
    this.safeInit("initCipher");
    this.safeInit("initNumberSystem");
    this.safeInit("initSecretLink");
    this.safeInit("initHashGenerator");
    this.safeInit("initTextRepeater");
    this.safeInit("initPasswordGenerator");
  }

  safeInit(methodName) {
    if (typeof this[methodName] === "function") {
      try {
        console.log(`[Stegora] Initializing ${methodName}...`);
        this[methodName]();
        console.log(`[Stegora] ${methodName} success.`);
      } catch (err) {
        console.error(`[Stegora] Failed to initialize ${methodName}:`, err);
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
        this.showToast("Please drop an image file", "error");
      }
    });

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) onFile(file);
    });
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Invalid image file"));
        return;
      }
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
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

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  copyToClipboard(text, successMsg = "Copied to clipboard!") {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(successMsg, "success");
    });
  }

  prepareCanvas(image) {
    this.canvas.width = image.width || image.naturalWidth;
    this.canvas.height = image.height || image.naturalHeight;
    this.ctx.drawImage(image, 0, 0);
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
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
}

Object.assign(StegoraApp.prototype, ImagePanelMixin);
Object.assign(StegoraApp.prototype, AudioPanelMixin);
Object.assign(StegoraApp.prototype, ImageToolsMixin);
Object.assign(StegoraApp.prototype, FilePanelMixin);
Object.assign(StegoraApp.prototype, CryptoPanelMixin);

document.addEventListener("DOMContentLoaded", () => {
  new StegoraApp();
});

export { StegoraApp };
