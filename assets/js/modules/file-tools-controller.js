import Crypto from "./crypto.js";

export default class FileToolsController {
  constructor(ui) {
    this.ui = ui;
    this.fileToEncrypt = null;
    this.fileToDecrypt = null;
    this.fileToSplit = null;
  }

  init() {
    this.initFileEncrypt();
    this.initFileBase64();
    this.initFileSplitter();
    this.initMagicBytes();
  }

  initFileEncrypt() {
    const encDropzone = document.getElementById("file-enc-dropzone");
    const encInput = document.getElementById("file-enc-input");
    const encPass = document.getElementById("file-enc-password");
    const encBtn = document.getElementById("btn-file-encrypt");

    if (encDropzone && encInput) {
      this.ui.setupDropzone(encDropzone, encInput, (file) => {
        this.fileToEncrypt = file;
        document.getElementById("file-enc-name").textContent = file.name;
        document.getElementById("file-enc-preview").hidden = false;
        encDropzone.querySelector(".upload-content").hidden = true;
        document.getElementById("file-enc-actions").hidden = false;
        this.updateFileEncBtn();
      });

      document
        .getElementById("file-enc-remove")
        ?.addEventListener("click", (e) => {
          e.stopPropagation();
          this.fileToEncrypt = null;
          document.getElementById("file-enc-preview").hidden = true;
          encDropzone.querySelector(".upload-content").hidden = false;
          document.getElementById("file-enc-actions").hidden = true;
          encInput.value = "";
          this.updateFileEncBtn();
        });

      encPass?.addEventListener("input", () => this.updateFileEncBtn());

      encBtn?.addEventListener("click", async () => {
        try {
          if (!this.fileToEncrypt || !encPass.value) return;

          encBtn.textContent = "Encrypting...";
          encBtn.disabled = true;

          const password = encPass.value;
          const buffer = await this.fileToEncrypt.arrayBuffer();
          const salt = window.crypto.getRandomValues(new Uint8Array(16));
          const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
          );
          const key = await window.crypto.subtle.deriveKey(
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

          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            buffer
          );

          const combined = new Uint8Array(
            salt.length + iv.length + encryptedContent.byteLength
          );
          combined.set(salt, 0);
          combined.set(iv, salt.length);
          combined.set(
            new Uint8Array(encryptedContent),
            salt.length + iv.length
          );

          const blob = new Blob([combined], {
            type: "application/octet-stream",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = this.fileToEncrypt.name + ".enc";
          a.click();
          URL.revokeObjectURL(url);

          this.ui.showToast("File encrypted successfully!", "success");
          encBtn.textContent = "Encrypt & Download";
          encBtn.disabled = false;
        } catch (err) {
          console.error(err);
          this.ui.showToast("Encryption failed", "error");
          encBtn.textContent = "Encrypt & Download";
          encBtn.disabled = false;
        }
      });
    }

    const decDropzone = document.getElementById("file-dec-dropzone");
    const decInput = document.getElementById("file-dec-input");
    const decPass = document.getElementById("file-dec-password");
    const decBtn = document.getElementById("btn-file-decrypt");

    if (decDropzone && decInput) {
      this.ui.setupDropzone(decDropzone, decInput, (file) => {
        this.fileToDecrypt = file;
        document.getElementById("file-dec-name").textContent = file.name;
        document.getElementById("file-dec-preview").hidden = false;
        decDropzone.querySelector(".upload-content").hidden = true;
        document.getElementById("file-dec-actions").hidden = false;
        this.updateFileDecBtn();
      });

      document
        .getElementById("file-dec-remove")
        ?.addEventListener("click", (e) => {
          e.stopPropagation();
          this.fileToDecrypt = null;
          document.getElementById("file-dec-preview").hidden = true;
          decDropzone.querySelector(".upload-content").hidden = false;
          document.getElementById("file-dec-actions").hidden = true;
          decInput.value = "";
          this.updateFileDecBtn();
        });

      decPass?.addEventListener("input", () => this.updateFileDecBtn());

      decBtn?.addEventListener("click", async () => {
        try {
          if (!this.fileToDecrypt || !decPass.value) return;

          decBtn.textContent = "Decrypting...";
          decBtn.disabled = true;

          const password = decPass.value;
          const buffer = await this.fileToDecrypt.arrayBuffer();
          const combined = new Uint8Array(buffer);

          if (combined.length < 28) throw new Error("File too short");

          const salt = combined.slice(0, 16);
          const iv = combined.slice(16, 28);
          const data = combined.slice(28);

          const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
          );
          const key = await window.crypto.subtle.deriveKey(
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

          const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
          );

          const originalName = this.fileToDecrypt.name.replace(".enc", "");
          const blob = new Blob([decryptedContent], {
            type: "application/octet-stream",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = originalName;
          a.click();
          URL.revokeObjectURL(url);

          this.ui.showToast("File decrypted successfully!", "success");
          decBtn.textContent = "Decrypt & Download";
          decBtn.disabled = false;
        } catch (err) {
          console.error(err);
          this.ui.showToast("Decryption failed. Wrong password?", "error");
          decBtn.textContent = "Decrypt & Download";
          decBtn.disabled = false;
        }
      });
    }
  }

  updateFileEncBtn() {
    const btn = document.getElementById("btn-file-encrypt");
    const pass = document.getElementById("file-enc-password");
    if (btn && pass) {
      btn.disabled = !(this.fileToEncrypt && pass.value);
    }
  }

  updateFileDecBtn() {
    const btn = document.getElementById("btn-file-decrypt");
    const pass = document.getElementById("file-dec-password");
    if (btn && pass) {
      btn.disabled = !(this.fileToDecrypt && pass.value);
    }
  }

  initFileBase64() {
    const dropzone = document.getElementById("base64-dropzone");
    const input = document.getElementById("base64-input");
    const output = document.getElementById("base64-output");
    const copyBtn = document.getElementById("base64-copy");
    const dlBtn = document.getElementById("base64-download");

    if (dropzone && input) {
      this.ui.setupDropzone(dropzone, input, (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          output.value = e.target.result;
          this.ui.showToast("Converted to Base64!", "success");
          document.getElementById("base64-enc-actions").hidden = false;
        };
        reader.readAsDataURL(file);
      });
    }

    copyBtn?.addEventListener("click", () => {
      if (!output.value) return;
      navigator.clipboard.writeText(output.value);
      this.ui.showToast("Copied to clipboard!", "success");
    });

    dlBtn?.addEventListener("click", () => {
      if (!output.value) return;
      const blob = new Blob([output.value], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "base64_encoded.txt";
      a.click();
      URL.revokeObjectURL(url);
    });

    document
      .getElementById("base64-output-clear")
      ?.addEventListener("click", () => {
        output.value = "";
        document.getElementById("base64-enc-actions").hidden = true;
      });

    const decDropzone = document.getElementById("base64-dec-dropzone");
    const decInput = document.getElementById("base64-dec-input");
    const decFilename = document.getElementById("base64-dec-name");
    const decPreview = document.getElementById("base64-dec-preview");
    const decRemove = document.getElementById("base64-dec-remove");

    const textArea = document.getElementById("base64-decode-input");
    const decodeBtn = document.getElementById("btn-base64-decode");

    this.ui.setupDropzone(decDropzone, decInput, (file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        textArea.value = evt.target.result;
        this.ui.showToast("File text loaded!", "success");
        decFilename.textContent = file.name;
        decPreview.hidden = false;
        decDropzone.querySelector(".upload-content").hidden = true;
        document.getElementById("base64-dec-actions").hidden = false;
      };
      reader.readAsText(file);
    });

    if (decRemove) {
      decRemove.addEventListener("click", (e) => {
        e.stopPropagation();
        decPreview.hidden = true;
        decDropzone.querySelector(".upload-content").hidden = false;
        decInput.value = "";
        textArea.value = "";
        document.getElementById("base64-dec-actions").hidden = true;
      });
    }

    document
      .getElementById("base64-decode-clear")
      ?.addEventListener("click", () => {
        textArea.value = "";
      });

    decodeBtn?.addEventListener("click", () => {
      const base64Str = textArea.value.trim();
      if (!base64Str) return;
      try {
        const binStr = atob(base64Str.split(",")[1] || base64Str);
        const len = binStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }

        let type = "application/octet-stream";
        if (bytes[0] === 0xff && bytes[1] === 0xd8) type = "image/jpeg";
        if (bytes[0] === 0x89 && bytes[1] === 0x50) type = "image/png";

        const blob = new Blob([bytes], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "decoded_file";
        a.click();
        URL.revokeObjectURL(url);
        this.ui.showToast("Decoded & Downloaded!", "success");
      } catch (e) {
        this.ui.showToast("Invalid Base64 string", "error");
      }
    });
  }

  initFileSplitter() {
    const dropzone = document.getElementById("splitter-dropzone");
    const input = document.getElementById("splitter-input");
    const sizeInput = document.getElementById("splitter-size");
    const actionBtn = document.getElementById("btn-split-file");
    const removeBtn = document.getElementById("splitter-remove");

    document.querySelectorAll(".size-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        sizeInput.value = chip.dataset.size;
      });
    });

    if (dropzone && input) {
      this.ui.setupDropzone(dropzone, input, (file) => {
        this.fileToSplit = file;
        document.getElementById("splitter-name").textContent = file.name;
        document.getElementById("splitter-preview").hidden = false;
        dropzone.querySelector(".upload-content").hidden = true;
        document.getElementById("splitter-actions").hidden = false;
        if (actionBtn) actionBtn.disabled = false;
      });

      removeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.fileToSplit = null;
        document.getElementById("splitter-preview").hidden = true;
        dropzone.querySelector(".upload-content").hidden = false;
        document.getElementById("splitter-actions").hidden = true;
        input.value = "";
        if (actionBtn) actionBtn.disabled = true;
      });
    }

    actionBtn?.addEventListener("click", async () => {
      if (!this.fileToSplit) return;
      const mb = parseInt(sizeInput.value) || 10;
      const chunkSize = mb * 1024 * 1024;
      const file = this.fileToSplit;
      const totalChunks = Math.ceil(file.size / chunkSize);

      this.ui.showToast(`Splitting into ${totalChunks} parts...`, "info");

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const blob = new Blob([chunk], { type: "application/octet-stream" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${file.name}.part${i + 1}`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 500));
      }

      this.ui.showToast("Split complete!", "success");
    });
  }

  initMagicBytes() {
    const dropzone = document.getElementById("magic-dropzone");
    const input = document.getElementById("magic-input");
    const resultBox = document.getElementById("magic-result");

    if (dropzone && input) {
      this.ui.setupDropzone(dropzone, input, (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arr = new Uint8Array(e.target.result).subarray(0, 16);
          const hex = Array.from(arr)
            .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
            .join(" ");

          let type = "Unknown";
          let mime = "application/octet-stream";
          const h = hex;

          if (h.startsWith("FF D8 FF")) {
            type = "JPEG Image";
            mime = "image/jpeg";
          } else if (h.startsWith("89 50 4E 47")) {
            type = "PNG Image";
            mime = "image/png";
          } else if (h.startsWith("25 50 44 46")) {
            type = "PDF Document";
            mime = "application/pdf";
          } else if (h.startsWith("50 4B 03 04")) {
            type = "ZIP Archive / DOCX / XLSX";
            mime = "application/zip";
          } else if (h.startsWith("52 49 46 46")) {
            type = "WAV Audio / AVI Video";
            mime = "media/riff";
          } else if (h.startsWith("49 44 33")) {
            type = "MP3 Audio";
            mime = "audio/mpeg";
          } else if (h.startsWith("1F 8B 08")) {
            type = "GZIP Archive";
            mime = "application/gzip";
          }

          document.getElementById("magic-type").textContent = type;
          document.getElementById("magic-mime").textContent = mime;
          document.getElementById("magic-hex").textContent = hex;
          resultBox.hidden = false;
        };
        reader.readAsArrayBuffer(file.slice(0, 32));
      });
    }
  }
}
