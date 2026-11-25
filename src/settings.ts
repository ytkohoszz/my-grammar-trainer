import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type GrammarTrainerPlugin from "./main";
import { getActivePack } from "./packLoader";

export class GrammarTrainerSettingTab extends PluginSettingTab {
  private plugin: GrammarTrainerPlugin;

  constructor(app: App, plugin: GrammarTrainerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("URL пакета упражнений")
      .setDesc(
        "Прямая HTTPS-ссылка на raw JSON (например, GitHub Raw или jsDelivr). Оставьте пустым для встроенного базового пакета."
      )
      .addText((text) =>
        text
          .setPlaceholder("https://raw.githubusercontent.com/.../grammar-pack.json")
          .setValue(this.plugin.data.settings.packSourceUrl)
          .onChange(async (value) => {
            this.plugin.data.settings.packSourceUrl = value.trim();
            await this.plugin.savePluginData();
          })
      );

    const active = getActivePack(this.plugin.data);
    const statusText = active.isRemote
      ? `Внешний пакет (кэш): ${active.pack.topics.length} тем, ${active.pack.exercises.length} упр.`
      : `Встроенный базовый пакет: ${active.pack.topics.length} тем, ${active.pack.exercises.length} упр.`;

    new Setting(containerEl)
      .setName("Синхронизация пакета")
      .setDesc(statusText)
      .addButton((btn) =>
        btn
          .setButtonText("Обновить")
          .setCta()
          .onClick(async () => {
            btn.setDisabled(true);
            btn.setButtonText("Обновление...");
            try {
              await this.plugin.syncRemotePack();
              new Notice("Пакет грамматики обновлён");
              this.display();
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              new Notice(`Ошибка обновления: ${message}`);
            } finally {
              btn.setDisabled(false);
              btn.setButtonText("Обновить");
            }
          })
      );

    new Setting(containerEl)
      .setName("Длина сессии")
      .setDesc("Количество упражнений в одной умной сессии.")
      .addSlider((slider) =>
        slider
          .setLimits(5, 30, 1)
          .setValue(this.plugin.data.settings.sessionLength)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.data.settings.sessionLength = value;
            await this.plugin.savePluginData();
          })
      );
  }
}