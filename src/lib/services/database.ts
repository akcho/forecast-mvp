import { CalculatedValue } from '@/types/financial';

export class DatabaseService {
  private static instance: DatabaseService;
  private calculatedValues: Map<string, CalculatedValue> = new Map();

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async storeCalculatedValue(value: CalculatedValue): Promise<void> {
    this.calculatedValues.set(value.id, value);
    // In a real implementation, this would persist to a database
    // await db.collection('calculatedValues').insertOne(value);
  }

  public async getCalculatedValue(id: string): Promise<CalculatedValue | null> {
    const value = this.calculatedValues.get(id);
    if (!value) return null;
    
    // In a real implementation, this would query the database
    // const value = await db.collection('calculatedValues').findOne({ id });
    return value;
  }

  public async clearCalculatedValues(): Promise<void> {
    this.calculatedValues.clear();
    // In a real implementation, this would clear the database collection
    // await db.collection('calculatedValues').deleteMany({});
  }
} 