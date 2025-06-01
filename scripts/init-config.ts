import { db } from "@/server/db";

async function initializeConfig() {
    // Site configurations
    const siteConfigs = [
        {
            key: "site.name",
            value: "Fit Infinity",
            category: "site"
        },
        {
            key: "site.url",
            value: "https://dev.fitinfinity.id",
            category: "site"
        },
        {
            key: "site.portalUrl",
            value: "https://portal.fitinfinity.id",
            category: "site"
        },
        {
            key: "site.supportEmail",
            value: "support@fitinfinity.id",
            category: "site"
        },
        {
            key: "site.supportPhone",
            value: "+6281234567890",
            category: "site"
        },
        {
            key: "site.address",
            value: "Jl. Sungai Saddang lama No. 102, Makassar, Indonesia",
            category: "site"
        }
    ];

    console.log("Initializing configurations...");

    for (const config of siteConfigs) {
        await db.config.upsert({
            where: { key: config.key },
            create: config,
            update: config
        });
    }

    console.log("Configuration initialization completed!");
}

initializeConfig()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error initializing configurations:", error);
        process.exit(1);
    });