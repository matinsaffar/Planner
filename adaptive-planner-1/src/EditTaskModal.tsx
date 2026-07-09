import React, { useState } from "react";
import { formatJalaali } from "./jalaali";
import JalaaliPicker from "./JalaaliPicker";
import WheelPicker from "./WheelPicker";
import TimeOfDayPicker from "./TimeOfDayPicker";
import { sound } from "./sound";

export default function EditTaskModal({ task, categories, subcategories, onSave, onClose }: any) {
  const [title, setTitle] = useState(task.title);
  const [duration, setDuration] = useState(task.duration);
  const [date, setDate] = useState(task.date);
  const [time, setTime] = useState(task.time || "");
  const [notes, setNotes] = useState(task.notes || "");
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState("Normal");
  const [color, setColor] = useState<string | null>(task.color || null);

  function addSubtask() {
    if (!subtaskInput) return;
    setSubtasks([...subtasks, { id: Date.now().toString(36), title: subtaskInput, priority: subtaskPriority }]);
    setSubtaskInput("");
  }

  return (
    <div className="page-modal">
      <div className="page-modal-header">
        <h3>Edit Task</h3>
        <button className="close-x" style={{ position: "static" }} onClick={onClose}>×</button>
      </div>
      <div className="page-modal-body">
        <div className="step-content">
          <div className="field"><label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="field" style={{ textAlign: "center" }}><label>Duration</label>
            <WheelPicker totalMinutes={duration} onChange={setDuration} />
            <p style={{ fontSize: 13 }}>{Math.floor(duration / 60)}h {duration % 60}m</p>
          </div>
          <div className="field"><label>Date ({formatJalaali(date)})</label>
            <JalaaliPicker value={date} onChange={setDate} disablePast /></div>
          <div className="field"><label>Time</label>
            <TimeOfDayPicker value={time} onChange={setTime} onClear={() => setTime("")} /></div>
          <div className="field"><label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
          <div className="field"><label>Card color (optional)</label>
            <div className="color-swatches">
              <div className={"swatch" + (color === null ? " sel" : "")}
                style={{ background: "var(--glass)", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                onClick={() => setColor(null)}>✕</div>
              {['#7dd3c0', '#a78bfa', '#f4a261', '#ef6461', '#4f9d69', '#e8a4c9', '#5b8bd6', '#c9a24b'].map((c) => (
                <div key={c} className={"swatch" + (color === c ? " sel" : "")} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
              <input type="color" value={color || "#7dd3c0"} onChange={(e) => setColor(e.target.value)}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer" }} />
            </div>
          </div>
          <div className="field"><label>Subtasks</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={subtaskInput} onChange={(e) => setSubtaskInput(e.target.value)} placeholder="Add subtask" />
              <select value={subtaskPriority} onChange={(e) => setSubtaskPriority(e.target.value)} style={{ width: 100 }}>
                <option>Low</option><option>Normal</option><option>High</option>
              </select>
              <button className="btn btn-ghost" style={{ flex: "0 0 auto" }} onClick={addSubtask}>Add</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", marginTop: 8 }}>
              {subtasks.map((s: any) => (
                <span key={s.id} className="subtask-chip">
                  <span className={`priority-dot priority-${s.priority}`} />{s.title}
                  <span style={{ cursor: "pointer" }} onClick={() => setSubtasks(subtasks.filter((x: any) => x.id !== s.id))}>×</span>
                </span>
              ))}
            </div>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => {
              onSave({ ...task, title, duration, date, time: time || null, notes, subtasks, color });
              sound.save();
            }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
