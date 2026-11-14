export const createVercelHandler = ({ app, connectDB }) =>
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      return app(req, res);
    }

    try {
      await connectDB();
      return app(req, res);
    } catch (error) {
      const code =
        error.message === 'MONGODB_URI is missing from environment variables'
          ? 'MONGODB_URI_MISSING'
          : 'DATABASE_UNAVAILABLE';
      console.error(`API request could not be served: ${code} (${error.name})`);
      return res.status(503).json({
        success: false,
        code,
        error:
          code === 'MONGODB_URI_MISSING'
            ? 'MongoDB is not configured'
            : 'Database unavailable',
      });
    }
  };
