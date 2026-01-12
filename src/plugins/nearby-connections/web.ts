import { WebPlugin } from '@capacitor/core';

import type {
  NearbyConnectionsPlugin,
  NearbyRoomInfo,
  IsSupportedResult,
  AdvertisingResult,
  BrowsingResult,
  DiscoveredRoomsResult,
  JoinResult,
  RespondResult,
  NearbyConnectionsState,
} from './definitions';

/**
 * Web implementation of NearbyConnections plugin
 * Returns unsupported/no-op for all methods since Multipeer Connectivity
 * is not available on web browsers
 */
export class NearbyConnectionsWeb extends WebPlugin implements NearbyConnectionsPlugin {
  
  async isSupported(): Promise<IsSupportedResult> {
    // Web browsers don't support Multipeer Connectivity
    return { supported: false };
  }

  async startAdvertising(_options: NearbyRoomInfo): Promise<AdvertisingResult> {
    console.warn('[NearbyConnections] Not supported on web');
    return { advertising: false };
  }

  async stopAdvertising(): Promise<AdvertisingResult> {
    return { advertising: false };
  }

  async updateAdvertising(_options: NearbyRoomInfo): Promise<AdvertisingResult> {
    return { advertising: false };
  }

  async startBrowsing(): Promise<BrowsingResult> {
    console.warn('[NearbyConnections] Not supported on web');
    return { browsing: false };
  }

  async stopBrowsing(): Promise<BrowsingResult> {
    return { browsing: false };
  }

  async getDiscoveredRooms(): Promise<DiscoveredRoomsResult> {
    return { rooms: [] };
  }

  async requestToJoin(_options: { peerId: string }): Promise<JoinResult> {
    throw new Error('NearbyConnections not supported on web');
  }

  async respondToJoinRequest(_options: { peerId: string; accept: boolean }): Promise<RespondResult> {
    throw new Error('NearbyConnections not supported on web');
  }

  async disconnect(): Promise<void> {
    // No-op on web
  }

  async getState(): Promise<NearbyConnectionsState> {
    return {
      isAdvertising: false,
      isBrowsing: false,
      roomCount: 0,
    };
  }
}
