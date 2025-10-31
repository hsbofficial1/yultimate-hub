import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Upload,
  Merge,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ChildProfileDialog } from '@/components/ChildProfileDialog';
import { BulkImportWizard } from '@/components/BulkImportWizard';
import { DuplicateDetectionDialog } from '@/components/DuplicateDetectionDialog';

interface Child {
  id: string;
  name: string;
  age: number;
  gender: string;
  school: string | null;
  community: string | null;
  active: boolean;
  join_date: string;
  photo_url: string | null;
  parent_name: string;
  parent_phone: string;
}

const Children = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [filteredChildren, setFilteredChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (userRole !== 'coach' && userRole !== 'program_manager' && userRole !== 'admin') {
      navigate('/');
      return;
    }
    fetchChildren();
  }, [userRole, navigate]);

  useEffect(() => {
    applyFilters();
  }, [children, searchQuery, ageFilter, genderFilter, schoolFilter, activeFilter]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setChildren(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching children',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...children];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (child) =>
          child.name.toLowerCase().includes(query) ||
          child.parent_name.toLowerCase().includes(query) ||
          child.parent_phone.includes(query) ||
          (child.school && child.school.toLowerCase().includes(query)) ||
          (child.community && child.community.toLowerCase().includes(query))
      );
    }

    // Age filter
    if (ageFilter !== 'all') {
      const [min, max] = ageFilter.split('-').map(Number);
      filtered = filtered.filter((child) => {
        if (max) {
          return child.age >= min && child.age <= max;
        }
        return child.age >= min;
      });
    }

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter((child) => child.gender === genderFilter);
    }

    // School filter
    if (schoolFilter !== 'all') {
      if (schoolFilter === 'none') {
        filtered = filtered.filter((child) => !child.school);
      } else {
        filtered = filtered.filter((child) => child.school === schoolFilter);
      }
    }

    // Active filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter((child) =>
        activeFilter === 'active' ? child.active : !child.active
      );
    }

    setFilteredChildren(filtered);
  };

  const uniqueSchools = useMemo(() => {
    const schools = new Set(children.map((c) => c.school).filter(Boolean));
    return Array.from(schools).sort();
  }, [children]);

  const handleChildClick = (childId: string) => {
    setSelectedChildId(childId);
    setProfileDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedChildId(undefined);
    setProfileDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setAgeFilter('all');
    setGenderFilter('all');
    setSchoolFilter('all');
    setActiveFilter('all');
  };

  const hasActiveFilters =
    searchQuery ||
    ageFilter !== 'all' ||
    genderFilter !== 'all' ||
    schoolFilter !== 'all' ||
    activeFilter !== 'all';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Players</h1>
                  <p className="text-xs text-muted-foreground">
                    {filteredChildren.length} {filteredChildren.length === 1 ? 'player' : 'players'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setDuplicateDialogOpen(true)}
              >
                <Merge className="h-4 w-4 mr-2" />
                Find Duplicates
              </Button>
              <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, parent, phone, school, or community..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {[
                      searchQuery && 'Search',
                      ageFilter !== 'all' && 'Age',
                      genderFilter !== 'all' && 'Gender',
                      schoolFilter !== 'all' && 'School',
                      activeFilter !== 'all' && 'Status',
                    ]
                      .filter(Boolean)
                      .length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-1 block">Age</label>
                  <Select value={ageFilter} onValueChange={setAgeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ages</SelectItem>
                      <SelectItem value="5-8">5-8 years</SelectItem>
                      <SelectItem value="9-12">9-12 years</SelectItem>
                      <SelectItem value="13-15">13-15 years</SelectItem>
                      <SelectItem value="16-18">16-18 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Gender</label>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">School</label>
                  <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schools</SelectItem>
                      <SelectItem value="none">No School</SelectItem>
                      {uniqueSchools.map((school) => (
                        <SelectItem key={school} value={school}>
                          {school}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={activeFilter} onValueChange={setActiveFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading profiles...</p>
          </div>
        ) : filteredChildren.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {children.length === 0
                  ? 'No children enrolled yet'
                  : 'No children match your filters'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {children.length === 0
                  ? 'Start adding children to your coaching program!'
                  : 'Try adjusting your search or filter criteria'}
              </p>
              {children.length === 0 ? (
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Child
                </Button>
              ) : (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredChildren.map((child) => (
              <Card
                key={child.id}
                className="hover:shadow-md transition-shadow duration-200 cursor-pointer border border-border"
                onClick={() => handleChildClick(child.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={child.photo_url || ''} alt={child.name} />
                        <AvatarFallback>
                          {child.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{child.name}</CardTitle>
                        <CardDescription>
                          Age {child.age} • {child.gender === 'male' ? 'M' : child.gender === 'female' ? 'F' : 'O'}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={child.active ? 'default' : 'secondary'}>
                      {child.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {child.school && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">School:</span> {child.school}
                    </p>
                  )}
                  {child.community && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Community:</span> {child.community}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Parent:</span> {child.parent_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Joined:</span>{' '}
                    {new Date(child.join_date).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ChildProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        childId={selectedChildId}
        onSuccess={() => {
          fetchChildren();
          setProfileDialogOpen(false);
        }}
      />

      <BulkImportWizard
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onSuccess={fetchChildren}
      />

      <DuplicateDetectionDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        onSuccess={fetchChildren}
      />
    </div>
  );
};

export default Children;
