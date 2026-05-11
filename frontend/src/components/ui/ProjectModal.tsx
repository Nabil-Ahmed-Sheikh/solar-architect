"use client";
import { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveModal, selectModalData, closeModal } from "@/store/slices/uiSlice";
import { createProject, updateProject, deleteProject } from "@/store/slices/projectsSlice";
import { pushNotification } from "@/store/slices/uiSlice";
import type { ProjectStatus } from "@/lib/api";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "PENDING",   label: "Pending" },
  { value: "ACTIVE",    label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED",  label: "Archived" },
];

function Overlay({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />;
}

/** Generic confirm-delete modal */
export function DeleteProjectModal() {
  const dispatch = useAppDispatch();
  const modal = useAppSelector(selectActiveModal);
  const data = useAppSelector(selectModalData) as { id: number; name: string };
  const [loading, setLoading] = useState(false);

  if (modal !== "deleteProject") return null;

  const handleDelete = async () => {
    setLoading(true);
    const result = await dispatch(deleteProject(data.id));
    setLoading(false);
    if (deleteProject.fulfilled.match(result)) {
      dispatch(pushNotification({ type: "success", title: "Project deleted", message: `"${data.name}" has been removed.` }));
      dispatch(closeModal());
    } else {
      dispatch(pushNotification({ type: "error", title: "Delete failed", message: "Please try again." }));
    }
  };

  return (
    <>
      <Overlay onClose={() => dispatch(closeModal())} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#ba1a1a]" style={{ fontSize: 22 }}>delete_forever</span>
            </div>
            <h2 className="font-headline font-bold text-lg text-[#191c1d]">Delete Project</h2>
          </div>
          <p className="text-sm text-[#40484c] mb-6">
            Are you sure you want to delete <strong>"{data.name}"</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => dispatch(closeModal())}
              className="flex-1 py-3 rounded-xl border border-[#bfc8cc]/40 text-sm font-bold text-[#40484c] hover:bg-[#f2f4f5] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[#ba1a1a] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deleting…</>
              ) : "Delete Project"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Create / Edit project modal */
export default function ProjectModal() {
  const dispatch = useAppDispatch();
  const modal = useAppSelector(selectActiveModal);
  const data = useAppSelector(selectModalData) as { id?: number; name?: string; location?: string; status?: ProjectStatus; roof_area?: number; estimated_generation?: number };

  const isEdit = modal === "editProject";
  const isCreate = modal === "createProject";
  const isOpen = isEdit || isCreate;

  const [form, setForm] = useState({
    name: "", location: "", status: "PENDING" as ProjectStatus,
    roof_area: "", estimated_generation: "", latitude: "", longitude: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: data.name ?? "",
        location: data.location ?? "",
        status: data.status ?? "PENDING",
        roof_area: data.roof_area?.toString() ?? "",
        estimated_generation: data.estimated_generation?.toString() ?? "",
        latitude: "", longitude: "",
      });
      setErrors({});
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen, modal]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Project name is required";
    if (!form.location.trim()) e.location = "Location is required";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      status: form.status,
      roof_area: form.roof_area ? parseFloat(form.roof_area) : 0,
      estimated_generation: form.estimated_generation ? parseFloat(form.estimated_generation) : 0,
      ...(form.latitude && { latitude: parseFloat(form.latitude) }),
      ...(form.longitude && { longitude: parseFloat(form.longitude) }),
    };

    const result = isEdit
      ? await dispatch(updateProject({ id: data.id!, data: payload }))
      : await dispatch(createProject(payload));

    setLoading(false);

    if (createProject.fulfilled.match(result) || updateProject.fulfilled.match(result)) {
      dispatch(pushNotification({
        type: "success",
        title: isEdit ? "Project updated" : "Project created",
        message: `"${payload.name}" has been ${isEdit ? "updated" : "added to your pipeline"}.`,
      }));
      dispatch(closeModal());
    } else {
      dispatch(pushNotification({ type: "error", title: "Save failed", message: "Please check your inputs and try again." }));
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <>
      <Overlay onClose={() => dispatch(closeModal())} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#f2f4f5]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#a1e4fe]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#19667d]" style={{ fontSize: 20 }}>
                  {isEdit ? "edit" : "add_circle"}
                </span>
              </div>
              <h2 className="font-headline font-bold text-lg text-[#191c1d]">
                {isEdit ? "Edit Project" : "New Project"}
              </h2>
            </div>
            <button onClick={() => dispatch(closeModal())} className="text-[#70787d] hover:text-[#191c1d] transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">
                Project Name <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                ref={firstInputRef}
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Greenway Logistics Hub"
                className={`w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm outline-none transition-all placeholder:text-[#70787d]
                  ${errors.name ? "ring-2 ring-[#ba1a1a]/40" : "focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white"}`}
              />
              {errors.name && <p className="text-[10px] text-[#ba1a1a] mt-1">{errors.name}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">
                Location <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                value={form.location}
                onChange={set("location")}
                placeholder="City, State / Province"
                className={`w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm outline-none transition-all placeholder:text-[#70787d]
                  ${errors.location ? "ring-2 ring-[#ba1a1a]/40" : "focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white"}`}
              />
              {errors.location && <p className="text-[10px] text-[#ba1a1a] mt-1">{errors.location}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={set("status")}
                className="w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Roof area + generation */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { field: "roof_area", label: "Roof Area", unit: "m²", placeholder: "1200" },
                { field: "estimated_generation", label: "Est. Generation", unit: "MWh/yr", placeholder: "180" },
              ].map(({ field, label, unit, placeholder }) => (
                <div key={field}>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">
                    {label} <span className="normal-case font-normal text-[#70787d]">({unit})</span>
                  </label>
                  <input
                    type="number"
                    value={form[field as keyof typeof form]}
                    onChange={set(field)}
                    placeholder={placeholder}
                    min={0}
                    className="w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Coordinates (optional) */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { field: "latitude", label: "Latitude", placeholder: "33.4484" },
                { field: "longitude", label: "Longitude", placeholder: "-112.0740" },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">{label}</label>
                  <input
                    type="number"
                    value={form[field as keyof typeof form]}
                    onChange={set(field)}
                    placeholder={placeholder}
                    step={0.0001}
                    className="w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => dispatch(closeModal())}
                className="flex-1 py-3 rounded-xl border border-[#bfc8cc]/40 text-sm font-bold text-[#40484c] hover:bg-[#f2f4f5] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : (
                  <>{isEdit ? "Save Changes" : "Create Project"}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
