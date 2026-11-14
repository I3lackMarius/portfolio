import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import User from '../models/User.js';
import { entitlementRepository } from '../life/core/entitlementRepository.js';
import { listModuleDefinitions } from '../life/core/moduleRegistry.js';
import { provisioningService } from '../life/core/provisioningService.js';

const moduleKeysAvailable = new Set(
  listModuleDefinitions().map(({ key }) => key),
);
const usage = [
  'Usage: node backend/scripts/provisionLifeWorkspace.js --user-id <id> --modules <module,...> [--apply]',
  'Without --apply, the command validates the request and performs no writes.',
].join('\n');

export class ProvisioningInputError extends Error {}

const validateModuleKeys = (moduleKeys) => {
  if (!Array.isArray(moduleKeys) || moduleKeys.length === 0) {
    throw new ProvisioningInputError('An explicit module list is required.');
  }

  if (moduleKeys.some((key) => !moduleKeysAvailable.has(key))) {
    throw new ProvisioningInputError(
      'The module list contains an unknown module.',
    );
  }

  if (new Set(moduleKeys).size !== moduleKeys.length) {
    throw new ProvisioningInputError(
      'The module list must not contain duplicates.',
    );
  }
};

export const provisionLifeWorkspace = async ({
  userId,
  moduleKeys,
  apply = false,
} = {}) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new ProvisioningInputError('A valid user ID is required.');
  }
  validateModuleKeys(moduleKeys);

  const user = await User.findById(userId);
  if (!user) {
    throw new ProvisioningInputError('The specified user does not exist.');
  }

  if (!apply) {
    return { dryRun: true, moduleKeys: [...moduleKeys] };
  }

  const { tenant } = await provisioningService.provisionPersonalWorkspace(
    user._id,
  );
  const entitlements = [];

  for (const moduleKey of moduleKeys) {
    try {
      await entitlementRepository.create({
        tenantId: tenant._id,
        moduleKey,
      });
      entitlements.push({ moduleKey, result: 'created' });
    } catch (error) {
      if (error?.code !== 11000) throw error;

      const existing = await entitlementRepository.findByTenantAndModule(
        tenant._id,
        moduleKey,
      );
      if (!existing) throw error;

      entitlements.push({
        moduleKey,
        result: 'unchanged',
        status: existing.status,
      });
    }
  }

  return {
    dryRun: false,
    moduleKeys: [...moduleKeys],
    entitlements,
  };
};

const parseArguments = (args) => {
  let userId;
  let moduleList;
  let apply = false;
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      help = true;
    } else if (argument === '--apply') {
      apply = true;
    } else if (argument === '--user-id') {
      userId = args[++index];
    } else if (argument === '--modules') {
      moduleList = args[++index];
    } else {
      throw new ProvisioningInputError('Unknown command-line option.');
    }
  }

  if (help) return { help: true };
  if (!userId) {
    throw new ProvisioningInputError('The --user-id option is required.');
  }
  if (!moduleList) {
    throw new ProvisioningInputError('The --modules option is required.');
  }

  return {
    userId,
    moduleKeys: moduleList.split(',').map((key) => key.trim()),
    apply,
  };
};

const runCli = async (args) => {
  const options = parseArguments(args);
  if (options.help) {
    console.log(usage);
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new ProvisioningInputError(
      'MONGODB_URI must be set in the environment.',
    );
  }

  try {
    await mongoose.connect(mongoUri);
    const result = await provisionLifeWorkspace(options);
    if (result.dryRun) {
      console.log(
        `Dry run complete; no writes were made. Requested modules: ${result.moduleKeys.join(', ')}.`,
      );
    } else {
      console.log(
        `Provisioning applied for ${result.entitlements.length} requested module(s).`,
      );
    }
  } finally {
    await mongoose.disconnect();
  }
};

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedPath === import.meta.url) {
  runCli(process.argv.slice(2)).catch((error) => {
    if (error instanceof ProvisioningInputError) {
      console.error(error.message);
    } else {
      console.error(
        `Provisioning failed (${error?.name ?? 'Error'}); details withheld to protect database credentials.`,
      );
    }
    process.exitCode = 1;
  });
}
