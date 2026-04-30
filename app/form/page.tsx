"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import FieldCard from "@/components/form/field-card";
import { createField, type FormField } from "@/dto/form/form-field";

export default function FormBuilderPage() {
  const [fields, setFields] = useState<FormField[]>(() => [createField(0)]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const deleteField = (id: string) => {
    setFields((prev) =>
      prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i }))
    );
  };

  const duplicateField = (id: string) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const clone: FormField = {
        ...prev[idx],
        id: crypto.randomUUID(),
        options: prev[idx].options ? [...prev[idx].options!] : undefined,
      };
      const next = [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  };

  const addField = () => {
    setFields((prev) => {
      const next = [...prev, createField(prev.length)];
      setActiveId(next[next.length - 1].id);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((f, i) => ({
        ...f,
        order: i,
      }));
    });
  };

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-4">
        <header className="rounded-lg bg-card text-card-foreground border border-border border-t-8 border-t-primary shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Untitled form
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Form description</p>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-4">
              {fields.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  isActive={activeId === field.id}
                  onFocus={() => setActiveId(field.id)}
                  onChange={(patch) => updateField(field.id, patch)}
                  onDelete={() => deleteField(field.id)}
                  onDuplicate={() => duplicateField(field.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={addField}
          className="self-center mt-2 flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 shadow-sm text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>
    </div>
  );
}
