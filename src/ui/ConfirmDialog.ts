import Phaser from "phaser";

export interface DialogConfig {
  title: string;
  message: string;
  details?: string[]; // e.g. ["Time: 67s", "Diamonds: 5/12"]
  confirmText?: string; // default: "Press Y to confirm"
  cancelText?: string; // default: "Press N to cancel"
  onYes: () => void;
  onNo: () => void;
}

/**
 * Reusable confirmation dialog component
 */
export class ConfirmDialog {
  private container!: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private config: DialogConfig;
  private yKey!: Phaser.Input.Keyboard.Key;
  private nKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, config: DialogConfig) {
    this.scene = scene;
    this.config = config;
    this.createDialog();
    this.setupKeys();
  }

  private createDialog(): void {
    const width = 400;
    const height = 280;
    const x = this.scene.cameras.main.width / 2 - width / 2;
    const y = this.scene.cameras.main.height / 2 - height / 2;

    this.container = this.scene.add.container(x, y).setDepth(10000);
    this.container.setScrollFactor(0);

    // Background (semi-transparent black)
    const bg = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.9)
      .setOrigin(0, 0);
    this.container.add(bg);

    // Border
    const border = this.scene.add
      .rectangle(0, 0, width, height, 0xffffff, 0)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0, 0);
    this.container.add(border);

    let currentY = 20;

    // Title
    const title = this.scene.add
      .text(width / 2, currentY, this.config.title, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffff00",
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.container.add(title);
    currentY += 40;

    // Message
    const message = this.scene.add
      .text(width / 2, currentY, this.config.message, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.container.add(message);
    currentY += 40;

    // Details (if any)
    if (this.config.details && this.config.details.length > 0) {
      currentY += 10;

      const detailsTitle = this.scene.add
        .text(width / 2, currentY, "Current progress:", {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#aaaaaa",
          align: "center",
        })
        .setOrigin(0.5, 0);
      this.container.add(detailsTitle);
      currentY += 20;

      this.config.details.forEach((detail) => {
        const detailText = this.scene.add
          .text(width / 2, currentY, detail, {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#cccccc",
            align: "center",
          })
          .setOrigin(0.5, 0);
        this.container.add(detailText);
        currentY += 18;
      });

      currentY += 10;
    }

    // Separator line
    const separator = this.scene.add
      .rectangle(40, currentY, width - 80, 1, 0x666666)
      .setOrigin(0, 0);
    this.container.add(separator);
    currentY += 20;

    // Confirm text
    const confirmText = this.config.confirmText || "Press Y to confirm";
    const confirm = this.scene.add
      .text(width / 2, currentY, confirmText, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00ff00",
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.container.add(confirm);
    currentY += 25;

    // Cancel text
    const cancelText = this.config.cancelText || "Press N to cancel";
    const cancel = this.scene.add
      .text(width / 2, currentY, cancelText, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ff0000",
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.container.add(cancel);
  }

  private setupKeys(): void {
    this.yKey = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.Y
    );
    this.nKey = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.N
    );
    this.escKey = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );

    this.yKey.on("down", () => {
      this.config.onYes();
      this.destroy();
    });

    this.nKey.on("down", () => {
      this.config.onNo();
      this.destroy();
    });

    this.escKey.on("down", () => {
      this.config.onNo(); // ESC acts as cancel
      this.destroy();
    });
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.yKey.off("down");
    this.nKey.off("down");
    this.escKey.off("down");
    this.container.destroy();
  }
}
