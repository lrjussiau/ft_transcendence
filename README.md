
# Transcendence - Social Networking and Multiplayer Gaming Platform

## Description

*Transcendence* is an ambitious web development project at 42 school aimed at integrating social networking with real-time multiplayer gaming. This project leverages modern technologies like **NestJS**, **AngularJS**, **Socket.IO**, and **Docker** to build a dynamic and scalable platform. Users can create profiles, connect with friends, participate in live Pong games, and engage in real-time chats, all while ensuring security with Two-Factor Authentication (2FA) and JWT.

## Key Features

1. **Social Networking Integration**:
   - Users can manage personalized profiles, add friends, send messages, and share posts.
   - Match history, statistics (e.g., wins/losses), and achievements are tracked for each player.

2. **Real-Time Multiplayer Gaming**:
   - The platform offers a *Pong* game, allowing users to compete in real-time.
   - Matchmaking system allows users to queue up for games.
   - Customizable game options (maps, power-ups) are supported, with a default version available for players.

3. **WebSocket Communication**:
   - Real-time updates for chats, game invites, and player status through **Socket.IO**.

4. **Security**:
   - Two-Factor Authentication (2FA) using Google Authenticator.
   - JWT-based authentication for secure sessions.
   - Strong password hashing and protection against SQL injections.

5. **Admin and User Features**:
   - Chat channels can be created by users (public, private, password-protected).
   - Admins can ban/mute users in chat, while channel creators retain control over their channels.
   - Players can invite friends to Pong games directly through the chat interface.

## Technologies

- **Django**: Used for building the backend and managing REST APIs.
- **JavaScript**: Used for frontend development, creating a responsive single-page application (SPA).
- **PostgreSQL**: Database used for storing user data and game results.
- **NGINX**: Reverse proxy to enhance performance and security.
- **Socket.IO**: Manages real-time interactions between users.
- **Docker**: For containerizing the application, making deployment consistent across environments.

## Installation

1. **Clone the Repository**:

```bash
git clone https://github.com/your-repo/ft_transcendence_42project.git
cd ft_transcendence_42project
```

2. **Set Up Environment Variables**: 
Create a `.env` file with the necessary variables such as:

```
DEBUG=True
SECRET_KEY=S*CR*T
POSTGRES_USER=root
POSTGRES_PASSWORD=12345
POSTGRES_DB=trs
POSTGRES_HOST=db
POSTGRES_PORT=5432
PROTOCOL=https
HOST_IN_USE=localhost
FRONTEND_PORT=5173
BACKEND_PORT=8000
ADMIN=admin
PASSADMIN=adminpass
```

3. **Run Docker**:

```bash
docker-compose up --build
```

4. **Access the Platform**:
Open Google Chrome and navigate to the URL:

```bash
https://localhost:5173
```

## Security Concerns

- All passwords must be securely hashed and stored.
- Forms and user inputs should be validated on the server side to prevent SQL injections.
- Sensitive credentials (API keys, environment variables) should be stored in `.env` files and never exposed publicly.

## Game Mechanics

- Players can join real-time Pong matches, with matchmaking available for finding opponents.
- The game is responsive, can be played via canvas or in 3D, and offers both simple and customizable modes.
- Users can challenge others directly from the chat interface.

## Testing

Test the platform by creating user accounts, joining chat rooms, and playing real-time Pong matches. Ensure that the social networking features work as expected (e.g., adding friends, sending messages).

