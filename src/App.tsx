import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import MatchScoring from "./pages/MatchScoring";
import TeamRegistration from "./pages/TeamRegistration";
import TeamDetail from "./pages/TeamDetail";
import Reports from "./pages/Reports";
import Children from "./pages/Children";
import Sessions from "./pages/Sessions";
import SessionAttendanceEnhanced from "./pages/SessionAttendanceEnhanced";
import Leaderboards from "./pages/Leaderboards";
import StreakLeaderboardPage from "./pages/StreakLeaderboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments"
              element={
                <ProtectedRoute>
                  <Tournaments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournament/:id"
              element={
                <ProtectedRoute>
                  <TournamentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match/:id"
              element={
                <ProtectedRoute>
                  <MatchScoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournament/:tournamentId/register"
              element={
                <ProtectedRoute>
                  <TeamRegistration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/:id"
              element={
                <ProtectedRoute>
                  <TeamDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournament/:tournamentId/leaderboards"
              element={<Leaderboards />}
            />
            <Route
              path="/streak-leaderboard"
              element={
                <ProtectedRoute>
                  <StreakLeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/children"
              element={
                <ProtectedRoute>
                  <Children />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute>
                  <Sessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/session/:id"
              element={
                <ProtectedRoute>
                  <SessionAttendanceEnhanced />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
