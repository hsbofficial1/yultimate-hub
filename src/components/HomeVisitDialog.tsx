import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const homeVisitSchema = z.object({
  visit_date: z.date(),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  purpose: z.enum(['initial_visit', 'follow_up', 'parent_meeting', 'welfare_check', 'other']),
  observations: z.string().optional(),
  notes: z.string().max(1000).optional(),
  action_items: z.string().max(500).optional(),
});

type HomeVisitFormData = z.infer<typeof homeVisitSchema>;

interface HomeVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  visitId?: string;
  onSuccess?: () => void;
}

interface PhotoFile {
  file: File;
  preview: string;
  caption?: string;
}

export const HomeVisitDialog = ({
  open,
  onOpenChange,
  childId,
  visitId,
  onSuccess,
}: HomeVisitDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<
    Array<{ id: string; photo_url: string; caption: string | null }>
  >([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<HomeVisitFormData>({
    resolver: zodResolver(homeVisitSchema),
    defaultValues: {
      visit_date: new Date(),
      duration_minutes: undefined,
      purpose: 'follow_up',
      observations: '',
      notes: '',
      action_items: '',
    },
  });

  useEffect(() => {
    if (open && visitId) {
      fetchVisitData();
    } else if (open && !visitId) {
      form.reset({
        visit_date: new Date(),
        duration_minutes: undefined,
        purpose: 'follow_up',
        observations: '',
        notes: '',
        action_items: '',
      });
      setPhotos([]);
      setExistingPhotos([]);
    }
  }, [open, visitId]);

  const fetchVisitData = async () => {
    if (!visitId) return;

    try {
      setLoading(true);
      const { data: visit, error } = await supabase
        .from('home_visits')
        .select('*')
        .eq('id', visitId)
        .single();

      if (error) throw error;

      if (visit) {
        form.reset({
          visit_date: new Date(visit.visit_date),
          duration_minutes: visit.duration_minutes || undefined,
          purpose: visit.purpose as any,
          observations: visit.observations || '',
          notes: visit.notes || '',
          action_items: visit.action_items || '',
        });

        // Fetch existing photos
        const { data: photosData } = await supabase
          .from('home_visit_photos')
          .select('*')
          .eq('visit_id', visitId);

        setExistingPhotos(photosData || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading visit',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPhotos: PhotoFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const removeExistingPhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('home_visit_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      setExistingPhotos(existingPhotos.filter((p) => p.id !== photoId));
      toast({
        title: 'Photo removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error removing photo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const uploadPhotos = async (visitId: string) => {
    if (photos.length === 0) return;

    try {
      setUploading(true);
      for (const photo of photos) {
        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${visitId}-${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `home-visits/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('home-visit-photos')
          .upload(filePath, photo.file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('home-visit-photos')
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from('home_visit_photos')
          .insert({
            visit_id: visitId,
            photo_url: publicUrl,
            caption: photo.caption || null,
          });

        if (insertError) throw insertError;
      }

      // Clean up preview URLs
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    } catch (error: any) {
      throw error;
    }
  };

  const onSubmit = async (data: HomeVisitFormData) => {
    try {
      setLoading(true);

      const visitData: any = {
        child_id: childId,
        visit_date: format(data.visit_date, 'yyyy-MM-dd'),
        duration_minutes: data.duration_minutes || null,
        purpose: data.purpose,
        observations: data.observations || null,
        notes: data.notes || null,
        action_items: data.action_items || null,
        visited_by: user?.id || null,
      };

      let savedVisitId: string;

      if (visitId) {
        const { error } = await supabase
          .from('home_visits')
          .update(visitData)
          .eq('id', visitId);

        if (error) throw error;
        savedVisitId = visitId;
      } else {
        const { data: newVisit, error } = await supabase
          .from('home_visits')
          .insert(visitData)
          .select('id')
          .single();

        if (error) throw error;
        savedVisitId = newVisit.id;
      }

      // Upload photos
      if (photos.length > 0) {
        await uploadPhotos(savedVisitId);
      }

      toast({
        title: visitId ? 'Visit updated' : 'Visit logged',
        description: 'Home visit has been saved successfully.',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: visitId ? 'Error updating visit' : 'Error logging visit',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{visitId ? 'Edit Home Visit' : 'Log Home Visit'}</DialogTitle>
          <DialogDescription>
            {visitId ? 'Update home visit details' : 'Record a new home visit'}
          </DialogDescription>
        </DialogHeader>

        {loading && visitId ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="visit_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Visit Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="60"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="initial_visit">Initial Visit</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="parent_meeting">Parent Meeting</SelectItem>
                        <SelectItem value="welfare_check">Welfare Check</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observations</FormLabel>
                    <FormControl>
                      <div className="border rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Record your observations from the visit..."
                          modules={{
                            toolbar: [
                              [{ header: [1, 2, false] }],
                              ['bold', 'italic', 'underline'],
                              [{ list: 'ordered' }, { list: 'bullet' }],
                              ['link'],
                              ['clean'],
                            ],
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="action_items"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Items / Next Steps</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Action items or next steps to follow up on..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photo Upload Section */}
              <div className="space-y-2">
                <FormLabel>Photos (Optional)</FormLabel>
                <div className="flex flex-wrap gap-4">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || 'Visit photo'}
                        className="h-24 w-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeExistingPhoto(photo.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.preview}
                        alt="Preview"
                        className="h-24 w-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <div className="h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || uploading}>
                  {loading || uploading
                    ? 'Saving...'
                    : visitId
                      ? 'Update Visit'
                      : 'Log Visit'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};




