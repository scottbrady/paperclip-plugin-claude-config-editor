import { useState, useEffect, useRef, type CSSProperties } from "react";
import {
  usePluginData,
  usePluginAction,
  usePluginToast,
  type PluginSettingsPageProps,
} from "@paperclipai/plugin-sdk/ui";

type ClaudeConfigData = {
  claudeJson: Record<string, unknown> | null;
  credentialsJson: Record<string, unknown> | null;
  claudeJsonPath: string;
  credentialsJsonPath: string;
};

function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "240px",
  fontFamily: "monospace",
  fontSize: "13px",
  padding: "8px",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  background: "var(--input)",
  color: "var(--foreground)",
  resize: "vertical",
};

const buttonStyle: CSSProperties = {
  padding: "6px 16px",
  fontSize: "13px",
  borderRadius: "4px",
  border: "1px solid var(--border)",
  background: "var(--secondary)",
  color: "var(--secondary-foreground)",
  cursor: "pointer",
};

const disabledButtonStyle: CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

function ConfigSection({
  label,
  filePath,
  text,
  onChange,
  onSave,
  saving,
  confirmBeforeSave,
}: {
  label: string;
  filePath: string;
  text: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  confirmBeforeSave?: boolean;
}) {
  const isValid = text.trim() === "" || tryParseJson(text) !== null;
  const canSave = text.trim() !== "" && isValid && !saving;

  function handleSave() {
    if (confirmBeforeSave) {
      if (!window.confirm(`Are you sure you want to save ${label}? This will overwrite the existing file.`)) {
        return;
      }
    }
    onSave();
  }

  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{label}</strong>
        <button
          type="button"
          style={canSave ? buttonStyle : disabledButtonStyle}
          disabled={!canSave}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <div style={{ fontSize: "12px", opacity: 0.6 }}>{filePath}</div>
      <textarea
        style={{
          ...textareaStyle,
          borderColor: !isValid ? "var(--destructive)" : undefined,
        }}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      {!isValid && (
        <div style={{ fontSize: "12px", color: "var(--destructive)" }}>Invalid JSON</div>
      )}
    </div>
  );
}

export function ClaudeConfigSettingsPage(_props: PluginSettingsPageProps) {
  const { data, loading, error, refresh } = usePluginData<ClaudeConfigData>("claude-config");
  const saveConfig = usePluginAction("save-claude-config");
  const toast = usePluginToast();

  const [claudeJsonText, setClaudeJsonText] = useState("");
  const [credentialsJsonText, setCredentialsJsonText] = useState("");
  const [savingClaude, setSavingClaude] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!data || initializedRef.current) return;
    initializedRef.current = true;
    setClaudeJsonText(data.claudeJson ? JSON.stringify(data.claudeJson, null, 2) : "");
    setCredentialsJsonText(data.credentialsJson ? JSON.stringify(data.credentialsJson, null, 2) : "");
  }, [data]);

  async function handleSaveClaudeJson() {
    const parsed = tryParseJson(claudeJsonText);
    if (!parsed) return;
    setSavingClaude(true);
    try {
      await saveConfig({ claudeJson: parsed });
      toast({ title: "Claude settings saved", tone: "success" });
      initializedRef.current = false;
      refresh();
    } catch (err) {
      toast({ title: "Failed to save Claude settings", body: String(err), tone: "error" });
    } finally {
      setSavingClaude(false);
    }
  }

  async function handleSaveCredentials() {
    const parsed = tryParseJson(credentialsJsonText);
    if (!parsed) return;
    setSavingCredentials(true);
    try {
      await saveConfig({ credentialsJson: parsed });
      toast({ title: "Credentials saved", tone: "success" });
      initializedRef.current = false;
      refresh();
    } catch (err) {
      toast({ title: "Failed to save credentials", body: String(err), tone: "error" });
    } finally {
      setSavingCredentials(false);
    }
  }

  if (loading) {
    return <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Loading Claude config…</div>;
  }

  if (error) {
    return <div style={{ fontSize: "12px", color: "var(--destructive)" }}>Error loading config: {error.message}</div>;
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <div>
        <strong style={{ fontSize: "15px" }}>Claude Code Configuration</strong>
        <div style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
          Edit the Claude Code settings and credentials files used by agents on this instance.
        </div>
      </div>

      <ConfigSection
        label="Claude Settings"
        filePath={data?.claudeJsonPath ?? ""}
        text={claudeJsonText}
        onChange={setClaudeJsonText}
        onSave={handleSaveClaudeJson}
        saving={savingClaude}
      />

      <ConfigSection
        label="Claude Credentials"
        filePath={data?.credentialsJsonPath ?? ""}
        text={credentialsJsonText}
        onChange={setCredentialsJsonText}
        onSave={handleSaveCredentials}
        saving={savingCredentials}
        confirmBeforeSave
      />
    </div>
  );
}
