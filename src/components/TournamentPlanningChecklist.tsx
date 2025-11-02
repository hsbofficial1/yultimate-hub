import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  AlertCircle,
  Calendar,
  User,
  Edit2,
  Trash2,
  Filter,
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ChecklistItem {
  id: string;
  tournament_id: string;
  category: string;
  task_name: string;
  description: string | null;
  vertical: string | null;
  quantity: string | null;
  poc_name: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TournamentPlanningChecklistProps {
  tournamentId: string;
  canManage: boolean;
}

export const TournamentPlanningChecklist = ({ tournamentId, canManage }: TournamentPlanningChecklistProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    quantity: '',
    poc_name: '',
    category: 'pre_tournament',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchChecklistItems();
  }, [tournamentId]);

  const fetchChecklistItems = async () => {
    try {
      setLoading(true);
      
      if (!tournamentId) {
        console.error('No tournament ID provided');
        toast({
          title: 'Error',
          description: 'Tournament ID is missing',
          variant: 'destructive',
        });
        return;
      }

      console.log('Fetching checklist items for tournament:', tournamentId);
      
      const { data, error } = await supabase
        .from('tournament_checklists')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching checklist items:', error);
        throw error;
      }

      console.log('Fetched checklist items:', data?.length || 0);
      setItems(data || []);
      
      if (data && data.length === 0) {
        console.log('No checklist items found for tournament:', tournamentId);
      }
    } catch (error: any) {
      console.error('Failed to load checklist items:', error);
      toast({
        title: 'Error loading checklist',
        description: error?.message || 'Failed to load checklist items. You may not have permission to view this tournament\'s checklist.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: ChecklistItem) => {
    try {
      const newStatus = item.status === 'completed' ? 'pending' : 'completed';
      const updateData: any = { status: newStatus };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      const { error } = await supabase
        .from('tournament_checklists')
        .update(updateData)
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Task marked as ${newStatus}`,
      });

      fetchChecklistItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.task_name.trim()) {
      toast({
        title: 'Validation error',
        description: 'Task name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (selectedItem) {
        // Update existing item
        const { error } = await supabase
          .from('tournament_checklists')
          .update({
            task_name: formData.task_name,
            description: formData.description || null,
            quantity: formData.quantity || null,
            poc_name: formData.poc_name || null,
            category: formData.category,
            priority: formData.priority,
            status: formData.status,
            due_date: formData.due_date || null,
            notes: formData.notes || null,
          })
          .eq('id', selectedItem.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Checklist item updated',
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('tournament_checklists')
          .insert({
            tournament_id: tournamentId,
            task_name: formData.task_name,
            description: formData.description || null,
            quantity: formData.quantity || null,
            poc_name: formData.poc_name || null,
            category: formData.category,
            priority: formData.priority,
            status: formData.status,
            due_date: formData.due_date || null,
            notes: formData.notes || null,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Checklist item added',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchChecklistItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      setDeleteLoading(true);
      const { error } = await supabase
        .from('tournament_checklists')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Checklist item deleted',
      });

      setDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchChecklistItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditDialog = (item: ChecklistItem) => {
    setSelectedItem(item);
    setFormData({
      task_name: item.task_name,
      description: item.description || '',
      quantity: item.quantity || '',
      poc_name: item.poc_name || '',
      category: item.category,
      priority: item.priority,
      status: item.status,
      due_date: item.due_date || '',
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      task_name: '',
      description: '',
      quantity: '',
      poc_name: '',
      category: 'pre_tournament',
      priority: 'medium',
      status: 'pending',
      due_date: '',
      notes: '',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      pre_registration: 'Pre-Registration',
      registration: 'Registration',
      pre_tournament: 'Pre-Tournament',
      during_tournament: 'During Tournament',
      post_tournament: 'Post-Tournament',
      ceremony: 'Ceremony',
      logistics: 'Logistics',
      rules: 'Rules',
      seeding: 'Seeding',
      tournament: 'Tournament',
      ops: 'Operations',
      social_media: 'Social Media',
      accounts: 'Accounts',
    };
    return labels[category] || category;
  };

  const filteredItems = items.filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    if (searchQuery && !item.task_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const groupedByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const categories = ['pre_registration', 'registration', 'pre_tournament', 'during_tournament', 'post_tournament', 'ceremony', 'logistics', 'rules', 'seeding', 'tournament', 'ops', 'social_media', 'accounts'];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading checklist...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Planning Checklist</h3>
          <p className="text-muted-foreground">
            {filteredItems.length} task{filteredItems.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Checklist Items */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                {getCategoryLabel(category)} ({categoryItems.length})
              </h4>
              {categoryItems.map((item) => (
                <Card key={item.id} className={item.status === 'completed' ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      {canManage && (
                        <div className="pt-1">
                          <Checkbox
                            checked={item.status === 'completed'}
                            onCheckedChange={() => handleToggleStatus(item)}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <h5 className={`font-medium ${item.status === 'completed' ? 'line-through' : ''}`}>
                            {item.task_name}
                          </h5>
                          <div className="flex gap-1 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              <span className={`w-2 h-2 rounded-full mr-1 ${getPriorityColor(item.priority)}`} />
                              {item.priority}
                            </Badge>
                            <Badge variant={item.status === 'completed' ? 'default' : 'outline'}>
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                        {(item.description || item.quantity || item.poc_name) && (
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            {item.description && <p>{item.description}</p>}
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.quantity && <Badge variant="outline" className="text-xs">Qty: {item.quantity}</Badge>}
                              {item.poc_name && <Badge variant="outline" className="text-xs">POC: {item.poc_name}</Badge>}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                          {item.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(item.due_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          {item.completed_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed {format(parseISO(item.completed_at), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(item)}
                            className="h-8 w-8"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedItem(item);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            <DialogDescription>
              {selectedItem ? 'Update task details below' : 'Create a new checklist item'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Task Name *</label>
              <Input
                value={formData.task_name}
                onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add detailed description"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Quantity</label>
              <Input
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g., 20kg, 5"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">POC (Person of Contact)</label>
              <Input
                value={formData.poc_name}
                onChange={(e) => setFormData({ ...formData, poc_name: e.target.value })}
                placeholder="e.g., Cyril, Lax"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

