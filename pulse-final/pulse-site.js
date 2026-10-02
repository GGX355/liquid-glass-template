import { mountPulse } from './pulse-runtime.js';
import { createDemoApi } from './pulse-demo.js';
mountPulse({ business: createDemoApi() });
