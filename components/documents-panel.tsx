"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Edit2, FileCode, Microscope, Shield, StickyNote, X } from "lucide-react";
import { Document, Task } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

const DOC_TYPE_CONFIG = {
  deliverable: { label: 'Deliverable', icon: FileCode, color: 'text-cyber-red', bgColor: 'bg-cyber-red/10', borderColor: 'border-cyber-red' },
  research: { label: 'Research', icon: Microscope, color: 'text-cyber-cyan', bgColor: 'bg-cyber-cyan/10', borderColor: 'border-cyber-cyan' },
  protocol: { label: 'Protocol', icon: Shield, color: 'text-cyber-yellow', bgColor: 'bg-cyber-yellow/10', borderColor: 'border-cyber-yellow' },
  notes: { label: 'Notes', icon: StickyNote, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500' },
};

interface DocumentsPanelProps {
  isMobile?: boolean;
}

export function DocumentsPanel({ isMobile = false }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'notes' as Document['type'],
    task_id: null as string | null,
  });

  useEffect(() => {
    loadDocuments();
    loadTasks();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('documents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
        loadDocuments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDocuments() {
    try {
      const response = await fetch('/api/documents');
      const { documents: docs } = await response.json();
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks() {
    try {
      const { data } = await supabase.from('tasks').select('*').order('title');
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  async function handleCreate() {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, created_by: 'lucas' }),
      });
      
      if (response.ok) {
        setCreateModalOpen(false);
        resetForm();
        loadDocuments();
      }
    } catch (error) {
      console.error('Error creating document:', error);
    }
  }

  async function handleUpdate() {
    if (!editingDoc) return;
    
    try {
      const response = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingDoc.id, ...formData }),
      });
      
      if (response.ok) {
        setEditingDoc(null);
        resetForm();
        loadDocuments();
      }
    } catch (error) {
      console.error('Error updating document:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return;
    
    try {
      const response = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadDocuments();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  }

  function resetForm() {
    setFormData({ title: '', content: '', type: 'notes', task_id: null });
  }

  function openCreateModal() {
    resetForm();
    setCreateModalOpen(true);
  }

  function openEditModal(doc: Document) {
    setFormData({
      title: doc.title,
      content: doc.content,
      type: doc.type,
      task_id: doc.task_id,
    });
    setEditingDoc(doc);
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-cyber-cyan font-mono text-sm animate-pulse">LOADING DOCUMENTS...</div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-cyber-dark">
        {/* Header */}
        <div className="p-4 border-b border-cyber-red/30 bg-cyber-panel">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white tracking-wider font-cyber">DOCUMENTS</h2>
            <Button
              size="sm"
              onClick={openCreateModal}
              className="bg-cyber-red text-white hover:bg-cyber-red-dark border border-cyber-red h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              NEW
            </Button>
          </div>
          <div className="text-xs text-cyber-red/80 font-mono">
            {documents.length} FILE{documents.length !== 1 ? 'S' : ''} // TOTAL
          </div>
        </div>

        {/* Document List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-cyber-red/30 mx-auto mb-3" />
                <p className="text-sm text-cyber-cyan/60 font-mono">NO DOCUMENTS</p>
                <p className="text-xs text-cyber-cyan/40 font-mono mt-1">CREATE YOUR FIRST FILE</p>
              </div>
            ) : (
              documents.map((doc) => {
                const config = DOC_TYPE_CONFIG[doc.type];
                const Icon = config.icon;
                const linkedTask = tasks.find(t => t.id === doc.task_id);

                return (
                  <Card
                    key={doc.id}
                    className={`${config.bgColor} border-2 ${config.borderColor} hover:border-opacity-100 transition-all cursor-pointer`}
                    onClick={() => setViewingDoc(doc)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Icon className={`h-5 w-5 ${config.color} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">{doc.title}</h3>
                          <Badge className={`mt-1 text-xs ${config.color} bg-transparent border ${config.borderColor}`}>
                            {config.label}
                          </Badge>
                          {linkedTask && (
                            <div className="mt-1 text-xs text-cyber-cyan/70 font-mono flex items-center gap-1">
                              <span className="text-cyber-red">→</span>
                              {linkedTask.title}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-cyber-cyan/50 font-mono">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-cyber-cyan hover:text-cyber-cyan hover:bg-cyber-cyan/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(doc);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-cyber-red hover:text-cyber-red hover:bg-cyber-red/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(doc.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={createModalOpen || !!editingDoc} onOpenChange={(open) => {
        if (!open) {
          setCreateModalOpen(false);
          setEditingDoc(null);
          resetForm();
        }
      }}>
        <DialogContent className="bg-cyber-dark border-2 border-cyber-red max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-cyber tracking-wider">
              {editingDoc ? 'EDIT DOCUMENT' : 'NEW DOCUMENT'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-cyber-cyan font-mono text-xs">TITLE</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-cyber-panel border-cyber-cyan/30 text-white"
                placeholder="Enter document title..."
              />
            </div>

            <div>
              <Label className="text-cyber-cyan font-mono text-xs">TYPE</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-cyber-panel border-cyber-cyan/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cyber-dark border-cyber-cyan">
                  {Object.entries(DOC_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-cyber-panel">
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-cyber-cyan font-mono text-xs">LINKED TASK (OPTIONAL)</Label>
              <Select value={formData.task_id || 'none'} onValueChange={(value) => setFormData({ ...formData, task_id: value === 'none' ? null : value })}>
                <SelectTrigger className="bg-cyber-panel border-cyber-cyan/30 text-white">
                  <SelectValue placeholder="No task linked" />
                </SelectTrigger>
                <SelectContent className="bg-cyber-dark border-cyber-cyan max-h-60">
                  <SelectItem value="none" className="text-white hover:bg-cyber-panel">
                    None
                  </SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id} className="text-white hover:bg-cyber-panel">
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-cyber-cyan font-mono text-xs">CONTENT (MARKDOWN)</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="bg-cyber-panel border-cyber-cyan/30 text-white font-mono min-h-[300px]"
                placeholder="Write your document content in markdown..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingDoc(null);
                resetForm();
              }}
              className="border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/10"
            >
              CANCEL
            </Button>
            <Button
              onClick={editingDoc ? handleUpdate : handleCreate}
              disabled={!formData.title || !formData.content}
              className="bg-cyber-red text-white hover:bg-cyber-red-dark border border-cyber-red"
            >
              {editingDoc ? 'UPDATE' : 'CREATE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Modal */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="bg-cyber-dark border-2 border-cyber-red max-w-3xl max-h-[80vh]">
          {viewingDoc && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-white font-cyber tracking-wider flex items-center gap-2">
                    {(() => {
                      const Icon = DOC_TYPE_CONFIG[viewingDoc.type].icon;
                      return <Icon className={`h-5 w-5 ${DOC_TYPE_CONFIG[viewingDoc.type].color}`} />;
                    })()}
                    {viewingDoc.title}
                  </DialogTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewingDoc(null)}
                    className="text-cyber-red hover:bg-cyber-red/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`text-xs ${DOC_TYPE_CONFIG[viewingDoc.type].color} bg-transparent border ${DOC_TYPE_CONFIG[viewingDoc.type].borderColor}`}>
                    {DOC_TYPE_CONFIG[viewingDoc.type].label}
                  </Badge>
                  <span className="text-xs text-cyber-cyan/50 font-mono">
                    {new Date(viewingDoc.created_at).toLocaleString()}
                  </span>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                <div className="p-4 bg-cyber-panel border border-cyber-cyan/20 rounded">
                  <pre className="text-sm text-white font-mono whitespace-pre-wrap">{viewingDoc.content}</pre>
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewingDoc(null);
                    openEditModal(viewingDoc);
                  }}
                  className="border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/10"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  EDIT
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
