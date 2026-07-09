import React, { useRef, useState, useEffect } from "react";
import { requestNotificationPermission, getNotificationPermission, isNotificationSupported } from "./notifications";

const SWATCHES = ["#7dd3c0","#a78bfa","#f4a261","#ef6461","#4f9d69","#e8a4c9","#5b8bd6","#c9a24b","#0d9488","#7c3aed"];

interface Props {
  accents: { accent: string; accent2: string; accentWarm: string };
  setAccents: (a: any) => void;
  bgImage?: string | null;
  setBgImage?: (v: string | null) => void;
  bgOpacity?: number;
  setBgOpacity?: (v: number) => void;
  exportData?: () => any;
  onImportData?: (data: any) => void;
  cardOpacity?: number;
  setCardOpacity?: (v: number) => void;
}

export default function AccentPicker({ accents, setAccents, bgImage, setBgImage, bgOpacity = 0.35, setBgOpacity, exportData, onImportData, cardOpacity = 1, setCardOpacity }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [notifPerm, setNotifPerm] = useState(getNotificationPermission());
  const [exportMsg, setExportMsg] = useState("");

  function handleExport() {
    if (!exportData) return;
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `adaptive-planner-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportMsg("Backup downloaded ✓");
    setTimeout(() => setExportMsg(""), 3000);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onImportData) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        onImportData(data);
        setExportMsg("Backup restored ✓");
        setTimeout(() => setExportMsg(""), 3000);
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission();
    setNotifPerm(result);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !setBgImage) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBgImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <>
      {isNotificationSupported() && (
        <div className="glass section" style={{ margin: "0 16px 16px" }}>
          <h2>Notifications</h2>
          {notifPerm === "granted" && <p style={{ fontSize: 13, color: "var(--muted)" }}>✅ Notifications are enabled. You'll get alerts for reminders and tasks with a notify time set.</p>}
          {notifPerm === "denied" && <p style={{ fontSize: 13, color: "var(--muted)" }}>Notifications are blocked in your browser settings. Enable them from your browser's site settings to receive alerts.</p>}
          {notifPerm === "default" && (
            <>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>Enable browser notifications to get alerted for reminders and tasks, even as an installed web app on your phone.</p>
              <button className="btn btn-primary" onClick={handleEnableNotifications}>Enable Notifications</button>
            </>
          )}
        </div>
      )}

      {setCardOpacity && (
        <div className="glass section" style={{ margin: "0 16px 16px" }}>
          <h2>Timeline Card Opacity</h2>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 10 }}>
            Adjust how transparent task cards look on the Day Timeline.
          </p>
          <input type="range" min={0.2} max={1} step={0.05} value={cardOpacity}
            onChange={(e) => setCardOpacity(parseFloat(e.target.value))}
            className="bg-opacity-slider" />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{Math.round(cardOpacity * 100)}%</p>
        </div>
      )}

      <div className="glass section" style={{ margin: "0 16px 16px" }}>
        <h2>App Colors</h2>
        {(["accent", "accent2", "accentWarm"] as const).map((key) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              {key === "accent" ? "Primary" : key === "accent2" ? "Secondary" : "Highlight"}
            </label>
            <div className="color-swatches">
              {SWATCHES.map((c) => (
                <div key={c} className={"swatch" + (accents[key] === c ? " sel" : "")}
                  style={{ background: c }} onClick={() => setAccents({ ...accents, [key]: c })} />
              ))}
              <input type="color" value={accents[key]} onChange={(e) => setAccents({ ...accents, [key]: e.target.value })}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer" }} />
            </div>
          </div>
        ))}
      </div>

      <div className="glass section" style={{ margin: "0 16px 16px" }}>
        <h2>App Background</h2>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>
          Upload a custom photo to personalize your background.
        </p>

        {bgImage && (
          <div className="bg-preview-wrap">
            <div className="bg-preview" style={{ backgroundImage: `url(${bgImage})` }} />
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

        <div className="btn-row" style={{ marginTop: bgImage ? 10 : 0 }}>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            {bgImage ? "Change Photo" : "Upload Photo"}
          </button>
          {bgImage && (
            <button className="btn btn-ghost" onClick={() => setBgImage && setBgImage(null)}>Reset to Default</button>
          )}
        </div>

        {bgImage && setBgOpacity && (
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Background visibility
            </label>
            <input type="range" min={0} max={1} step={0.05} value={bgOpacity}
              onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
              className="bg-opacity-slider" />
          </div>
        )}
      </div>

      {exportData && (
        <div className="glass section" style={{ margin: "0 16px 16px" }}>
          <h2>Backup &amp; Restore</h2>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>
            Download all your tasks, goals, reminders, and categories as a file you can restore later.
          </p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={handleExport}>⬇ Export Backup</button>
            <button className="btn btn-ghost" onClick={() => importInputRef.current?.click()}>⬆ Import Backup</button>
          </div>
          <input ref={importInputRef} type="file" accept="application/json" onChange={handleImportFile} style={{ display: "none" }} />
          {exportMsg && <p style={{ fontSize: 12, color: "var(--accent)", marginTop: 8, fontWeight: 700 }}>{exportMsg}</p>}
        </div>
      )}
    </>
  );
}
