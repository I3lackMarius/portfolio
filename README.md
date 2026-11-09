# Portfolio Web Application

This is a MERN stack portfolio application with modern best practices.

## Features
- Responsive design
- Portfolio management
- Admin authentication (planned)
- 3D animations
- Contact forms

## Tech Stack
- **Frontend**: React, Three.js, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB
- **Authentication**: JWT
- **Deployment**: Vercel/Netlify

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Set environment variables in `.env` file
4. Run development server: `npm run dev`

## Project Structure
- `/backend` - Express server with API routes and controllers
- `/frontend` - React application with components

## Environment Variables
Create a `.env` file in the root directory:
```
MONGODB_URI=mongodb://localhost:27017/portfolio
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
```

## Development
- Backend: `npm run dev:server`
- Frontend: `npm run dev:client`

## Testing
To be implemented

## Deployment
1. Build frontend: `npm run build`
2. Start backend server: `npm run start`