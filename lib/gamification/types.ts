export type StudentXPData = {
  total_xp: number;
  level: string;
  xp_to_next_level: number;
  xp_this_week: number;
  current_level_min: number;
  next_level_min: number | null;
};

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

export type LeaderboardEntry = {
  id: string;
  total_xp: number;
  level: string;
  current_streak: number;
  modules_done: number;
  rank: number;
  name: string;
  imageUrl?: string;
};
