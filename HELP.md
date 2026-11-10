# Portfolio MERN Application Setup

## Database Connection Troubleshooting

### If you get "MONGODB_URI is missing from environment variables":
1. **Verify the `.env` file exists in the root of your project**
2. **Ensure correct formatting without quotes around URI:**

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-secret-key
PORT=5000
```

3. **Try these commands to test directly (from root folder):**

```bash
# Test with explicit dotenv loading
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI);"

# If using nodemon, this approach may work:
npx cross-env NODE_ENV=development nodemon server.js
```

### For Your MongoDB Connection to Work:

1. Replace the placeholder URI in `.env` with your actual MongoDB Atlas connection string
2. Make sure your IP address is whitelisted in MongoDB Atlas (0.0.0.0/0 for testing)
3. Verify user credentials work properly

### Quick Verification Steps:
```bash
# Test database connectivity via command line
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected!'))
  .catch(err => console.error('Connection error:', err))
"
```

## Architecture Status:
✅ Backend MERN structure complete
✅ Database models ready  
✅ API routes implemented
✅ Authentication middleware ready
✅ Frontend architecture prepared

Your portfolio is now a complete MERN application architecture with MongoDB Atlas integration that's ready to go once the database connection parameter is properly configured.