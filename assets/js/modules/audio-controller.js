import AudioSteganography from "./audio-steganography.js";

export default class AudioController {
  constructor(ui) {
    this.ui = ui;
    this.audioEncodeBuffer = null;
    this.audioDecodeBuffer = null;
  }

  init() {
    this.initAudio();
  }

  initAudio() {
    const encodeDropzone = document.getElementById("audio-enc-dropzone");
    const encodeInput = document.getElementById("audio-enc-input");
    const encodeFilename = document.getElementById("audio-enc-name");
    const encodePreview = document.getElementById("audio-enc-preview");
    const encodeRemove = document.getElementById("audio-enc-remove");
    const audioMessage = document.getElementById("audio-secret-message");
    const audioEncodeBtn = document.getElementById("btn-audio-encode");

    this.setupAudioDropzone(encodeDropzone, encodeInput, (file) => {
      file.arrayBuffer().then((buffer) => {
        this.audioEncodeBuffer = buffer;
        encodeFilename.textContent = file.name;
        encodePreview.hidden = false;
        encodeDropzone.querySelector(".upload-content").hidden = true;
        document.getElementById("audio-enc-actions").hidden = false;
        this.updateAudioEncodeButton();
      });
    });

    encodeRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      this.audioEncodeBuffer = null;
      encodePreview.hidden = true;
      encodeDropzone.querySelector(".upload-content").hidden = false;
      document.getElementById("audio-enc-actions").hidden = true;
      encodeInput.value = "";
      audioMessage.value = "";
      document.getElementById("audio-encode-password").value = "";
      this.updateAudioEncodeButton();
    });

    audioMessage.addEventListener("input", () =>
      this.updateAudioEncodeButton()
    );

    audioEncodeBtn.addEventListener("click", () => this.encodeAudio());

    const decodeDropzone = document.getElementById("audio-dec-dropzone");
    const decodeInput = document.getElementById("audio-dec-input");
    const decodeFilename = document.getElementById("audio-dec-name");
    const decodePreview = document.getElementById("audio-dec-preview");
    const decodeRemove = document.getElementById("audio-dec-remove");
    const audioDecodeBtn = document.getElementById("btn-audio-decode");

    this.setupAudioDropzone(decodeDropzone, decodeInput, (file) => {
      file.arrayBuffer().then((buffer) => {
        this.audioDecodeBuffer = buffer;
        decodeFilename.textContent = file.name;
        decodePreview.hidden = false;
        decodeDropzone.querySelector(".upload-content").hidden = true;
        document.getElementById("audio-dec-actions").hidden = false;
        audioDecodeBtn.disabled = false;
        document.getElementById("audio-result-box").hidden = true;
      });
    });

    decodeRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      this.audioDecodeBuffer = null;
      decodePreview.hidden = true;
      decodeDropzone.querySelector(".upload-content").hidden = false;
      document.getElementById("audio-dec-actions").hidden = true;
      decodeInput.value = "";
      document.getElementById("audio-decode-password").value = "";
      audioDecodeBtn.disabled = true;
      document.getElementById("audio-result-box").hidden = true;
    });

    audioDecodeBtn.addEventListener("click", () => this.decodeAudio());
  }

  setupAudioDropzone(dropzone, input, onFile) {
    if (!dropzone || !input) return;

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
      if (file && file.type.startsWith("audio/")) {
        onFile(file);
      } else {
        this.ui.showToast("Please drop a valid audio file (WAV/MP3)", "error");
      }
    });

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) onFile(file);
    });
  }

  updateAudioEncodeButton() {
    const btn = document.getElementById("btn-audio-encode");
    const msg = document.getElementById("audio-secret-message");
    if (btn) {
      btn.disabled = !(this.audioEncodeBuffer && msg.value);
    }
  }

  async encodeAudio() {
    if (!this.audioEncodeBuffer) return;

    const message = document.getElementById("audio-secret-message").value;

    try {
      const encodedBuffer = await AudioSteganography.encode(
        this.audioEncodeBuffer,
        message
      );

      const blob = new Blob([encodedBuffer], { type: "audio/wav" }); // Assuming WAV
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "encoded_audio.wav";
      a.click();
      URL.revokeObjectURL(url);

      this.ui.showToast("Audio encoded & downloaded!", "success");
    } catch (err) {
      console.error(err);
      this.ui.showToast(err.message || "Audio encoding failed", "error");
    }
  }

  async decodeAudio() {
    if (!this.audioDecodeBuffer) return;

    try {
      const message = await AudioSteganography.decode(this.audioDecodeBuffer);
      document.getElementById("audio-result-text").textContent = message;
      document.getElementById("audio-result-box").hidden = false;
      this.ui.showToast("Message revealed!", "success");
    } catch (err) {
      console.error(err);
      this.ui.showToast(err.message || "Failed to decode", "error");
    }
  }
}
