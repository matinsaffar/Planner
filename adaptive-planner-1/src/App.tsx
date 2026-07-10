import React, { useEffect, useState } from "react";
import { all, insertRow, updateRow, upsertRow, deleteRow, uid } from "./db";
import { seedIfEmpty, todayStr, daysUntil } from "./seed";
import { supabase } from "./supabaseClient";
import { sound, setMuted, isMuted } from "./sound";
import { useTheme } from "./theme";
import { formatJalaali } from "./jalaali";
import AccentPicker from "./AccentPicker";
import CategoryManager from "./CategoryManager";
import SubcategoryDetail from "./SubcategoryDetail";
import StructuredTimeline from "./StructuredTimeline";
import DayScroller from "./DayScroller";
import RemindersDropdown from "./RemindersDropdown";
import PlanFlow from "./PlanFlow";
import ReminderFlow from "./ReminderFlow";
import BlockFlow from "./BlockFlow";
import TaskDetail from "./TaskDetail";
import EditTaskModal from "./EditTaskModal";
import EndOfDayReview from "./EndOfDayReview";
import GoalFlow from "./GoalFlow";
import { contrastText } from "./colorUtils";
import FocusMode from "./FocusMode";
import SearchOverlay from "./SearchOverlay";
import EmptyState from "./EmptyState";
import BadgePicker from "./BadgePicker";
import { scheduleNotification, computeNotifyTime, requestNotificationPermission, getNotificationPermission } from "./notifications";

type Tab = "home" | "tasks" | "categories" | "goals" | "settings";

export default function App() {
  const { theme, setTheme, accents, setAccents, bgImage, setBgImage, bgOpacity, setBgOpacity } = useTheme();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [tasks, setTasks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [muted, setMutedState] = useState(isMuted());
  const [showSearch, setShowSearch] = useState(false);
  const [badgePromptGoal, setBadgePromptGoal] = useState<any>(null);
  const [achievingId, setAchievingId] = useState<string | null>(null);
  const [openHallCats, setOpenHallCats] = useState<string[]>([]);
  const [pendingDrop, setPendingDrop] = useState<{ taskId: string; hour: number; minute: number; date: string } | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{ type: string; item: any } | null>(null);
  const [cardOpacity, setCardOpacityState] = useState<number>(() => {
    const saved = localStorage.getItem("tl-card-opacity");
    return saved ? parseFloat(saved) : 1;
  });
  useEffect(() => {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0d14' : '#f4f6fb');
}, [theme]);
  function setCardOpacity(v: number) {
    setCardOpacityState(v);
    localStorage.setItem("tl-card-opacity", String(v));
  }
  const [selectedDate, setSelectedDate] = useState(todayStr(0));

  const [flow, setFlow] = useState<null | "plan" | "reminder" | "block">(null);
  const [showAdd, setShowAdd] = useState(false);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [editTask, setEditTask] = useState<any>(null);
  const [editReminder, setEditReminder] = useState<any>(null);
  const [reviewTasks, setReviewTasks] = useState<any[]>([]);
  const [focusTask, setFocusTask] = useState<any>(null);
  const [openSub, setOpenSub] = useState<{ cat: any; sub: any } | null>(null);
  const [showGoalFlow, setShowGoalFlow] = useState(false);
  const [presetCatSub, setPresetCatSub] = useState<{ cat: string; sub: string } | null>(null);

  async function reloadAll() {
    const allTasks = await all("tasks");
    const activeTasks = allTasks.filter((t: any) => t.status !== "Cancelled");
    setTasks(activeTasks);
    const allReminders = (await all("reminders")).sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
    setReminders(allReminders);
    setBlocks(await all("blocks"));
    setGoals((await all("goals")).sort((a: any, b: any) => (a.deadline || "").localeCompare(b.deadline || "")));
    setCategories((await all("categories")).filter((c: any) => !c.archived));
    setSubcategories((await all("subcategories")).filter((s: any) => !s.archived));
    rescheduleAllNotifications(activeTasks, allReminders.filter((r: any) => !r.hidden));
  }

  async function handleImportBackup(data: any) {
    if (!data || typeof data !== "object") return;
    const confirmed = window.confirm("This will add all items from the backup file to your current data. Continue?");
    if (!confirmed) return;
    try {
      for (const c of data.categories || []) await upsertRow("categories", c);
      for (const s of data.subcategories || []) await upsertRow("subcategories", s);
      for (const t of data.tasks || []) await upsertRow("tasks", t);
      for (const r of data.reminders || []) await upsertRow("reminders", r);
      for (const b of data.blocks || []) await upsertRow("blocks", b);
      for (const g of data.goals || []) await upsertRow("goals", g);
      await reloadAll();
    } catch (e) {
      console.error(e);
      alert("Failed to restore backup. The file may be malformed.");
    }
  }

  function rescheduleAllNotifications(taskList: any[], reminderList: any[]) {
    if (getNotificationPermission() !== "granted") return;
    for (const t of taskList) {
      if (t.notify && t.notify !== "none" && t.date && t.status !== "Finished" && t.status !== "Cancelled") {
        const fireAt = computeNotifyTime(t.date, t.time, t.notify, t.notify_custom_time);
        if (fireAt && fireAt.getTime() > Date.now()) scheduleNotification("task_" + t.id, t.title, "Task scheduled: " + t.title, fireAt);
      }
    }
    for (const r of reminderList) {
      if (r.notify && r.notify !== "none" && r.date) {
        const fireAt = computeNotifyTime(r.date, r.time, r.notify, r.notify_custom_time);
        if (fireAt && fireAt.getTime() > Date.now()) scheduleNotification("reminder_" + r.id, r.title, "Reminder: " + r.title, fireAt);
      }
    }
  }

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      await reloadAll();
      const pending = (await all("tasks")).filter(
        (t: any) => t.date < todayStr(0) && ["Planned", "Ready"].includes(t.status)
      );
      if (pending.length > 0) setReviewTasks(pending);
      setReady(true);
    })();
  }, []);

  function toggleMute() { const next = !muted; setMuted(next); setMutedState(next); }
  function subInfo(cat: string, sub: string) { return subcategories.find((s: any) => s.category_id === cat && s.id === sub); }
  function catInfo(cat: string) { return categories.find((c: any) => c.id === cat); }

  async function saveTask(t: any) {
    const existsLocally = tasks.some((x) => x.id === t.id);
    const payload = {
      id: t.id, title: t.title, category: t.category, subcategory: t.subcategory,
      duration: t.duration, date: t.date, time: t.time, status: t.status, notes: t.notes || "",
      subtasks: t.subtasks || [], goals: t.goals || [], color: t.color || null,
      created_at: t.created_at || Date.now(), started_at: t.started_at || null, finished_at: t.finished_at || null,
      repeat: t.repeat || "none", notify: t.notify || "none", notify_custom_time: t.notifyCustomTime || null,
    };
    if (existsLocally) await updateRow("tasks", t.id, payload);
    else await insertRow("tasks", payload);

    if (payload.notify !== "none" && payload.date) {
      const fireAt = computeNotifyTime(payload.date, payload.time, payload.notify, payload.notify_custom_time);
      if (fireAt) scheduleNotification("task_" + t.id, payload.title, "Task scheduled: " + payload.title, fireAt);
    }

    if (t.repeat && t.repeat !== "none" && !existsLocally) {
      await generateRepeatInstances(t, payload);
    }

    await reloadAll();
  }

  async function generateRepeatInstances(original: any, basePayload: any) {
    const occurrences: string[] = [];
    const [y, m, d] = original.date.split("-").map(Number);
    let cursor = new Date(y, m - 1, d);
    const REPEAT_COUNT = 12;
    while (occurrences.length < REPEAT_COUNT) {
      cursor.setDate(cursor.getDate() + 1);
      const isWeekday = cursor.getDay() !== 5 && cursor.getDay() !== 6;
      if (original.repeat === "daily") occurrences.push(cursor.toISOString().slice(0, 10));
      else if (original.repeat === "weekdays" && isWeekday) occurrences.push(cursor.toISOString().slice(0, 10));
      else if (original.repeat === "weekly" && cursor.getDay() === new Date(y, m - 1, d).getDay()) occurrences.push(cursor.toISOString().slice(0, 10));
    }
    for (const dateStr of occurrences) {
      const instancePayload = { ...basePayload, id: uid(), date: dateStr, status: "Planned", started_at: null, finished_at: null };
      await insertRow("tasks", instancePayload);
      if (instancePayload.notify !== "none") {
        const fireAt = computeNotifyTime(dateStr, instancePayload.time, instancePayload.notify, instancePayload.notify_custom_time);
        if (fireAt) scheduleNotification("task_" + instancePayload.id, instancePayload.title, "Task scheduled: " + instancePayload.title, fireAt);
      }
    }
  }

  async function saveReminder(r: any) {
    const exists = reminders.some((x) => x.id === r.id);
    const payload = { ...r, notify: r.notify || "none", notify_custom_time: r.notifyCustomTime || null };
    delete (payload as any).notifyCustomTime;
    if (exists) await updateRow("reminders", r.id, payload);
    else await insertRow("reminders", payload);

    if (payload.notify !== "none" && payload.date) {
      const fireAt = computeNotifyTime(payload.date, payload.time, payload.notify, payload.notify_custom_time);
      if (fireAt) scheduleNotification("reminder_" + r.id, payload.title, "Reminder: " + payload.title, fireAt);
    }
    await reloadAll();
  }
  async function hideReminder(id: string) { await updateRow("reminders", id, { hidden: true }); await reloadAll(); }
  async function deleteReminder(id: string) { await updateRow("reminders", id, { hidden: true }); await reloadAll(); }

  async function saveBlock(b: any) {
    await insertRow("blocks", { id: b.id, title: b.title, date: b.date, start_time: b.start, end_time: b.end, repeat: b.repeat });
    await reloadAll();
  }

  async function addCategory(name: string, icon: string, color: string, banner: string | null, gif: string | null) {
    const id = uid();
    await insertRow("categories", { id, name, icon, color, banner, gif });
    await reloadAll(); return id;
  }
  async function editCategory(id: string, patch: any) { await updateRow("categories", id, patch); await reloadAll(); }
  async function deleteCategory(id: string) {
    await updateRow("categories", id, { archived: true });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }
  async function addSubcategory(categoryId: string, title: string, vitality: string, color: string, icon: string, gif: string | null) {
    const id = uid();
    await insertRow("subcategories", { id, category_id: categoryId, title, vitality, color, icon, gif });
    await reloadAll(); return id;
  }
  async function editSubcategory(id: string, patch: any) { await updateRow("subcategories", id, patch); await reloadAll(); }
  async function deleteSubcategory(id: string) {
    await updateRow("subcategories", id, { archived: true });
    setSubcategories((prev) => prev.filter((s) => s.id !== id));
  }
  async function saveGoal(g: any) {
    const exists = goals.some((x) => x.id === g.id);
    if (exists) await updateRow("goals", g.id, g);
    else await insertRow("goals", g);
    await reloadAll();
  }
  async function achieveGoal(id: string, badge: string) {
    await updateRow("goals", id, { achieved: true, badge, achieved_at: Date.now(), status: "Completed" });
    sound.achieve();
    await reloadAll();
  }
  async function unachieveGoal(id: string) {
    await updateRow("goals", id, { achieved: false, badge: null, achieved_at: null, status: "In Progress" });
    await reloadAll();
  }
  async function deleteGoal(id: string) { await updateRow("goals", id, { status: "Cancelled" }); await reloadAll(); }

  async function startTask(task: any) {
    const started = { ...task, status: "In Progress", started_at: Date.now() };
    await saveTask(started);
    sound.start();
    setDetailTask(null);
    setFocusTask(started);
  }
  async function finishFocus(task: any) {
    await saveTask({ ...task, status: "Finished", finished_at: Date.now() });
    sound.finish();
    setFocusTask(null);
    setDetailTask(null);
  }
  async function breakFocus(task: any, remainingMinutes: number) {
    await saveTask({ ...task, status: "Broken" });
    if (remainingMinutes > 2) {
      await saveTask({ id: uid(), title: task.title + " (continued)", category: task.category,
        subcategory: task.subcategory, duration: remainingMinutes, date: todayStr(0), time: null,
        status: "Planned", notes: task.notes, subtasks: [], goals: task.goals });
    }
    sound.break(); setFocusTask(null);
  }
  async function delayTask(task: any, newDate: string) {
    await saveTask({ ...task, date: newDate, status: "Delayed" }); setDetailTask(null);
  }
  async function cancelTask(task: any) {
    await updateRow("tasks", task.id, { status: "Cancelled" }); await reloadAll(); setDetailTask(null);
  }

  function findOverlap(taskId: string, hour: number, minute: number, date: string, durationOverride?: number): { type: "task" | "block" | "reminder"; item: any } | null {
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const [h, m] = time.split(":").map(Number);
    const newStart = h * 60 + m;
    const newDuration = durationOverride ?? (tasks.find((x: any) => x.id === taskId)?.duration || 30);
    const newEnd = newStart + newDuration;

    const dayTasks = tasks.filter((t: any) => t.date === date && t.id !== taskId && t.time && t.status !== "Finished" && t.status !== "Cancelled");
    const dayBlocks = blocks.filter((b: any) => b.date === date);
    const dayReminders = reminders.filter((r: any) => r.date === date && r.time && !r.hidden);

    const conflictTask = dayTasks.find((t: any) => {
      const [th, tm] = t.time.split(":").map(Number);
      const tStart = th * 60 + tm;
      const tEnd = tStart + (t.duration || 30);
      return newStart < tEnd && tStart < newEnd;
    });
    if (conflictTask) return { type: "task", item: conflictTask };

    const conflictBlock = dayBlocks.find((b: any) => {
      const [sh, sm] = (b.start_time || "00:00").split(":").map(Number);
      const [eh, em] = (b.end_time || "00:00").split(":").map(Number);
      const bStart = sh * 60 + sm;
      const bEnd = eh * 60 + em;
      return newStart < bEnd && bStart < newEnd;
    });
    if (conflictBlock) return { type: "block", item: conflictBlock };

    const conflictReminder = dayReminders.find((r: any) => {
      const [rh, rm] = r.time.split(":").map(Number);
      const rStart = rh * 60 + rm;
      const rEnd = rStart + 15;
      return newStart < rEnd && rStart < newEnd;
    });
    if (conflictReminder) return { type: "reminder", item: conflictReminder };

    return null;
  }

  function checkOverlap(taskId: string, hour: number, minute: number, date: string, durationOverride?: number) {
    return findOverlap(taskId, hour, minute, date, durationOverride) !== null;
  }

  async function handleDropOnTimeline(taskId: string, hour: number, minute: number): Promise<{ ok: boolean; conflict?: { type: string; item: any } }> {
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const conflict = findOverlap(taskId, hour, minute, selectedDate);
    if (conflict) {
      sound.cancel();
      setPendingDrop({ taskId, hour, minute, date: selectedDate });
      setConflictInfo(conflict);
      return { ok: false, conflict };
    }
    await updateRow("tasks", taskId, { time, status: "Ready", date: selectedDate });
    await reloadAll();
    return { ok: true };
  }

  async function replaceConflictAndDrop() {
    if (!pendingDrop || !conflictInfo) return;
    const { taskId, hour, minute, date } = pendingDrop;
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    if (conflictInfo.type === "task") {
      await updateRow("tasks", conflictInfo.item.id, { status: "Cancelled" });
    } else if (conflictInfo.type === "block") {
      await deleteRow("blocks", conflictInfo.item.id);
    } else if (conflictInfo.type === "reminder") {
      await updateRow("reminders", conflictInfo.item.id, { hidden: true });
    }
    await updateRow("tasks", taskId, { time, status: "Ready", date });
    setPendingDrop(null);
    setConflictInfo(null);
    sound.save();
    await reloadAll();
  }

  async function resolveReview(id: string, action: string, delayDate?: string) {
    if (action === "finish") await updateRow("tasks", id, { status: "Finished", finished_at: Date.now() });
    else if (action === "cancel") await updateRow("tasks", id, { status: "Cancelled" });
    else if (action === "backlog") await updateRow("tasks", id, { date: todayStr(0), status: "Carried Over" });
    else if (action === "delay") await updateRow("tasks", id, { date: delayDate, status: "Delayed" });
    await reloadAll();
    setReviewTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const today = todayStr(0);
  const selectedDayTasks = tasks.filter((t: any) => t.date === selectedDate);
  const todaysTasks = tasks.filter((t: any) => t.date === today);
  const withTime = selectedDayTasks.filter((t: any) => t.time || t.status === "In Progress" || t.status === "Finished");
  const withoutTime = selectedDayTasks.filter((t: any) => !t.time && t.status !== "In Progress" && t.status !== "Finished");
  const visibleReminders = reminders.filter((r: any) => !r.hidden && r.date >= today);

  function deadlineClass(dateStr: string | null) {
    if (!dateStr) return "";
    const d = daysUntil(dateStr);
    if (d <= 0) return "deadline-today";
    if (d <= 2) return "deadline-near";
    return "";
  }

  function isPastDue(task: any) {
    if (task.date > today) return false;
    if (task.date < today) return true;
    if (!task.time) return false;
    const [h, m] = task.time.split(":").map(Number);
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tehran" }));
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return h * 60 + m + (task.duration || 0) < nowMinutes;
  }

  function isReminderNear(r: any) {
    const d = daysUntil(r.date);
    return d <= 1;
  }

  if (!ready) {
  return (
    <div className="app-shell">
      <div className="loading-screen">
        Loading your planner…
      </div>
    </div>
  );
}

return (
  <div className="app-shell">
      {reviewTasks.length > 0 && (
        <EndOfDayReview tasks={reviewTasks} onResolve={resolveReview} onClose={() => setReviewTasks([])} />
      )}
      {focusTask && (
        <FocusMode task={focusTask} onFinish={finishFocus} onBreak={breakFocus} onClose={() => setFocusTask(null)} />
      )}

      <div className="app-header">
        <div>
          <h1>Adaptive Planner</h1>
          <p>{formatJalaali(today)} · Tehran time</p>
        </div>
        <div className="header-actions">
          <div className="theme-toggle">
            <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>Light</button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>Dark</button>
          </div>
          <button className="mute-btn" onClick={() => setShowSearch(true)}>🔎</button>
          <button className="mute-btn" onClick={toggleMute}>{muted ? "🔇" : "🔊"}</button>
          <button className="mute-btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      {showSearch && (
        <SearchOverlay
          tasks={tasks} goals={goals} reminders={reminders}
          onOpenTask={(t: any) => { setShowSearch(false); setDetailTask(t); }}
          onOpenGoal={(g: any) => {
            setShowSearch(false);
            const cat = categories.find((c: any) => c.id === g.category);
            const sub = subcategories.find((s: any) => s.id === g.subcategory);
            if (cat && sub) setOpenSub({ cat, sub });
          }}
          onOpenReminder={() => { setShowSearch(false); setTab("home"); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      <div className="nav">
        <button className={tab === "home" ? "active" : ""} onClick={() => { setTab("home"); setSelectedDate(today); reloadAll(); sound.navigate(); }}>Home</button>
        <button className={tab === "tasks" ? "active" : ""} onClick={() => { setTab("tasks"); reloadAll(); sound.navigate(); }}>Tasks</button>
        <button className={tab === "categories" ? "active" : ""} onClick={() => { setTab("categories"); reloadAll(); sound.navigate(); }}>Categories</button>
        <button className={tab === "goals" ? "active" : ""} onClick={() => { setTab("goals"); reloadAll(); sound.navigate(); }}>Goals</button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => { setTab("settings"); sound.navigate(); }}>⚙️</button>
      </div>

      {tab === "home" && (
        <>
          <div className="glass section">
            <h2>Today's Tasks</h2>
            {todaysTasks.length === 0 && <EmptyState type="tasksToday" />}
            <div className="unstarted-grid">
              {todaysTasks.map((t: any) => {
                const sub = subInfo(t.category, t.subcategory);
                const custom = t.color;
                const isFinished = t.status === "Finished";
                return (
                  <div key={t.id}
                    className={`task-card vital-${sub ? sub.vitality : "Normal"}${custom ? " custom-color" : ""}${isFinished ? " finished" : ""}`}
                    style={custom ? { background: custom } : {}}
                    onClick={() => setDetailTask(t)}>
                    {sub?.icon && <span className="icon-badge">{sub.icon}</span>}
                    <div className="t">{t.title}</div>
                    <div className="d">{t.duration} min {t.time ? "· " + t.time : ""}</div>
                    {sub && <div className="sub-tag-chip" style={{ background: sub.color, color: contrastText(sub.color) }}>{sub.icon} {sub.title}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <RemindersDropdown reminders={visibleReminders} onEdit={setEditReminder} onHide={hideReminder} isNear={isReminderNear} />
          <div className="glass section">
            <h2>Categories</h2>
            <div className="cat-grid">
              {categories.slice(0, 6).map((c: any) => (
                <div key={c.id} className="cat-card" onClick={() => setTab("categories")}>
                  {c.banner ? <div className="cat-banner" style={{ backgroundImage: `url(${c.banner})` }} /> : <div className="cat-banner" style={{ background: c.color }} />}
                  <div className="cat-body"><div className="icon">{c.icon}</div><div className="name">{c.name}</div></div>
                </div>
              ))}
              {categories.length === 0 && <EmptyState type="categories" fallback="No categories yet — head to the Categories tab to create one." />}
            </div>
          </div>
        </>
      )}

      {tab === "tasks" && (
        <>
          <DayScroller selectedDate={selectedDate} onSelect={setSelectedDate} />
          <StructuredTimeline
            key={selectedDate}
            tasksWithTime={withTime}
            unstarted={withoutTime}
            blocks={blocks.filter((b: any) => b.date === selectedDate)}
            subInfo={subInfo}
            onOpenTask={setDetailTask}
            onDropTask={handleDropOnTimeline}
            onReplaceConflict={replaceConflictAndDrop}
            cardOpacity={cardOpacity}
          />
        </>
      )}

      {tab === "categories" && (
        <div style={{ margin: "0 16px 16px" }}>
          <CategoryManager
            categories={categories} subcategories={subcategories}
            onAddCategory={addCategory} onEditCategory={editCategory} onDeleteCategory={deleteCategory}
            onAddSubcategory={addSubcategory} onEditSubcategory={editSubcategory} onDeleteSubcategory={deleteSubcategory}
            onSelectSubcategory={(catId, subId) => setOpenSub({ cat: catInfo(catId), sub: subInfo(catId, subId) })}
          />
        </div>
      )}

      {tab === "goals" && (
        <>
          <div className="section glass">
            <h2>Goals <button className="expand-btn" onClick={() => setShowGoalFlow(true)}>+ New Goal</button></h2>
            {categories.map((c: any) => {
              const activeInCat = goals.filter((g: any) => g.category === c.id && g.status !== "Cancelled" && !g.achieved);
              if (activeInCat.length === 0) return null;
              return (
                <div key={c.id} className="goal-cat-section">
                  <h3 className="goal-cat-heading">{c.icon} {c.name}</h3>
                  {activeInCat.map((g: any) => (
                    <div key={g.id} className={`goal-row ${deadlineClass(g.deadline)}${achievingId === g.id ? " achieving-out" : ""}`}>
                      <div className="goal-row-title">{g.title}</div>
                      <span className="badge">{subInfo(g.category, g.subcategory)?.title}</span>
                      <div className="days">{g.type} · deadline {g.deadline ? formatJalaali(g.deadline) : "—"} · {g.status}</div>
                      <button className="btn btn-achieve" onClick={() => setBadgePromptGoal(g)}>🏆 Mark Achieved</button>
                    </div>
                  ))}
                </div>
              );
            })}
            {goals.filter((g: any) => g.status !== "Cancelled" && !g.achieved).length === 0 && <EmptyState type="goals" />}
          </div>

          {goals.some((g: any) => g.achieved) && (
            <div className="section glass hall-of-goals">
              <h2 style={{ marginBottom: 4 }}>🏛️ Hall of Goals</h2>
              {categories.map((c: any) => {
                const achievedInCat = goals.filter((g: any) => g.category === c.id && g.achieved);
                if (achievedInCat.length === 0) return null;
                const isOpen = openHallCats.includes(c.id);
                return (
                  <div key={c.id} className="hall-cat-dropdown">
                    <button className="hall-cat-toggle" onClick={() => setOpenHallCats((prev: string[]) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])}>
                      <span>{c.icon} {c.name}</span>
                      <span className="hall-cat-count">{achievedInCat.length} {isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div className="hall-grid">
                        {achievedInCat.map((g: any) => (
                          <div key={g.id} className="hall-card">
                            <div className="hall-badge">{g.badge || "🏆"}</div>
                            <div className="hall-title">{g.title}</div>
                            <div className="hall-meta">{subInfo(g.category, g.subcategory)?.title}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {badgePromptGoal && (
        <div className="overlay" onClick={() => setBadgePromptGoal(null)}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <h3>🏆 Choose a badge</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Pick a badge to celebrate "{badgePromptGoal.title}".</p>
            <BadgePicker value={null} onChange={(b) => {
              const goalId = badgePromptGoal.id;
              setBadgePromptGoal(null);
              setAchievingId(goalId);
              setTimeout(async () => { await achieveGoal(goalId, b); setAchievingId(null); }, 450);
            }} />
            <div className="btn-row"><button className="btn btn-ghost" onClick={() => setBadgePromptGoal(null)}>Cancel</button></div>
          </div>
        </div>
      )}
      {showGoalFlow && (
        <GoalFlow
          categories={categories} subcategories={subcategories}
          addCategory={(n: string, i: string) => addCategory(n, i, "#7dd3c0", null, null)}
          addSubcategory={(cid: string, t: string, v: string) => addSubcategory(cid, t, v, "#a78bfa", "🔹", null)}
          onSave={async (g: any) => { await saveGoal(g); setShowGoalFlow(false); }}
          onClose={() => setShowGoalFlow(false)}
        />
      )}

      {tab === "settings" && (
        <AccentPicker
          accents={accents} setAccents={setAccents}
          bgImage={bgImage} setBgImage={setBgImage}
          bgOpacity={bgOpacity} setBgOpacity={setBgOpacity}
          exportData={() => ({ tasks, goals, reminders, blocks, categories, subcategories, exportedAt: new Date().toISOString() })}
          onImportData={handleImportBackup}
          cardOpacity={cardOpacity} setCardOpacity={setCardOpacity}
        />
      )}

      <button className="fab" onClick={() => { setShowAdd(true); setFlow(null); sound.navigate(); }}>+</button>

      {showAdd && !flow && (
        <div className="overlay" onClick={() => setShowAdd(false)}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
            <h3>What would you like to add?</h3>
            <button className="opt-btn" onClick={() => setFlow("plan")}>📝 Plan a task</button>
            <button className="opt-btn" onClick={() => setFlow("reminder")}>⏰ Set a reminder</button>
            <button className="opt-btn" onClick={() => setFlow("block")}>🔒 Occupied block</button>
          </div>
        </div>
      )}

      {flow === "plan" && (
        <PlanFlow
          categories={categories} subcategories={subcategories} goals={goals} allTasks={tasks}
          addCategory={(n: string, i: string) => addCategory(n, i, "#7dd3c0", null, null)}
          addSubcategory={(cid: string, t: string, v: string) => addSubcategory(cid, t, v, "#a78bfa", "🔹", null)}
          defaultDate={selectedDate}
          presetCategory={presetCatSub?.cat}
          presetSubcategory={presetCatSub?.sub}
          checkTimeConflict={(date: string, time: string, duration: number) => {
            if (!time) return null;
            const [h, m] = time.split(":").map(Number);
            return findOverlap("__new__", h, m, date, duration);
          }}
          onReplaceAndContinue={async (conflict: any) => {
            if (conflict.type === "task") await updateRow("tasks", conflict.item.id, { status: "Cancelled" });
            else if (conflict.type === "block") await deleteRow("blocks", conflict.item.id);
            else if (conflict.type === "reminder") await updateRow("reminders", conflict.item.id, { hidden: true });
            await reloadAll();
          }}
          onSave={async (t: any) => { await saveTask(t); setFlow(null); setShowAdd(false); setPresetCatSub(null); }}
          onClose={() => { setFlow(null); setShowAdd(false); setPresetCatSub(null); }}
        />
      )}
      {flow === "reminder" && (
        <ReminderFlow
          allReminders={reminders}
          checkTimeConflict={(date: string, time: string) => {
            if (!time) return null;
            const [h, m] = time.split(":").map(Number);
            return findOverlap("__new__", h, m, date, 15);
          }}
          onReplaceAndContinue={async (conflict: any) => {
            if (conflict.type === "task") await updateRow("tasks", conflict.item.id, { status: "Cancelled" });
            else if (conflict.type === "block") await deleteRow("blocks", conflict.item.id);
            else if (conflict.type === "reminder") await updateRow("reminders", conflict.item.id, { hidden: true });
            await reloadAll();
          }}
          onSave={async (r: any) => { await saveReminder(r); setFlow(null); setShowAdd(false); }}
          onClose={() => { setFlow(null); setShowAdd(false); }}
        />
      )}
      {flow === "block" && (
        <BlockFlow
          defaultDate={selectedDate}
          allBlocks={blocks}
          checkTimeConflict={(date: string, startTime: string, endTime: string) => {
            if (!startTime || !endTime) return null;
            const [sh, sm] = startTime.split(":").map(Number);
            const [eh, em] = endTime.split(":").map(Number);
            const duration = (eh * 60 + em) - (sh * 60 + sm);
            return findOverlap("__new__", sh, sm, date, duration > 0 ? duration : 30);
          }}
          onReplaceAndContinue={async (conflict: any) => {
            if (conflict.type === "task") await updateRow("tasks", conflict.item.id, { status: "Cancelled" });
            else if (conflict.type === "block") await deleteRow("blocks", conflict.item.id);
            else if (conflict.type === "reminder") await updateRow("reminders", conflict.item.id, { hidden: true });
            await reloadAll();
          }}
          onSave={async (b: any) => { await saveBlock(b); setFlow(null); setShowAdd(false); }}
          onClose={() => { setFlow(null); setShowAdd(false); }}
        />
      )}

      {detailTask && (
        <TaskDetail
          task={detailTask} subInfo={subInfo} catInfo={catInfo}
          isPastDue={isPastDue(detailTask)}
          onStart={() => startTask(detailTask)}
          onFinishDirect={() => finishFocus(detailTask)}
          onDelay={(d: string) => delayTask(detailTask, d)}
          onCancel={() => cancelTask(detailTask)}
          onClose={() => setDetailTask(null)}
          onEdit={(t: any) => { setEditTask(t); setDetailTask(null); }}
        />
      )}
      {editTask && (
        <EditTaskModal
          task={editTask} categories={categories} subcategories={subcategories}
          onSave={async (t: any) => { await saveTask(t); setEditTask(null); }}
          onClose={() => setEditTask(null)}
        />
      )}
      {editReminder && (
        <div className="overlay" onClick={() => setEditReminder(null)}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Reminder</h3>
            <div className="field"><label>Title</label>
              <input value={editReminder.title} onChange={(e) => setEditReminder({ ...editReminder, title: e.target.value })} /></div>
            <div className="field"><label>Time</label>
              <input type="time" value={editReminder.time} onChange={(e) => setEditReminder({ ...editReminder, time: e.target.value })} /></div>
            <div className="btn-row">
              <button className="btn btn-danger" onClick={async () => { await deleteReminder(editReminder.id); setEditReminder(null); }}>Delete</button>
              <button className="btn btn-ghost" onClick={() => setEditReminder(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => { await saveReminder(editReminder); setEditReminder(null); }}>Save</button>
            </div>
          </div>
        </div>
      )}
      {openSub && (
        <SubcategoryDetail
          sub={openSub.sub} category={openSub.cat}
          tasks={tasks.filter((t: any) => t.category === openSub.cat.id && t.subcategory === openSub.sub.id)}
          goals={goals.filter((g: any) => g.category === openSub.cat.id && g.subcategory === openSub.sub.id && g.status !== "Cancelled")}
          onClose={() => setOpenSub(null)}
          onSaveGoal={saveGoal}
          onDeleteGoal={deleteGoal}
          onOpenTask={(t: any) => { setOpenSub(null); setDetailTask(t); }}
          onCreateTask={() => { setPresetCatSub({ cat: openSub.cat.id, sub: openSub.sub.id }); setFlow("plan"); setShowAdd(true); setOpenSub(null); }}
          onAchieveGoal={achieveGoal}
        />
      )}
    </div>
  );
}
