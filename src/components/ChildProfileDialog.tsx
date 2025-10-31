import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X, User, Phone, MessageCircle, School, Heart, History } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AttendanceHistoryTimeline } from './AttendanceHistoryTimeline';
import { ChildBadges } from './ChildBadges';
import { HomeVisitTimeline } from './HomeVisitTimeline';
import { LSASProgressChart } from './LSASProgressChart';

const childSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  age: z.number().min(5, 'Age must be at least 5').max(18, 'Age must be under 18'),
  gender: z.enum(['male', 'female', 'other']),
  school: z.string().max(100).optional(),
  community: z.string().max(100).optional(),
  parent_name: z.string().min(2, 'Parent name is required').max(100),
  parent_phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  parent_whatsapp: z.string().max(15).optional(),
  medical_notes: z.string().max(500).optional(),
  join_date: z.date(),
  active: z.boolean(),
});

type ChildFormData = z.infer<typeof childSchema>;

interface ChildProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId?: string;
  onSuccess?: () => void;
}

interface ChildData extends ChildFormData {
  id: string;
  photo_url: string | null;
  created_at: string;
  programs?: Array<{
    id: string;
    program_id: string | null;
    program_type: string | null;
    enrollment_date: string;
    status: string;
    program?: {
      id: string;
      name: string;
      program_type: string;
    } | null;
  }>;
  transfer_history?: Array<{
    id: string;
    from_program_type: string | null;
    to_program_type: string | null;
    transfer_date: string;
    reason: string | null;
    from_program?: { name: string } | null;
    to_program?: { name: string } | null;
  }>;
}

export const ChildProfileDialog = ({ open, onOpenChange, childId, onSuccess }: ChildProfileDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [childData, setChildData] = useState<ChildData | null>(null);
  const { toast } = useToast();

  const form = useForm<ChildFormData>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: '',
      age: 10,
      gender: 'male',
      school: '',
      community: '',
      parent_name: '',
      parent_phone: '',
      parent_whatsapp: '',
      medical_notes: '',
      join_date: new Date(),
      active: true,
    },
  });

  useEffect(() => {
    if (open && childId) {
      fetchChildData();
    } else if (open && !childId) {
      form.reset({
        name: '',
        age: 10,
        gender: 'male',
        school: '',
        community: '',
        parent_name: '',
        parent_phone: '',
        parent_whatsapp: '',
        medical_notes: '',
        join_date: new Date(),
        active: true,
      });
      setChildData(null);
    }
  }, [open, childId]);

  const fetchChildData = async () => {
    if (!childId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('children')
        .select(`
          *,
          child_program_enrollments (
            id,
            program_id,
            program_type,
            enrollment_date,
            status,
            program:programs (
              id,
              name,
              program_type
            )
          ),
          child_transfer_history (
            id,
            from_program_type,
            to_program_type,
            transfer_date,
            reason,
            from_program:programs!child_transfer_history_from_program_id_fkey (
              name
            ),
            to_program:programs!child_transfer_history_to_program_id_fkey (
              name
            )
          )
        `)
        .eq('id', childId)
        .single();

      if (error) throw error;

      if (data) {
        setChildData(data as ChildData);
        form.reset({
          name: data.name,
          age: data.age,
          gender: data.gender as 'male' | 'female' | 'other',
          school: data.school || '',
          community: data.community || '',
          parent_name: data.parent_name,
          parent_phone: data.parent_phone,
          parent_whatsapp: data.parent_whatsapp || '',
          medical_notes: data.medical_notes || '',
          join_date: new Date(data.join_date),
          active: data.active,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error loading child data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !childId) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${childId}-${Math.random()}.${fileExt}`;
      const filePath = `child-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('child-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('child-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('children')
        .update({ photo_url: publicUrl })
        .eq('id', childId);

      if (updateError) throw updateError;

      setChildData((prev) => prev ? { ...prev, photo_url: publicUrl } : null);
      toast({
        title: 'Photo uploaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error uploading photo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ChildFormData) => {
    try {
      setLoading(true);

      const updateData: any = {
        name: data.name,
        age: data.age,
        gender: data.gender,
        school: data.school || null,
        community: data.community || null,
        parent_name: data.parent_name,
        parent_phone: data.parent_phone,
        parent_whatsapp: data.parent_whatsapp || null,
        medical_notes: data.medical_notes || null,
        join_date: format(data.join_date, 'yyyy-MM-dd'),
        active: data.active,
      };

      if (childId) {
        const { error } = await supabase
          .from('children')
          .update(updateData)
          .eq('id', childId);

        if (error) throw error;

        toast({
          title: 'Child profile updated',
          description: `${data.name}'s profile has been updated.`,
        });
      } else {
        const { error } = await supabase
          .from('children')
          .insert(updateData);

        if (error) throw error;

        toast({
          title: 'Child added successfully',
          description: `${data.name} has been enrolled in the program.`,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: childId ? 'Error updating child' : 'Error adding child',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{childId ? 'Edit Child Profile' : 'Add New Child'}</DialogTitle>
          <DialogDescription>
            {childId ? 'Update child profile information' : 'Enroll a child in the coaching program'}
          </DialogDescription>
        </DialogHeader>

        {loading && !childData ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="badges">Badges</TabsTrigger>
              <TabsTrigger value="visits">Home Visits</TabsTrigger>
              <TabsTrigger value="assessments">LSAS</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Photo Upload */}
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={childData?.photo_url || ''} alt={form.watch('name')} />
                      <AvatarFallback>
                        {form.watch('name')?.charAt(0)?.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Profile Photo</p>
                      {childId && (
                        <div className="flex gap-2">
                          <label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                              disabled={uploading}
                            />
                            <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                              <span>
                                <Upload className="h-4 w-4 mr-2" />
                                {uploading ? 'Uploading...' : 'Upload Photo'}
                              </span>
                            </Button>
                          </label>
                          {childData?.photo_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                // Remove photo logic
                                const { error } = await supabase
                                  .from('children')
                                  .update({ photo_url: null })
                                  .eq('id', childId);
                                if (!error) {
                                  setChildData((prev) => prev ? { ...prev, photo_url: null } : null);
                                }
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="school"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC School" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="community"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Community (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="North Mumbai" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Parent Info */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Parent/Guardian Information
                    </h3>
                    <FormField
                      control={form.control}
                      name="parent_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent/Guardian Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="parent_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+91 9876543210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="parent_whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="+91 9876543210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Medical & Other Info */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Medical Information
                    </h3>
                    <FormField
                      control={form.control}
                      name="medical_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Notes / Allergies (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any medical conditions, allergies, or special requirements..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Join Date & Status */}
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <FormField
                      control={form.control}
                      name="join_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Join Date</FormLabel>
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
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-end">
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <FormLabel className="!mt-0">Active Status</FormLabel>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : childId ? 'Update Profile' : 'Add Child'}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="badges" className="space-y-4">
              {childId && (
                <ChildBadges childId={childId} showStreakInfo={true} />
              )}
            </TabsContent>

            <TabsContent value="visits" className="space-y-4">
              {childId && (
                <HomeVisitTimeline
                  childId={childId}
                  childName={form.watch('name') || childData?.name || ''}
                />
              )}
            </TabsContent>

            <TabsContent value="assessments" className="space-y-4">
              {childId && (
                <LSASProgressChart
                  childId={childId}
                  childName={form.watch('name') || childData?.name || ''}
                />
              )}
            </TabsContent>

            <TabsContent value="programs" className="space-y-4">
              {childId && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Program Enrollments</h3>
                    <Button variant="outline" size="sm">
                      Add Enrollment
                    </Button>
                  </div>
                  {childData?.programs && childData.programs.length > 0 ? (
                    <div className="space-y-2">
                      {childData.programs.map((enrollment) => (
                        <div
                          key={enrollment.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {enrollment.program?.name || enrollment.program_type || 'Program'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                            {enrollment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No program enrollments</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {childId && (
                <div className="space-y-6">
                  <Tabs defaultValue="attendance" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="attendance">Attendance</TabsTrigger>
                      <TabsTrigger value="transfers">Transfers</TabsTrigger>
                    </TabsList>
                    <TabsContent value="attendance" className="space-y-4">
                      <AttendanceHistoryTimeline
                        childId={childId}
                        childName={form.watch('name') || childData?.name || ''}
                      />
                    </TabsContent>
                    <TabsContent value="transfers" className="space-y-4">
                      <h3 className="text-lg font-semibold">Transfer History</h3>
                      {childData?.transfer_history && childData.transfer_history.length > 0 ? (
                        <div className="space-y-2">
                          {childData.transfer_history.map((transfer) => (
                            <div key={transfer.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {transfer.from_program?.name || transfer.from_program_type || 'Unknown'}
                                  </span>
                                  <span>→</span>
                                  <span className="font-medium">
                                    {transfer.to_program?.name || transfer.to_program_type || 'Unknown'}
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(transfer.transfer_date).toLocaleDateString()}
                                </span>
                              </div>
                              {transfer.reason && (
                                <p className="text-sm text-muted-foreground">{transfer.reason}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No transfer history</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

