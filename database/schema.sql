-- Go Web Application Database Schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rating INTEGER DEFAULT 1200,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    black_player_id INTEGER REFERENCES users(id),
    white_player_id INTEGER REFERENCES users(id),
    board_size INTEGER DEFAULT 19,
    status VARCHAR(20) DEFAULT 'active', -- active, finished, resigned
    winner_id INTEGER REFERENCES users(id),
    result VARCHAR(20), -- black_wins, white_wins, draw
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    sgf_data TEXT -- Store game in SGF format
);

-- Moves table
CREATE TABLE moves (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id),
    player_id INTEGER REFERENCES users(id),
    move_number INTEGER NOT NULL,
    x_coordinate INTEGER,
    y_coordinate INTEGER,
    is_pass BOOLEAN DEFAULT FALSE,
    is_resign BOOLEAN DEFAULT FALSE,
    captured_stones TEXT, -- JSON array of captured stone positions
    move_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matchmaking queue table
CREATE TABLE matchmaking_queue (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES users(id),
    rating_range_min INTEGER,
    rating_range_max INTEGER,
    board_size INTEGER DEFAULT 19,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes')
);

-- Game invitations table
CREATE TABLE game_invitations (
    id SERIAL PRIMARY KEY,
    inviter_id INTEGER REFERENCES users(id),
    invitee_id INTEGER REFERENCES users(id),
    board_size INTEGER DEFAULT 19,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
);

-- Indexes for better performance
CREATE INDEX idx_users_rating ON users(rating);
CREATE INDEX idx_games_players ON games(black_player_id, white_player_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_moves_game_id ON moves(game_id);
CREATE INDEX idx_moves_move_number ON moves(game_id, move_number);
CREATE INDEX idx_matchmaking_rating ON matchmaking_queue(rating_range_min, rating_range_max);
CREATE INDEX idx_matchmaking_expires ON matchmaking_queue(expires_at);
