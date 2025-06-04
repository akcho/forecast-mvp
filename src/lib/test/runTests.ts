import { runTests } from './calculationTest';

// Run the test suite
console.log('Starting test suite...');
runTests().catch((error: Error) => {
  console.error('Test suite failed:', error.message);
  process.exit(1);
}); 