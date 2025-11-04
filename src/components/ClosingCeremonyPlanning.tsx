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
  Gift,
  Star,
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
  team_id?: string | null;
  team_name?: string | null;
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

interface Team {
  id: string;
  name: string;
}

interface ClosingCeremonyPlanningProps {
  tournamentId: string;
  canManage: boolean;
}

export const ClosingCeremonyPlanning = ({ tournamentId, canManage }: ClosingCeremonyPlanningProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ceremonyEvent, setCeremonyEvent] = useState<CeremonyEvent | null>(null);
  const [speakers, setSpeakers] = useState<CeremonySpeaker[]>([]);
  const [awards, setAwards] = useState<CeremonyAward[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [speakerDialogOpen, setSpeakerDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<CeremonySpeaker | null>(null);
  const [editingAward, setEditingAward] = useState<CeremonyAward | null>(null);

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
    speaker_role: 'team_speech',
    speech_topic: '',
    allocated_minutes: '3',
    speaking_order: '',
    notes: '',
    confirmed: false,
    team_id: '',
  });

  const [awardFormData, setAwardFormData] = useState({
    award_category: '',
    award_description: '',
    recipient_type: 'individual',
    recipient_name: '',
    presentor_name: '',
    jersey_count: '1',
    notes: '',
  });

  useEffect(() => {
    fetchCeremonyData();
    fetchTeams();
  }, [tournamentId]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('tournament_id', tournamentId)
        .in('status', ['approved', 'registered'])
        .order('name', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchCeremonyData = async () => {
    try {
      setLoading(true);

      let { data: eventData, error: eventError } = await supabase
        .from('ceremony_events')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('event_type', 'closing_ceremony')
        .maybeSingle();

      if (eventError && eventError.code !== 'PGRST116') throw eventError;

      if (!eventData && canManage) {
        const { data: newEvent, error: createError } = await supabase
          .from('ceremony_events')
          .insert({
            tournament_id: tournamentId,
            event_name: 'Closing Ceremony',
            event_type: 'closing_ceremony',
            description: 'Closing ceremony for tournament',
            status: 'planned',
          })
          .select()
          .single();

        if (createError) throw createError;
        eventData = newEvent;
      }

      if (eventData) {
        setCeremonyEvent(eventData);
        setFormData({
          scheduled_date: eventData.scheduled_date || '',
          scheduled_time: eventData.scheduled_time || '',
          location: eventData.location || '',
          duration_minutes: eventData.duration_minutes?.toString() || '',
          description: eventData.description || '',
          organizer_notes: eventData.organizer_notes || '',
          status: eventData.status,
        });

        const { data: speakersData, error: speakersError } = await supabase
          .from('ceremony_speakers')
          .select('*')
          .eq('ceremony_id', eventData.id)
          .order('speaking_order', { ascending: true });

        if (speakersError) throw speakersError;
        setSpeakers(speakersData || []);

        const { data: awardsData, error: awardsError } = await supabase
          .from('ceremony_awards')
          .select('*')
          .eq('ceremony_id', eventData.id)
          .order('id', { ascending: true });

        if (awardsError) throw awardsError;
        setAwards(awardsData || []);
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

    if (speakerFormData.speaker_role === 'parent_response') {
      const parentCount = speakers.filter(s => s.speaker_role === 'parent_response').length;
      if (parentCount >= 3 && !editingSpeaker) {
        toast({
          title: 'Limit reached',
          description: 'Maximum 3 parent responses allowed',
          variant: 'destructive',
        });
        return;
      }
    }

    if (speakerFormData.speaker_role === 'open_to_everyone') {
      const openCount = speakers.filter(s => s.speaker_role === 'open_to_everyone').length;
      if (openCount >= 5 && !editingSpeaker) {
        toast({
          title: 'Limit reached',
          description: 'Maximum 5 open responses allowed',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const speakerData: any = {
        ceremony_id: ceremonyEvent.id,
        speaker_name: speakerFormData.speaker_name,
        speaker_title: speakerFormData.speaker_title || null,
        speaker_role: speakerFormData.speaker_role,
        speech_topic: speakerFormData.speech_topic || null,
        allocated_minutes: speakerFormData.allocated_minutes ? parseInt(speakerFormData.allocated_minutes) : null,
        speaking_order: speakerFormData.speaking_order ? parseInt(speakerFormData.speaking_order) : null,
        notes: speakerFormData.notes || null,
        confirmed: speakerFormData.confirmed,
      };

      if (speakerFormData.speaker_role === 'team_speech' && speakerFormData.team_id) {
        speakerData.team_id = speakerFormData.team_id;
        const selectedTeam = teams.find(t => t.id === speakerFormData.team_id);
        if (selectedTeam) {
          speakerData.team_name = selectedTeam.name;
        }
      }

      if (editingSpeaker) {
        const { error } = await supabase
          .from('ceremony_speakers')
          .update(speakerData)
          .eq('id', editingSpeaker.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Speaker updated' });
      } else {
        const { error } = await supabase
          .from('ceremony_speakers')
          .insert(speakerData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Speaker added' });
      }

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
      let notes = awardFormData.notes || '';
      if (awardFormData.jersey_count) {
        notes = `Jerseys: ${awardFormData.jersey_count}${notes ? '\n' + notes : ''}`.trim();
      }

      const awardData: any = {
        ceremony_id: ceremonyEvent.id,
        award_category: awardFormData.award_category,
        award_description: awardFormData.award_description || null,
        recipient_type: awardFormData.recipient_type || null,
        recipient_name: awardFormData.recipient_name || null,
        presentor_name: awardFormData.presentor_name || null,
        notes: notes || null,
      };

      if (editingAward) {
        const { error } = await supabase
          .from('ceremony_awards')
          .update(awardData)
          .eq('id', editingAward.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Award updated' });
      } else {
        const { error } = await supabase
          .from('ceremony_awards')
          .insert(awardData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Award added' });
      }

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

  const handleDeleteSpeaker = async (speakerId: string) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from('ceremony_speakers')
        .delete()
        .eq('id', speakerId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Speaker removed' });
      fetchCeremonyData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteAward = async (awardId: string) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from('ceremony_awards')
        .delete()
        .eq('id', awardId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Award removed' });
      fetchCeremonyData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetSpeakerForm = () => {
    setSpeakerFormData({
      speaker_name: '',
      speaker_title: '',
      speaker_role: 'team_speech',
      speech_topic: '',
      allocated_minutes: '3',
      speaking_order: '',
      notes: '',
      confirmed: false,
      team_id: '',
    });
    setEditingSpeaker(null);
  };

  const resetAwardForm = () => {
    setAwardFormData({
      award_category: '',
      award_description: '',
      recipient_type: 'individual',
      recipient_name: '',
      presentor_name: '',
      jersey_count: '1',
      notes: '',
    });
    setEditingAward(null);
  };

  const openEditSpeakerDialog = (speaker: CeremonySpeaker) => {
    setEditingSpeaker(speaker);
    setSpeakerFormData({
      speaker_name: speaker.speaker_name,
      speaker_title: speaker.speaker_title || '',
      speaker_role: speaker.speaker_role || 'team_speech',
      speech_topic: speaker.speech_topic || '',
      allocated_minutes: speaker.allocated_minutes?.toString() || '3',
      speaking_order: speaker.speaking_order?.toString() || '',
      notes: speaker.notes || '',
      confirmed: speaker.confirmed,
      team_id: speaker.team_id || '',
    });
    setSpeakerDialogOpen(true);
  };

  const openEditAwardDialog = (award: CeremonyAward) => {
    setEditingAward(award);
    let jerseyCount = '1';
    if (award.notes && award.notes.includes('Jerseys:')) {
      const match = award.notes.match(/Jerseys:\s*(\d+)/);
      if (match) jerseyCount = match[1];
    }
    
    setAwardFormData({
      award_category: award.award_category,
      award_description: award.award_description || '',
      recipient_type: award.recipient_type || 'individual',
      recipient_name: award.recipient_name || '',
      presentor_name: award.presentor_name || '',
      jersey_count: jerseyCount,
      notes: award.notes?.replace(/Jerseys:\s*\d+\n?/i, '').trim() || '',
    });
    setAwardDialogOpen(true);
  };

  const openAddSpeakerDialog = (role: string = 'team_speech') => {
    resetSpeakerForm();
    setSpeakerFormData(prev => ({ ...prev, speaker_role: role }));
    setSpeakerDialogOpen(true);
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
          {canManage && (
            <Button className="mt-4" onClick={fetchCeremonyData}>
              Initialize Ceremony
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const teamSpeeches = speakers.filter(s => s.speaker_role === 'team_speech');
  const parentResponses = speakers.filter(s => s.speaker_role === 'parent_response');
  const openToEveryone = speakers.filter(s => s.speaker_role === 'open_to_everyone');
  const specialMentions = speakers.filter(s => s.speaker_role === 'special_mention');
  const teamsWithoutSpeech = teams.filter(team => 
    !teamSpeeches.some(speech => speech.team_id === team.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Ceremony Planning</h3>
          <p className="text-muted-foreground">Manage closing ceremony schedule and activities</p>
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Details
          </Button>
        )}
      </div>

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Team Speeches
            </CardTitle>
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => openAddSpeakerDialog('team_speech')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Team Speech
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            1 response from each participating team. Participation certificate given after each speech (3 minutes each)
          </p>
        </CardHeader>
        <CardContent>
          {teamSpeeches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No team speeches scheduled yet</p>
              {canManage && teams.length > 0 && (
                <p className="text-xs mt-2">{teams.length} team(s) available for speeches</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {teamSpeeches.map((speaker) => (
                <div key={speaker.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">{speaker.speaker_name}</h5>
                      {speaker.team_name && <Badge variant="secondary">{speaker.team_name}</Badge>}
                      {speaker.confirmed && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                      )}
                    </div>
                    {speaker.speech_topic && (
                      <p className="text-sm text-muted-foreground mt-1">{speaker.speech_topic}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {speaker.allocated_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {speaker.allocated_minutes} min
                        </span>
                      )}
                      {speaker.speaking_order && <span>Order: #{speaker.speaking_order}</span>}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditSpeakerDialog(speaker)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSpeaker(speaker.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parents' Response
            </CardTitle>
            {canManage && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => openAddSpeakerDialog('parent_response')}
                disabled={parentResponses.length >= 3}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Parent ({parentResponses.length}/3)
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Maximum 3 responses from parents (5 minutes total)
          </p>
        </CardHeader>
        <CardContent>
          {parentResponses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No parent responses scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {parentResponses.map((speaker) => (
                <div key={speaker.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">{speaker.speaker_name}</h5>
                      {speaker.confirmed && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                      )}
                    </div>
                    {speaker.speech_topic && (
                      <p className="text-sm text-muted-foreground mt-1">{speaker.speech_topic}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditSpeakerDialog(speaker)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSpeaker(speaker.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Open to Everyone
            </CardTitle>
            {canManage && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => openAddSpeakerDialog('open_to_everyone')}
                disabled={openToEveryone.length >= 5}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Speaker ({openToEveryone.length}/5)
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Maximum 5 responses from volunteers or donors (5 minutes total)
          </p>
        </CardHeader>
        <CardContent>
          {openToEveryone.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No open speakers scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openToEveryone.map((speaker) => (
                <div key={speaker.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">{speaker.speaker_name}</h5>
                      {speaker.speaker_title && <Badge variant="secondary">{speaker.speaker_title}</Badge>}
                      {speaker.confirmed && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                      )}
                    </div>
                    {speaker.speech_topic && (
                      <p className="text-sm text-muted-foreground mt-1">{speaker.speech_topic}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditSpeakerDialog(speaker)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSpeaker(speaker.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Special Mention
            </CardTitle>
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => openAddSpeakerDialog('special_mention')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Mention
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Thank venue partners and community sponsors (2 minutes)
          </p>
        </CardHeader>
        <CardContent>
          {specialMentions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No special mentions scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {specialMentions.map((speaker) => (
                <div key={speaker.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">{speaker.speaker_name}</h5>
                      {speaker.speaker_title && <Badge variant="secondary">{speaker.speaker_title}</Badge>}
                    </div>
                    {speaker.speech_topic && (
                      <p className="text-sm text-muted-foreground mt-1">{speaker.speech_topic}</p>
                    )}
                    {speaker.notes && <p className="text-sm mt-2">{speaker.notes}</p>}
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditSpeakerDialog(speaker)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSpeaker(speaker.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Medal Ceremony
            </CardTitle>
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setAwardDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Award
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Awards and recognitions with jersey counts
          </p>
        </CardHeader>
        <CardContent>
          {awards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No awards scheduled yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {awards.map((award) => {
                let jerseyCount = null;
                if (award.notes && award.notes.includes('Jerseys:')) {
                  const match = award.notes.match(/Jerseys:\s*(\d+)/);
                  if (match) jerseyCount = parseInt(match[1]);
                }

                return (
                  <div key={award.id} className="border rounded-lg p-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{award.award_category}</h5>
                        {jerseyCount !== null && (
                          <Badge variant="secondary">
                            <Gift className="h-3 w-3 mr-1" />
                            {jerseyCount} Jersey{jerseyCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      {award.recipient_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Winner: <span className="font-medium">{award.recipient_name}</span>
                        </p>
                      )}
                      {award.award_description && (
                        <p className="text-sm mt-1">{award.award_description}</p>
                      )}
                      {award.presentor_name && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Presented by: {award.presentor_name}
                        </p>
                      )}
                      {award.notes && !award.notes.includes('Jerseys:') && (
                        <p className="text-xs text-muted-foreground mt-2">{award.notes}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditAwardDialog(award)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAward(award.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Add/Edit Speaker Dialog */}
      <Dialog open={speakerDialogOpen} onOpenChange={(open) => {
        setSpeakerDialogOpen(open);
        if (!open) resetSpeakerForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSpeaker ? 'Edit Speaker' : 'Add Speaker'}</DialogTitle>
            <DialogDescription>
              {speakerFormData.speaker_role === 'team_speech' && 'Add a team representative speech'}
              {speakerFormData.speaker_role === 'parent_response' && 'Add a parent response (max 3)'}
              {speakerFormData.speaker_role === 'open_to_everyone' && 'Add an open speaker (max 5)'}
              {speakerFormData.speaker_role === 'special_mention' && 'Add a special mention'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Speaker Role *</label>
              <Select 
                value={speakerFormData.speaker_role} 
                onValueChange={(value) => setSpeakerFormData({ ...speakerFormData, speaker_role: value, team_id: '' })}
                disabled={!!editingSpeaker}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_speech">Team Speech</SelectItem>
                  <SelectItem value="parent_response">Parent Response</SelectItem>
                  <SelectItem value="open_to_everyone">Open to Everyone</SelectItem>
                  <SelectItem value="special_mention">Special Mention</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {speakerFormData.speaker_role === 'team_speech' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Team *</label>
                <Select 
                  value={speakerFormData.team_id} 
                  onValueChange={(value) => setSpeakerFormData({ ...speakerFormData, team_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                        {teamSpeeches.some(s => s.team_id === team.id && s.id !== editingSpeaker?.id) && ' (Already assigned)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Speaker Name *</label>
              <Input
                value={speakerFormData.speaker_name}
                onChange={(e) => setSpeakerFormData({ ...speakerFormData, speaker_name: e.target.value })}
                placeholder="Enter speaker name"
              />
            </div>

            {speakerFormData.speaker_role !== 'team_speech' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={speakerFormData.speaker_title}
                  onChange={(e) => setSpeakerFormData({ ...speakerFormData, speaker_title: e.target.value })}
                  placeholder="e.g., Parent, Volunteer, Donor"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Speech Topic / Mention</label>
              <Input
                value={speakerFormData.speech_topic}
                onChange={(e) => setSpeakerFormData({ ...speakerFormData, speech_topic: e.target.value })}
                placeholder="Topic or mention details"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Allocated Minutes</label>
                <Input
                  type="number"
                  value={speakerFormData.allocated_minutes}
                  onChange={(e) => setSpeakerFormData({ ...speakerFormData, allocated_minutes: e.target.value })}
                  placeholder="e.g., 3"
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
            <Button variant="outline" onClick={() => {
              setSpeakerDialogOpen(false);
              resetSpeakerForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddSpeaker}>
              {editingSpeaker ? 'Update Speaker' : 'Add Speaker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Award Dialog */}
      <Dialog open={awardDialogOpen} onOpenChange={(open) => {
        setAwardDialogOpen(open);
        if (!open) resetAwardForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAward ? 'Edit Award' : 'Add Award'}</DialogTitle>
            <DialogDescription>
              Add an award to be presented during the medal ceremony
            </DialogDescription>
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
                <label className="text-sm font-medium mb-2 block">Number of Jerseys</label>
                <Input
                  type="number"
                  value={awardFormData.jersey_count}
                  onChange={(e) => setAwardFormData({ ...awardFormData, jersey_count: e.target.value })}
                  placeholder="e.g., 1"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Presentor Name</label>
              <Input
                value={awardFormData.presentor_name}
                onChange={(e) => setAwardFormData({ ...awardFormData, presentor_name: e.target.value })}
                placeholder="e.g., Event Sponsor"
              />
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
            <Button variant="outline" onClick={() => {
              setAwardDialogOpen(false);
              resetAwardForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddAward}>
              {editingAward ? 'Update Award' : 'Add Award'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
