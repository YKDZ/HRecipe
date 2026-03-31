---
description: Keep locale files in sync after adding or removing i18n entries.
paths: ["locales/*.json", "**/*.{vue,ts}"]
---

# i18n Sync Rule

After **adding or removing** translation keys in any locale file (e.g. `locales/zh-CN.json`, `locales/en-US.json`) or in Vue/TS source files via `t()` calls:

1. Run `pnpm i18n:sync` to synchronize all locale files so every language has the same set of keys.
2. Check the sync output for any newly added keys with empty values.
3. Translate all empty entries in non-source locale files (e.g. provide English translations in `en-US.json` for new Chinese keys).
