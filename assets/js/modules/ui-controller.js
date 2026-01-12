export default class UIController {
  constructor() {
    this.toast = document.getElementById("toast");
  }

  showToast(message, type = "") {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.className = "toast show " + type;
    setTimeout(() => {
      this.toast.className = this.toast.className.replace("show", "");
    }, 3000);
  }

  setupDropzone(dropzone, input, onFile, allowedTypes = null) {
    if (!dropzone || !input) return;

    dropzone.addEventListener("click", () => {
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
      if (file) {
        if (allowedTypes === "image") {
          if (file.type.startsWith("image/")) {
            onFile(file);
          } else {
            this.showToast("Please drop a valid image file", "error");
          }
        } else if (allowedTypes === "audio") {
          if (file.type.startsWith("audio/")) {
            onFile(file);
          } else {
            this.showToast("Please drop a valid audio file", "error");
          }
        } else {
          // Allow all if not specified (or add more types)
          onFile(file);
        }
      }
    });

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) onFile(file);
    });
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
    if (!modal) return;

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
}
