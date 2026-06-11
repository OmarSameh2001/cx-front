"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { FormSection } from "@/dto/form/form";
import type { FormField } from "@/dto/form/form-field";
import FieldCard from "./field-card";

interface Props {
  section: FormSection;
  fields: FormField[];
  isExam: boolean;
  activeFieldId: string | null;
  onUpdateSection: (patch: Partial<FormSection>) => void;
  onDeleteSection: () => void;
  onAddField: () => void;
  onUpdateField: (fieldId: string, patch: Partial<FormField>) => void;
  onDeleteField: (fieldId: string) => void;
  onDuplicateField: (fieldId: string) => void;
  onFocusField: (fieldId: string | null) => void;
  onReorderFields: (reorderedFields: FormField[]) => void;
}

export default function SectionCard({
  section,
  fields,
  isExam,
  activeFieldId,
  onUpdateSection,
  onDeleteSection,
  onAddField,
  onUpdateField,
  onDeleteField,
  onDuplicateField,
  onFocusField,
  onReorderFields,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `section-${section.id}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(fields, oldIndex, newIndex).map((f, i) => ({
      ...f,
      order: i,
    }));
    onReorderFields(reordered);
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-3">
      {/* Section header card */}
      <div className="relative rounded-lg bg-card border border-border shadow-sm">
        {/* Section drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag section to reorder"
          className="absolute top-1 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="h-4 w-4 rotate-90" />
        </button>

        <div className="p-5 pt-7 flex flex-col gap-3">
          <div className="flex items-start gap-3 flex-col md:flex-row">
            <div className="flex-1 flex flex-col gap-2">
              <input
                type="text"
                value={section.title}
                onChange={(e) => onUpdateSection({ title: e.target.value })}
                placeholder="Section title"
                className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-transparent border-b border-transparent focus:border-primary outline-none px-3 py-2 text-base font-medium text-foreground rounded-t-md transition"
              />
              <input
                type="text"
                value={section.description ?? ""}
                onChange={(e) =>
                  onUpdateSection({
                    description: e.target.value || null,
                  })
                }
                placeholder="Section description (optional)"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none px-3 py-1 text-xs text-muted-foreground"
              />
            </div>

            {isExam && (
              <label className="flex flex-col gap-1 min-w-[140px]">
                <span className="text-xs text-muted-foreground">
                  Section weight
                </span>
                <input
                  type="number"
                  step="1"
                  min={1}
                  value={section.score_weight}
                  onChange={(e) =>
                    onUpdateSection({
                      score_weight: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
            )}

            <button
              type="button"
              onClick={onDeleteSection}
              aria-label="Delete section"
              className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted/60 mt-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Fields within this section */}
      <div className="pl-4 flex flex-col gap-3 border-l-2 border-border ml-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleFieldDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                onChange={(patch) => onUpdateField(field.id, patch)}
                onDelete={() => onDeleteField(field.id)}
                onDuplicate={() => onDuplicateField(field.id)}
                isActive={activeFieldId === field.id}
                onFocus={() => onFocusField(field.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={onAddField}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary hover:bg-muted/40 text-sm transition"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>
    </div>
  );
}
