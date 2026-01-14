export const FilePanelMixin = {
  initFileUtilities() {
    this.initFileEncrypt();
    this.initFileBase64();
    this.initFileSplitter();
    this.initMagicBytes();
    this.initDeepScan();
    this.initHexEditor();
  },

  initFileEncrypt() {
    const encDropzone = document.getElementById("file-enc-dropzone");
    const encInput = document.getElementById("file-enc-input");
    const encPass = document.getElementById("file-enc-password");
    const encBtn = document.getElementById("btn-file-encrypt");

    if (encDropzone && encInput) {
      this.setupDropzone(encDropzone, encInput, (file) => {
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
            ["encrypt"]
          );

          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const fileData = await this.fileToEncrypt.arrayBuffer();
          const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            fileData
          );

          const blob = new Blob([salt, iv, encryptedContent], {
            type: "application/octet-stream",
          });

          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = this.fileToEncrypt.name + ".enc";
          a.click();

          this.showToast("File encrypted successfully!", "success");
          encBtn.textContent = "Encrypt File";
          encBtn.disabled = false;
        } catch (err) {
          console.error(err);
          this.showToast("Encryption failed: " + err.message, "error");
          encBtn.textContent = "Encrypt File";
          encBtn.disabled = false;
        }
      });
    }

    const decDropzone = document.getElementById("file-dec-dropzone");
    const decInput = document.getElementById("file-dec-input");
    const decPass = document.getElementById("file-dec-password");
    const decBtn = document.getElementById("btn-file-decrypt");

    if (decDropzone && decInput) {
      this.setupDropzone(decDropzone, decInput, (file) => {
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

          const data = await this.fileToDecrypt.arrayBuffer();
          const salt = data.slice(0, 16);
          const iv = data.slice(16, 28);
          const encryptedContent = data.slice(28);
          const password = decPass.value;

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
            ["decrypt"]
          );

          const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encryptedContent
          );

          const originalName = this.fileToDecrypt.name.replace(".enc", "");
          const blob = new Blob([decryptedContent]);
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = originalName;
          a.click();

          this.showToast("File decrypted successfully!", "success");
          decBtn.textContent = "Decrypt File";
          decBtn.disabled = false;
        } catch (err) {
          console.error(err);
          this.showToast("Decryption failed. Wrong password?", "error");
          decBtn.textContent = "Decrypt File";
          decBtn.disabled = false;
        }
      });
    }
  },

  updateFileEncBtn() {
    const btn = document.getElementById("btn-file-encrypt");
    const pass = document.getElementById("file-enc-password");
    if (btn) btn.disabled = !this.fileToEncrypt || !pass.value;
  },

  updateFileDecBtn() {
    const btn = document.getElementById("btn-file-decrypt");
    const pass = document.getElementById("file-dec-password");
    if (btn) btn.disabled = !this.fileToDecrypt || !pass.value;
  },

  initFileBase64() {
    const dropzone = document.getElementById("base64-dropzone");
    const input = document.getElementById("base64-input");
    const output = document.getElementById("base64-output");

    if (dropzone && input) {
      this.setupDropzone(dropzone, input, (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          output.value = e.target.result;
          this.showToast("Converted to Base64!", "success");
          document.getElementById("base64-enc-actions").hidden = false;
        };
        reader.readAsDataURL(file);
      });
    }

    document
      .getElementById("base64-output-clear")
      ?.addEventListener("click", () => {
        output.value = "";
        document.getElementById("base64-enc-actions").hidden = true;
      });

    document
      .getElementById("base64-decode-clear")
      ?.addEventListener("click", () => {
        document.getElementById("base64-decode-input").value = "";
      });

    const decDropzone = document.getElementById("base64-dec-dropzone");
    const decInput = document.getElementById("base64-dec-upload-txt");
    const decPreview = document.getElementById("base64-dec-preview");
    const decFilename = document.getElementById("base64-dec-filename");
    const decRemove = document.getElementById("base64-dec-remove");

    if (decDropzone && decInput) {
      this.setupDropzone(decDropzone, decInput, (file) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          document.getElementById("base64-decode-input").value =
            evt.target.result;
          this.showToast("File text loaded!", "success");

          decFilename.textContent = file.name;
          decPreview.hidden = false;
          decDropzone.querySelector(".upload-content").hidden = true;
        };
        reader.readAsText(file);
      });
    }

    if (decRemove) {
      decRemove.addEventListener("click", (e) => {
        e.stopPropagation();
        decPreview.hidden = true;
        decDropzone.querySelector(".upload-content").hidden = false;
        decInput.value = "";
        document.getElementById("base64-decode-input").value = "";
      });
    }

    document.getElementById("base64-copy")?.addEventListener("click", () => {
      if (!output.value) return;
      navigator.clipboard.writeText(output.value);
      this.showToast("Copied to clipboard", "success");
    });

    document
      .getElementById("base64-download")
      ?.addEventListener("click", () => {
        if (!output.value) return;
        const blob = new Blob([output.value], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "base64_content.txt";
        a.click();
      });

    document
      .getElementById("btn-base64-decode")
      ?.addEventListener("click", () => {
        const inputVal = document
          .getElementById("base64-decode-input")
          .value.trim();
        if (!inputVal) return;

        try {
          let base64Content = inputVal;
          let mimeType = "application/octet-stream";
          let extension = "bin";

          if (inputVal.includes(",")) {
            const parts = inputVal.split(",");
            base64Content = parts[1];

            const matches = parts[0].match(/:(.*?);/);
            if (matches && matches[1]) {
              mimeType = matches[1];
              extension = mimeType.split("/")[1] || "bin";
            }
          }

          const binaryString = atob(base64Content);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: mimeType });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `decoded_file.${extension}`;
          a.click();

          this.showToast("File decoded successfully!", "success");
        } catch (e) {
          console.error(e);
          this.showToast("Invalid Base64 string", "error");
        }
      });
  },

  initFileSplitter() {
    const dropzone = document.getElementById("splitter-dropzone");
    const input = document.getElementById("splitter-input");
    const removeBtn = document.getElementById("splitter-remove");
    const actionBtn = document.getElementById("btn-split-file");
    const sizeInput = document.getElementById("splitter-size");
    const chips = document.querySelectorAll(".size-chip");

    const joinDropzone = document.getElementById("join-dropzone");
    const joinInput = document.getElementById("join-input");
    const joinListContent = document.getElementById("join-list-content");
    const joinList = document.getElementById("join-file-list");
    const joinBtn = document.getElementById("btn-join-file");
    const joinClear = document.getElementById("join-clear");
    const joinCount = document.getElementById("join-count");

    let joinFiles = [];

    const handleSplitFile = (file) => {
      this.fileToSplit = file;
      if (document.getElementById("splitter-name")) {
        document.getElementById("splitter-name").textContent = file.name;
      }
      if (document.getElementById("splitter-preview")) {
        document.getElementById("splitter-preview").hidden = false;
      }
      if (dropzone && dropzone.querySelector(".upload-content")) {
        dropzone.querySelector(".upload-content").hidden = true;
      }
      if (document.getElementById("splitter-actions")) {
        document.getElementById("splitter-actions").hidden = false;
      }
      if (actionBtn) actionBtn.disabled = false;
    };

    const renderJoinList = () => {
      if (joinListContent) joinListContent.innerHTML = "";
      joinFiles.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

      joinFiles.forEach((file) => {
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex; justify-content:space-between; align-items:center; padding:6px; background:var(--bg-tertiary); border-radius:4px; font-size:12px; font-family:monospace;";
        row.innerHTML = `
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${
            file.name
          }</span>
          <span style="color:var(--text-muted);">${this.formatBytes(
            file.size
          )}</span>
        `;
        if (joinListContent) joinListContent.appendChild(row);
      });

      if (joinCount) joinCount.textContent = joinFiles.length;
      if (joinList) joinList.hidden = joinFiles.length === 0;
      if (joinBtn) joinBtn.hidden = joinFiles.length === 0;
    };

    const handleJoinFiles = (files) => {
      Array.from(files).forEach((f) => {
        if (!joinFiles.some((existing) => existing.name === f.name)) {
          joinFiles.push(f);
        }
      });
      renderJoinList();
    };

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        if (sizeInput) sizeInput.value = chip.dataset.size;
        chips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });

    sizeInput?.addEventListener("input", () => {
      chips.forEach((c) => c.classList.remove("active"));
      const matchingChip = Array.from(chips).find(
        (c) => c.dataset.size === sizeInput.value
      );
      if (matchingChip) matchingChip.classList.add("active");
    });

    if (dropzone && input) {
      dropzone.onclick = () => input.click();
      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      };
      dropzone.ondragleave = () => dropzone.classList.remove("dragover");
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file) handleSplitFile(file);
      };
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleSplitFile(file);
      };
    }

    removeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.fileToSplit = null;
      if (document.getElementById("splitter-preview"))
        document.getElementById("splitter-preview").hidden = true;
      if (dropzone && dropzone.querySelector(".upload-content"))
        dropzone.querySelector(".upload-content").hidden = false;
      if (document.getElementById("splitter-actions"))
        document.getElementById("splitter-actions").hidden = true;
      if (input) input.value = "";
      if (actionBtn) actionBtn.disabled = true;
    });

    actionBtn?.addEventListener("click", () => {
      if (!this.fileToSplit) return;
      const chunkSize = (parseInt(sizeInput.value) || 10) * 1024 * 1024;
      if (chunkSize <= 0) {
        this.showToast("Invalid chunk size", "error");
        return;
      }
      const fileSize = this.fileToSplit.size;
      const chunks = Math.ceil(fileSize / chunkSize);

      let offset = 0;
      for (let i = 0; i < chunks; i++) {
        const chunk = this.fileToSplit.slice(offset, offset + chunkSize);
        offset += chunkSize;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(chunk);
        const ext = "." + (i + 1).toString().padStart(3, "0");
        a.download = this.fileToSplit.name + ext;
        a.click();
      }
      this.showToast(`Split into ${chunks} files!`, "success");
    });

    if (joinDropzone && joinInput) {
      joinDropzone.onclick = () => joinInput.click();
      joinDropzone.ondragover = (e) => {
        e.preventDefault();
        joinDropzone.classList.add("dragover");
      };
      joinDropzone.ondragleave = () =>
        joinDropzone.classList.remove("dragover");
      joinDropzone.ondrop = (e) => {
        e.preventDefault();
        joinDropzone.classList.remove("dragover");
        if (e.dataTransfer.files.length) handleJoinFiles(e.dataTransfer.files);
      };
      joinInput.onchange = (e) => {
        if (e.target.files.length) handleJoinFiles(e.target.files);
        joinInput.value = "";
      };
    }

    joinClear?.addEventListener("click", () => {
      joinFiles = [];
      renderJoinList();
    });

    joinBtn?.addEventListener("click", () => {
      if (joinFiles.length === 0) return;

      joinBtn.textContent = "Merging...";
      joinBtn.disabled = true;

      try {
        const blob = new Blob(joinFiles);
        const firstFile = joinFiles[0].name;
        const downloadName = firstFile.replace(/\.\d{3}$/, "");

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = downloadName;
        a.click();

        this.showToast("Files merged successfully!", "success");
      } catch (e) {
        console.error(e);
        this.showToast("Merge failed", "error");
      } finally {
        joinBtn.textContent = "Merge & Download";
        joinBtn.disabled = false;
      }
    });
  },

  initMagicBytes() {
    const dropzone = document.getElementById("magic-dropzone");
    const input = document.getElementById("magic-input");
    const resultBox = document.getElementById("magic-result");
    const fixArea = document.getElementById("magic-fix-area");
    const fixBtn = document.getElementById("magic-fix-btn");
    const realTypeSpan = document.getElementById("magic-real-type");
    const typeDisplay = document.getElementById("magic-type");
    const mimeDisplay = document.getElementById("magic-mime");
    const hexDisplay = document.getElementById("magic-hex");
    const preview = document.getElementById("magic-preview");
    const filenameEl = document.getElementById("magic-filename");
    const removeBtn = document.getElementById("magic-remove");

    let currentFile = null;
    let detectedExt = null;
    let detectedMime = null;

    const analyzeFile = (file) => {
      currentFile = file;

      // Show preview
      if (filenameEl) filenameEl.textContent = file.name;
      if (preview) preview.hidden = false;
      if (dropzone) dropzone.querySelector(".upload-content").hidden = true;
      const reader = new FileReader();
      reader.onload = (e) => {
        const arr = new Uint8Array(e.target.result);
        let hex = "";
        for (let i = 0; i < Math.min(arr.length, 16); i++) {
          hex += arr[i].toString(16).padStart(2, "0").toUpperCase() + " ";
        }

        let type = "Unknown Binary";
        let mime = "application/octet-stream";
        let ext = "bin";

        const header = Array.from(arr)
          .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
          .join(" ");

        const starts = (sig) =>
          header.replace(/\s/g, "").startsWith(sig.replace(/\s/g, ""));
        const containsAt = (sig, offset) => {
          if (arr.length < offset + sig.length / 3) return false;
          const sigBytes = sig.split(" ").map((b) => parseInt(b, 16));
          for (let i = 0; i < sigBytes.length; i++) {
            if (arr[offset + i] !== sigBytes[i]) return false;
          }
          return true;
        };

        if (starts("89 50 4E 47")) {
          type = "PNG Image";
          mime = "image/png";
          ext = "png";
        } else if (starts("FF D8 FF")) {
          type = "JPEG Image";
          mime = "image/jpeg";
          ext = "jpg";
        } else if (starts("25 50 44 46")) {
          type = "PDF Document";
          mime = "application/pdf";
          ext = "pdf";
        } else if (starts("50 4B 03 04")) {
          type = "ZIP / Office / APK";
          mime = "application/zip";
          ext = "zip";
        } else if (starts("52 61 72 21")) {
          type = "RAR Archive";
          mime = "application/x-rar";
          ext = "rar";
        } else if (starts("4D 5A")) {
          type = "Windows Executable (EXE)";
          mime = "application/x-msdownload";
          ext = "exe";
        } else if (starts("1F 8B 08")) {
          type = "GZIP Archive";
          mime = "application/gzip";
          ext = "gz";
        } else if (starts("47 49 46 38")) {
          type = "GIF Image";
          mime = "image/gif";
          ext = "gif";
        } else if (starts("49 44 33") || starts("FF FB") || starts("FF F3")) {
          type = "MP3 Audio";
          mime = "audio/mpeg";
          ext = "mp3";
        } else if (containsAt("66 74 79 70", 4)) {
          type = "MP4 Video";
          mime = "video/mp4";
          ext = "mp4";
        } else if (starts("52 49 46 46") && containsAt("57 45 42 50", 8)) {
          type = "WebP Image";
          mime = "image/webp";
          ext = "webp";
        } else if (starts("52 49 46 46") && containsAt("57 41 56 45", 8)) {
          type = "WAV Audio";
          mime = "audio/wav";
          ext = "wav";
        } else if (starts("42 4D")) {
          type = "BMP Image";
          mime = "image/bmp";
          ext = "bmp";
        } else if (starts("00 00 01 00")) {
          type = "ICO Icon";
          mime = "image/x-icon";
          ext = "ico";
        } else if (starts("1A 45 DF A3")) {
          type = "MKV Video";
          mime = "video/x-matroska";
          ext = "mkv";
        } else if (starts("37 7A BC AF 27 1C")) {
          type = "7Z Archive";
          mime = "application/x-7z-compressed";
          ext = "7z";
        } else if (starts("66 4C 61 43")) {
          type = "FLAC Audio";
          mime = "audio/flac";
          ext = "flac";
        } else if (starts("4F 67 67 53")) {
          type = "OGG Audio/Video";
          mime = "application/ogg";
          ext = "ogg";
        }

        detectedExt = ext;
        detectedMime = mime;

        typeDisplay.textContent = type;
        mimeDisplay.textContent = mime;
        hexDisplay.textContent = hex;
        resultBox.hidden = false;

        const currentExt = file.name.split(".").pop().toLowerCase();
        let isMismatch =
          type !== "Unknown Binary" &&
          detectedExt !== "bin" &&
          currentExt !== detectedExt;

        if (
          detectedExt === "zip" &&
          ["docx", "xlsx", "pptx", "apk"].includes(currentExt)
        ) {
          isMismatch = false;
        }
        if (detectedExt === "jpg" && currentExt === "jpeg") isMismatch = false;

        if (isMismatch) {
          fixArea.hidden = false;
          realTypeSpan.textContent = detectedExt.toUpperCase();
        } else {
          fixArea.hidden = true;
        }
      };
      reader.readAsArrayBuffer(file.slice(0, 32));
    };

    // Remove button handler
    removeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      currentFile = null;
      detectedExt = null;
      detectedMime = null;
      if (preview) preview.hidden = true;
      if (dropzone) dropzone.querySelector(".upload-content").hidden = false;
      if (resultBox) resultBox.hidden = true;
      if (fixArea) fixArea.hidden = true;
      if (input) input.value = "";
    });

    if (dropzone && input) {
      dropzone.onclick = (e) => {
        if (e.target.closest(".preview-remove")) return;
        input.click();
      };
      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      };
      dropzone.ondragleave = () => dropzone.classList.remove("dragover");
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file) analyzeFile(file);
      };
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) analyzeFile(file);
      };
    }

    fixBtn?.addEventListener("click", () => {
      if (!currentFile || !detectedExt) return;

      const nameParts = currentFile.name.split(".");
      if (nameParts.length > 1) nameParts.pop();
      const newName = nameParts.join(".") + "." + detectedExt;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(currentFile);
      a.download = newName;
      a.click();

      this.showToast(`Fixed extension to .${detectedExt}`, "success");
    });
  },

  initDeepScan() {
    const dropzone = document.getElementById("deepscan-dropzone");
    const input = document.getElementById("deepscan-input");
    const progress = document.getElementById("deepscan-progress");
    const status = document.getElementById("deepscan-status");
    const bar = document.getElementById("deepscan-bar");
    const result = document.getElementById("deepscan-result");
    const list = document.getElementById("deepscan-list");
    const count = document.getElementById("deepscan-count");
    const empty = document.getElementById("deepscan-empty");
    const preview = document.getElementById("deepscan-preview");
    const filenameEl = document.getElementById("deepscan-filename");
    const removeBtn = document.getElementById("deepscan-remove");

    const signatures = [
      { name: "PNG Image", sig: [0x89, 0x50, 0x4e, 0x47], ext: "png" },
      { name: "JPEG Image", sig: [0xff, 0xd8, 0xff], ext: "jpg" },
      { name: "GIF Image", sig: [0x47, 0x49, 0x46, 0x38], ext: "gif" },
      { name: "PDF Document", sig: [0x25, 0x50, 0x44, 0x46], ext: "pdf" },
      { name: "ZIP Archive", sig: [0x50, 0x4b, 0x03, 0x04], ext: "zip" },
      { name: "RAR Archive", sig: [0x52, 0x61, 0x72, 0x21], ext: "rar" },
      {
        name: "7Z Archive",
        sig: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
        ext: "7z",
      },
      { name: "MP3 Audio", sig: [0x49, 0x44, 0x33], ext: "mp3" },
      { name: "BMP Image", sig: [0x42, 0x4d], ext: "bmp" },
      {
        name: "WebP Image",
        sig: [0x52, 0x49, 0x46, 0x46],
        ext: "webp",
        extra: [0x57, 0x45, 0x42, 0x50],
        extraOffset: 8,
      },
      { name: "MKV Video", sig: [0x1a, 0x45, 0xdf, 0xa3], ext: "mkv" },
      { name: "FLAC Audio", sig: [0x66, 0x4c, 0x61, 0x43], ext: "flac" },
      { name: "EXE", sig: [0x4d, 0x5a], ext: "exe" },
    ];

    let fileData = null;
    let fileName = null;

    const scanFile = async (file) => {
      fileName = file.name;

      // Show preview
      if (filenameEl) filenameEl.textContent = file.name;
      if (preview) preview.hidden = false;
      if (dropzone) dropzone.querySelector(".upload-content").hidden = true;

      progress.hidden = false;
      result.hidden = true;
      empty.hidden = true;
      list.innerHTML = "";

      const buffer = await file.arrayBuffer();
      fileData = new Uint8Array(buffer);
      const found = [];

      const chunkSize = 1024 * 64;
      const totalChunks = Math.ceil(fileData.length / chunkSize);

      for (let chunk = 0; chunk < totalChunks; chunk++) {
        const startOffset = chunk * chunkSize;
        const endOffset = Math.min(
          startOffset + chunkSize + 20,
          fileData.length
        );

        for (let i = startOffset; i < endOffset; i++) {
          for (const sig of signatures) {
            if (i + sig.sig.length > fileData.length) continue;

            let match = true;
            for (let j = 0; j < sig.sig.length; j++) {
              if (fileData[i + j] !== sig.sig[j]) {
                match = false;
                break;
              }
            }

            if (match && sig.extra && sig.extraOffset) {
              const extraPos = i + sig.extraOffset;
              if (extraPos + sig.extra.length <= fileData.length) {
                for (let k = 0; k < sig.extra.length; k++) {
                  if (fileData[extraPos + k] !== sig.extra[k]) {
                    match = false;
                    break;
                  }
                }
              } else {
                match = false;
              }
            }

            if (match && i > 0) {
              found.push({
                name: sig.name,
                ext: sig.ext,
                offset: i,
              });
            }
          }
        }

        bar.style.width = `${((chunk + 1) / totalChunks) * 100}%`;
        status.textContent = `Scanning... ${Math.round(
          ((chunk + 1) / totalChunks) * 100
        )}%`;

        await new Promise((r) => setTimeout(r, 0));
      }

      progress.hidden = true;
      bar.style.width = "0%";

      if (found.length > 0) {
        count.textContent = found.length;
        result.hidden = false;

        found.forEach((item, idx) => {
          const row = document.createElement("div");
          row.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: var(--bg-tertiary);
            border-radius: 6px;
            font-size: 13px;
          `;

          row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="
                background: var(--accent);
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
              ">${item.ext.toUpperCase()}</span>
              <span>${item.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--text-muted); font-family: monospace; font-size: 11px;">
                @ 0x${item.offset.toString(16).toUpperCase()}
              </span>
              <button class="btn secondary small extract-btn" data-idx="${idx}" style="padding: 4px 10px; font-size: 11px;">
                Extract
              </button>
            </div>
          `;
          list.appendChild(row);
        });

        list.querySelectorAll(".extract-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.idx);
            const item = found[idx];
            const extracted = fileData.slice(item.offset);
            const blob = new Blob([extracted], {
              type: "application/octet-stream",
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `extracted_${idx + 1}.${item.ext}`;
            a.click();
            this.showToast(`Extracted ${item.name}`, "success");
          });
        });
      } else {
        empty.hidden = false;
      }
    };

    // Remove button handler
    removeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      fileData = null;
      fileName = null;
      if (preview) preview.hidden = true;
      if (dropzone) dropzone.querySelector(".upload-content").hidden = false;
      if (result) result.hidden = true;
      if (empty) empty.hidden = true;
      if (progress) progress.hidden = true;
      if (input) input.value = "";
    });

    if (dropzone && input) {
      dropzone.onclick = (e) => {
        if (e.target.closest(".preview-remove")) return;
        input.click();
      };
      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      };
      dropzone.ondragleave = () => dropzone.classList.remove("dragover");
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file) scanFile(file);
      };
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) scanFile(file);
      };
    }
  },

  initHexEditor() {
    const dropzone = document.getElementById("hexedit-dropzone");
    const input = document.getElementById("hexedit-input");
    const container = document.getElementById("hexedit-container");
    const content = document.getElementById("hexedit-content");
    const filenameEl = document.getElementById("hexedit-filename");
    const filesizeEl = document.getElementById("hexedit-filesize");
    const offsetInput = document.getElementById("hexedit-offset");
    const gotoBtn = document.getElementById("hexedit-goto");
    const downloadBtn = document.getElementById("hexedit-download");
    const resetBtn = document.getElementById("hexedit-reset");
    const preview = document.getElementById("hexedit-preview");
    const fnameEl = document.getElementById("hexedit-fname");
    const removeBtn = document.getElementById("hexedit-remove");

    let originalData = null;
    let modifiedData = null;
    let currentFile = null;
    let currentOffset = 0;
    const BYTES_PER_VIEW = 256;
    const BYTES_PER_ROW = 16;

    const renderHex = (offset = 0) => {
      content.innerHTML = "";
      currentOffset = offset;
      offsetInput.value = offset;

      const endOffset = Math.min(offset + BYTES_PER_VIEW, modifiedData.length);

      for (let i = offset; i < endOffset; i += BYTES_PER_ROW) {
        const row = document.createElement("div");
        row.style.cssText = `
          display: grid;
          grid-template-columns: 80px 1fr 1fr;
          gap: 2px;
          border-bottom: 1px solid var(--border-color);
        `;

        const offsetCell = document.createElement("div");
        offsetCell.style.cssText = `
          padding: 6px 8px;
          background: var(--bg-secondary);
          color: var(--accent);
          text-align: center;
          font-family: monospace;
          font-size: 11px;
        `;
        offsetCell.textContent =
          "0x" + i.toString(16).toUpperCase().padStart(6, "0");

        const hexCell = document.createElement("div");
        hexCell.style.cssText = `
          padding: 6px 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          font-family: monospace;
          font-size: 11px;
        `;

        const asciiCell = document.createElement("div");
        asciiCell.style.cssText = `
          padding: 6px 8px;
          font-family: monospace;
          font-size: 11px;
          color: var(--text-secondary);
          word-break: break-all;
        `;

        let asciiStr = "";
        for (let j = 0; j < BYTES_PER_ROW && i + j < endOffset; j++) {
          const byteIdx = i + j;
          const byte = modifiedData[byteIdx];
          const isModified = originalData[byteIdx] !== byte;

          const hexSpan = document.createElement("span");
          hexSpan.textContent = byte
            .toString(16)
            .toUpperCase()
            .padStart(2, "0");
          hexSpan.style.cssText = `
            cursor: pointer;
            padding: 1px 3px;
            border-radius: 2px;
            transition: background 0.2s;
            ${isModified ? "background: var(--warning); color: black;" : ""}
          `;
          hexSpan.dataset.idx = byteIdx;

          hexSpan.onclick = () => {
            const newVal = prompt(
              `Edit byte at 0x${byteIdx.toString(16).toUpperCase()}:`,
              hexSpan.textContent
            );
            if (newVal !== null) {
              const parsed = parseInt(newVal, 16);
              if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
                modifiedData[byteIdx] = parsed;
                renderHex(currentOffset);
                this.showToast("Byte modified", "success");
              } else {
                this.showToast("Invalid hex value (00-FF)", "error");
              }
            }
          };

          hexCell.appendChild(hexSpan);

          const char =
            byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
          asciiStr += char;
        }

        asciiCell.textContent = asciiStr;

        row.appendChild(offsetCell);
        row.appendChild(hexCell);
        row.appendChild(asciiCell);
        content.appendChild(row);
      }
    };

    const loadFile = async (file) => {
      currentFile = file;
      const buffer = await file.arrayBuffer();
      originalData = new Uint8Array(buffer);
      modifiedData = new Uint8Array(buffer);

      // Show preview
      if (fnameEl) fnameEl.textContent = file.name;
      if (preview) preview.hidden = false;
      if (dropzone) dropzone.querySelector(".upload-content").hidden = true;

      filenameEl.textContent = file.name;
      filesizeEl.textContent = this.formatBytes(file.size);
      container.hidden = false;
      renderHex(0);
    };

    // Remove button handler
    removeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      originalData = null;
      modifiedData = null;
      currentFile = null;
      if (preview) preview.hidden = true;
      if (dropzone) dropzone.querySelector(".upload-content").hidden = false;
      if (container) container.hidden = true;
      if (input) input.value = "";
    });

    if (dropzone && input) {
      dropzone.onclick = (e) => {
        if (e.target.closest(".preview-remove")) return;
        input.click();
      };
      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      };
      dropzone.ondragleave = () => dropzone.classList.remove("dragover");
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file) loadFile(file);
      };
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) loadFile(file);
      };
    }

    gotoBtn?.addEventListener("click", () => {
      let offset = parseInt(offsetInput.value);
      if (isNaN(offset) || offset < 0) offset = 0;
      if (offset >= modifiedData.length)
        offset = Math.max(0, modifiedData.length - BYTES_PER_VIEW);
      renderHex(offset);
    });

    downloadBtn?.addEventListener("click", () => {
      if (!modifiedData || !currentFile) return;
      const blob = new Blob([modifiedData], {
        type: "application/octet-stream",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "modified_" + currentFile.name;
      a.click();
      this.showToast("Downloaded modified file", "success");
    });

    resetBtn?.addEventListener("click", () => {
      if (!originalData) return;
      modifiedData = new Uint8Array(originalData);
      renderHex(currentOffset);
      this.showToast("Changes reset", "success");
    });
  },

  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  },
};
