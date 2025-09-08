/**
 * @fileoverview Memory Management Protocol Usage Example
 * @description Example of how to use the MemoryManagementProtocol for ABSOLUTE-RULE compliance
 */

import { MemoryManagementProtocol, MemoryEntityType } from './MemoryManagementProtocol.js';

// Example usage of the Memory Management Protocol
async function exampleUsage() {
  // Initialize the protocol with configuration
  const protocol = new MemoryManagementProtocol({
    thoughtsPerCheckpoint: 10,
    maxCheckpoints: 100,
    autoCheckpoint: true,
    enablePersistence: true,
  });

  // Initialize the protocol
  await protocol.initialize();

  // Record thoughts during analysis
  const thought1 = await protocol.recordThought(
    'Starting analysis of user request for memory management implementation',
    MemoryEntityType.ANALYSIS,
    'user_request_analysis',
    0.8,
  );

  const thought2 = await protocol.recordThought(
    'Identified ABSOLUTE-RULE compliance requirements for memory tracking',
    MemoryEntityType.REQUIREMENT,
    'compliance_check',
    0.9,
  );

  // Add observations to existing thoughts
  await protocol.addObservation(thought1, 'Additional context: Phase 5 completion requires memory protocol');

  // Create relationships between thoughts
  await protocol.createRelationship(thought1, thought2, 'depends_on');

  // Record architectural decisions (commented out for now)
  // const decision1 = await reasoner.makeDecision("Should we implement caching for this query?", {...});

  // Get current statistics
  const stats = protocol.getStats();
  console.log('Memory stats:', stats);

  // Validate graph integrity
  const isValid = await protocol.validateGraph();
  console.log('Graph validation:', isValid);

  // Get data for MCP memory persistence
  const persistenceData = protocol.getPersistenceData();
  console.log('Persistence data:', persistenceData);

  // Example of how to integrate with MCP memory tools:
  // This would be called externally when MCP memory tools are available
  /*
  import { mcp_memory_create_entities } from 'mcp-memory-tools';
  import { mcp_memory_create_relations } from 'mcp-memory-tools';

  // Create entities in persistent memory
  await mcp_memory_create_entities(persistenceData.entities);

  // Create relations in persistent memory
  await mcp_memory_create_relations(persistenceData.relations);
  */
}

// Export for use in other modules
export { exampleUsage };
