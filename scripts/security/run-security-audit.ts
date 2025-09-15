#!/usr/bin/env tsx
/**
 * Security Audit Script
 * Runs comprehensive security audit for enterprise deployment readiness
 */

import { runSecurityAuditCli } from '../../src/security/security-audit-framework.js';

async function main() {
  try {
    await runSecurityAuditCli();
  } catch (error) {
    console.error('Security audit failed:', error);
    process.exit(1);
  }
}

main();