#!/usr/bin/env node
/**
 * Export the OpenAPI schema from this checkout's own backend container.
 *
 * Runs the backend's `export_openapi_schema` management command in the backend service
 * of this checkout's Compose project: the full stack in the main checkout, or a
 * worktree's test stack, whose infrastructure/.env names its own project. The output
 * must parse as JSON before openapi.json is written, so a failed export leaves the
 * file as it was. CI exports the schema the same way.
 *
 * A linked worktree whose infrastructure/.env names no project would fall back to the
 * main checkout's default project and export the main checkout's schema, so the
 * export refuses there instead.
 *
 * The console log level is raised to WARNING for the export: the development stack
 * logs at DEBUG to stdout, and an import-time debug line would land in the schema.
 *
 * Usage:
 *   node scripts/export-openapi.js   (run by `npm run generate-types`)
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECKOUT_ROOT = path.join(__dirname, '..', '..');
const COMPOSE_FILE = path.join(CHECKOUT_ROOT, 'infrastructure', 'docker-compose.yml');
const DEFAULT_PROJECT = path.basename(path.dirname(COMPOSE_FILE));
const OUTPUT_FILE = path.join(__dirname, '..', 'openapi.json');
const EXEC_OPTIONS = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] };

/** A linked worktree has a `.git` file pointing at the main repository; the main checkout has a folder. */
function isLinkedWorktree() {
  try {
    return fs.statSync(path.join(CHECKOUT_ROOT, '.git')).isFile();
  } catch {
    return false;
  }
}

function composeProjectName() {
  const config = execFileSync('docker', ['compose', '-f', COMPOSE_FILE, 'config', '--format', 'json'], EXEC_OPTIONS);
  return JSON.parse(config).name;
}

let schema;
try {
  if (isLinkedWorktree() && composeProjectName() === DEFAULT_PROJECT) {
    console.error(`❌ This worktree's Compose project is "${DEFAULT_PROJECT}", the main checkout's.`);
    console.error('   Set COMPOSE_PROJECT_NAME in infrastructure/.env; openapi.json is unchanged.');
    process.exit(1);
  }
  schema = execFileSync(
    'docker',
    [
      'compose', '-f', COMPOSE_FILE,
      'exec', '-T', '-e', 'DJANGO_CONSOLE_LOG_LEVEL=WARNING',
      'backend', 'python', 'manage.py', 'export_openapi_schema',
    ],
    EXEC_OPTIONS,
  );
  JSON.parse(schema);
} catch (error) {
  console.error('❌ Schema export failed; openapi.json is unchanged.');
  console.error("   Is this checkout's backend container running?");
  console.error(`   ${error.message.split('\n')[0]}`);
  process.exit(1);
}

fs.writeFileSync(OUTPUT_FILE, schema, 'utf8');
console.log(`✅ Exported the OpenAPI schema to ${path.basename(OUTPUT_FILE)}`);
