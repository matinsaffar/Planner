import React, { useState } from "react";
import EmptyState from "./EmptyState";
import { sound } from "./sound";
import BannerCropper from "./BannerCropper";

const PALETTE = ["#7dd3c0", "#a78bfa", "#f4a261", "#ef6461", "#4f9d69", "#e8a4c9", "#5b8bd6", "#c9a24b"];

function fileToDataUrl(file) {
  return new Promise((res) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.readAsDataURL(file);
  });
}

export default function CategoryManager(props) {
  const { categories, subcategories, onAddCategory, onEditCategory, onDeleteCategory,
    onAddSubcategory, onEditSubcategory, onDeleteSubcategory, onSelectSubcategory } = props;
  const [showNewCat, setShowNewCat] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [showNewSub, setShowNewSub] = useState(null);
  const [editSub, setEditSub] = useState(null);

  return (
    <div>
      {categories.map((c) => (
        <div key={c.id} className="glass section cat-section">
          <h2>
            <span>{c.icon} {c.name}</span>
            <span style={{ display: "flex", gap: 6 }}>
              <button className="card-edit-btn" onClick={() => setEditCat(c)}>Edit</button>
              <button className="card-edit-btn" onClick={() => setShowNewSub(c.id)}>+ Subcategory</button>
            </span>
          </h2>
          {/* Category banner intentionally not shown here — only on Home tab cards.
              Subcategory banners render below instead. */}
          <div className="cat-grid">
            {subcategories.filter((s) => s.category_id === c.id).map((s) => (
              <div key={s.id} className="cat-card" onClick={() => onSelectSubcategory(c.id, s.id)}>
                {s.gif ? (
                  <div className="cat-banner" style={{ backgroundImage: `url(${s.gif})` }} />
                ) : (
                  <div className="cat-banner" style={{ background: s.color }} />
                )}
                <div className="cat-body">
                  <div className="icon">{s.icon}</div>
                  <div className="name">{s.title}</div>
                  <div className="sub">{s.vitality}</div>
                </div>
                <button className="mini-btn" style={{ position: "absolute", top: 8, right: 8 }}
                  onClick={(e) => { e.stopPropagation(); setEditSub(s); }}>Edit</button>
              </div>
            ))}
            {subcategories.filter((s) => s.category_id === c.id).length === 0 && (
              <EmptyState type="categories" fallback="No subcategories yet — add one above." />
            )}
          </div>
        </div>
      ))}

      <button className="opt-btn" style={{ textAlign: "center", color: "var(--accent)" }} onClick={() => setShowNewCat(true)}>
        + New Category
      </button>

      {showNewCat && (
        <CategoryModal onClose={() => setShowNewCat(false)}
          onSave={async (name, icon, color, banner, gif) => { await onAddCategory(name, icon, color, banner, gif); setShowNewCat(false); sound.save(); }} />
      )}
      {editCat && (
        <CategoryModal initial={editCat} onClose={() => setEditCat(null)}
          onSave={async (name, icon, color, banner, gif) => { await onEditCategory(editCat.id, { name, icon, color, banner, gif }); setEditCat(null); sound.save(); }}
          onDelete={async () => { await onDeleteCategory(editCat.id); setEditCat(null); }} />
      )}
      {showNewSub && (
        <SubcategoryModal onClose={() => setShowNewSub(null)}
          onSave={async (title, vitality, color, icon, gif) => { await onAddSubcategory(showNewSub, title, vitality, color, icon, gif); setShowNewSub(null); sound.save(); }} />
      )}
      {editSub && (
        <SubcategoryModal initial={editSub} onClose={() => setEditSub(null)}
          onSave={async (title, vitality, color, icon, gif) => { await onEditSubcategory(editSub.id, { title, vitality, color, icon, gif }); setEditSub(null); sound.save(); }}
          onDelete={async () => { await onDeleteSubcategory(editSub.id); setEditSub(null); }} />
      )}
    </div>
  );
}

function CategoryModal({ initial, onClose, onSave, onDelete }) {
  const [name, setName] = useState(initial?.name || "");
  const [icon, setIcon] = useState(initial?.icon || "📁");
  const [color, setColor] = useState(initial?.color || PALETTE[0]);
  const [banner, setBanner] = useState(initial?.banner || null);
  const [gif, setGif] = useState(initial?.gif || null);
  const [cropSrc, setCropSrc] = useState(null);

  async function handleBanner(e) {
    const file = e.target.files?.[0];
    if (file) setCropSrc(await fileToDataUrl(file));
    e.target.value = "";
  }
  async function handleGif(e) {
    const file = e.target.files?.[0];
    if (file) setGif(await fileToDataUrl(file));
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
        <h3>{initial ? "Edit Category" : "New Category"}</h3>
        <div className="banner-upload-row">
          <label className="banner-upload" style={banner ? { backgroundImage: `url(${banner})` } : {}}>
            {!banner && "Click to upload a banner image"}
            <input type="file" accept="image/*" onChange={handleBanner} style={{ display: "none" }} />
          </label>
          {banner && (
            <button type="button" className="banner-remove-btn" title="Remove banner" onClick={() => setBanner(null)}>✕</button>
          )}
        </div>
        {cropSrc && (
          <BannerCropper
            src={cropSrc}
            onCancel={() => setCropSrc(null)}
            onConfirm={(cropped) => { setBanner(cropped); setCropSrc(null); }}
          />
        )}
        <div className="field" style={{ marginTop: 14 }}><label>Category name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fitness" /></div>
        <div className="field"><label>Icon (emoji)</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} /></div>
        <div className="field"><label>GIF (optional, shown beside icon)</label>
          <input type="file" accept="image/gif,image/*" onChange={handleGif} />
          {gif && <img src={gif} alt="" style={{ height: 40, marginTop: 6, borderRadius: 8 }} />}
        </div>
        <div className="field"><label>Color</label>
          <div className="color-swatches">
            {PALETTE.map((c) => (<div key={c} className={"swatch" + (c === color ? " sel" : "")} style={{ background: c }} onClick={() => setColor(c)} />))}
            <label className="color-picker-icon-btn" title="Custom color">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="btn-row">
          {initial && <button className="btn btn-danger" onClick={onDelete}>Delete</button>}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name} onClick={() => onSave(name, icon, color, banner, gif)}>Save</button>
        </div>
      </div>
    </div>
  );
}

function SubcategoryModal({ initial, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [vitality, setVitality] = useState(initial?.vitality || "Normal");
  const [color, setColor] = useState(initial?.color || PALETTE[1]);
  const [icon, setIcon] = useState(initial?.icon || "🔹");
  const [gif, setGif] = useState(initial?.gif || null);
  const [cropSrc, setCropSrc] = useState(null);

  async function handleGif(e) {
    const file = e.target.files?.[0];
    if (file) setCropSrc(await fileToDataUrl(file));
    e.target.value = "";
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
        <h3>{initial ? "Edit Subcategory" : "New Subcategory"}</h3>
        <div className="field"><label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Thesis" /></div>
        <div className="field"><label>Icon (emoji)</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} /></div>
        <div className="field">
          <label>Banner (optional — shown on this subcategory's card instead of its color)</label>
          <div className="banner-upload-row">
            <label className="banner-upload" style={gif ? { backgroundImage: `url(${gif})` } : {}}>
              {!gif && "Click to upload a banner image"}
              <input type="file" accept="image/*" onChange={handleGif} style={{ display: "none" }} />
            </label>
            {gif && (
              <button type="button" className="banner-remove-btn" title="Remove banner" onClick={() => setGif(null)}>✕</button>
            )}
          </div>
          {cropSrc && (
            <BannerCropper
              src={cropSrc}
              onCancel={() => setCropSrc(null)}
              onConfirm={(cropped) => { setGif(cropped); setCropSrc(null); }}
            />
          )}
        </div>
        <div className="field"><label>Vitality</label>
          <select value={vitality} onChange={(e) => setVitality(e.target.value)}>
            <option>Normal</option><option>High</option><option>Critical</option>
          </select></div>
        <div className="field"><label>Color{gif ? " (used if banner is removed)" : ""}</label>
          <div className="color-swatches">
            {PALETTE.map((c) => (<div key={c} className={"swatch" + (c === color ? " sel" : "")} style={{ background: c }} onClick={() => setColor(c)} />))}
            <label className="color-picker-icon-btn" title="Custom color">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="btn-row">
          {initial && <button className="btn btn-danger" onClick={onDelete}>Delete</button>}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!title} onClick={() => onSave(title, vitality, color, icon, gif)}>Save</button>
        </div>
      </div>
    </div>
  );
}
