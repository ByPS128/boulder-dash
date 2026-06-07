import Phaser from "phaser";
import { DEFAULT_FONT } from "./AtariFont";

const FONT = DEFAULT_FONT;

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
    const height = 240;
    const x = this.scene.cameras.main.width / 2 - width / 2;
    const y = this.scene.cameras.main.height / 2 - height / 2;

    this.container = this.scene.add.container(x, y).setDepth(10000).setScrollFactor(0);

    const bg = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0, 0);
    const border = this.scene.add
      .rectangle(0, 0, width, height, 0xffffff, 0)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0, 0);
    this.container.add(bg);
    this.container.add(border);

    const cx = width / 2;
    // Bitmap font je jen velkými písmeny → text vždy zvelkopísmeníme.
    const txt = (yy: number, text: string, size: number, tint: number) => {
      const t = this.scene.add
        .bitmapText(cx, yy, FONT, text.toUpperCase(), size)
        .setOrigin(0.5, 0)
        .setTint(tint);
      this.container.add(t);
      return t;
    };

    let cyy = 22;
    txt(cyy, this.config.title, 16, 0xffd23f);
    cyy += 34;
    txt(cyy, this.config.message, 8, 0xffffff);
    cyy += 28;

    if (this.config.details && this.config.details.length > 0) {
      txt(cyy, "CURRENT PROGRESS:", 8, 0x9a8a66);
      cyy += 18;
      for (const detail of this.config.details) {
        txt(cyy, detail, 8, 0xd9c9a3);
        cyy += 16;
      }
      cyy += 10;
    }

    const separator = this.scene.add
      .rectangle(40, cyy, width - 80, 1, 0x6b5a33)
      .setOrigin(0, 0);
    this.container.add(separator);
    cyy += 16;

    txt(cyy, this.config.confirmText || "Press Y to confirm", 16, 0x6cc04a);
    cyy += 26;
    txt(cyy, this.config.cancelText || "Press N to cancel", 16, 0xff4030);
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
