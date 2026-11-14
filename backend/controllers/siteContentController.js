import SiteContent from '../models/SiteContent.js';

export const supportedLocales = ['it', 'gb'];

export const createGetSiteContent = (SiteContentModel = SiteContent) =>
  async (req, res, next) => {
    const { locale } = req.params;

    if (!supportedLocales.includes(locale)) {
      return res.status(400).json({ message: 'Unsupported locale' });
    }

    try {
      const document = await SiteContentModel.findOne({ locale }).lean();

      if (!document) {
        return res.status(404).json({ message: 'Content not found' });
      }

      return res.json(document.content);
    } catch (error) {
      return next(error);
    }
  };

export const getSiteContent = createGetSiteContent();
