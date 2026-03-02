import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StickyNote, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NOTE_COLORS = [
  { value: 'default', label: 'Default', bg: 'bg-card', border: 'border-border' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { value: 'green', label: 'Green', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'blue', label: 'Blue', bg: 'bg-sky-50', border: 'border-sky-200' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-50', border: 'border-pink-200' },
];

const getColorClasses = (color) => {
  const found = NOTE_COLORS.find(c => c.value === color);
  return found || NOTE_COLORS[0];
};

const emptyForm = { title: '', content: '', color: 'default' };

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchNotes = async () => {
    try {
      const res = await axios.get(`${API}/notes`);
      setNotes(res.data);
    } catch (e) {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, []);

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.content || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (note) => {
    setEditing(note);
    setForm({
      title: note.title || '',
      content: note.content || '',
      color: note.color || 'default'
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/notes/${editing.id}`, form);
        toast.success('Note updated');
      } else {
        await axios.post(`${API}/notes`, form);
        toast.success('Note created');
      }
      setDialogOpen(false);
      fetchNotes();
    } catch (e) {
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await axios.delete(`${API}/notes/${id}`);
      toast.success('Note deleted');
      fetchNotes();
    } catch (e) {
      toast.error('Failed to delete note');
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">Keep track of important information</p>
        </div>
        <Button onClick={openCreate} data-testid="notes-create-button">
          <Plus className="h-4 w-4 mr-2" /> Add Note
        </Button>
      </div>

      {/* Search */}
      {notes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="notes-search-input"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <StickyNote className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No notes yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add your first note to get started</p>
            <Button className="mt-4" onClick={openCreate}>Add Note</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No notes match your search
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(note => {
            const colors = getColorClasses(note.color);
            return (
              <Card
                key={note.id}
                className={`${colors.bg} ${colors.border} hover:shadow-md transition-shadow cursor-pointer group`}
                onClick={() => openEdit(note)}
                data-testid="notes-card"
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-heading text-base font-semibold tracking-tight line-clamp-1 flex-1 mr-2">
                      {note.title}
                    </h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(note)} data-testid="note-edit-button">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(note.id)} data-testid="note-delete-button">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {note.content ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{note.content}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic">No content</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-3">
                    {formatDate(note.updated_at)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Note' : 'Add Note'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Note title"
                data-testid="note-title-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Write your note here..."
                className="min-h-[180px]"
                data-testid="note-content-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${c.bg} ${
                      form.color === c.value ? 'ring-2 ring-primary ring-offset-2 border-primary' : c.border
                    }`}
                    title={c.label}
                    data-testid={`note-color-${c.value}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="note-save-button">
              {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
