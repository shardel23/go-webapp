# Go Webapp - Frontend

The frontend application for the Go web game, built with Next.js and React, providing an interactive and responsive user interface.

## 🏗️ Architecture

- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: Socket.IO client
- **State Management**: React hooks and context
- **Routing**: Next.js App Router

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Home page
│   │   ├── login/             # Authentication pages
│   │   ├── register/          # User registration
│   │   ├── game/              # Game management
│   │   │   ├── page.tsx       # Main game lobby
│   │   │   └── [gameId]/      # Dynamic game pages
│   │   └── simulation/        # Practice mode
│   ├── components/            # Reusable React components
│   │   ├── GoBoard.tsx        # Interactive game board
│   │   └── Toast.tsx          # Notification component
│   ├── styles/               # Global styles
│   │   └── globals.css        # Tailwind CSS imports
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend server running on port 5000

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

The application will start on `http://localhost:3000`

## 🎮 Features

### Authentication
- **User Registration**: Create new accounts
- **User Login**: Secure authentication
- **Session Management**: Persistent login sessions
- **User Profile**: View user stats and rating

### Game Management
- **Matchmaking**: Find opponents automatically
- **Game Lobby**: View active and recent games
- **Live Games**: Real-time game playing
- **Game History**: Review past games

### Game Simulation
- **Practice Mode**: Play against yourself
- **Board Sizes**: 9×9, 13×13, and 19×19 boards
- **Move History**: Track all moves made
- **Undo/Redo**: Experiment with different moves
- **Export**: Save game positions

### Interactive Features
- **Real-time Updates**: Live game synchronization
- **Toast Notifications**: User feedback
- **Responsive Design**: Works on all devices
- **Keyboard Shortcuts**: Quick actions

## 🎯 Pages and Routes

### `/` - Home Page
- Landing page with game introduction
- Redirects to game lobby if logged in

### `/login` - Login Page
- User authentication form
- Redirects to game lobby on success

### `/register` - Registration Page
- New user registration form
- Account creation with validation

### `/game` - Game Lobby
- Main game interface
- Matchmaking controls
- Active games list
- Recent games history
- User statistics
- Simulation access

### `/game/[gameId]` - Game View
- Live game playing interface
- Interactive game board
- Move controls (pass, resign)
- Game state information
- Real-time updates

### `/simulation` - Practice Mode
- Interactive game simulation
- Board size selection
- Move history tracking
- Undo/redo functionality
- Export game state

## 🧩 Components

### GoBoard Component (`components/GoBoard.tsx`)

Interactive game board with:
- **Click Handling**: Stone placement on intersections
- **Visual Feedback**: Hover effects and move indicators
- **Stone Rendering**: Black and white stone display
- **Board Sizing**: Responsive to different board sizes
- **Move Validation**: Visual feedback for valid/invalid moves

```tsx
<GoBoard
  size={19}
  moves={moves}
  onMove={handleMove}
  currentPlayer="black"
  disabled={false}
/>
```

### Toast Component (`components/Toast.tsx`)

Notification system with:
- **Multiple Types**: Success, error, and info messages
- **Auto-dismiss**: Configurable timeout
- **Manual Close**: User can dismiss manually
- **Animations**: Smooth slide-in effects

```tsx
<Toast
  message="Move made successfully"
  type="success"
  duration={3000}
  onClose={() => setToast(null)}
/>
```

## 🎨 Styling

### Tailwind CSS
- **Utility-first**: Rapid UI development
- **Responsive Design**: Mobile-first approach
- **Custom Colors**: Go-themed color palette
- **Dark Mode**: Optional dark theme support

### Design System
- **Colors**: Black stones, white stones, board colors
- **Typography**: Clear, readable fonts
- **Spacing**: Consistent spacing system
- **Components**: Reusable UI patterns

## 🔌 Real-time Communication

### Socket.IO Integration
- **Connection Management**: Automatic reconnection
- **Event Handling**: Real-time game updates
- **Error Handling**: Connection error recovery
- **Authentication**: Secure socket connections

### WebSocket Events
- `match-found` - Game match discovered
- `move-made` - Move was played
- `game-updated` - Game state changed
- `invalid-move` - Invalid move attempted
- `game-finished` - Game ended

## 📱 Responsive Design

### Mobile Support
- **Touch Interactions**: Touch-friendly game board
- **Responsive Layout**: Adapts to screen size
- **Mobile Navigation**: Optimized for mobile devices
- **Performance**: Optimized for mobile browsers

### Desktop Features
- **Keyboard Shortcuts**: Quick actions
- **Mouse Interactions**: Precise stone placement
- **Multi-window**: Multiple game support
- **Large Screens**: Optimized for desktop displays

## 🧪 Testing

### Component Testing
```bash
npm test
```

### E2E Testing
```bash
npm run test:e2e
```

### Manual Testing
- Test all game flows
- Verify responsive design
- Check real-time updates
- Validate error handling

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Static Export
```bash
npm run export
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Development

### Code Structure
- **Pages**: Next.js App Router pages
- **Components**: Reusable React components
- **Hooks**: Custom React hooks
- **Types**: TypeScript type definitions
- **Utils**: Helper functions

### State Management
- **React Hooks**: useState, useEffect, useCallback
- **Context API**: Global state management
- **Local Storage**: Persistent user data
- **Session Storage**: Temporary game data

### Performance Optimization
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js image optimization
- **Bundle Analysis**: Webpack bundle analyzer
- **Lazy Loading**: Component lazy loading

## 🎨 UI/UX Features

### User Experience
- **Intuitive Interface**: Easy-to-use game controls
- **Visual Feedback**: Clear move indicators
- **Error Handling**: User-friendly error messages
- **Loading States**: Smooth loading animations

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **Color Contrast**: High contrast for visibility
- **Focus Management**: Clear focus indicators

## 🔒 Security

### Client-side Security
- **Input Validation**: Form validation
- **XSS Prevention**: Sanitized user input
- **CSRF Protection**: CSRF token validation
- **Secure Storage**: Encrypted local storage

### Authentication
- **JWT Tokens**: Secure authentication
- **Session Management**: Automatic token refresh
- **Route Protection**: Protected routes
- **Logout Handling**: Secure session cleanup

## 📊 Performance

### Optimization Features
- **Code Splitting**: Route-based code splitting
- **Image Optimization**: Next.js image optimization
- **Bundle Optimization**: Webpack optimization
- **Caching**: Browser and CDN caching

### Monitoring
- **Performance Metrics**: Core Web Vitals
- **Error Tracking**: Error boundary implementation
- **Analytics**: User interaction tracking
- **Real User Monitoring**: Performance monitoring

## 🛠️ Development Tools

### Code Quality
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Husky**: Git hooks

### Development Experience
- **Hot Reload**: Fast development iteration
- **TypeScript**: Full type safety
- **Debugging**: React DevTools support
- **Error Boundaries**: Error handling

## 📝 Documentation

### Code Documentation
- **JSDoc**: Function documentation
- **Type Definitions**: TypeScript interfaces
- **Component Props**: Prop documentation
- **API Integration**: Service documentation

### User Documentation
- **Game Rules**: How to play Go
- **Feature Guides**: Using the application
- **Troubleshooting**: Common issues
- **FAQ**: Frequently asked questions

---

**Frontend application for the Go web game - providing an intuitive and responsive user experience! 🎯**