import React, { useState } from "react";
import { uid } from "./db";
import { sound } from "./sound";
import { todayStr } from "./seed";
import { formatJalaali } from "./jalaali";
import JalaaliPicker from "./JalaaliPicker";

export default function GoalFlow({ categories, subcategories, addCategory, addSubcategory, onSave, onClose }: any) {
  const steps = ["Category", "Subcategory", "Goal", "Deadline"];
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Deadline");
  const [deadline, setDeadline] = useState(todayStr(14));
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");

  const catObj = categories.find((c: any) => c.id === category);
  const subsOfCat = subcategories.filter((s: any) => s.category_id === category);

  function next() { sound.step(); setStep((s) => Math.min(steps.length - 1, s + 1)); }
  function back() { sound.step(); setStep((s) => Math.max(0, s - 1)); }

  function finalize() {
    onSave({
      id: uid(), category, subcategory, type, title,
      start_date: todayStr(0), deadline, status: "In Progress", target: 1, progress: 0,
    });
    sound.save();
  }

  return (
    <div className="page-modal">
      <div className="page-modal-header">
        <h3>New Goal · {steps[step]}</h3>
        <button className="close-x" style={{ position: "static" }} onClick={onClose}>×</button>
      </div>
      <div className="step-progress">{steps.map((_, i) => <div key={i} className={i <= step ? "done" : ""} />)}</div>
      <div className="page-modal-body">
        <div className="step-content" key={step}>
          {step === 0 && (
            <div>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 14 }}>Which area of life is this goal for?</p>
              {categories.length === 0 && <p className="empty">No categories yet — create one below.</p>}
              {categories.map((c: any) => (
                <button key={c.id} className="opt-btn" onClick={() => { setCategory(c.id); next(); }}>{c.icon} {c.name}</button>
              ))}
              <div className="field">
                <label>Create a new category</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" />
                  <button className="btn btn-ghost" style={{ flex: "0 0 auto" }} onClick={async () => {
                    if (!newCatName) return;
                    const id = await addCategory(newCatName, "📁");
                    setCategory(id); setNewCatName(""); next();
                  }}>Add</button>
                </div>
              </div>
            </div>
          )}
          {step === 1 && catObj && (
            <div>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 14 }}>Pick a subcategory within {catObj.name}.</p>
              {subsOfCat.length === 0 && <p className="empty">No subcategories yet.</p>}
              {subsOfCat.map((s: any) => (
                <button key={s.id} className="opt-btn" style={{ borderLeft: `3px solid ${s.color}` }}
                  onClick={() => { setSubcategory(s.id); next(); }}>{s.icon} {s.title}</button>
              ))}
              <div className="field">
                <label>Create a new subcategory</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="Subcategory title" />
                  <button className="btn btn-ghost" style={{ flex: "0 0 auto" }} onClick={async () => {
                    if (!newSubName) return;
                    const id = await addSubcategory(category!, newSubName, "Normal");
                    setSubcategory(id); setNewSubName(""); next();
                  }}>Add</button>
                </div>
              </div>
              <div className="btn-row"><button className="btn btn-ghost" onClick={back}>Back</button></div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div className="field"><label>Goal title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finish thesis draft" autoFocus /></div>
              <div className="field"><label>Goal type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option>Deadline</option><option>Phase</option><option>Metric</option>
                </select></div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" disabled={!title} onClick={next}>Continue</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <div className="field"><label>Deadline ({formatJalaali(deadline)})</label>
                <JalaaliPicker value={deadline} onChange={setDeadline} disablePast /></div>
              <div className="review-item">
                <div className="title">{title}</div>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>{catObj?.name} · {type} · deadline {formatJalaali(deadline)}</p>
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={finalize}>Save Goal</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
