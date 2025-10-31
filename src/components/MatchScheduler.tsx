import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { generateBracket } from '@/lib/bracketUtils';
import { exportToCSV, exportToICal, exportToHTML } from '@/lib/scheduleExport';
import { CalendarIcon, Download, Settings, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Team, TournamentSettings, BracketType } from '@/lib/bracketUtils';

interface MatchSchedulerProps {
  tournamentId: string;
  tournamentName: string;
  teams: Team[];
  onSuccess?: () => void;
}

export const MatchScheduler = ({ tournamentId, tournamentName, teams, onSuccess }: MatchSchedulerProps) => {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState<TournamentSettings>({
    bracket_type: 'round_robin',
    match_duration_minutes: 90,
    break_time_minutes: 10,
    fields: ['Field 1', 'Field 2'],
    start_time: '09:00',
    end_time: '18:00',
  });
  const [startDate, setStartDate] = useState<Date>(new Date());
  const { toast } = useToast();

  const handleGenerateBracket = async () => {
    if (teams.length < 2) {
      toast({
        title: 'Not enough teams',
        description: 'Need at least 2 teams to generate a bracket',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      // Save tournament settings first
      await saveTournamentSettings();

      // Generate bracket
      const { matches, poolAssignments } = generateBracket(teams, settings, startDate);

      // Save matches to database
      const matchesToInsert = matches.map(match => ({
        tournament_id: tournamentId,
        team_a_id: match.team_a_id,
        team_b_id: match.team_b_id,
        scheduled_time: match.scheduled_time,
        field: match.field,
        pool: match.pool || null,
        round: match.round || null,
        bracket_position: match.bracket_position || null,
        status: 'upcoming',
      }));

      const { error } = await supabase
        .from('matches')
        .insert(matchesToInsert);

      if (error) throw error;

      toast({
        title: 'Bracket generated successfully!',
        description: `${matches.length} matches created`,
      });

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error generating bracket',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveTournamentSettings = async () => {
    try {
      const { error } = await supabase
        .from('tournament_settings')
        .upsert({
          tournament_id: tournamentId,
          bracket_type: settings.bracket_type,
          match_duration_minutes: settings.match_duration_minutes,
          break_time_minutes: settings.break_time_minutes,
          fields: settings.fields,
          start_time: settings.start_time,
          end_time: settings.end_time,
          pool_count: settings.pool_count || 4,
          pool_size: settings.pool_size || 4,
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Generate Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Tournament Schedule</DialogTitle>
          <DialogDescription>
            Configure bracket settings and generate matches automatically
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Bracket Type */}
          <div className="space-y-2">
            <Label>Bracket Type</Label>
            <Select
              value={settings.bracket_type}
              onValueChange={(value) => setSettings({ ...settings, bracket_type: value as BracketType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round_robin">Round Robin</SelectItem>
                <SelectItem value="single_elimination">Single Elimination</SelectItem>
                <SelectItem value="double_elimination">Double Elimination</SelectItem>
                <SelectItem value="pools">Pools</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Match Duration */}
          <div className="space-y-2">
            <Label>Match Duration (minutes)</Label>
            <Input
              type="number"
              value={settings.match_duration_minutes}
              onChange={(e) => setSettings({ ...settings, match_duration_minutes: parseInt(e.target.value) })}
            />
          </div>

          {/* Break Time */}
          <div className="space-y-2">
            <Label>Break Time Between Matches (minutes)</Label>
            <Input
              type="number"
              value={settings.break_time_minutes}
              onChange={(e) => setSettings({ ...settings, break_time_minutes: parseInt(e.target.value) })}
            />
          </div>

          {/* Fields */}
          <div className="space-y-2">
            <Label>Fields (comma-separated)</Label>
            <Input
              value={settings.fields.join(', ')}
              onChange={(e) => setSettings({ ...settings, fields: e.target.value.split(',').map(f => f.trim()) })}
              placeholder="Field 1, Field 2, Field 3"
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={settings.start_time}
                onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={settings.end_time}
                onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <div className="flex items-center gap-2">
              <Input
                value={format(startDate, 'MM/dd/yyyy')}
                readOnly
                className="flex-1"
              />
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                className="rounded-md border"
              />
            </div>
          </div>

          {/* Pool Settings (only for pool bracket) */}
          {settings.bracket_type === 'pools' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Pools</Label>
                <Input
                  type="number"
                  value={settings.pool_count || 4}
                  onChange={(e) => setSettings({ ...settings, pool_count: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pool Size</Label>
                <Input
                  type="number"
                  value={settings.pool_size || 4}
                  onChange={(e) => setSettings({ ...settings, pool_size: parseInt(e.target.value) })}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerateBracket} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Export helper component for the existing UI
export const ScheduleExportButtons = ({ tournamentName, location = '' }: { tournamentName: string; location?: string }) => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'ical' | 'html') => {
    setExporting(true);
    try {
      // Fetch matches from database
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(name),
          team_b:teams!team_b_id(name)
        `)
        .order('scheduled_time');

      if (error) throw error;
      if (!matches || matches.length === 0) {
        toast({
          title: 'No matches to export',
          description: 'Generate a schedule first',
          variant: 'destructive',
        });
        return;
      }

      const formattedMatches = matches.map(m => ({
        id: m.id,
        team_a_name: m.team_a.name,
        team_b_name: m.team_b.name,
        scheduled_time: m.scheduled_time,
        field: m.field,
        pool: m.pool,
        round: m.round,
      }));

      switch (format) {
        case 'csv':
          exportToCSV(formattedMatches, tournamentName);
          break;
        case 'ical':
          exportToICal(formattedMatches, tournamentName, location);
          break;
        case 'html':
          exportToHTML(formattedMatches, tournamentName);
          break;
      }

      toast({
        title: 'Export successful',
        description: `Schedule exported to ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={exporting}>
        <Download className="h-4 w-4 mr-2" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('ical')} disabled={exporting}>
        <CalendarIcon className="h-4 w-4 mr-2" />
        iCal
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('html')} disabled={exporting}>
        <Download className="h-4 w-4 mr-2" />
        HTML
      </Button>
    </div>
  );
};

