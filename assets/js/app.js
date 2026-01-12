import UIController from "./modules/ui-controller.js";
import ImageController from "./modules/image-controller.js";
import AudioController from "./modules/audio-controller.js";
import FileToolsController from "./modules/file-tools-controller.js";
import AnalysisController from "./modules/analysis-controller.js";

class StegoraApp {
  constructor() {
    console.log("[Stegora] Initializing modular app...");

    this.canvas = document.getElementById("canvas");
    if (!this.canvas) {
      console.error("Canvas not found!");
      return;
    }
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    this.ui = new UIController();
    this.ui.initTabs();
    this.ui.initPasswordToggles();
    this.ui.initModal();

    this.imageCtrl = new ImageController(this.ui, this.canvas, this.ctx);
    this.imageCtrl.init();

    this.audioCtrl = new AudioController(this.ui);
    this.audioCtrl.init();

    this.fileCtrl = new FileToolsController(this.ui);
    this.fileCtrl.init();

    this.analysisCtrl = new AnalysisController(this.ui, this.canvas, this.ctx);
    this.analysisCtrl.init();

    console.log("[Stegora] Initialization complete.");
  }
}

new StegoraApp();
