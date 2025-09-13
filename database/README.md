# Go Webapp - Database

PostgreSQL database schema and management for the Go web application, designed with Prisma ORM for type-safe database operations.

## 🗄️ Database Overview

- **Database**: PostgreSQL 13+
- **ORM**: Prisma
- **Schema**: Relational database design
- **Migrations**: Version-controlled schema changes
- **Seeding**: Sample data for development

## 📊 Schema Design

### Entity Relationship Diagram

```
User (1) ──── (M) Game (M) ──── (1) User
  │              │
  │              └── (M) Move
  │
  └── (M) MatchmakingQueue

Game (1) ──── (M) GameInvitation
```

### Core Entities

#### User
Stores player information and statistics
- **Primary Key**: `id` (auto-increment)
- **Unique Fields**: `username`, `email`
- **Statistics**: `rating`, `gamesPlayed`, `gamesWon`
- **Timestamps**: `createdAt`, `updatedAt`

#### Game
Represents a complete Go game session
- **Primary Key**: `id` (auto-increment)
- **Players**: `blackPlayerId`, `whitePlayerId` (foreign keys)
- **Game State**: `boardSize`, `status`, `boardState`
- **Results**: `winnerId`, `result`
- **Timestamps**: `startedAt`, `finishedAt`

#### Move
Individual moves within a game
- **Primary Key**: `id` (auto-increment)
- **Game Reference**: `gameId` (foreign key)
- **Position**: `xCoordinate`, `yCoordinate`
- **Move Data**: `moveNumber`, `isPass`, `isResign`
- **Captures**: `capturedStones` (JSON string)
- **Timestamp**: `createdAt`

#### MatchmakingQueue
Temporary queue for player matching
- **Primary Key**: `id` (auto-increment)
- **Player Reference**: `playerId` (foreign key)
- **Preferences**: `preferredBoardSize`, `ratingRange`
- **Timestamp**: `joinedAt`

#### GameInvitation
Private game invitations
- **Primary Key**: `id` (auto-increment)
- **Players**: `fromPlayerId`, `toPlayerId` (foreign keys)
- **Game Settings**: `boardSize`, `message`
- **Status**: `status`, `respondedAt`

## 🏗️ Database Schema

### Complete Prisma Schema

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         Int      @id @default(autoincrement())
  username   String   @unique
  email      String   @unique
  password   String
  rating     Int      @default(1200)
  gamesPlayed Int     @default(0)
  gamesWon   Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  blackGames     Game[] @relation("BlackPlayer")
  whiteGames     Game[] @relation("WhitePlayer")
  wonGames       Game[] @relation("Winner")
  matchmaking    MatchmakingQueue[]
  sentInvites    GameInvitation[] @relation("FromPlayer")
  receivedInvites GameInvitation[] @relation("ToPlayer")

  @@map("users")
}

model Game {
  id            Int      @id @default(autoincrement())
  blackPlayerId Int
  whitePlayerId Int
  boardSize     Int      @default(19)
  status        String   @default("active") // active, finished, abandoned
  boardState    String?  @map("board_state") @db.Text
  winnerId      Int?
  result        String?  // win, loss, draw, resignation
  blackScore    Int?     @default(0) @map("black_score")
  whiteScore    Int?     @default(0) @map("white_score")
  startedAt     DateTime @default(now())
  finishedAt    DateTime?

  // Relations
  blackPlayer User  @relation("BlackPlayer", fields: [blackPlayerId], references: [id])
  whitePlayer User  @relation("WhitePlayer", fields: [whitePlayerId], references: [id])
  winner      User? @relation("Winner", fields: [winnerId], references: [id])
  moves       Move[]
  invitations GameInvitation[]

  @@map("games")
}

model Move {
  id             Int      @id @default(autoincrement())
  gameId         Int
  playerId       Int
  xCoordinate    Int?     @map("x_coordinate")
  yCoordinate    Int?     @map("y_coordinate")
  moveNumber     Int      @map("move_number")
  isPass         Boolean  @default(false) @map("is_pass")
  isResign       Boolean  @default(false) @map("is_resign")
  capturedStones String?  @map("captured_stones") @db.Text
  createdAt      DateTime @default(now())

  // Relations
  game Game @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@map("moves")
}

model MatchmakingQueue {
  id                  Int      @id @default(autoincrement())
  playerId            Int      @unique
  preferredBoardSize  Int      @default(19) @map("preferred_board_size")
  minRating           Int      @default(1000) @map("min_rating")
  maxRating           Int      @default(2000) @map("max_rating")
  joinedAt            DateTime @default(now())

  // Relations
  player User @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@map("matchmaking_queue")
}

model GameInvitation {
  id           Int      @id @default(autoincrement())
  fromPlayerId Int      @map("from_player_id")
  toPlayerId   Int      @map("to_player_id")
  boardSize    Int      @default(19) @map("board_size")
  message      String?
  status       String   @default("pending") // pending, accepted, declined
  createdAt    DateTime @default(now())
  respondedAt  DateTime?
  gameId       Int?

  // Relations
  fromPlayer User  @relation("FromPlayer", fields: [fromPlayerId], references: [id])
  toPlayer   User  @relation("ToPlayer", fields: [toPlayerId], references: [id])
  game       Game? @relation(fields: [gameId], references: [id])

  @@map("game_invitations")
}
```

## 🚀 Database Setup

### Prerequisites
- PostgreSQL 13+ installed and running
- Database user with appropriate permissions

### Initial Setup

1. **Create Database**
   ```sql
   CREATE DATABASE go_webapp;
   ```

2. **Set Environment Variables**
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/go_webapp?schema=public"
   ```

3. **Run Migrations**
   ```bash
   npx prisma migrate dev
   ```

4. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

### Development Workflow

1. **Make Schema Changes**
   - Edit `schema.prisma`
   - Update models, fields, relations

2. **Create Migration**
   ```bash
   npx prisma migrate dev --name "description-of-changes"
   ```

3. **Reset Database** (if needed)
   ```bash
   npx prisma migrate reset
   ```

## 📊 Data Types and Constraints

### User Table
- **id**: Auto-incrementing primary key
- **username**: Unique string (3-20 characters)
- **email**: Unique email address
- **password**: Hashed password string
- **rating**: Integer (default: 1200, range: 0-3000)
- **gamesPlayed**: Integer (default: 0)
- **gamesWon**: Integer (default: 0)

### Game Table
- **id**: Auto-incrementing primary key
- **blackPlayerId**: Foreign key to User
- **whitePlayerId**: Foreign key to User
- **boardSize**: Integer (9, 13, or 19)
- **status**: Enum (active, finished, abandoned)
- **boardState**: Text field for board representation
- **winnerId**: Foreign key to User (nullable)
- **result**: String (win, loss, draw, resignation)
- **blackScore/whiteScore**: Integer scores
- **startedAt/finishedAt**: Timestamps

### Move Table
- **id**: Auto-incrementing primary key
- **gameId**: Foreign key to Game
- **playerId**: Integer (references User.id)
- **xCoordinate/yCoordinate**: Integer (0 to boardSize-1)
- **moveNumber**: Integer (sequential move number)
- **isPass/isResign**: Boolean flags
- **capturedStones**: JSON string of captured stones
- **createdAt**: Timestamp

## 🔍 Indexing Strategy

### Primary Indexes
- All primary keys are automatically indexed
- Foreign keys are automatically indexed

### Custom Indexes
```sql
-- User lookups
CREATE INDEX idx_user_username ON users(username);
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_rating ON users(rating);

-- Game queries
CREATE INDEX idx_game_players ON games(blackPlayerId, whitePlayerId);
CREATE INDEX idx_game_status ON games(status);
CREATE INDEX idx_game_started_at ON games(startedAt);

-- Move queries
CREATE INDEX idx_move_game ON moves(gameId);
CREATE INDEX idx_move_player ON moves(playerId);
CREATE INDEX idx_move_number ON moves(gameId, moveNumber);

-- Matchmaking
CREATE INDEX idx_matchmaking_rating ON matchmaking_queue(minRating, maxRating);
CREATE INDEX idx_matchmaking_board_size ON matchmaking_queue(preferredBoardSize);
```

## 🧪 Database Testing

### Prisma Studio
```bash
npx prisma studio
```
- Visual database browser
- Data inspection and editing
- Query testing interface

### Seed Data
```bash
npx prisma db seed
```
- Sample users for testing
- Test games and moves
- Development data

### Migration Testing
```bash
# Test migration up
npx prisma migrate dev

# Test migration down
npx prisma migrate reset
```

## 📈 Performance Optimization

### Query Optimization
- **Selective Fields**: Only fetch needed columns
- **Pagination**: Limit result sets
- **Joins**: Efficient relationship queries
- **Indexes**: Proper indexing strategy

### Connection Pooling
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/go_webapp?schema=public&connection_limit=20&pool_timeout=20"
```

### Caching Strategy
- **Game State**: In-memory caching for active games
- **User Data**: Session-based caching
- **Query Results**: Redis caching for frequent queries

## 🔒 Security Considerations

### Data Protection
- **Password Hashing**: bcrypt with salt
- **Input Validation**: Prisma validation
- **SQL Injection**: Parameterized queries
- **Access Control**: Row-level security

### Backup Strategy
```bash
# Full database backup
pg_dump go_webapp > backup.sql

# Restore from backup
psql go_webapp < backup.sql
```

### Monitoring
- **Query Performance**: Slow query logging
- **Connection Monitoring**: Connection pool metrics
- **Error Tracking**: Database error logging
- **Health Checks**: Database connectivity tests

## 🚀 Production Deployment

### Environment Configuration
```env
# Production database URL
DATABASE_URL="postgresql://user:pass@prod-host:5432/go_webapp?schema=public&sslmode=require"

# Connection pooling
DATABASE_CONNECTION_LIMIT=20
DATABASE_POOL_TIMEOUT=20
```

### Migration Strategy
```bash
# Production migration
npx prisma migrate deploy

# Rollback if needed
npx prisma migrate resolve --rolled-back "migration_name"
```

### Monitoring
- **Database Metrics**: CPU, memory, disk usage
- **Query Performance**: Slow query analysis
- **Connection Health**: Pool status monitoring
- **Error Rates**: Database error tracking

## 📚 Common Queries

### User Statistics
```sql
-- Get user with game statistics
SELECT 
  u.username,
  u.rating,
  u.gamesPlayed,
  u.gamesWon,
  ROUND((u.gamesWon::float / u.gamesPlayed) * 100, 2) as winRate
FROM users u
WHERE u.id = ?;
```

### Game History
```sql
-- Get user's recent games
SELECT 
  g.id,
  g.boardSize,
  g.status,
  g.startedAt,
  g.finishedAt,
  black.username as blackPlayer,
  white.username as whitePlayer
FROM games g
JOIN users black ON g.blackPlayerId = black.id
JOIN users white ON g.whitePlayerId = white.id
WHERE g.blackPlayerId = ? OR g.whitePlayerId = ?
ORDER BY g.startedAt DESC
LIMIT 10;
```

### Move History
```sql
-- Get game moves in order
SELECT 
  m.moveNumber,
  m.xCoordinate,
  m.yCoordinate,
  m.isPass,
  m.isResign,
  m.capturedStones
FROM moves m
WHERE m.gameId = ?
ORDER BY m.moveNumber ASC;
```

---

**Database schema and management for the Go web application - providing robust data storage and efficient queries! 🗄️**
