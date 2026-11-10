import app from './app.js';
import dotenv from 'dotenv';

// Load environment variables first  
dotenv.config();

console.log('Env file loaded, MONGODB_URI:', process.env.MONGODB_URI);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;