import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Calendar, TrendingUp, Brain, Activity, Users, Heart, Target, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { LSASAssessmentDialog } from './LSASAssessmentDialog';

interface AssessmentProgress {
  assessment_date: string;
  assessment_type: string;
  physical_score: number;
  social_score: number;
  emotional_score: number;
  cognitive_score: number;
  average_score: number;
  cohort_physical: number | null;
  cohort_social: number | null;
  cohort_emotional: number | null;
  cohort_cognitive: number | null;
  cohort_average: number | null;
}

interface LSASProgressChartProps {
  childId: string;
  childName: string;
}

export const LSASProgressChart = ({ childId, childName }: LSASProgressChartProps) => {
  const [assessments, setAssessments] = useState<AssessmentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    baseline: 0,
    endline: 0,
    periodic: 0,
    currentAverage: 0,
    improvement: 0,
  });

  useEffect(() => {
    fetchAssessmentProgress();
  }, [childId]);

  const fetchAssessmentProgress = async () => {
    try {
      setLoading(true);

      // Use the database function for assessment progress with cohort comparison
      const { data, error } = await supabase.rpc('get_child_assessment_progress', {
        _child_id: childId,
      });

      if (error) {
        console.error('Error fetching assessment progress:', error);
        // Fallback to direct query if function doesn't exist
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('lsas_assessments')
          .select('*')
          .eq('child_id', childId)
          .order('assessment_date', { ascending: true });

        if (assessmentError) throw assessmentError;

        const formattedData = assessmentData?.map((a) => ({
          assessment_date: a.assessment_date,
          assessment_type: a.assessment_type,
          physical_score: a.physical_score,
          social_score: a.social_score,
          emotional_score: a.emotional_score,
          cognitive_score: a.cognitive_score,
          average_score: (a.physical_score + a.social_score + a.emotional_score + a.cognitive_score) / 4,
          cohort_physical: null,
          cohort_social: null,
          cohort_emotional: null,
          cohort_cognitive: null,
          cohort_average: null,
        })) || [];

        setAssessments(formattedData);
      } else {
        setAssessments(data || []);
      }

      // Calculate statistics
      const total = assessments.length;
      const baseline = assessments.filter((a) => a.assessment_type === 'baseline').length;
      const endline = assessments.filter((a) => a.assessment_type === 'endline').length;
      const periodic = assessments.filter((a) => a.assessment_type === 'periodic').length;

      const currentAverage = assessments.length > 0 
        ? assessments[assessments.length - 1].average_score 
        : 0;

      // Calculate improvement from baseline to most recent
      let improvement = 0;
      const baselineAssessment = assessments.find((a) => a.assessment_type === 'baseline');
      const recentAssessment = assessments[assessments.length - 1];
      
      if (baselineAssessment && recentAssessment) {
        improvement = recentAssessment.average_score - baselineAssessment.average_score;
      }

      setStats({
        total,
        baseline,
        endline,
        periodic,
        currentAverage,
        improvement: Math.round(improvement * 10) / 10,
      });
    } catch (error: any) {
      console.error('Error fetching assessment progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = assessments.map((a) => ({
    date: format(new Date(a.assessment_date), 'MMM d, yyyy'),
    dateRaw: a.assessment_date,
    Physical: a.physical_score,
    Social: a.social_score,
    Emotional: a.emotional_score,
    Cognitive: a.cognitive_score,
    Average: a.average_score,
    'Cohort Avg': a.cohort_average || null,
  }));

  const domainColors = {
    Physical: '#3b82f6', // blue
    Social: '#10b981', // green
    Emotional: '#ef4444', // red
    Cognitive: '#8b5cf6', // purple
    Average: '#f59e0b', // amber
    'Cohort Avg': '#94a3b8', // gray
  };

  const getAssessmentTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'baseline':
        return 'default';
      case 'endline':
        return 'secondary';
      case 'periodic':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getAssessmentTypeLabel = (type: string) => {
    switch (type) {
      case 'baseline':
        return 'Baseline';
      case 'endline':
        return 'Endline';
      case 'periodic':
        return 'Periodic';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading assessment progress...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">LSAS Progress Tracking</h3>
          <p className="text-sm text-muted-foreground">
            Life Skills Assessment System (LSAS) progress over time
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Target className="h-4 w-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="text-lg font-semibold mb-2">No assessments yet</h4>
            <p className="text-muted-foreground mb-4">
              Start tracking {childName}'s development with a baseline assessment
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Create Baseline Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.currentAverage.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">/ 5.0</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {stats.improvement >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                  )}
                  <span className={`text-2xl font-bold ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.improvement >= 0 ? '+' : ''}{stats.improvement.toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="default" className="text-xs">
                    B: {stats.baseline}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    E: {stats.endline}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    P: {stats.periodic}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Progress Timeline</CardTitle>
              <CardDescription>
                Development across all four LSAS domains over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={3} stroke="#94a3b8" strokeDasharray="3 3" label="Average (3)" />
                  {chartData.some((d) => d['Cohort Avg'] !== null) && (
                    <Line
                      type="monotone"
                      dataKey="Cohort Avg"
                      stroke={domainColors['Cohort Avg']}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 4 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="Physical"
                    stroke={domainColors.Physical}
                    strokeWidth={2}
                    dot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Social"
                    stroke={domainColors.Social}
                    strokeWidth={2}
                    dot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Emotional"
                    stroke={domainColors.Emotional}
                    strokeWidth={2}
                    dot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Cognitive"
                    stroke={domainColors.Cognitive}
                    strokeWidth={2}
                    dot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Average"
                    stroke={domainColors.Average}
                    strokeWidth={3}
                    dot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Assessment History */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment History</CardTitle>
              <CardDescription>All recorded assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assessments.map((assessment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {format(new Date(assessment.assessment_date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getAssessmentTypeLabel(assessment.assessment_type)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">
                            {assessment.physical_score}
                          </div>
                          <div className="text-xs text-muted-foreground">Physical</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-green-600">
                            {assessment.social_score}
                          </div>
                          <div className="text-xs text-muted-foreground">Social</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-red-600">
                            {assessment.emotional_score}
                          </div>
                          <div className="text-xs text-muted-foreground">Emotional</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-purple-600">
                            {assessment.cognitive_score}
                          </div>
                          <div className="text-xs text-muted-foreground">Cognitive</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {assessment.average_score.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">Average</div>
                      </div>
                      <Badge variant={getAssessmentTypeBadgeVariant(assessment.assessment_type) as any}>
                        {getAssessmentTypeLabel(assessment.assessment_type)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cohort Comparison Info */}
          {assessments.some((a) => a.cohort_average !== null) && (
            <Card className="bg-blue-50 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Cohort Comparison
                </CardTitle>
                <CardDescription>
                  Your scores compared to the average of similar children (same age/program)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>
                    The dashed line on the chart represents the cohort average. This helps you understand how{' '}
                    {childName} compares to peers in similar programs.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <LSASAssessmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        childId={childId}
        onSuccess={() => {
          fetchAssessmentProgress();
        }}
      />
    </div>
  );
};

