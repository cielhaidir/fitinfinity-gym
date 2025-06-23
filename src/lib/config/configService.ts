import { db } from "@/server/db";

export interface ConfigItem {
  key: string;
  value: string;
  category: string;
  description?: string;
}

class ConfigService {
  private configs: Map<string, string>;
  private isLoaded: boolean;

  constructor() {
    this.configs = new Map();
    this.isLoaded = false;
  }

  async ensureLoaded() {
    if (this.isLoaded) return;

    const configs = await db.config.findMany();
    this.configs.clear();

    configs.forEach((config) => {
      this.configs.set(config.key, config.value);
    });

    this.isLoaded = true;
  }

  async get(key: string): Promise<string | null> {
    await this.ensureLoaded();
    return this.configs.get(key) ?? null;
  }

  async set(key: string, value: string, category: string) {
    await db.config.upsert({
      where: { key },
      create: { key, value, category },
      update: { value, category },
    });

    this.configs.set(key, value);
  }

  async initializeDefaults() {
    const defaults: ConfigItem[] = [
      {
        key: "site.name",
        value: "Fit Infinity",
        category: "site",
        description: "Site name displayed in various places",
      },
      {
        key: "site.url",
        value: "https://dev.fitinfinity.id",
        category: "site",
        description: "Main site URL",
      },
      {
        key: "site.portalUrl",
        value: "https://portal.fitinfinity.id",
        category: "site",
        description: "Portal URL for member access",
      },
      {
        key: "site.supportEmail",
        value: "support@fitinfinity.id",
        category: "site",
        description: "Support email address",
      },
      {
        key: "site.supportPhone",
        value: "+6281234567890",
        category: "site",
        description: "Support phone number",
      },
      {
        key: "site.address",
        value: "Jl. Sungai Saddang lama No. 102, Makassar, Indonesia",
        category: "site",
        description: "Physical address",
      },
      {
        key: "rfid_point",
        value: "10",  // Default 10 point per attendance
        category: "attendance",
        description: "Point earned per RFID attendance"
      }
    ];

    for (const config of defaults) {
      await this.set(config.key, config.value, config.category);
    }
  }
}

export const configService = new ConfigService();
