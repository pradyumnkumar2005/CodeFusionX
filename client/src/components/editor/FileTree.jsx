import { useEffect, useMemo, useRef, useState } from "react";
import { listFiles } from "../../api/fsApi";

const sortEntries = (entries) => {
  const dirs = entries
    .filter((e) => e.type === "dir")
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = entries
    .filter((e) => e.type === "file")
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...dirs, ...files];
};

export default function FileTree({
  projectPath,
  onSelectFile,
  onSelectDir,
  onRename,
  onDelete,
  dirtyFiles,
  refreshKey,
  readOnly,
}) {
  const [entriesByDir, setEntriesByDir] = useState({});
  const [expanded, setExpanded] = useState(() => new Set());
  const [error, setError] = useState("");

  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // Initial load / project switch: reset tree state.
  useEffect(() => {
    let active = true;

    const init = async () => {
      setEntriesByDir({});
      setExpanded(new Set([projectPath]));
      setError("");
      try {
        const res = await listFiles(projectPath);
        if (!active) return;
        setEntriesByDir({ [projectPath]: res.data });
      } catch {
        if (!active) return;
        setError("Unable to load files.");
      }
    };

    if (projectPath) init();

    return () => {
      active = false;
    };
  }, [projectPath]);

  // Refresh: keep expanded state, just re-fetch open directories.
  useEffect(() => {
    let active = true;
    if (!projectPath) return;

    const refresh = async () => {
      const dirs = Array.from(expandedRef.current || []);
      if (!dirs.includes(projectPath)) dirs.unshift(projectPath);

      const results = await Promise.all(
        dirs.map(async (dirPath) => {
          try {
            const res = await listFiles(dirPath);
            return [dirPath, res.data];
          } catch {
            return [dirPath, null];
          }
        }),
      );

      if (!active) return;

      setEntriesByDir((prev) => {
        const next = { ...prev };
        for (const [dirPath, data] of results) {
          if (Array.isArray(data)) next[dirPath] = data;
          else delete next[dirPath];
        }
        return next;
      });
    };

    refresh();

    return () => {
      active = false;
    };
  }, [projectPath, refreshKey]);

  const toggleDir = async (dirPath) => {
    onSelectDir?.(dirPath);

    const next = new Set(expanded);
    if (next.has(dirPath)) {
      next.delete(dirPath);
      setExpanded(next);
      return;
    }

    next.add(dirPath);
    setExpanded(next);

    try {
      const res = await listFiles(dirPath);
      setEntriesByDir((prev) => ({ ...prev, [dirPath]: res.data }));
    } catch {
      setError("Unable to load files.");
    }
  };

  const renderDir = (dirPath, depth) => {
    const entries = entriesByDir[dirPath] || [];
    const sorted = sortEntries(entries);

    return sorted.map((entry) => {
      const fullPath = `${dirPath}/${entry.name}`;
      const paddingLeft = `${depth * 12}px`;

      if (entry.type === "dir") {
        const isOpen = expanded.has(fullPath);
        return (
          <div key={fullPath}>
            <div
              className="group cursor-pointer hover:bg-gray-800 rounded px-2 py-1 text-sm flex items-center gap-2"
              style={{ paddingLeft }}
              onClick={() => toggleDir(fullPath)}
              title={entry.name}
            >
              <span className="text-gray-400 w-4">{isOpen ? "▾" : "▸"}</span>
              <span className="text-gray-200 truncate flex-1">{entry.name}</span>
              {!readOnly && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                  <button
                    className="text-xs text-gray-300 hover:text-white px-1"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename?.(fullPath, "dir");
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="text-xs text-red-300 hover:text-red-200 px-1"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(fullPath, "dir");
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            {isOpen && renderDir(fullPath, depth + 1)}
          </div>
        );
      }

      const isDirty = Boolean(dirtyFiles?.has(fullPath));

      return (
        <div
          key={fullPath}
          className="group cursor-pointer hover:bg-gray-800 rounded px-2 py-1 text-sm text-gray-100 flex items-center justify-between"
          style={{ paddingLeft: `${depth * 12 + 16}px` }}
          onClick={() => onSelectFile?.(fullPath)}
          title={entry.name}
        >
          <div className="flex items-center min-w-0 gap-2">
            <span className="truncate">{entry.name}</span>
            {isDirty && <span className="text-yellow-300 text-xs">●</span>}
          </div>
          {!readOnly && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
              <button
                className="text-xs text-gray-300 hover:text-white px-1"
                title="Rename"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename?.(fullPath, "file");
                }}
              >
                Rename
              </button>
              <button
                className="text-xs text-red-300 hover:text-red-200 px-1"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(fullPath, "file");
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      );
    });
  };

  const rootEntries = useMemo(
    () => entriesByDir[projectPath] || [],
    [entriesByDir, projectPath]
  );

  return (
    <div className="w-full md:w-72 bg-gray-900 text-white p-2 border-b md:border-b-0 md:border-r border-gray-800 overflow-auto">
      <div className="text-xs text-gray-300 mb-2 truncate" title={projectPath}>
        {projectPath}
      </div>
      {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
      {rootEntries.length === 0 && !error ? (
        <div className="text-xs text-gray-400">No files</div>
      ) : (
        renderDir(projectPath, 0)
      )}
    </div>
  );
}
