import Editor from "@monaco-editor/react";
import { useMemo } from "react";

const languageFromPath = (filePath) => {
  if (!filePath) return "plaintext";
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "py":
      return "python";
    case "java":
      return "java";
    case "c":
    case "h":
      return "c";
    case "cc":
    case "cpp":
    case "cxx":
    case "hpp":
    case "hh":
      return "cpp";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
};

export default function CodeEditor({
  filePath,
  value,
  onChange,
  onSave,
  saving,
  error,
  isDirty,
  readOnly,
}) {
  const language = useMemo(() => languageFromPath(filePath), [filePath]);

  const handleMount = (editor, monaco) => {
    // Ctrl/Cmd + S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-950 px-3 py-2 text-white">
        <button
          onClick={onSave}
          disabled={!filePath || saving || !isDirty || readOnly}
          className="bg-blue-600 disabled:bg-blue-900 disabled:cursor-not-allowed text-white px-3 py-1 rounded"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <div className="text-xs text-gray-300 truncate">
          {filePath ? `${filePath}${isDirty ? " *" : ""}` : "Select a file"}
        </div>
        {error && <div className="text-xs text-red-400 ml-auto">{error}</div>}
      </div>

      <div className="flex-1">
        <Editor
          height="calc(100vh - 48px)"
          language={language}
          value={value}
          onChange={(v) => onChange?.(v ?? "")}
          onMount={handleMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
