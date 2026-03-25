import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

// Plugin workers run in a sandboxed environment without PAPERCLIP_HOME.
// Use HOME directly — in Docker containers this is set to the data directory
// (e.g. /app/data/paperclip), and locally it's the user's home directory.
// The Claude config files live at ~/.claude.json and ~/.claude/.credentials.json.
const HOME_DIR = os.homedir();
const CLAUDE_JSON_PATH = path.resolve(HOME_DIR, ".claude.json");
const CLAUDE_CREDENTIALS_PATH = path.resolve(HOME_DIR, ".claude", ".credentials.json");

async function readJsonFileOrNull(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function writeJsonFileAtomic(filePath: string, data: Record<string, unknown>): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 0o600 });
    await fs.rename(tempPath, filePath);
  } catch (err) {
    await fs.unlink(tempPath).catch(() => {});
    throw err;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("claude-config-editor plugin setup");

    ctx.data.register("claude-config", async () => {
      const [claudeJson, credentialsJson] = await Promise.all([
        readJsonFileOrNull(CLAUDE_JSON_PATH),
        readJsonFileOrNull(CLAUDE_CREDENTIALS_PATH),
      ]);
      return {
        claudeJson,
        credentialsJson,
        claudeJsonPath: CLAUDE_JSON_PATH,
        credentialsJsonPath: CLAUDE_CREDENTIALS_PATH,
      };
    });

    // Access control: the settingsPage slot is gated to instance admins by the
    // host. The plugin SDK enforces the "instance.settings.register" capability
    // before routing any action/data call to this worker.
    ctx.actions.register("save-claude-config", async (params: Record<string, unknown>) => {
      const claudeJson = params.claudeJson ?? null;
      const credentialsJson = params.credentialsJson ?? null;

      if (claudeJson !== null && !isPlainObject(claudeJson)) {
        throw new Error("claudeJson must be a JSON object");
      }
      if (credentialsJson !== null && !isPlainObject(credentialsJson)) {
        throw new Error("credentialsJson must be a JSON object");
      }

      const writes: Promise<void>[] = [];
      if (claudeJson != null) writes.push(writeJsonFileAtomic(CLAUDE_JSON_PATH, claudeJson));
      if (credentialsJson != null) writes.push(writeJsonFileAtomic(CLAUDE_CREDENTIALS_PATH, credentialsJson));
      await Promise.all(writes);

      ctx.logger.info("Claude config files updated", {
        claudeJsonUpdated: claudeJson != null,
        credentialsJsonUpdated: credentialsJson != null,
      });

      return { success: true };
    });
  },

  async onHealth() {
    return { status: "ok", message: "claude-config-editor ready" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
