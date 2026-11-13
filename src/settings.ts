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
      .setName("Grammar pack URL")
      .setDesc("Direct HTTPS link to raw JSON pack (e.g. GitHub raw or jsDelivr). Leave empty to use built-in starter pack.")
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
      ? `Remote cache: ${active.pack.topics.length} topics, ${active.pack.exercises.length} exercises`
      : `Built-in starter pack: ${active.pack.topics.length} topics, ${active.pack.exercises.length} exercises`;

    new Setting(containerEl)
      .setName("Sync grammar pack")
      .setDesc(statusText)
      .addButton((btn) =>
        btn.setButtonText("Sync now").setCta().onClick(async () => {
          btn.setDisabled(true);
          btn.setButtonText("Syncing...");
          try {
            await this.plugin.syncRemotePack();
            new Notice("Grammar pack synced");
            this.display();
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            new Notice(`Sync failed: ${message}`);
          } finally {
            btn.setDisabled(false);
            btn.setButtonText("Sync now");
          }
        })
      );

    new Setting(containerEl)
      .setName("Session length")
      .setDesc("Number of exercises per smart session.")
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