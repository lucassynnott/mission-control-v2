"use client";

import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Target, AlertTriangle, CheckCircle, Clock, Inbox } from "lucide-react";
import { supabase, Task } from "@/lib/supabase";

// Cyberpunk column styling
const COLUMNS = [
  { id: "backlog", label: "INBOX", color: "bg-cyber-panel", borderColor: "border-cyber-cyan/30", icon: Inbox },
  { id: "todo", label: "ASSIGNED", color: "bg-cyber-cyan/10", borderColor: "border-cyber-cyan", icon: Target },
  { id: "in_progress", label: "IN PROGRESS", color: "bg-cyber-yellow/10", borderColor: "border-cyber-yellow", icon: Clock },
  { id: "review", label: "REVIEW", color: "bg-purple-500/10", borderColor: "border-purple-500", icon: AlertTriangle },
  { id: "done", label: "DONE", color: "bg-cyber-red/10", borderColor: "border-cyber-red", icon: CheckCircle },
];

const PRIORITY_COLORS = {
  high: "bg-cyber-red/20 text-cyber-red border-cyber-red/50",
  medium: "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/50",
  low: "bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50",
};

// Cyberpunk task card
function SortableTask({ task, onClick }: { task: Task; onClick: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className="relative bg-cyber-panel border border-cyber-red/30 hover:border-cyber-red/60 cursor-grab active:cursor-grabbing group transition-all"
        onClick={() => onClick(task)}
      >
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-cyber-red/50 group-hover:border-cyber-red" />
        <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-cyber-red/50 group-hover:border-cyber-red" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-cyber-red/50 group-hover:border-cyber-red" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-cyber-red/50 group-hover:border-cyber-red" />
        
        <CardContent className="p-3">
          <h4 className="text-sm font-bold text-white line-clamp-2 tracking-wide group-hover:text-cyber-cyan transition-colors">
            {task.title}
          </h4>
          <p className="text-xs text-cyber-cyan/50 mt-1 line-clamp-2 font-mono">
            {task.description || 'NO_DESCRIPTION'}
          </p>
          <div className="flex items-center justify-between mt-3">
            <Badge
              variant="outline"
              className={`text-[10px] h-5 px-1.5 font-mono uppercase ${PRIORITY_COLORS[task.priority]}`}
            >
              {task.priority}
            </Badge>
            {task.assignee && (
              <span className="text-[10px] text-cyber-cyan/60 font-mono">
                @{task.assignee.toUpperCase()}
              </span>
            )}
          </div>
        </CardContent>
      </div>
    </div>
  );
}

interface TaskFormData {
  title: string;
  description: string;
  column_status: Task["column_status"];
  priority: Task["priority"];
  assignee: string;
}

interface KanbanBoardProps {
  isMobile?: boolean;
}

export function KanbanBoard({ isMobile }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeColumn, setActiveColumn] = useState("backlog");
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    column_status: "backlog",
    priority: "medium",
    assignee: "",
  });

  useEffect(() => {
    fetchTasks();

    const subscription = supabase
      .channel("tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTasks((prev) => [...prev, payload.new as Task]);
        } else if (payload.eventType === "UPDATE") {
          setTasks((prev) => prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t)));
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  async function fetchTasks() {
    const { data, error } = await supabase.from("tasks").select("*").order("position");
    if (error) console.error("Error fetching tasks:", error);
    else setTasks(data || []);
    setLoading(false);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    const overTask = tasks.find((t) => t.id === over.id);
    if (!activeTask || !overTask) return;

    if (activeTask.column_status !== overTask.column_status) {
      const newStatus = overTask.column_status;
      setTasks((prev) => prev.map((t) => (t.id === active.id ? { ...t, column_status: newStatus } : t)));
      await supabase.from("tasks").update({ column_status: newStatus, updated_at: new Date().toISOString() }).eq("id", active.id);
    } else {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    const newTask = {
      title: formData.title,
      description: formData.description,
      column_status: formData.column_status,
      priority: formData.priority,
      assignee: formData.assignee || null,
      project_tag: "Mission Control",
      position: tasks.length,
    };

    const { error } = await supabase.from("tasks").insert(newTask).select();
    if (error) console.error("Error creating task:", error);
    else {
      setShowCreateDialog(false);
      setFormData({ title: "", description: "", column_status: "backlog", priority: "medium", assignee: "" });
    }
  }

  async function handleUpdateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;

    const { error } = await supabase.from("tasks").update({
      title: formData.title,
      description: formData.description,
      column_status: formData.column_status,
      priority: formData.priority,
      assignee: formData.assignee || null,
      updated_at: new Date().toISOString(),
    }).eq("id", selectedTask.id);

    if (!error) setSelectedTask(null);
  }

  function openTaskDialog(task: Task) {
    setFormData({
      title: task.title,
      description: task.description,
      column_status: task.column_status,
      priority: task.priority,
      assignee: task.assignee || "",
    });
    setSelectedTask(task);
  }

  function openCreateDialog() {
    setFormData({ title: "", description: "", column_status: "backlog", priority: "medium", assignee: "" });
    setShowCreateDialog(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-cyber-cyan/40 font-mono">
        <span className="animate-pulse">INITIALIZING_TASK_MATRIX...</span>
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    const column = COLUMNS.find(c => c.id === activeColumn)!;
    const columnTasks = tasks.filter(t => t.column_status === activeColumn);

    return (
      <div className="flex flex-col bg-cyber-dark h-full overflow-hidden">
        {/* Column Selector */}
        <div className="flex overflow-x-auto gap-1 p-2 border-b border-cyber-red/30 bg-cyber-panel">
          {COLUMNS.map((col) => {
            const Icon = col.icon;
            const count = tasks.filter(t => t.column_status === col.id).length;
            return (
              <Button
                key={col.id}
                variant={activeColumn === col.id ? 'default' : 'ghost'}
                size="sm"
                className={`flex-shrink-0 text-xs rounded-none ${
                  activeColumn === col.id 
                    ? 'bg-cyber-red text-white border-b-2 border-cyber-red' 
                    : 'text-cyber-cyan/60 hover:text-cyber-cyan border-b-2 border-transparent'
                }`}
                onClick={() => setActiveColumn(col.id)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {col.label}
                <span className="ml-1 text-[10px] opacity-60">({count})</span>
              </Button>
            );
          })}
          <Button size="sm" variant="ghost" className="flex-shrink-0 h-8 w-8 p-0 text-cyber-red" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Single Column */}
        <div className="flex-1 overflow-auto p-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {columnTasks.map((task) => <SortableTask key={task.id} task={task} onClick={openTaskDialog} />)}
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-cyber-cyan/30 font-mono text-xs">
                    NO_TASKS_IN_{column.label.toUpperCase().replace(/\s+/g, '_')}
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {renderDialogs()}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="flex flex-col bg-cyber-dark overflow-hidden h-full">
      {/* Header */}
      <div className="p-3 border-b border-cyber-red/30 bg-cyber-panel flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-cyber-red" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-wider">MISSION BOARD</h2>
            <p className="text-[10px] text-cyber-cyan/60 font-mono">{tasks.length} OBJECTIVES TRACKED</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-cyber-red hover:bg-cyber-red/10" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((task) => task.column_status === column.id);
            const ColumnIcon = column.icon;

            return (
              <div key={column.id} className="w-72 flex flex-col">
                {/* Column Header */}
                <div className={`p-3 border ${column.borderColor} ${column.color} mb-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ColumnIcon className="h-4 w-4 text-cyber-cyan" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        {column.label}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-cyber-cyan/60">{columnTasks.length}</span>
                  </div>
                </div>

                {/* Tasks */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex-1 space-y-2 min-h-[100px]">
                      {columnTasks.map((task) => <SortableTask key={task.id} task={task} onClick={openTaskDialog} />)}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}
        </div>
      </div>

      {renderDialogs()}
    </div>
  );

  function renderDialogs() {
    return (
      <>
        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-cyber-dark border-2 border-cyber-red/50 max-w-[calc(100vw-2rem)] sm:max-w-lg p-0">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-red to-transparent" />
            <DialogHeader className="p-6 pb-0 bg-cyber-panel border-b border-cyber-red/30">
              <DialogTitle className="text-lg font-bold text-white tracking-wider uppercase flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyber-red" />
                New Mission
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4 p-6">
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Mission Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none"
                  required
                />
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Briefing</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Status</Label>
                  <Select value={formData.column_status} onValueChange={(v) => setFormData({ ...formData, column_status: v as Task["column_status"] })}>
                    <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none">
                      {COLUMNS.map((col) => <SelectItem key={col.id} value={col.id} className="text-white">{col.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as Task["priority"] })}>
                    <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none">
                      <SelectItem value="low" className="text-cyber-cyan">LOW</SelectItem>
                      <SelectItem value="medium" className="text-cyber-yellow">MEDIUM</SelectItem>
                      <SelectItem value="high" className="text-cyber-red">HIGH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Agent</Label>
                <Input
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  placeholder="@agent-name"
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none"
                />
              </div>
              <Button type="submit" className="w-full bg-cyber-red hover:bg-cyber-red-dark text-white rounded-none font-bold tracking-wider">
                DEPLOY MISSION
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="bg-cyber-dark border-2 border-cyber-red/50 max-w-[calc(100vw-2rem)] sm:max-w-lg p-0">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-red to-transparent" />
            <DialogHeader className="p-6 pb-0 bg-cyber-panel border-b border-cyber-red/30">
              <DialogTitle className="text-lg font-bold text-white tracking-wider uppercase">
                Edit Mission
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTask} className="space-y-4 p-6">
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Mission Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none"
                  required
                />
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Briefing</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Status</Label>
                  <Select value={formData.column_status} onValueChange={(v) => setFormData({ ...formData, column_status: v as Task["column_status"] })}>
                    <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none">
                      {COLUMNS.map((col) => <SelectItem key={col.id} value={col.id} className="text-white">{col.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as Task["priority"] })}>
                    <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none">
                      <SelectItem value="low" className="text-cyber-cyan">LOW</SelectItem>
                      <SelectItem value="medium" className="text-cyber-yellow">MEDIUM</SelectItem>
                      <SelectItem value="high" className="text-cyber-red">HIGH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Agent</Label>
                <Input
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  placeholder="@agent-name"
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-cyber-red hover:bg-cyber-red-dark text-white rounded-none font-bold tracking-wider">
                  UPDATE
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-cyber-red/50 text-cyber-red hover:bg-cyber-red/10 rounded-none"
                  onClick={async () => {
                    if (!selectedTask) return;
                    await supabase.from("tasks").delete().eq("id", selectedTask.id);
                    setSelectedTask(null);
                  }}
                >
                  DELETE
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
