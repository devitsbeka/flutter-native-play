import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Room information for nearby advertising/discovery
 */
export interface NearbyRoomInfo {
  roomCode: string;
  roomName: string;
  hostNickname: string;
  hostAvatar?: string;
  category?: string;
  playerCount: number;
  maxPlayers: number;
}

/**
 * Discovered nearby room
 */
export interface DiscoveredRoom extends NearbyRoomInfo {
  peerId: string;
}

/**
 * State of the NearbyConnections plugin
 */
export interface NearbyConnectionsState {
  isAdvertising: boolean;
  isBrowsing: boolean;
  roomCount: number;
}

/**
 * Result of isSupported call
 */
export interface IsSupportedResult {
  supported: boolean;
}

/**
 * Result of advertising operations
 */
export interface AdvertisingResult {
  advertising: boolean;
}

/**
 * Result of browsing operations
 */
export interface BrowsingResult {
  browsing: boolean;
}

/**
 * Result of getDiscoveredRooms
 */
export interface DiscoveredRoomsResult {
  rooms: DiscoveredRoom[];
}

/**
 * Result of requestToJoin
 */
export interface JoinResult {
  roomCode: string;
}

/**
 * Result of respondToJoinRequest
 */
export interface RespondResult {
  accepted: boolean;
}

/**
 * Event data for room discovered
 */
export interface RoomDiscoveredEvent extends DiscoveredRoom {}

/**
 * Event data for room lost
 */
export interface RoomLostEvent {
  peerId: string;
}

/**
 * Event data for join request received (host side)
 */
export interface JoinRequestReceivedEvent {
  peerId: string;
  roomCode: string;
}

/**
 * Event data for peer connected
 */
export interface PeerConnectedEvent {
  peerId: string;
}

/**
 * Event data for peer disconnected
 */
export interface PeerDisconnectedEvent {
  peerId: string;
}

/**
 * Event data for room code received (joiner side)
 */
export interface RoomCodeReceivedEvent {
  peerId: string;
  roomCode: string;
}

/**
 * NearbyConnections plugin interface
 */
export interface NearbyConnectionsPlugin {
  /**
   * Check if Nearby Connections is supported on this device
   */
  isSupported(): Promise<IsSupportedResult>;

  /**
   * Start advertising a room to nearby devices
   */
  startAdvertising(options: NearbyRoomInfo): Promise<AdvertisingResult>;

  /**
   * Stop advertising
   */
  stopAdvertising(): Promise<AdvertisingResult>;

  /**
   * Update advertising info (e.g., player count changed)
   */
  updateAdvertising(options: NearbyRoomInfo): Promise<AdvertisingResult>;

  /**
   * Start browsing for nearby rooms
   */
  startBrowsing(): Promise<BrowsingResult>;

  /**
   * Stop browsing
   */
  stopBrowsing(): Promise<BrowsingResult>;

  /**
   * Get all currently discovered rooms
   */
  getDiscoveredRooms(): Promise<DiscoveredRoomsResult>;

  /**
   * Request to join a room by peerId
   */
  requestToJoin(options: { peerId: string }): Promise<JoinResult>;

  /**
   * Respond to a join request (host accepts or declines)
   */
  respondToJoinRequest(options: { peerId: string; accept: boolean }): Promise<RespondResult>;

  /**
   * Disconnect from all peers
   */
  disconnect(): Promise<void>;

  /**
   * Get current state
   */
  getState(): Promise<NearbyConnectionsState>;

  // Event listeners
  addListener(
    eventName: 'roomDiscovered',
    listenerFunc: (event: RoomDiscoveredEvent) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'roomLost',
    listenerFunc: (event: RoomLostEvent) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'joinRequestReceived',
    listenerFunc: (event: JoinRequestReceivedEvent) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'peerConnected',
    listenerFunc: (event: PeerConnectedEvent) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'peerDisconnected',
    listenerFunc: (event: PeerDisconnectedEvent) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'roomCodeReceived',
    listenerFunc: (event: RoomCodeReceivedEvent) => void
  ): Promise<PluginListenerHandle>;

  removeAllListeners(): Promise<void>;
}
