CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_ins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE TABLE IF NOT EXISTS dimension_scores (
  id SERIAL PRIMARY KEY,
  check_in_id INTEGER NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  dimension VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  note TEXT DEFAULT '',
  action TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quarterly_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  year INTEGER NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]',
  observations TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quarter, year)
);

CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_week_start ON check_ins(week_start);
CREATE INDEX IF NOT EXISTS idx_dimension_scores_check_in_id ON dimension_scores(check_in_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_goals_user_id ON quarterly_goals(user_id);

CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dimension VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  UNIQUE(habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, log_date);
