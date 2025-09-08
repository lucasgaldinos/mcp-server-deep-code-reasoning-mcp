/**
 * Mock database implementation for performance analysis examples
 * This simulates various database operations and performance scenarios
 */

export interface Database {
  query(sql: string, params?: any[]): Promise<any[]>;
  transaction<T>(fn: (db: Database) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

class MockDatabase implements Database {
  private connected = true;
  private queryCount = 0;
  
  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Database connection closed');
    }
    
    this.queryCount++;
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Mock different query types
    if (sql.includes('SELECT')) {
      return this.mockSelectResult();
    } else if (sql.includes('INSERT')) {
      return [{ insertId: Math.floor(Math.random() * 1000) }];
    } else if (sql.includes('UPDATE')) {
      return [{ affectedRows: Math.floor(Math.random() * 10) }];
    } else if (sql.includes('DELETE')) {
      return [{ deletedRows: Math.floor(Math.random() * 5) }];
    }
    
    return [];
  }
  
  async transaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
    if (!this.connected) {
      throw new Error('Database connection closed');
    }
    
    try {
      // Simulate transaction overhead
      await new Promise(resolve => setTimeout(resolve, 10));
      const result = await fn(this);
      // Simulate commit time
      await new Promise(resolve => setTimeout(resolve, 5));
      return result;
    } catch (error) {
      // Simulate rollback time
      await new Promise(resolve => setTimeout(resolve, 15));
      throw error;
    }
  }
  
  async close(): Promise<void> {
    this.connected = false;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  private mockSelectResult(): any[] {
    const rowCount = Math.floor(Math.random() * 100) + 1;
    return Array(rowCount).fill(null).map((_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      email: `user${index + 1}@example.com`,
      created_at: new Date(Date.now() - Math.random() * 86400000 * 365).toISOString(),
      status: Math.random() > 0.5 ? 'active' : 'inactive'
    }));
  }
  
  getQueryCount(): number {
    return this.queryCount;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
}

export function createDatabase(): Database {
  return new MockDatabase();
}

export function createSlowDatabase(): Database {
  const db = new MockDatabase();
  
  // Override query method to simulate slow database
  const originalQuery = db.query.bind(db);
  db.query = async (sql: string, params?: any[]) => {
    // Add extra delay for slow database simulation
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    return originalQuery(sql, params);
  };
  
  return db;
}

export function createUnreliableDatabase(): Database {
  const db = new MockDatabase();
  
  // Override query method to simulate unreliable database
  const originalQuery = db.query.bind(db);
  db.query = async (sql: string, params?: any[]) => {
    // 10% chance of failure
    if (Math.random() < 0.1) {
      throw new Error('Database connection timeout');
    }
    return originalQuery(sql, params);
  };
  
  return db;
}
