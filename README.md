## Setup

### Prerequisites
- Node.js
- PostgreSQL
- Redis

### Backend
1. Clone the repo
2. In the root folder, install dependencies:
   npm install
3. Copy .env.example to .env and fill in your values:
   cp .env.example .env
4. Create a PostgreSQL database and update .env accordingly
5. Run the seed script to populate sample data:
   node seed.js
6. Start the server:
   node index.js
   or with auto-reload
   nodemon index.js

### Frontend
1. Navigate to the client folder:
   cd client
2. Install dependencies:
   npm install
3. Start the frontend:
   npm run dev

The frontend runs on http://localhost:5173 and the backend on http://localhost:4001

## Running Tests
Make sure the backend server is running first, then from the root folder:
node --experimental-vm-modules node_modules/.bin/jest UnitTesting.test.js
