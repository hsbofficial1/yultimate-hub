import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Heart, AlertTriangle, Info, Loader2 } from 'lucide-react';

const spiritSchema = z.object({
  rules: z.number().min(0).max(4),
  fouls: z.number().min(0).max(4),
  fairness: z.number().min(0).max(4),
  attitude: z.number().min(0).max(4),
  communication: z.number().min(0).max(4),
  comments: z.string().optional(),
});

type SpiritFormData = z.infer<typeof spiritSchema>;

interface SpiritScoreDialogProps {
  matchId: string;
  fromTeamId: string;
  toTeamId: string;
  toTeamName: string;
  matchStatus: string;
  onSuccess?: () => void;
}

export const SpiritScoreDialog = ({ 
  matchId, 
  fromTeamId, 
  toTeamId, 
  toTeamName,
  matchStatus,
  onSuccess 
}: SpiritScoreDialogProps) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<SpiritFormData>({
    resolver: zodResolver(spiritSchema),
    defaultValues: {
      rules: 4,
      fouls: 4,
      fairness: 4,
      attitude: 4,
      communication: 4,
      comments: '',
    },
  });

  const watchedValues = form.watch();
  const total = (watchedValues.rules + watchedValues.fouls + watchedValues.fairness + 
                 watchedValues.attitude + watchedValues.communication);

  const onSubmit = async (data: SpiritFormData) => {
    // Check if match is completed
    if (matchStatus !== 'completed') {
      toast({
        title: 'Cannot submit spirit score',
        description: 'Spirit scores can only be submitted after the match is completed',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('spirit_scores')
        .insert({
          match_id: matchId,
          from_team_id: fromTeamId,
          to_team_id: toTeamId,
          rules: data.rules,
          fouls: data.fouls,
          fairness: data.fairness,
          attitude: data.attitude,
          communication: data.communication,
          comments: data.comments || null,
        });

      if (error) throw error;

      toast({
        title: 'Spirit score submitted',
        description: `Thank you for rating ${toTeamName}`,
      });

      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error submitting spirit score',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryDescription = (category: string, value: number) => {
    const descriptions: Record<string, string[]> = {
      rules: [
        'Poor understanding or application of rules',
        'Some confusion about rules',
        'Good understanding with minor issues',
        'Excellent knowledge and application',
        'Outstanding rules knowledge'
      ],
      fouls: [
        'Excessive fouls or body contact',
        'Several avoidable fouls',
        'Occasional contact issues',
        'Good control, minimal fouls',
        'Exemplary control and respect'
      ],
      fairness: [
        'Demonstrated poor sportsmanship',
        'Some questionable calls',
        'Mostly fair play',
        'Very fair-minded',
        'Exemplary fairness'
      ],
      attitude: [
        'Negative or unsportsmanlike conduct',
        'Some poor attitude displayed',
        'Generally positive',
        'Excellent positive attitude',
        'Outstanding sportsmanship'
      ],
      communication: [
        'Poor or argumentative communication',
        'Some communication issues',
        'Adequate communication',
        'Clear and respectful',
        'Exemplary communication'
      ],
    };
    return descriptions[category]?.[value] || '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={matchStatus !== 'completed'}>
          <Heart className="h-4 w-4 mr-2" />
          Submit Spirit Score
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spirit of the Game Score</DialogTitle>
          <DialogDescription>
            Rate {toTeamName} on spirit of the game (0-4 for each category)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4">
              {(['rules', 'fouls', 'fairness', 'attitude', 'communication'] as const).map((category) => (
                <FormField
                  key={category}
                  control={form.control}
                  name={category}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-base font-semibold capitalize">
                            {category === 'rules' ? 'Rules Knowledge & Use' :
                             category === 'fouls' ? 'Fouls & Body Contact' :
                             category === 'fairness' ? 'Fair-Mindedness' :
                             category === 'attitude' ? 'Positive Attitude & Self-Control' :
                             'Communication'}
                          </FormLabel>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-primary">{field.value}</span>
                            <span className="text-sm text-muted-foreground">/4</span>
                          </div>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={4}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="w-full"
                          />
                        </FormControl>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Info className="h-4 w-4" />
                          <FormDescription>
                            {getCategoryDescription(category, field.value)}
                          </FormDescription>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any comments or feedback..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Share specific feedback or highlights from the match
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Total Spirit Score</CardTitle>
                  <div className="text-right">
                    <div className="text-4xl font-black text-primary">{total}</div>
                    <CardDescription className="text-sm font-semibold">/ 20 points</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" />
                    Submit Spirit Score
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

