# Go Webapp - Backend

The backend server for the Go web application, providing RESTful APIs, real-time WebSocket communication, and game logic.

## 🏗️ Architecture

- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO for live game updates
- **Authentication**: JWT tokens with bcrypt hashing
- **Language**: TypeScript for type safety

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Database and app configuration
│   ├── routes/          # API route handlers
│   │   ├── auth.ts      # Authentication endpoints
│   │   ├── game.ts      # Game management endpoints
│   │   └── simulation.ts # Simulation mode endpoints
│   ├── services/        # Business logic services
│   │   ├── goRules.ts   # Go game rules engine
│   │   └── gameStateManager.ts # Game state management
│   ├── socket/          # WebSocket handlers
│   │   └── socketHandlers.ts # Real-time game logic
│   ├── utils/           # Utility functions
│   │   └── boardStateConverter.ts # Board state utilities
│   └── server.ts        # Main server entry point
├── prisma/
│   ├── schema.prisma    # Database schema definition
│   └── migrations/      # Database migration files
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb go_webapp
   
   # Run database migrations
   npx prisma migrate dev
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/go_webapp?schema=public"

# JWT
JWT_SECRET="your-secret-key-here"

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Game Management
- `GET /api/game/history` - Get user's game history
- `GET /api/game/:gameId` - Get specific game details
- `POST /api/game/invite` - Send private game invitation

### Simulation Mode
- `GET /api/simulation/state` - Get simulation state
- `POST /api/simulation/move` - Make a move in simulation
- `POST /api/simulation/undo` - Undo last move
- `POST /api/simulation/reset` - Reset simulation
- `POST /api/simulation/export` - Export game state

### Health Check
- `GET /api/health` - Server health status

## 🔌 WebSocket Events

### Client → Server
- `join-matchmaking` - Join matchmaking queue
- `leave-matchmaking` - Leave matchmaking queue
- `join-game` - Join specific game room
- `make-move` - Make a game move
- `pass-turn` - Pass current turn
- `resign-game` - Resign from game

### Server → Client
- `match-found` - Game match found
- `move-made` - Move was made
- `game-updated` - Game state updated
- `invalid-move` - Invalid move attempted
- `game-finished` - Game ended

## 🎮 Game Logic

### GoRules Service (`src/services/goRules.ts`)

The core game engine implementing complete Go rules:

- **Move Validation**: Legal move checking
- **Capture Logic**: Stone capture and group detection
- **Ko Rule**: Prevents immediate recapture
- **Suicide Prevention**: Prevents self-capture
- **Scoring**: Territory and captured stone counting
- **Game State**: Board state management

### GameStateManager Service (`src/services/gameStateManager.ts`)

Manages game state persistence and caching:

- **In-Memory Caching**: Fast game state access
- **Database Persistence**: Game state storage
- **State Reconstruction**: Rebuild from move history
- **Board State Conversion**: String ↔ 2D array conversion

## 🗄️ Database Schema

### Models

#### User
```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  email     String   @unique
  password  String
  rating    Int      @default(1200)
  gamesPlayed Int    @default(0)
  gamesWon  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Game
```prisma
model Game {
  id            Int      @id @default(autoincrement())
  blackPlayerId Int
  whitePlayerId Int
  boardSize     Int      @default(19)
  status        String   @default("active")
  boardState    String?  @db.Text
  winnerId      Int?
  result        String?
  startedAt     DateTime @default(now())
  finishedAt    DateTime?
  blackPlayer   User     @relation("BlackPlayer", fields: [blackPlayerId], references: [id])
  whitePlayer   User     @relation("WhitePlayer", fields: [whitePlayerId], references: [id])
  moves         Move[]
}
```

#### Move
```prisma
model Move {
  id             Int      @id @default(autoincrement())
  gameId         Int
  playerId       Int
  xCoordinate    Int
  yCoordinate    Int
  moveNumber     Int
  isPass         Boolean  @default(false)
  isResign       Boolean  @default(false)
  capturedStones String?  @db.Text
  createdAt      DateTime @default(now())
  game           Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
}
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Database Testing
```bash
# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test with authentication
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/profile
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
- Set `NODE_ENV=production`
- Configure production database URL
- Set secure JWT secret
- Configure CORS for production frontend URL

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔧 Development

### Code Structure
- **Routes**: Handle HTTP requests and responses
- **Services**: Business logic and game rules
- **Socket Handlers**: Real-time communication
- **Utils**: Helper functions and utilities
- **Config**: Database and application configuration

### Adding New Features
1. Create route handler in `src/routes/`
2. Add business logic in `src/services/`
3. Update database schema if needed
4. Add WebSocket events if real-time
5. Write tests for new functionality

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name "add-new-feature"

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

## 📊 Performance

### Optimization Features
- **Game State Caching**: In-memory game state storage
- **Efficient Board Representation**: String-based board state
- **Database Indexing**: Optimized queries for game data
- **WebSocket Connection Pooling**: Efficient real-time communication

### Monitoring
- Health check endpoint for uptime monitoring
- Database query logging in development
- WebSocket connection tracking
- Error logging and handling

## 🛡️ Security

### Authentication
- JWT token-based authentication
- Password hashing with bcrypt
- Protected routes and middleware
- Session management

### Data Validation
- Input validation on all endpoints
- SQL injection prevention via Prisma
- XSS protection
- CORS configuration

## 📝 Logging

### Development Logging
- Request/response logging
- Database query logging
- WebSocket event logging
- Error stack traces

### Production Logging
- Structured logging with timestamps
- Error tracking and monitoring
- Performance metrics
- Security event logging

---

**Backend server for the Go web application - providing robust APIs and real-time game functionality! 🎯**
