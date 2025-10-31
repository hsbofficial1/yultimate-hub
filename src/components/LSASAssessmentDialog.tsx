import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, TrendingUp, Users, Heart, Brain, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

const assessmentSchema = z.object({
  assessment_date: z.date(),
  assessment_type: z.enum(['baseline', 'endline', 'periodic']),
  physical_score: z.number().min(1).max(5),
  physical_notes: z.string().max(500).optional(),
  social_score: z.number().min(1).max(5),
  social_notes: z.string().max(500).optional(),
  emotional_score: z.number().min(1).max(5),
  emotional_notes: z.string().max(500).optional(),
  cognitive_score: z.number().min(1).max(5),
  cognitive_notes: z.string().max(500).optional(),
  overall_notes: z.string().max(1000).optional(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface LSASAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  assessmentId?: string;
  onSuccess?: () => void;
}

const domainDescriptions = {
  physical: {
    title: 'Physical',
    icon: Activity,
    description: 'Motor skills, coordination, strength',
    subdomains: ['Gross motor skills', 'Fine motor skills', 'Balance & coordination'],
  },
  social: {
    title: 'Social',
    icon: Users,
    description: 'Teamwork, communication, collaboration',
    subdomains: ['Teamwork', 'Communication', 'Social interactions'],
  },
  emotional: {
    title: 'Emotional',
    icon: Heart,
    description: 'Confidence, resilience, self-regulation',
    subdomains: ['Self-confidence', 'Resilience', 'Emotional regulation'],
  },
  cognitive: {
    title: 'Cognitive',
    icon: Brain,
    description: 'Focus, problem-solving, strategic thinking',
    subdomains: ['Focus & attention', 'Problem-solving', 'Decision-making'],
  },
};

const scoreLabels = {
  1: 'Needs Improvement',
  2: 'Developing',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export const LSASAssessmentDialog = ({
  open,
  onOpenChange,
  childId,
  assessmentId,
  onSuccess,
}: LSASAssessmentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      assessment_date: new Date(),
      assessment_type: 'periodic',
      physical_score: 3,
      physical_notes: '',
      social_score: 3,
      social_notes: '',
      emotional_score: 3,
      emotional_notes: '',
      cognitive_score: 3,
      cognitive_notes: '',
      overall_notes: '',
    },
  });

  useEffect(() => {
    if (open && assessmentId) {
      fetchAssessmentData();
    } else if (open && !assessmentId) {
      form.reset({
        assessment_date: new Date(),
        assessment_type: 'periodic',
        physical_score: 3,
        physical_notes: '',
        social_score: 3,
        social_notes: '',
        emotional_score: 3,
        emotional_notes: '',
        cognitive_score: 3,
        cognitive_notes: '',
        overall_notes: '',
      });
    }
  }, [open, assessmentId]);

  const fetchAssessmentData = async () => {
    if (!assessmentId) return;

    try {
      setLoading(true);
      const { data: assessment, error } = await supabase
        .from('lsas_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) throw error;

      if (assessment) {
        form.reset({
          assessment_date: new Date(assessment.assessment_date),
          assessment_type: assessment.assessment_type as any,
          physical_score: assessment.physical_score,
          physical_notes: assessment.physical_notes || '',
          social_score: assessment.social_score,
          social_notes: assessment.social_notes || '',
          emotional_score: assessment.emotional_score,
          emotional_notes: assessment.emotional_notes || '',
          cognitive_score: assessment.cognitive_score,
          cognitive_notes: assessment.cognitive_notes || '',
          overall_notes: assessment.overall_notes || '',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error loading assessment',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AssessmentFormData) => {
    try {
      setLoading(true);

      const assessmentData: any = {
        child_id: childId,
        assessment_date: format(data.assessment_date, 'yyyy-MM-dd'),
        assessment_type: data.assessment_type,
        physical_score: data.physical_score,
        physical_notes: data.physical_notes || null,
        social_score: data.social_score,
        social_notes: data.social_notes || null,
        emotional_score: data.emotional_score,
        emotional_notes: data.emotional_notes || null,
        cognitive_score: data.cognitive_score,
        cognitive_notes: data.cognitive_notes || null,
        overall_notes: data.overall_notes || null,
        assessed_by: user?.id || null,
      };

      if (assessmentId) {
        const { error } = await supabase
          .from('lsas_assessments')
          .update(assessmentData)
          .eq('id', assessmentId);

        if (error) throw error;

        toast({
          title: 'Assessment updated',
          description: 'LSAS assessment has been updated successfully.',
        });
      } else {
        const { error } = await supabase
          .from('lsas_assessments')
          .insert(assessmentData);

        if (error) throw error;

        toast({
          title: 'Assessment recorded',
          description: 'LSAS assessment has been recorded successfully.',
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: assessmentId ? 'Error updating assessment' : 'Error recording assessment',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const averageScore = (
    form.watch('physical_score') +
    form.watch('social_score') +
    form.watch('emotional_score') +
    form.watch('cognitive_score')
  ) / 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assessmentId ? 'Edit LSAS Assessment' : 'New LSAS Assessment'}</DialogTitle>
          <DialogDescription>
            {assessmentId 
              ? 'Update the Life Skills Assessment System (LSAS) scores' 
              : 'Record a Life Skills Assessment System (LSAS) evaluation'}
          </DialogDescription>
        </DialogHeader>

        {loading && assessmentId ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assessment_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Assessment Date</FormLabel>
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
                  name="assessment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="baseline">Baseline (Program Start)</SelectItem>
                          <SelectItem value="endline">Endline (Program End)</SelectItem>
                          <SelectItem value="periodic">Periodic (Progress Check)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Overall Score Display */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Overall Score
                  </CardTitle>
                  <CardDescription>Average across all four domains</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{averageScore.toFixed(1)}</span>
                    <span className="text-2xl text-muted-foreground">/ 5.0</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {scoreLabels[Math.round(averageScore) as keyof typeof scoreLabels]}
                  </p>
                </CardContent>
              </Card>

              {/* Domain Assessments */}
              {(['physical', 'social', 'emotional', 'cognitive'] as const).map((domain) => {
                const domainInfo = domainDescriptions[domain];
                const Icon = domainInfo.icon;
                const score = form.watch(`${domain}_score` as any);

                return (
                  <Card key={domain}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {domainInfo.title} Domain
                      </CardTitle>
                      <CardDescription>{domainInfo.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`${domain}_score` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {domainInfo.title} Score
                              <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({score} / 5 - {scoreLabels[score as keyof typeof scoreLabels]})
                              </span>
                            </FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Slider
                                  value={[field.value]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  min={1}
                                  max={5}
                                  step={1}
                                  className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>1 - {scoreLabels[1]}</span>
                                  <span>3 - {scoreLabels[3]}</span>
                                  <span>5 - {scoreLabels[5]}</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Sub-domains: {domainInfo.subdomains.join(', ')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`${domain}_notes` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observations & Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={`Record specific observations for ${domainInfo.title.toLowerCase()} domain...`}
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                );
              })}

              {/* Overall Notes */}
              <FormField
                control={form.control}
                name="overall_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Assessment Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Overall impressions, recommendations, and goals..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : assessmentId ? 'Update Assessment' : 'Save Assessment'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

