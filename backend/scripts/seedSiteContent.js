import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import SiteContent from '../models/SiteContent.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');

export const localeSources = [
  { locale: 'it', file: 'src/locales/it/global.json' },
  { locale: 'gb', file: 'src/locales/gb/global.json' },
];

export const countLocaleContent = (content) => ({
  projects: content.Works?.Projects?.length ?? 0,
  experiences: content.Experience?.Experiences?.length ?? 0,
  technologies: content.Experience?.Technologies?.length ?? 0,
  feedbacks: content.Feedbacks?.Technologies?.length ?? 0,
});

export const readLocaleDocuments = async () =>
  Promise.all(
    localeSources.map(async ({ locale, file }) => {
      const filePath = path.join(projectRoot, file);
      const content = JSON.parse(await readFile(filePath, 'utf8'));

      if (!content || typeof content !== 'object' || Array.isArray(content)) {
        throw new Error(`Invalid content resource for locale "${locale}"`);
      }

      return { locale, content, counts: countLocaleContent(content) };
    }),
  );

export const seedSiteContent = async ({
  dryRun = false,
  replace = false,
  model = SiteContent,
  connect = connectDB,
  disconnect = () => mongoose.disconnect(),
} = {}) => {
  const documents = await readLocaleDocuments();

  if (dryRun) {
    return documents.map(({ locale, counts }) => ({
      locale,
      status: 'dry-run',
      counts,
    }));
  }

  await connect();

  try {
    const results = [];

    for (const { locale, content, counts } of documents) {
      const update = replace
        ? { $set: { content }, $setOnInsert: { locale } }
        : { $setOnInsert: { locale, content } };
      const result = await model.updateOne({ locale }, update, {
        upsert: true,
        runValidators: true,
      });

      const status = result.upsertedCount
        ? 'inserted'
        : result.modifiedCount
          ? 'updated'
          : 'unchanged';

      results.push({ locale, status, counts });
    }

    return results;
  } finally {
    await disconnect();
  }
};

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const args = new Set(process.argv.slice(2));
  const unknownArgs = [...args].filter(
    (argument) => !['--dry-run', '--replace'].includes(argument),
  );

  if (unknownArgs.length) {
    console.error(`Unknown arguments: ${unknownArgs.join(', ')}`);
    process.exitCode = 1;
  } else {
    seedSiteContent({
      dryRun: args.has('--dry-run'),
      replace: args.has('--replace'),
    })
      .then((results) => {
        for (const result of results) {
          const { projects, experiences, technologies, feedbacks } =
            result.counts;
          console.log(
            `${result.locale}: ${result.status}; projects=${projects}, experiences=${experiences}, technologies=${technologies}, feedbacks=${feedbacks}`,
          );
        }
      })
      .catch((error) => {
        console.error('Content seeding failed:', error.message);
        process.exitCode = 1;
      });
  }
}
