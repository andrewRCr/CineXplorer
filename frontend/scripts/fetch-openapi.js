#!/usr/bin/env node
/**
 * Fetch OpenAPI schema from backend API with TLS safety checks.
 *
 * This script fetches the OpenAPI schema and saves it locally for type generation.
 * TLS verification is enforced by default for security.
 *
 * Usage:
 *   node scripts/fetch-openapi.js
 *
 * Environment Variables:
 *   OPENAPI_SCHEMA_URL - API endpoint (default: https://localhost:8444/api/openapi.json)
 *   DEV_SKIP_TLS - Set to 'true' to skip TLS verification (development only)
 *   NODE_ENV - Must be 'development' to allow DEV_SKIP_TLS
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SCHEMA_URL = process.env.OPENAPI_SCHEMA_URL || 'https://localhost:8444/api/openapi.json';
const OUTPUT_FILE = path.join(__dirname, '..', 'openapi.json');
const ALLOW_SKIP_TLS = process.env.DEV_SKIP_TLS === 'true';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Safety check: Only allow TLS bypass in development
if (ALLOW_SKIP_TLS && !IS_DEVELOPMENT) {
  console.error('❌ ERROR: TLS bypass (DEV_SKIP_TLS) is only allowed in development mode');
  console.error('   Set NODE_ENV=development to enable this option');
  process.exit(1);
}

// Configure HTTPS agent
const agent = new https.Agent({
  rejectUnauthorized: !(ALLOW_SKIP_TLS && IS_DEVELOPMENT)
});

console.log('🔄 Fetching OpenAPI schema...');
console.log(`   URL: ${SCHEMA_URL}`);
console.log(`   TLS Verification: ${agent.options.rejectUnauthorized ? '✅ ENABLED' : '⚠️  DISABLED (development only)'}`);

https.get(SCHEMA_URL, { agent }, (res) => {
  if (res.statusCode !== 200) {
    console.error(`❌ ERROR: Failed to fetch schema (HTTP ${res.statusCode})`);
    process.exit(1);
  }

  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      // Validate JSON
      JSON.parse(data);

      // Write to file
      fs.writeFileSync(OUTPUT_FILE, data, 'utf8');
      console.log(`✅ Successfully saved OpenAPI schema to ${path.basename(OUTPUT_FILE)}`);
      console.log(`   Size: ${(data.length / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('❌ ERROR: Invalid JSON response');
      console.error(err.message);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ ERROR: Network request failed');
  console.error(err.message);

  if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || err.code === 'CERT_HAS_EXPIRED') {
    console.error('\n💡 TIP: For local development with self-signed certificates, you can use:');
    console.error('   DEV_SKIP_TLS=true NODE_ENV=development npm run fetch-schema');
  }

  process.exit(1);
});