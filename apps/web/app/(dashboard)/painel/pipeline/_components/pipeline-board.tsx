"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, X, Check, Pencil, Trash2, Loader2, CalendarDays,
  User, Package, GripVertical, ChevronDown, Zap,
} from "lucide-react";
import {
  addCard, updateCard, moveCard, deleteCard,
  addColumn, renameColumn, deleteColumn,
} from "@/app/actions/pipeline";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineCard {
  id: string;
  title: string;
  description: string | null;
  contact_name: string | null;
  product_name: string | null;
  position: number;
  due_date: string | null;
  created_at: string;
  inquiry_id: string | null;
  proposal_id: string | null;
  origin: "manual" | "auto";
}

export interface PipelineColumn {
  id: string;
  title: string;
  position: number;
  color: string;
  pipeline_cards: PipelineCard[];
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const COL_COLORS: Record<string, { header: string; dot: string; drag: string }> = {
  slate:  { header: "bg-slate-100  border-slate-200",  dot: "bg-slate-400",   drag: "ring-slate-300"  },
  green:  { header: "bg-green-50   border-green-200",   dot: "bg-green-500",   drag: "ring-green-300"  },
  red:    { header: "bg-red-50     border-red-200",     dot: "bg-red-500",     drag: "ring-red-300"    },
  amber:  { header: "bg-amber-50   border-amber-200",   dot: "bg-amber-500",   drag: "ring-amber-300"  },
  blue:   { header: "bg-blue-50    border-blue-200",    dot: "bg-blue-500",    drag: "ring-blue-300"   },
  purple: { header: "bg-purple-50  border-purple-200",  dot: "bg-purple-500",  drag: "ring-purple-300" },
};

const AVAILABLE_COLORS = ["slate", "blue", "green", "amber", "red", "purple"] as const;

function colStyle(color: string) {
  return COL_COLORS[color] ?? COL_COLORS.slate;
}

// ─── Card component ───────────────────────────────────────────────────────────

function KanbanCard({
  card,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  card: PipelineCard;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const isOverdue = card.due_date && new Date(card.due_date) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group bg-white border border-border rounded-xl px-3 py-2.5 shadow-sm cursor-pointer",
        "hover:shadow-md hover:border-slate-300 transition-all select-none",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-medium text-slate-800 line-clamp-2 flex-1">{card.title}</p>
            {card.origin === "auto" ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[color:var(--brand-green-50)] text-[color:var(--brand-green-700)] border border-[color:var(--brand-green-200)] shrink-0 mt-0.5">
                <Zap className="w-2 h-2" />Auto
              </span>
            ) : (
              <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200 shrink-0 mt-0.5">
                Manual
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {card.contact_name && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                <User className="w-2.5 h-2.5" />{card.contact_name}
              </span>
            )}
            {card.product_name && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                <Package className="w-2.5 h-2.5" />{card.product_name}
              </span>
            )}
            {card.due_date && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5",
                isOverdue
                  ? "text-red-600 bg-red-50 border border-red-100"
                  : "text-slate-500 bg-slate-50 border border-slate-100"
              )}>
                <CalendarDays className="w-2.5 h-2.5" />
                {new Date(card.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            )}
            {!card.contact_name && !card.product_name && !card.due_date && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 rounded-full px-0.5 py-0.5">
                <CalendarDays className="w-2.5 h-2.5" />
                {new Date(card.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card modal ───────────────────────────────────────────────────────────────

function CardModal({
  card,
  columnTitle,
  onClose,
  onSaved,
  onDeleted,
  columns,
  onMoved,
}: {
  card: PipelineCard;
  columnTitle: string;
  onClose: () => void;
  onSaved: (updated: Partial<PipelineCard>) => void;
  onDeleted: () => void;
  columns: PipelineColumn[];
  onMoved: (targetColumnId: string) => void;
}) {
  const [title,       setTitle]       = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [contact,     setContact]     = useState(card.contact_name ?? "");
  const [product,     setProduct]     = useState(card.product_name ?? "");
  const [dueDate,     setDueDate]     = useState(card.due_date ?? "");
  const [saving,      startSaving]    = useTransition();
  const [deleting,    startDeleting]  = useTransition();
  const [moving,      startMoving]    = useTransition();

  function handleSave() {
    if (!title.trim()) return;
    startSaving(async () => {
      await updateCard(card.id, {
        title:        title.trim(),
        description:  description || null,
        contact_name: contact || null,
        product_name: product || null,
        due_date:     dueDate || null,
      });
      onSaved({ title: title.trim(), description: description || null, contact_name: contact || null, product_name: product || null, due_date: dueDate || null });
    });
  }

  function handleDelete() {
    startDeleting(async () => {
      await deleteCard(card.id);
      onDeleted();
    });
  }

  function handleMove(targetColumnId: string) {
    startMoving(async () => {
      await moveCard(card.id, targetColumnId);
      onMoved(targetColumnId);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{columnTitle}</p>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Título *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-green-200)] focus:border-[color:var(--brand-green-400)]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Descrição</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anotações, contexto, próximos passos..."
              className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-[color:var(--brand-green-200)] focus:border-[color:var(--brand-green-400)]"
            />
          </div>

          {/* Contact + Product */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Contato</label>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Nome do contato"
                className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-green-200)] focus:border-[color:var(--brand-green-400)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Produto</label>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Ex: Parafusos M8"
                className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-green-200)] focus:border-[color:var(--brand-green-400)]"
              />
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Prazo</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-green-200)] focus:border-[color:var(--brand-green-400)]"
            />
          </div>

          {/* Move to column */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Mover para coluna</label>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((col) => (
                <button
                  key={col.id}
                  disabled={moving}
                  onClick={() => handleMove(col.id)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs rounded-full border px-3 py-1 transition-colors",
                    col.title === columnTitle
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                      : "bg-white text-slate-700 border-slate-200 hover:border-[color:var(--brand-green-300)] hover:bg-[color:var(--brand-green-50)]"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", colStyle(col.color).dot)} />
                  {col.title}
                  {moving && col.title !== columnTitle && <Loader2 className="w-3 h-3 animate-spin" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Excluir
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="btn-primary text-sm rounded-xl px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export default function PipelineBoard({ initialColumns }: { initialColumns: PipelineColumn[] }) {
  const router = useRouter();

  const [columns, setColumns] = useState<PipelineColumn[]>(initialColumns);

  // Drag state
  const [dragging, setDragging]         = useState<{ cardId: string; fromColumnId: string } | null>(null);
  const [dragOverCol, setDragOverCol]   = useState<string | null>(null);

  // Inline add card
  const [addingTo,    setAddingTo]      = useState<string | null>(null);
  const [newCardText, setNewCardText]   = useState("");
  const [addingCard,  startAddingCard]  = useTransition();

  // Add column
  const [addingCol,   setAddingCol]     = useState(false);
  const [newColTitle, setNewColTitle]   = useState("");
  const [newColColor, setNewColColor]   = useState<string>("slate");
  const [addingColP,  startAddingCol]   = useTransition();

  // Rename column
  const [renamingId,  setRenamingId]    = useState<string | null>(null);
  const [renameTitle, setRenameTitle]   = useState("");
  const [renamingP,   startRenaming]    = useTransition();

  // Delete column
  const [deletingColId, setDeletingColId] = useState<string | null>(null);

  // Card modal
  const [modal, setModal] = useState<{ card: PipelineCard; columnId: string } | null>(null);

  const addInputRef = useRef<HTMLTextAreaElement>(null);
  const colInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingTo) addInputRef.current?.focus();
  }, [addingTo]);

  useEffect(() => {
    if (addingCol) colInputRef.current?.focus();
  }, [addingCol]);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(cardId: string, fromColumnId: string) {
    setDragging({ cardId, fromColumnId });
  }

  function handleDrop(targetColumnId: string) {
    if (!dragging || dragging.fromColumnId === targetColumnId) {
      setDragging(null);
      setDragOverCol(null);
      return;
    }
    const { cardId, fromColumnId } = dragging;
    setDragging(null);
    setDragOverCol(null);

    // Optimistic update
    setColumns(prev => {
      let movedCard: PipelineCard | undefined;
      const next = prev.map(col => {
        if (col.id === fromColumnId) {
          const cards = col.pipeline_cards.filter(c => {
            if (c.id === cardId) { movedCard = c; return false; }
            return true;
          });
          return { ...col, pipeline_cards: cards };
        }
        return col;
      });
      if (!movedCard) return prev;
      return next.map(col => {
        if (col.id !== targetColumnId) return col;
        return { ...col, pipeline_cards: [...col.pipeline_cards, movedCard!] };
      });
    });

    moveCard(cardId, targetColumnId).catch(() => {
      toast.error("Erro ao mover card.");
      router.refresh();
    });
  }

  // ── Add card ───────────────────────────────────────────────────────────────

  function submitAddCard(columnId: string) {
    if (!newCardText.trim()) { setAddingTo(null); return; }
    const title = newCardText.trim();
    setNewCardText("");
    setAddingTo(null);

    // Optimistic
    const tempCard: PipelineCard = {
      id: `temp-${Date.now()}`,
      title,
      description: null, contact_name: null, product_name: null,
      position: 999, due_date: null, created_at: new Date().toISOString(),
      inquiry_id: null, proposal_id: null, origin: "manual",
    };
    setColumns(prev => prev.map(col =>
      col.id === columnId
        ? { ...col, pipeline_cards: [...col.pipeline_cards, tempCard] }
        : col
    ));

    startAddingCard(async () => {
      const result = await addCard(columnId, title);
      if ("error" in result) {
        toast.error(result.error);
        setColumns(prev => prev.map(col =>
          col.id === columnId
            ? { ...col, pipeline_cards: col.pipeline_cards.filter(c => c.id !== tempCard.id) }
            : col
        ));
      } else {
        setColumns(prev => prev.map(col =>
          col.id === columnId
            ? { ...col, pipeline_cards: col.pipeline_cards.map(c => c.id === tempCard.id ? { ...c, id: result.id } : c) }
            : col
        ));
      }
    });
  }

  // ── Add column ─────────────────────────────────────────────────────────────

  function submitAddColumn() {
    if (!newColTitle.trim()) { setAddingCol(false); return; }
    const title = newColTitle.trim();
    const color = newColColor;
    setNewColTitle("");
    setNewColColor("slate");
    setAddingCol(false);

    const tempCol: PipelineColumn = {
      id: `temp-${Date.now()}`, title, position: columns.length, color, pipeline_cards: [],
    };
    setColumns(prev => [...prev, tempCol]);

    startAddingCol(async () => {
      const result = await addColumn(title, color);
      if ("error" in result) {
        toast.error(result.error);
        setColumns(prev => prev.filter(c => c.id !== tempCol.id));
      } else {
        setColumns(prev => prev.map(c => c.id === tempCol.id ? { ...c, id: result.id } : c));
      }
    });
  }

  // ── Rename column ──────────────────────────────────────────────────────────

  function submitRename(columnId: string) {
    if (!renameTitle.trim()) { setRenamingId(null); return; }
    const title = renameTitle.trim();
    setRenamingId(null);
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, title } : c));
    startRenaming(() => renameColumn(columnId, title));
  }

  // ── Delete column ──────────────────────────────────────────────────────────

  async function handleDeleteColumn(columnId: string) {
    setDeletingColId(columnId);
    const result = await deleteColumn(columnId);
    setDeletingColId(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      setColumns(prev => prev.filter(c => c.id !== columnId));
    }
  }

  // ── Card modal handlers ────────────────────────────────────────────────────

  function handleCardSaved(cardId: string, columnId: string, updated: Partial<PipelineCard>) {
    setColumns(prev => prev.map(col =>
      col.id === columnId
        ? { ...col, pipeline_cards: col.pipeline_cards.map(c => c.id === cardId ? { ...c, ...updated } : c) }
        : col
    ));
    setModal(null);
  }

  function handleCardDeleted(cardId: string, columnId: string) {
    setColumns(prev => prev.map(col =>
      col.id === columnId
        ? { ...col, pipeline_cards: col.pipeline_cards.filter(c => c.id !== cardId) }
        : col
    ));
    setModal(null);
  }

  function handleCardMoved(cardId: string, fromColumnId: string, targetColumnId: string) {
    let movedCard: PipelineCard | undefined;
    setColumns(prev => {
      const next = prev.map(col => {
        if (col.id === fromColumnId) {
          const cards = col.pipeline_cards.filter(c => {
            if (c.id === cardId) { movedCard = c; return false; }
            return true;
          });
          return { ...col, pipeline_cards: cards };
        }
        return col;
      });
      if (!movedCard) return prev;
      return next.map(col =>
        col.id === targetColumnId
          ? { ...col, pipeline_cards: [...col.pipeline_cards, movedCard!] }
          : col
      );
    });
    setModal(null);
  }

  // ─────────────────────────────────────────────────────────────────────────

  const modalCol = modal ? columns.find(c => c.id === modal.columnId) : null;

  return (
    <>
      {/* Board */}
      <div
        className="flex gap-4 overflow-x-auto pb-6 flex-1 min-h-0"
        onDragOver={(e) => e.preventDefault()}
      >
        {columns.map((col) => {
          const style  = colStyle(col.color);
          const isDragTarget = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className={cn(
                "w-72 shrink-0 rounded-2xl border border-border bg-slate-50 flex flex-col transition-all self-stretch",
                isDragTarget && `ring-2 ${style.drag}`
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null);
              }}
              onDrop={(e) => { e.preventDefault(); handleDrop(col.id); }}
            >
              {/* Column header */}
              <div className={cn("flex items-center gap-2 px-3 py-3 rounded-t-2xl border-b", style.header)}>
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", style.dot)} />

                {renamingId === col.id ? (
                  <input
                    autoFocus
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")  submitRename(col.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onBlur={() => submitRename(col.id)}
                    className="flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none border-b border-[color:var(--brand-green-400)]"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm font-semibold text-slate-800 truncate cursor-pointer"
                    onDoubleClick={() => { setRenamingId(col.id); setRenameTitle(col.title); }}
                    title="Duplo-clique para renomear"
                  >
                    {col.title}
                  </span>
                )}

                <span className="text-[11px] text-slate-400 font-medium shrink-0">
                  {col.pipeline_cards.length}
                </span>

                {/* Column menu */}
                <div className="relative group/menu shrink-0">
                  <button className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <div className="hidden group-hover/menu:flex absolute right-0 top-6 z-20 flex-col bg-white border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                    <button
                      onClick={() => { setRenamingId(col.id); setRenameTitle(col.title); }}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full text-left"
                    >
                      <Pencil className="w-3 h-3" /> Renomear
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(col.id)}
                      disabled={deletingColId === col.id}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 w-full text-left disabled:opacity-50"
                    >
                      {deletingColId === col.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />}
                      Excluir coluna
                    </button>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {col.pipeline_cards.map(card => (
                  <KanbanCard
                    key={card.id}
                    card={card}
                    isDragging={dragging?.cardId === card.id}
                    onDragStart={() => handleDragStart(card.id, col.id)}
                    onDragEnd={() => { setDragging(null); setDragOverCol(null); }}
                    onClick={() => setModal({ card, columnId: col.id })}
                  />
                ))}

                {/* Inline add card */}
                {addingTo === col.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      ref={addInputRef}
                      rows={2}
                      value={newCardText}
                      onChange={(e) => setNewCardText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAddCard(col.id); }
                        if (e.key === "Escape") { setAddingTo(null); setNewCardText(""); }
                      }}
                      placeholder="Título do card... (Enter para salvar)"
                      className="w-full rounded-xl border border-[color:var(--brand-green-400)] bg-white px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-[color:var(--brand-green-100)]"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => submitAddCard(col.id)}
                        disabled={addingCard}
                        className="btn-primary text-xs rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
                      >
                        {addingCard ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Adicionar
                      </button>
                      <button
                        onClick={() => { setAddingTo(null); setNewCardText(""); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Add card button */}
              {addingTo !== col.id && (
                <button
                  onClick={() => { setAddingTo(col.id); setNewCardText(""); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-colors rounded-b-2xl"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar card
                </button>
              )}
            </div>
          );
        })}

        {/* Add column */}
        {addingCol ? (
          <div className="w-72 shrink-0 rounded-2xl border border-[color:var(--brand-green-300)] bg-white p-3 space-y-3">
            <input
              ref={colInputRef}
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  submitAddColumn();
                if (e.key === "Escape") { setAddingCol(false); setNewColTitle(""); }
              }}
              placeholder="Nome da coluna..."
              className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-green-200)]"
            />
            <div className="flex items-center gap-1.5">
              {AVAILABLE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform",
                    colStyle(c).dot,
                    newColColor === c ? "border-slate-800 scale-110" : "border-transparent"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={submitAddColumn}
                disabled={addingColP || !newColTitle.trim()}
                className="btn-primary text-xs rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
              >
                {addingColP ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Criar
              </button>
              <button
                onClick={() => { setAddingCol(false); setNewColTitle(""); }}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCol(true)}
            className="w-72 shrink-0 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400 hover:border-[color:var(--brand-green-300)] hover:text-slate-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova coluna
          </button>
        )}
      </div>

      {/* Card modal */}
      {modal && modalCol && (
        <CardModal
          card={modal.card}
          columnTitle={modalCol.title}
          columns={columns}
          onClose={() => setModal(null)}
          onSaved={(updated) => handleCardSaved(modal.card.id, modal.columnId, updated)}
          onDeleted={() => handleCardDeleted(modal.card.id, modal.columnId)}
          onMoved={(targetColumnId) => handleCardMoved(modal.card.id, modal.columnId, targetColumnId)}
        />
      )}
    </>
  );
}
