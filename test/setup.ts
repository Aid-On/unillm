/**
 * Test setup file to handle unhandled promise rejections
 */

// Suppress unhandled promise rejection warnings during tests
// This is needed because we intentionally create rejected promises in mocks
process.removeAllListeners('unhandledRejection');
process.removeAllListeners('rejectionHandled');

process.on('unhandledRejection', (reason, promise) => {
  // Suppress test-related rejections
  if (reason && typeof reason === 'object' && 
      ('code' in reason || reason.constructor.name === 'LLMProviderError')) {
    return; // Suppress LLMProviderError rejections
  }
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('rejectionHandled', () => {
  // Suppress rejection handled warnings during tests
});