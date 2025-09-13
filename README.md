# Go Webapp

A full-stack web application for playing the ancient board game Go (Weiqi/Baduk) with modern features including real-time multiplayer, matchmaking, and interactive simulation.

## 🎯 Features

### Core Game Features
- **Complete Go Rules Implementation**: Legal moves, captures, ko rule, suicide prevention
- **Multiple Board Sizes**: 9×9, 13×13, and 19×19 boards
- **Real-time Multiplayer**: Live game sessions with WebSocket communication
- **Matchmaking System**: Automatic pairing of players with similar skill levels
- **Game Simulation**: Practice mode with undo/redo and position analysis
- **Game History**: Track and review past games
- **User Authentication**: Secure login and registration system

### Technical Features
- **Modern Tech Stack**: React/Next.js frontend, Node.js/Express backend
- **Real-time Communication**: Socket.IO for live game updates
- **Database Integration**: PostgreSQL with Prisma ORM
- **Type Safety**: Full TypeScript implementation
- **Responsive Design**: Works on desktop and mobile devices
- **State Management**: Efficient game state caching and persistence

## 🏗️ Architecture

```
go-webapp/
├── frontend/          # Next.js React application
├── backend/           # Node.js Express API server
├── database/          # PostgreSQL database with Prisma
└── docs/             # Documentation and guides
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 13+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shardel23/go-webapp.git
   cd go-webapp
   ```

2. **Set up the database**
   ```bash
   # Install PostgreSQL (macOS)
   brew install postgresql
   brew services start postgresql
   
   # Create database
   createdb go_webapp
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. **Configure environment**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Set up the database schema**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

6. **Start the development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🎮 How to Play

### Getting Started
1. **Register/Login**: Create an account or sign in
2. **Find a Game**: Use the matchmaking system to find an opponent
3. **Play**: Place stones, capture opponent pieces, and control territory
4. **Practice**: Use the simulation mode to practice and analyze positions

### Game Rules
- **Objective**: Control more territory than your opponent
- **Turns**: Black plays first, then players alternate
- **Captures**: Surround opponent stones to capture them
- **Ko Rule**: Cannot immediately recapture the same position
- **Suicide Prevention**: Cannot place a stone that would capture your own group
- **Passing**: Players can pass their turn
- **Game End**: Game ends when both players pass consecutively

## 🛠️ Development

### Project Structure

#### Frontend (`/frontend`)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Components**: Modular React components
- **State Management**: React hooks and context
- **Real-time**: Socket.IO client integration

#### Backend (`/backend`)
- **Framework**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with bcrypt
- **Real-time**: Socket.IO server
- **API**: RESTful endpoints for game management

#### Database Schema
- **Users**: Player accounts and ratings
- **Games**: Game records and state
- **Moves**: Individual move history
- **Matchmaking**: Queue management
- **Invitations**: Private game invites

### Key Components

#### Game Engine (`backend/src/services/goRules.ts`)
- Complete Go rules implementation
- Move validation and capture logic
- Game state management
- Scoring and territory calculation

#### Real-time System (`backend/src/socket/socketHandlers.ts`)
- WebSocket connection management
- Matchmaking and game creation
- Live move broadcasting
- Player synchronization

#### Frontend Components
- **GoBoard**: Interactive game board
- **GameView**: Live game interface
- **Simulation**: Practice mode
- **Matchmaking**: Player pairing system

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Games
- `GET /api/game/history` - Get user's game history
- `GET /api/game/:gameId` - Get specific game details
- `POST /api/game/invite` - Send game invitation

### Simulation
- `GET /api/simulation/state` - Get simulation state
- `POST /api/simulation/move` - Make a move in simulation
- `POST /api/simulation/undo` - Undo last move
- `POST /api/simulation/reset` - Reset simulation
- `POST /api/simulation/export` - Export game state

### WebSocket Events
- `join-matchmaking` - Join matchmaking queue
- `leave-matchmaking` - Leave matchmaking queue
- `match-found` - Game match found
- `join-game` - Join specific game room
- `make-move` - Make a game move
- `pass-turn` - Pass current turn
- `resign-game` - Resign from game

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Database Testing
```bash
cd backend
npx prisma studio
```

## 🚀 Deployment

### Production Build
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm start
```

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `FRONTEND_URL`: Frontend application URL
- `PORT`: Backend server port (default: 5000)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Go game rules based on official tournament standards
- UI/UX inspired by modern Go applications
- Real-time architecture patterns from modern web applications

## 📞 Support

For support, email shardel23@gmail.com or create an issue in the repository.

---

**Happy Go playing! 🎯**