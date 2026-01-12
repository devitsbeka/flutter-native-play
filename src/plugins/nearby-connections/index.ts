import { registerPlugin } from '@capacitor/core';

import type { NearbyConnectionsPlugin } from './definitions';

const NearbyConnections = registerPlugin<NearbyConnectionsPlugin>('NearbyConnections', {
  web: () => import('./web').then(m => new m.NearbyConnectionsWeb()),
});

export * from './definitions';
export { NearbyConnections };
