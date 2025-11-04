import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Edit2,
  Save,
  Loader2,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface RuleSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface TournamentRulesData {
  id?: string;
  tournament_id: string;
  title: string;
  rules_json: {
    sections: RuleSection[];
  };
}

interface TournamentRulesProps {
  tournamentId: string;
  canManage: boolean;
}

const DEFAULT_RULES: RuleSection[] = [
  {
    id: '1',
    title: 'Game Time, Time Outs, Scores',
    content: `Pool Games (A,B,C,D):
• Duration: 50 minutes
• Winning Score: Game to 17 points
• Half Time: 2 minutes at 9 goals or 25 minutes (at 25 min, finish point, and take half immediately)
• Match End: Either a team scoring 17 points or the whistle blowing at the end of 50 minutes. Only one legal pass is allowed after the whistle
• Time Cap (50 mins up): Finish the current point, then reduce the points target to the current highest score +1 (but never exceed 15)
• Time Outs: 1 time out of 60 seconds per team per half (can be taken after time caps too)

Finals:
• Duration: 60 minutes
• Winning Score: Game to 15 points
• Half Time: 2 minutes at 8 goals or 30 minutes (at 30 mins, finish point, and take half immediately)
• Time Cap (60 mins up): Finish the current point, then reduce the points target to the current highest score +1 (but never exceed 15)
• Time Outs: 1 time out of 60 seconds per team per half (can be taken after time caps too)`,
    order: 1,
  },
  {
    id: '2',
    title: 'Time Delays',
    content: `General Principle: Teams are urged to finish games on time, even if they started late, due to a tight schedule.

Penalty for Lateness: If a team is late, the opposing team is awarded 1 point per minute the other team is late.

Team Responsibility: Teams must make a significant effort to find the team they are meant to be playing.

TD Mistakes: If a delay is due to a mistake by the Tournament Director (TD), teams should NOT claim points (misreading the schedule is not a TD mistake).

Pre-Pull Time Limits:
• Offense: 60 seconds to be ready for the subsequent point
• Defense: 75 seconds to be ready and initiate the pull, or 15 seconds from when Offense shows readiness

Pre-Pull Time Limit Violations:
• First violation: No penalty
• Subsequent violations:
  - If Offense is not ready on time: Defense calls "delay of game" and initiates the pull when Offense is ready. Defense is allowed to set up as after a time-out
  - If Defense is not ready on time: Offense calls "delay of game," and once Defense initiates the pull, Offense can proceed`,
    order: 2,
  },
  {
    id: '3',
    title: 'Re-seeding within a pool',
    content: `If a pool initially contains seeds 1, 3, 6, 8, and 9.

After re-seed, the winner of the pool automatically takes 1st seed, 2nd place takes 3rd overall, 3rd takes 6th, 4th takes 8th, and 5th takes 9th, regardless of other pool results or goal difference. This is described as the "conventional WFDF format."`,
    order: 3,
  },
  {
    id: '4',
    title: 'Ratio Rules',
    content: `A7.2.1:
• Start of Game: After the first disc flip for choosing offense/defense, an additional disc flip determines the gender ratio for the first point
• Second and Third Points: The ratio must be the reverse of the first point
• Fourth and Fifth Points: The ratio must be the same as the first point
• Pattern: This alternating ratio (every two points) repeats until the end of the game (half time has no impact on the pattern)

Pulling Rule: A player representing the gender with four players on the field must pull for that point.

Violation: If a team breaches this rule, a violation may be called by the opposing team before the offense touches the disc and play starts.`,
    order: 4,
  },
  {
    id: '5',
    title: 'Rostering',
    content: `4 Girl Ratio Point: Teams will play with 3 boys and 3 girls. However, if the opponent team has enough girls, they will play 4 girls and 3 boys.`,
    order: 5,
  },
  {
    id: '6',
    title: 'Tie-breaking within a pool (in order) [from WFDF championship appendix]',
    content: `Order of Tie-breakers:
1. Games won in pool (not a tie)
2. Games won counting only games between tied teams
3. Points difference counting only games between tied teams
4. Points difference counting all pool games
5. Points scored counting only games between tied teams
6. Points scored counting all pool games
7. (Measured by the point touches the ground or if disc goes out of bound then the point from where)
8. Higher finish in the Y-Ultimate league

More than 2 Teams Tied: The same system is used for all involved teams (e.g., 1. Games won between tied teams, 2...); teams that come out on top/bottom are immediately removed, and the process restarts until a clear ranking of relevant teams is established.`,
    order: 6,
  },
  {
    id: '7',
    title: 'Spirit Circles',
    content: `In spirit circles, teams must share their spirit scoring with the opponent team and discuss any misinterpretation.`,
    order: 7,
  },
  {
    id: '8',
    title: 'Score Updating',
    content: `Reporting Scores: After every match, captains must share their match scores on the Y-U Captains group using the format: "your team name, score v opponent team name, opponent's score." (Example: Team Lions 11 v Team Tiger 10)

Ground Clearance: Coaches must ensure their team clears the ground as soon as the match ends to avoid delays for the next game.

Timeliness: Coaches and team captains need to update the scores on the captains group as soon as the match is over.`,
    order: 8,
  },
];

export const TournamentRules = ({ tournamentId, canManage }: TournamentRulesProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<TournamentRulesData | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('All games are played by WFDF 2021 rules');
  const [sections, setSections] = useState<RuleSection[]>([]);
  const [editingSection, setEditingSection] = useState<RuleSection | null>(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRules();
  }, [tournamentId]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournament_rules_documents')
        .select('*')
        .eq('tournament_id', tournamentId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setRules(data);
        setTitle(data.title);
        setSections(data.rules_json?.sections || DEFAULT_RULES);
      } else {
        // Initialize with default rules if none exist
        setSections(DEFAULT_RULES);
        setTitle('All games are played by WFDF 2021 rules');
      }
    } catch (error: any) {
      console.error('Error fetching rules:', error);
      toast({
        title: 'Error loading rules',
        description: error.message,
        variant: 'destructive',
      });
      // Set defaults on error
      setSections(DEFAULT_RULES);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canManage) return;

    try {
      setSaving(true);
      const rulesData = {
        tournament_id: tournamentId,
        title,
        rules_json: { sections },
      };

      let error;
      if (rules?.id) {
        const { error: updateError } = await supabase
          .from('tournament_rules_documents')
          .update(rulesData)
          .eq('id', rules.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('tournament_rules_documents')
          .insert(rulesData)
          .select()
          .single();
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tournament rules saved successfully',
      });

      setEditing(false);
      fetchRules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = () => {
    const newSection: RuleSection = {
      id: Date.now().toString(),
      title: 'New Section',
      content: '',
      order: sections.length + 1,
    };
    setEditingSection(newSection);
    setSectionDialogOpen(true);
  };

  const handleEditSection = (section: RuleSection) => {
    setEditingSection({ ...section });
    setSectionDialogOpen(true);
  };

  const handleSaveSection = () => {
    if (!editingSection) return;

    if (editingSection.id && sections.some(s => s.id === editingSection.id)) {
      // Update existing section
      setSections(sections.map(s => 
        s.id === editingSection.id ? editingSection : s
      ));
    } else {
      // Add new section
      setSections([...sections, { ...editingSection, id: Date.now().toString() }]);
    }

    setSectionDialogOpen(false);
    setEditingSection(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1) return;

    const newSections = [...sections];
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
      newSections[index].order = index;
      newSections[index - 1].order = index - 1;
    } else if (direction === 'down' && index < sections.length - 1) {
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      newSections[index].order = index;
      newSections[index + 1].order = index + 1;
    }
    setSections(newSections);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading tournament rules...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Tournament Rules</h3>
          <p className="text-muted-foreground">View and manage tournament rules and regulations</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => {
                  setEditing(false);
                  fetchRules();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Rules
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Rules
              </Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold"
                placeholder="Rules title"
              />
            ) : (
              <span>{title}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rules sections defined yet</p>
              {canManage && editing && (
                <Button className="mt-4" onClick={handleAddSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Section
                </Button>
              )}
            </div>
          ) : (
            sections
              .sort((a, b) => a.order - b.order)
              .map((section, index) => (
                <div
                  key={section.id}
                  className="border rounded-lg p-6 bg-card"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {editing ? (
                        <Input
                          value={section.title}
                          onChange={(e) => {
                            const updated = sections.map(s =>
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            );
                            setSections(updated);
                          }}
                          className="text-xl font-bold mb-2"
                          placeholder="Section title"
                        />
                      ) : (
                        <h4 className="text-xl font-bold mb-2 bg-yellow-200 px-3 py-1 rounded inline-block">
                          {section.title}
                        </h4>
                      )}
                    </div>
                    {editing && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveSection(section.id, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveSection(section.id, 'down')}
                          disabled={index === sections.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSection(section)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editing ? (
                    <Textarea
                      value={section.content}
                      onChange={(e) => {
                        const updated = sections.map(s =>
                          s.id === section.id ? { ...s, content: e.target.value } : s
                        );
                        setSections(updated);
                      }}
                      rows={10}
                      className="font-mono text-sm"
                      placeholder="Section content..."
                    />
                  ) : (
                    <div className="whitespace-pre-line text-sm leading-relaxed">
                      {section.content}
                    </div>
                  )}
                </div>
              ))
          )}

          {editing && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddSection}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Section
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Edit Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection?.id && sections.some(s => s.id === editingSection.id)
                ? 'Edit Section'
                : 'Add Section'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Section Title</label>
              <Input
                value={editingSection?.title || ''}
                onChange={(e) =>
                  setEditingSection(prev => prev ? { ...prev, title: e.target.value } : null)
                }
                placeholder="Section title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Section Content</label>
              <Textarea
                value={editingSection?.content || ''}
                onChange={(e) =>
                  setEditingSection(prev => prev ? { ...prev, content: e.target.value } : null)
                }
                rows={15}
                className="font-mono text-sm"
                placeholder="Enter section content..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSectionDialogOpen(false);
              setEditingSection(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveSection}>
              Save Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

