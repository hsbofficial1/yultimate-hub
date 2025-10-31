/**
 * Tournament Bracket Generation Utilities
 * Supports: Round Robin, Single Elimination, Double Elimination, Pools
 */

import { addMinutes, set, startOfDay } from 'date-fns';

export type BracketType = 'round_robin' | 'single_elimination' | 'double_elimination' | 'pools';

export interface Team {
  id: string;
  name: string;
}

export interface Match {
  id?: string;
  team_a_id: string;
  team_b_id: string;
  scheduled_time: Date | string;
  field: string;
  pool?: string;
  round?: number;
  bracket_position?: number;
}

export interface TournamentSettings {
  bracket_type: BracketType;
  match_duration_minutes: number;
  break_time_minutes: number;
  fields: string[];
  start_time: string;
  end_time: string;
  pool_count?: number;
  pool_size?: number;
}

/**
 * Generate Round Robin schedule where every team plays every other team
 */
export function generateRoundRobin(teams: Team[]): Match[] {
  const matches: Match[] = [];
  const n = teams.length;

  if (n < 2) return matches;

  // Generate all possible pairs
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      matches.push({
        team_a_id: teams[i].id,
        team_b_id: teams[j].id,
        scheduled_time: new Date(),
        field: '',
      });
    }
  }

  return matches;
}

/**
 * Generate Single Elimination bracket
 * Returns matches in order: quarterfinals, semifinals, finals
 */
export function generateSingleElimination(teams: Team[]): Match[] {
  const matches: Match[] = [];
  const n = teams.length;

  if (n < 2) return matches;

  // Shuffle teams for fairness
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

  // Calculate number of rounds
  const rounds = Math.ceil(Math.log2(n));

  // Generate matches for each round
  let currentTeams = shuffledTeams;
  let round = 1;

  while (currentTeams.length > 1) {
    const roundMatches: Match[] = [];
    
    // Pair teams for this round
    for (let i = 0; i < currentTeams.length; i += 2) {
      if (i + 1 < currentTeams.length) {
        roundMatches.push({
          team_a_id: currentTeams[i].id,
          team_b_id: currentTeams[i + 1].id,
          scheduled_time: new Date(),
          field: '',
          round,
          bracket_position: roundMatches.length + 1,
        });
      }
    }

    // Winners advance (simulated by reducing teams)
    const winners = [];
    for (let i = 0; i < currentTeams.length; i += 2) {
      winners.push(currentTeams[i]); // First team "wins" for seeding
    }
    currentTeams = winners;
    round++;

    matches.push(...roundMatches);
  }

  return matches;
}

/**
 * Generate Double Elimination bracket
 * More complex - includes winner's bracket and loser's bracket
 */
export function generateDoubleElimination(teams: Team[]): Match[] {
  const matches: Match[] = [];
  const n = teams.length;

  if (n < 2) return matches;

  // Start with single elimination winner's bracket
  const winnersBracketMatches = generateSingleElimination(teams);
  
  // Add loser's bracket matches
  // Simplified version - full double elimination requires complex bracketing
  const losersRound = Math.ceil(Math.log2(n));
  
  winnersBracketMatches.forEach(match => {
    matches.push(match);
    
    // Add corresponding loser's bracket match
    if (match.round && match.round < losersRound) {
      matches.push({
        team_a_id: match.team_a_id, // Loser from winner's bracket
        team_b_id: match.team_b_id, // Loser from loser's bracket
        scheduled_time: new Date(),
        field: '',
        round: match.round + losersRound,
        bracket_position: match.bracket_position,
      });
    }
  });

  // Add grand finals
  matches.push({
    team_a_id: teams[0].id, // Winner of winner's bracket
    team_b_id: teams[1].id, // Winner of loser's bracket
    scheduled_time: new Date(),
    field: '',
    round: losersRound * 2,
    bracket_position: 1,
  });

  return matches;
}

/**
 * Generate Pool-based schedule
 * Teams are divided into pools, each pool plays round robin
 */
export function generatePools(
  teams: Team[], 
  poolCount: number = 4, 
  poolSize: number = 4
): { poolMatches: Match[]; poolAssignments: Record<string, string> } {
  const matches: Match[] = [];
  const poolAssignments: Record<string, string> = {};

  if (teams.length < poolCount) return { poolMatches: [], poolAssignments };

  // Shuffle teams for fairness
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

  // Assign teams to pools
  const pools: Team[][] = [];
  for (let i = 0; i < poolCount; i++) {
    pools.push([]);
  }

  shuffledTeams.forEach((team, index) => {
    const poolIndex = index % poolCount;
    pools[poolIndex].push(team);
    poolAssignments[team.id] = `Pool ${String.fromCharCode(65 + poolIndex)}`;
  });

  // Generate round robin within each pool
  pools.forEach((poolTeams, poolIndex) => {
    const poolName = `Pool ${String.fromCharCode(65 + poolIndex)}`;
    const poolMatches = generateRoundRobin(poolTeams);
    
    poolMatches.forEach(match => {
      matches.push({
        ...match,
        pool: poolName,
        scheduled_time: new Date(),
      });
    });
  });

  return { poolMatches: matches, poolAssignments };
}

/**
 * Schedule matches across fields and time slots
 */
export function scheduleMatches(
  matches: Match[],
  settings: TournamentSettings,
  startDate: Date
): Match[] {
  const scheduled: Match[] = [];
  const { fields, start_time, end_time, match_duration_minutes, break_time_minutes } = settings;

  // Parse start and end times
  const [startHour, startMinute] = start_time.split(':').map(Number);
  const [endHour, endMinute] = end_time.split(':').map(Number);
  const startDateTime = set(startOfDay(startDate), { hours: startHour, minutes: startMinute });
  const endDateTime = set(startOfDay(startDate), { hours: endHour, minutes: endMinute });

  const totalDuration = match_duration_minutes + break_time_minutes;
  let currentTime = startDateTime;
  let fieldIndex = 0;

  // Sort matches by round for proper bracketing order
  const sortedMatches = [...matches].sort((a, b) => {
    if (a.round !== undefined && b.round !== undefined) {
      return a.round - b.round;
    }
    return 0;
  });

  sortedMatches.forEach(match => {
    // Check if we need to move to next day
    if (currentTime >= endDateTime) {
      currentTime = addMinutes(startDateTime, (24 * 60)); // Next day
    }

    // Assign field
    const field = fields[fieldIndex % fields.length];
    fieldIndex++;

    scheduled.push({
      ...match,
      scheduled_time: currentTime,
      field,
    });

    // Move to next time slot
    currentTime = addMinutes(currentTime, totalDuration);
  });

  return scheduled;
}

/**
 * Detect scheduling conflicts for a specific match
 */
export function detectConflicts(
  matches: Match[],
  newMatch: Match,
  matchDurationMinutes: number
): Match[] {
  return matches.filter(existingMatch => {
    const existingStart = new Date(existingMatch.scheduled_time);
    const existingEnd = addMinutes(existingStart, matchDurationMinutes);
    const newStart = new Date(newMatch.scheduled_time);
    const newEnd = addMinutes(newStart, matchDurationMinutes);

    const hasConflict = 
      (newMatch.team_a_id === existingMatch.team_a_id || 
       newMatch.team_a_id === existingMatch.team_b_id ||
       newMatch.team_b_id === existingMatch.team_a_id ||
       newMatch.team_b_id === existingMatch.team_b_id) &&
      existingStart < newEnd &&
      newStart < existingEnd;

    return hasConflict;
  });
}

/**
 * Main bracket generation function
 */
export function generateBracket(
  teams: Team[],
  settings: TournamentSettings,
  startDate: Date = new Date()
): { matches: Match[]; poolAssignments?: Record<string, string> } {
  let matches: Match[] = [];
  let poolAssignments: Record<string, string> | undefined;

  switch (settings.bracket_type) {
    case 'round_robin':
      matches = generateRoundRobin(teams);
      break;
    case 'single_elimination':
      matches = generateSingleElimination(teams);
      break;
    case 'double_elimination':
      matches = generateDoubleElimination(teams);
      break;
    case 'pools':
      const result = generatePools(teams, settings.pool_count, settings.pool_size);
      matches = result.poolMatches;
      poolAssignments = result.poolAssignments;
      break;
  }

  // Schedule the matches
  matches = scheduleMatches(matches, settings, startDate);

  return { matches, poolAssignments };
}

