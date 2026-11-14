export const createVercelHandler = ({ app, connectDB }) =>
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      return app(req, res);
    }

    try {
      await connectDB();
      return app(req, res);
    } catch (error) {
      console.error('API request could not be served:', error.name);
      return res.status(503).json({
        success: false,
        error: 'API temporarily unavailable',
      });
    }
  };
