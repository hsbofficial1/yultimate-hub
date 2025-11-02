import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Activity, Zap, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('player');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
    
    // Check if this is a password reset callback
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    if (token && type === 'recovery') {
      setIsPasswordReset(true);
      setIsLogin(false);
    }
  }, [user, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isPasswordReset) {
        // Handle password reset confirmation
        const { error } = await supabase.auth.updateUser({ password: password });
        if (error) {
          toast({
            title: "Password reset failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Password reset successful",
            description: "You can now sign in with your new password",
          });
          setIsPasswordReset(false);
          setIsLogin(true);
          setPassword('');
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        const { error } = await signUp(email, password, name, role);
        if (error) {
          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created!",
            description: "Welcome to Y-Ultimate",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password reset email sent",
          description: "Check your email for reset instructions",
        });
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg border border-border bg-card">
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 rounded-lg bg-primary flex items-center justify-center mb-4">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">
              Y-Ultimate
            </h1>
            <p className="text-sm text-muted-foreground">
              Tournament & Coaching Management
            </p>
          </div>

          <Tabs 
            value={isPasswordReset ? 'reset' : (isLogin ? 'login' : 'signup')} 
            onValueChange={(v) => {
              setIsPasswordReset(v === 'reset');
              setIsLogin(v === 'login');
            }} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                disabled={isPasswordReset}
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                disabled={isPasswordReset}
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reset" className="space-y-4 mt-0">
              <div className="text-center mb-4">
                <Key className="h-12 w-12 mx-auto mb-3 text-primary" />
                <h3 className="text-lg font-semibold mb-1">Reset Password</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your new password below
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-password" className="text-sm font-medium">
                    New Password
                  </Label>
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-10"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-10"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4 animate-spin" />
                      Resetting...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsPasswordReset(false);
                    setIsLogin(true);
                    setPassword('');
                  }}
                >
                  Back to Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login" className="space-y-4 mt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResetting || !email}
                    className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResetting ? 'Sending...' : 'Forgot password?'}
                  </button>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-10"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Role
                  </Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="player">Player</SelectItem>
                      <SelectItem value="team_captain">Team Captain</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="tournament_director">Tournament Director</SelectItem>
                      <SelectItem value="program_manager">Program Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-10"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4 animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our terms of service.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
