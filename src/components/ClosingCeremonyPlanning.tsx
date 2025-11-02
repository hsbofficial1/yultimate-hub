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
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  AlertCircle,
  Edit2,
  Trash2,
  Users,
  Trophy,
  Calendar,
  Mic,
  Loader2,
} from 'lucide-react';

interface CeremonyEvent {
  id: string;
  tournament_id: string;
  event_name: string;
  event_type: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  location: string | null;
  duration_minutes: number | null;
  description: string | null;
  organizer_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CeremonySpeaker {
  id: string;
  ceremony_id: string;
  speaker_name: string;
  speaker_title: string | null;
  speaker_role: string | null;
  speech_topic: string | null;
  allocated_minutes: number | null;
  speaking_order: number | null;
  notes: string | null;
  confirmed: boolean;
}

interface CeremonyAward {
  id: string;
  ceremony_id: string;
  award_category: string;
  award_description: string | null;
  recipient_type: string | null;
  recipient_id: string | null;
  recipient_name: string | null;
  presentor_name: string | null;
  awarded_at: string | null;
  notes: string | null;
}

interface ClosingCeremonyPlanningProps {
  tournamentId: string;
  canManage: boolean;
}

const DEFAULT_CEREMONY_PLAN = {
  sections: [
    {
      name: 'One brief with coaches to make sure everything goes well',
      duration: null,
      responsible: 'Lax/Cyril',
      items: [
        '- No disputes within coaches at any point. If any concern reach out to TD.',
        '- Coaches should not interfere in calls. Let kids talk and make decisions.',
        '- If by chance there is a long call spirit director can interfere if not present then coaches can',
        '- Spirit sheet need to be filled ASAP',
        '- If there is spirit score more or less than 2 right the reasons in detail',
        '- During matches no calls go beyond 30 secs. If there is no solution at the time of call within 30 secs please contest/retract the call and talk about it in the circle',
      ],
    },
    {
      name: 'Seating Arrangement',
      duration: null,
      responsible: 'Lax',
      items: [
        '- Flex/Banner to be moved to the second field, facing towards the camera',
        '- Players to be seated in 12 rows',
        '- Chairs to be set up at the back for parents',
      ],
    },
    {
      name: 'Introduction',
      duration: 10,
      responsible: 'Lax/Cyril',
      items: [
        'Start with a thanks to:',
        '- players for participating',
        '- coaches for leading their team',
        '- volunteers for helping us throughout the league and the UDAAN',
        '- Supporters/Donors for supporting kids',
      ],
    },
    {
      name: 'Tournament Experience',
      duration: 3,
      responsible: 'Lax/Cyril',
      items: [
        '- How was this tournament',
        '- Appreciate team for their effort',
        '- Thanks to my team for helping me everytime',
        '- Wish them for their future tournaments and studies',
        '- Special Mention: Disc Artists, who helped in arranging shoes, etc.',
      ],
    },
    {
      name: 'Speeches - 1 response from each team',
      duration: null,
      responsible: 'Lax/Cyril',
      items: [
        'Participation certificate to be given after each speech. Duration to be 2-3 minute per team',
        'Teams:',
        '- Wild Hackers',
        '- Garhi Ultimate',
        '- Abhas Warriors',
        '- Unique Ultimate',
        '- The Fearless',
        '- Throwing Aces',
        '- Flying Wolf',
        '- Mini Crazy',
        '- Little Stars',
        '- Seemapuri',
        '- IIM Indore',
        '- YU',
      ],
    },
    {
      name: "Parents' Response - 3 responses max",
      duration: 5,
      responsible: 'Open to everyone / RK/Benoy',
      items: [
        'Ask volunteers/donors if they want to share their experience',
      ],
    },
    {
      name: 'Special Mention',
      duration: 2,
      responsible: 'RK/Benoy',
      items: [
        'Thank the:',
        '1. Venue partner - Jamia Sports Complex',
        '2. Community sponsor - Ujjivan, Brahmos and Simply Sport',
        '3. Disc partner - USHA Play',
      ],
    },
    {
      name: 'Medal Ceremony',
      duration: null,
      responsible: 'Lax/Cyril',
      items: [
        '- MSP male of the League - Dev Raj from The Fearless (Karm Marg)',
        '- MSP female of the League - Arti Yadav from Flying Wolf',
        '- Runners up of the league - Garhi Ultimate',
        '- Spirit Award of the league',
        '- Winners of the league by UJJIVAN - Wild Hackers',
        '- MSP male of the UDAAN',
        '- MSP female of the UDAAN',
        '- Runners up of UDAAN',
        '- Winners of UDAAN by Ankur Dhama',
        '- Spirit Award of UDAAN',
        '- Special Award for 23-24 Season - Studying / Updates',
        '- Spirit Winners will play YU invitational',
      ],
    },
    {
      name: 'Pack-Up',
      duration: null,
      responsible: 'Lax/Cyril',
      items: [
        '- Coaches have to go home with their team',
        '- Pack up team will manage to take the equipments back',
        '- Lost and found by pack up team and Lax has to make sure of return of lost and found',
        '- Lax/Cyril has to make sure that there is nothing left on the field and there is no littering on the ground',
        '- Once equipments reach NGO - Need to write the return quantity of equipments',
      ],
    },
  ],
};

export const ClosingCeremonyPlanning = ({ tournamentId, canManage }: ClosingCeremonyPlanningProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ceremonyEvent, setCeremonyEvent] = useState<CeremonyEvent | null>(null);
  const [speakers, setSpeakers] = useState<CeremonySpeaker[]>([]);
  const [awards, setAwards] = useState<CeremonyAward[]>([]);
  const [sectionsExpanded, setSectionsExpanded] = useState<Record<string, boolean>>({});
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [speakerDialogOpen, setSpeakerDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    duration_minutes: '',
    description: '',
    organizer_notes: '',
    status: 'planned',
  });

  const [speakerFormData, setSpeakerFormData] = useState({
    speaker_name: '',
    speaker_title: '',
    speaker_role: '',
    speech_topic: '',
    allocated_minutes: '',
    speaking_order: '',
    notes: '',
    confirmed: false,
  });

  const [awardFormData, setAwardFormData] = useState({
    award_category: '',
    award_description: '',
    recipient_type: 'individual',
    recipient_name: '',
    presentor_name: '',
    notes: '',
  });

  useEffect(() => {
    fetchCeremonyData();
  }, [tournamentId]);

  const fetchCeremonyData = async () => {
    try {
      setLoading(true);

      // Fetch or create ceremony event
      const { data: eventData, error: eventError } = await supabase
        .from('ceremony_events')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('event_type', 'closing_ceremony')
        .maybeSingle();

      if (eventError && eventError.code !== 'PGRST116') throw eventError;

      if (!eventData && canManage) {
        // Create default closing ceremony event
        const { data: newEvent, error: createError } = await supabase
          .from('ceremony_events')
          .insert({
            tournament_id: tournamentId,
            event_name: 'Closing Ceremony',
            event_type: 'closing_ceremony',
            description: 'Default closing ceremony plan for tournament',
            status: 'planned',
          })
          .select()
          .single();

        if (createError) throw createError;
        setCeremonyEvent(newEvent);

        // Initialize checklist items
        const items: Record<string, boolean> = {};
        Object.keys(DEFAULT_CEREMONY_PLAN.sections).forEach((idx) => {
          items[idx] = false;
        });
        setChecklistItems(items);
      } else if (eventData) {
        setCeremonyEvent(eventData);

        // Fetch speakers
        const { data: speakersData, error: speakersError } = await supabase
          .from('ceremony_speakers')
          .select('*')
          .eq('ceremony_id', eventData.id)
          .order('speaking_order', { ascending: true });

        if (speakersError) throw speakersError;
        setSpeakers(speakersData || []);

        // Fetch awards
        const { data: awardsData, error: awardsError } = await supabase
          .from('ceremony_awards')
          .select('*')
          .eq('ceremony_id', eventData.id)
          .order('id', { ascending: true });

        if (awardsError) throw awardsError;
        setAwards(awardsData || []);

        // Initialize checklist items
        const items: Record<string, boolean> = {};
        Object.keys(DEFAULT_CEREMONY_PLAN.sections).forEach((idx) => {
          items[idx] = false;
        });
        setChecklistItems(items);
      }
    } catch (error: any) {
      console.error('Error fetching ceremony data:', error);
      toast({
        title: 'Error loading ceremony',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionKey: string) => {
    setSectionsExpanded((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const toggleChecklistItem = async (sectionKey: string) => {
    if (!canManage || !ceremonyEvent) return;

    const newValue = !checklistItems[sectionKey];
    setChecklistItems((prev) => ({ ...prev, [sectionKey]: newValue }));

    // TODO: Save checklist state to database
    toast({
      title: 'Checklist updated',
      description: `Section marked as ${newValue ? 'complete' : 'incomplete'}`,
    });
  };

  const handleSaveDetails = async () => {
    if (!ceremonyEvent || !canManage) return;

    try {
      const { error } = await supabase
        .from('ceremony_events')
        .update({
          scheduled_date: formData.scheduled_date || null,
          scheduled_time: formData.scheduled_time || null,
          location: formData.location || null,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          description: formData.description || null,
          organizer_notes: formData.organizer_notes || null,
          status: formData.status,
        })
        .eq('id', ceremonyEvent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ceremony details updated',
      });

      setDialogOpen(false);
      fetchCeremonyData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddSpeaker = async () => {
    if (!ceremonyEvent || !canManage) return;

    try {
      const { error } = await supabase.from('ceremony_speakers').insert({
        ceremony_id: ceremonyEvent.id,
        speaker_name: speakerFormData.speaker_name,
        speaker_title: speakerFormData.speaker_title || null,
        speaker_role: speakerFormData.speaker_role || null,
        speech_topic: speakerFormData.speech_topic || null,
        allocated_minutes: speakerFormData.allocated_minutes ? parseInt(speakerFormData.allocated_minutes) : null,
        speaking_order: speakerFormData.speaking_order ? parseInt(speakerFormData.speaking_order) : null,
        notes: speakerFormData.notes || null,
        confirmed: speakerFormData.confirmed,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Speaker added',
      });

      setSpeakerDialogOpen(false);
      resetSpeakerForm();
      fetchCeremonyData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddAward = async () => {
    if (!ceremonyEvent || !canManage) return;

    try {
      const { error } = await supabase.from('ceremony_awards').insert({
        ceremony_id: ceremonyEvent.id,
        award_category: awardFormData.award_category,
        award_description: awardFormData.award_description || null,
        recipient_type: awardFormData.recipient_type || null,
        recipient_name: awardFormData.recipient_name || null,
        presentor_name: awardFormData.presentor_name || null,
        notes: awardFormData.notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Award added',
      });

      setAwardDialogOpen(false);
      resetAwardForm();
      fetchCeremonyData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetSpeakerForm = () => {
    setSpeakerFormData({
      speaker_name: '',
      speaker_title: '',
      speaker_role: '',
      speech_topic: '',
      allocated_minutes: '',
      speaking_order: '',
      notes: '',
      confirmed: false,
    });
  };

  const resetAwardForm = () => {
    setAwardFormData({
      award_category: '',
      award_description: '',
      recipient_type: 'individual',
      recipient_name: '',
      presentor_name: '',
      notes: '',
    });
  };

  const openEditDialog = () => {
    if (!ceremonyEvent) return;

    setFormData({
      scheduled_date: ceremonyEvent.scheduled_date || '',
      scheduled_time: ceremonyEvent.scheduled_time || '',
      location: ceremonyEvent.location || '',
      duration_minutes: ceremonyEvent.duration_minutes?.toString() || '',
      description: ceremonyEvent.description || '',
      organizer_notes: ceremonyEvent.organizer_notes || '',
      status: ceremonyEvent.status,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading ceremony planning...</p>
        </CardContent>
      </Card>
    );
  }

  if (!ceremonyEvent) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No closing ceremony configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Closing Ceremony Planning</h3>
          <p className="text-muted-foreground">Default closing ceremony checklist</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditDialog}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
            <Button variant="outline" onClick={() => setSpeakerDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Speaker
            </Button>
            <Button variant="outline" onClick={() => setAwardDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Award
            </Button>
          </div>
        )}
      </div>

      {/* Ceremony Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ceremony Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ceremonyEvent.scheduled_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="text-base">{new Date(ceremonyEvent.scheduled_date).toLocaleDateString()}</p>
              </div>
            )}
            {ceremonyEvent.scheduled_time && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time</p>
                <p className="text-base">{ceremonyEvent.scheduled_time}</p>
              </div>
            )}
            {ceremonyEvent.location && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-base">{ceremonyEvent.location}</p>
              </div>
            )}
            {ceremonyEvent.duration_minutes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-base">{ceremonyEvent.duration_minutes} minutes</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge className="mt-1">{ceremonyEvent.status}</Badge>
            </div>
          </div>
          {ceremonyEvent.organizer_notes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Organizer Notes</p>
              <p className="text-base mt-1">{ceremonyEvent.organizer_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Ceremony Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Ceremony Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEFAULT_CEREMONY_PLAN.sections.map((section, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="flex items-start gap-3">
                {canManage && (
                  <div className="pt-1">
                    <Checkbox
                      checked={checklistItems[idx.toString()]}
                      onCheckedChange={() => toggleChecklistItem(idx.toString())}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{section.name}</h4>
                      {section.duration && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {section.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {section.responsible}
                          </span>
                        </div>
                      )}
                      {!section.duration && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {section.responsible}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection(idx.toString())}
                    >
                      {sectionsExpanded[idx.toString()] ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                  {sectionsExpanded[idx.toString()] && (
                    <div className="mt-3 space-y-2">
                      {section.items.map((item, itemIdx) => (
                        <p key={itemIdx} className="text-sm text-muted-foreground pl-4">
                          {item}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Speakers List */}
      {speakers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Speakers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {speakers.map((speaker) => (
                <div key={speaker.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{speaker.speaker_name}</h5>
                        {speaker.confirmed && (
                          <Badge variant="default" className="text-xs">Confirmed</Badge>
                        )}
                      </div>
                      {speaker.speaker_title && (
                        <p className="text-sm text-muted-foreground">{speaker.speaker_title}</p>
                      )}
                      {speaker.speech_topic && (
                        <p className="text-sm mt-1">{speaker.speech_topic}</p>
                      )}
                      {speaker.allocated_minutes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Duration: {speaker.allocated_minutes} minutes
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Awards List */}
      {awards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Awards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {awards.map((award) => (
                <div key={award.id} className="border rounded-lg p-3">
                  <h5 className="font-medium">{award.award_category}</h5>
                  {award.recipient_name && (
                    <p className="text-sm text-muted-foreground">Recipient: {award.recipient_name}</p>
                  )}
                  {award.award_description && (
                    <p className="text-sm mt-1">{award.award_description}</p>
                  )}
                  {award.presentor_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Presentor: {award.presentor_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Ceremony Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ceremony Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Time</label>
                <Input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Jamia Sports Complex"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  placeholder="e.g., 120"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Ceremony description..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Organizer Notes</label>
              <Textarea
                value={formData.organizer_notes}
                onChange={(e) => setFormData({ ...formData, organizer_notes: e.target.value })}
                rows={3}
                placeholder="Internal notes..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDetails}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Speaker Dialog */}
      <Dialog open={speakerDialogOpen} onOpenChange={setSpeakerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Speaker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Speaker Name *</label>
              <Input
                value={speakerFormData.speaker_name}
                onChange={(e) => setSpeakerFormData({ ...speakerFormData, speaker_name: e.target.value })}
                placeholder="Enter speaker name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={speakerFormData.speaker_title}
                onChange={(e) => setSpeakerFormData({ ...speakerFormData, speaker_title: e.target.value })}
                placeholder="e.g., CEO, Founder"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <Input
                value={speakerFormData.speaker_role}
                onChange={(e) => setSpeakerFormData({ ...speakerFormData, speaker_role: e.target.value })}
                placeholder="e.g., Guest Speaker"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Speech Topic</label>
              <Input
                value={speakerFormData.speech_topic}
                onChange={(e) => setSpeakerFormData({ ...speakerFormData, speech_topic: e.target.value })}
                placeholder="Topic of the speech"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Allocated Minutes</label>
                <Input
                  type="number"
                  value={speakerFormData.allocated_minutes}
                  onChange={(e) => setSpeakerFormData({ ...speakerFormData, allocated_minutes: e.target.value })}
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Speaking Order</label>
                <Input
                  type="number"
                  value={speakerFormData.speaking_order}
                  onChange={(e) => setSpeakerFormData({ ...speakerFormData, speaking_order: e.target.value })}
                  placeholder="e.g., 1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={speakerFormData.notes}
                onChange={(e) => setSpeakerFormData({ ...speakerFormData, notes: e.target.value })}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={speakerFormData.confirmed}
                onCheckedChange={(checked) => setSpeakerFormData({ ...speakerFormData, confirmed: checked as boolean })}
              />
              <label className="text-sm">Confirmed</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpeakerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSpeaker}>Add Speaker</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Award Dialog */}
      <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Award</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Award Category *</label>
              <Input
                value={awardFormData.award_category}
                onChange={(e) => setAwardFormData({ ...awardFormData, award_category: e.target.value })}
                placeholder="e.g., MSP male of the League"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={awardFormData.award_description}
                onChange={(e) => setAwardFormData({ ...awardFormData, award_description: e.target.value })}
                rows={2}
                placeholder="Award description..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Recipient Type</label>
              <Select
                value={awardFormData.recipient_type}
                onValueChange={(value) => setAwardFormData({ ...awardFormData, recipient_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Recipient Name</label>
                <Input
                  value={awardFormData.recipient_name}
                  onChange={(e) => setAwardFormData({ ...awardFormData, recipient_name: e.target.value })}
                  placeholder="e.g., Dev Raj"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Presentor Name</label>
                <Input
                  value={awardFormData.presentor_name}
                  onChange={(e) => setAwardFormData({ ...awardFormData, presentor_name: e.target.value })}
                  placeholder="e.g., Event Sponsor"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={awardFormData.notes}
                onChange={(e) => setAwardFormData({ ...awardFormData, notes: e.target.value })}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwardDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAward}>Add Award</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

