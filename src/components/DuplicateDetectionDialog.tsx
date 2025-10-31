import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, AlertTriangle, Merge, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DuplicateDetectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DuplicateGroup {
  id: string;
  children: Array<{
    id: string;
    name: string;
    age: number;
    gender: string;
    school: string | null;
    parent_name: string;
    parent_phone: string;
    join_date: string;
    active: boolean;
  }>;
  confidence: number;
  reason: string;
}

export const DuplicateDetectionDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: DuplicateDetectionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [primarySelections, setPrimarySelections] = useState<Map<string, string>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      detectDuplicates();
    } else {
      setDuplicateGroups([]);
      setSelectedGroups(new Set());
      setPrimarySelections(new Map());
    }
  }, [open]);

  const detectDuplicates = async () => {
    try {
      setLoading(true);
      const { data: children, error } = await supabase
        .from('children')
        .select('*')
        .order('name');

      if (error) throw error;

      // Simple duplicate detection algorithm
      // Group by similar name and phone number
      const groups: Map<string, DuplicateGroup> = new Map();

      children?.forEach((child1, i) => {
        children.slice(i + 1).forEach((child2) => {
          // Calculate similarity scores
          const nameSimilarity = calculateSimilarity(
            child1.name.toLowerCase(),
            child2.name.toLowerCase()
          );
          const phoneMatch = normalizePhone(child1.parent_phone) === normalizePhone(child2.parent_phone);
          const nameMatch = nameSimilarity > 0.8;

          if ((nameMatch && phoneMatch) || (nameMatch && nameSimilarity > 0.9)) {
            const groupKey = `${child1.id}-${child2.id}`;
            const existingGroup = Array.from(groups.values()).find(
              (g) => g.children.some((c) => c.id === child1.id || c.id === child2.id)
            );

            if (existingGroup) {
              if (!existingGroup.children.some((c) => c.id === child2.id)) {
                existingGroup.children.push(child2);
              }
            } else {
              const confidence = phoneMatch ? 95 : nameSimilarity * 100;
              groups.set(groupKey, {
                id: groupKey,
                children: [child1, child2],
                confidence: Math.round(confidence),
                reason: phoneMatch
                  ? 'Matching name and phone number'
                  : `Similar names (${Math.round(nameSimilarity * 100)}%)`,
              });
            }
          }
        });
      });

      setDuplicateGroups(Array.from(groups.values()));
    } catch (error: any) {
      toast({
        title: 'Error detecting duplicates',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    // Simple Levenshtein-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  const toggleGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
      const newSelections = new Map(primarySelections);
      newSelections.delete(groupId);
      setPrimarySelections(newSelections);
    } else {
      newSelected.add(groupId);
      const group = duplicateGroups.find((g) => g.id === groupId);
      if (group) {
        // Auto-select the most recent active child as primary
        const primary = group.children
          .sort((a, b) => {
            if (a.active !== b.active) return a.active ? -1 : 1;
            return new Date(b.join_date).getTime() - new Date(a.join_date).getTime();
          })[0];
        setPrimarySelections(new Map(primarySelections).set(groupId, primary.id));
      }
    }
    setSelectedGroups(newSelected);
  };

  const handleMerge = async () => {
    if (selectedGroups.size === 0) {
      toast({
        title: 'No groups selected',
        description: 'Please select duplicate groups to merge',
        variant: 'destructive',
      });
      return;
    }

    try {
      setMerging(true);
      let mergedCount = 0;

      for (const groupId of selectedGroups) {
        const group = duplicateGroups.find((g) => g.id === groupId);
        if (!group) continue;

        const primaryId = primarySelections.get(groupId);
        if (!primaryId) continue;

        const primaryChild = group.children.find((c) => c.id === primaryId);
        const duplicateChildren = group.children.filter((c) => c.id !== primaryId);

        if (!primaryChild) continue;

        // Merge duplicate children into primary
        for (const duplicate of duplicateChildren) {
          // Update all related records to use primary child ID
          // Then delete the duplicate child

          // Update attendance records
          await supabase
            .from('attendance')
            .update({ child_id: primaryId })
            .eq('child_id', duplicate.id);

          // Update program enrollments
          await supabase
            .from('child_program_enrollments')
            .update({ child_id: primaryId })
            .eq('child_id', duplicate.id);

          // Delete duplicate child
          const { error } = await supabase
            .from('children')
            .delete()
            .eq('id', duplicate.id);

          if (error) throw error;
        }

        mergedCount++;
      }

      toast({
        title: 'Merge complete',
        description: `Successfully merged ${mergedCount} duplicate group(s)`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error merging duplicates',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Duplicate Detection & Merge
          </DialogTitle>
          <DialogDescription>
            Find and merge duplicate child profiles based on name and contact information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Scanning for duplicates...</p>
          </div>
        ) : duplicateGroups.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
            <p className="text-muted-foreground">
              All child profiles appear to be unique
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Found <strong>{duplicateGroups.length}</strong> potential duplicate groups. 
                Select groups to merge, and choose which profile to keep as the primary.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {duplicateGroups.map((group) => {
                const isSelected = selectedGroups.has(group.id);
                const primaryId = primarySelections.get(group.id);

                return (
                  <Card key={group.id} className={cn(isSelected && 'border-primary')}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleGroup(group.id)}
                          />
                          <div>
                            <CardTitle className="text-base">
                              {group.children.length} Potential Duplicates
                            </CardTitle>
                            <CardDescription>
                              {group.reason} • {group.confidence}% confidence
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant={group.confidence > 90 ? 'destructive' : 'secondary'}
                        >
                          {group.confidence}% match
                        </Badge>
                      </div>
                    </CardHeader>
                    {isSelected && (
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium mb-2">Select primary profile (others will be merged into this):</p>
                          {group.children.map((child) => (
                            <div
                              key={child.id}
                              className={cn(
                                'flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent',
                                primaryId === child.id && 'border-primary bg-primary/5'
                              )}
                              onClick={() =>
                                setPrimarySelections(new Map(primarySelections).set(group.id, child.id))
                              }
                            >
                              <input
                                type="radio"
                                checked={primaryId === child.id}
                                onChange={() =>
                                  setPrimarySelections(new Map(primarySelections).set(group.id, child.id))
                                }
                                className="h-4 w-4"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{child.name}</p>
                                  {child.active && <Badge variant="outline">Active</Badge>}
                                  {primaryId === child.id && (
                                    <Badge>Primary</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Age {child.age} • {child.parent_name} • {child.parent_phone}
                                </p>
                                {child.school && (
                                  <p className="text-sm text-muted-foreground">
                                    {child.school}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                    {!isSelected && (
                      <CardContent>
                        <div className="space-y-2">
                          {group.children.map((child) => (
                            <div
                              key={child.id}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <div>
                                <p className="font-medium">{child.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {child.parent_name} • {child.parent_phone}
                                </p>
                              </div>
                              <Badge variant={child.active ? 'default' : 'secondary'}>
                                {child.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleMerge}
                disabled={selectedGroups.size === 0 || merging}
              >
                {merging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Merge className="h-4 w-4 mr-2" />
                    Merge {selectedGroups.size} Group(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};


