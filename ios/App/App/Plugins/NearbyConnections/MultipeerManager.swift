import Foundation
import MultipeerConnectivity

/// Room information that gets advertised to nearby devices
struct NearbyRoomInfo: Codable {
    let roomCode: String
    let roomName: String
    let hostNickname: String
    let hostAvatar: String?
    let category: String?
    let playerCount: Int
    let maxPlayers: Int
}

/// Discovered nearby room
struct DiscoveredRoom {
    let peerId: MCPeerID
    let roomInfo: NearbyRoomInfo
    let discoveredAt: Date
}

/// Delegate protocol for MultipeerManager events
protocol MultipeerManagerDelegate: AnyObject {
    func didDiscoverRoom(_ room: DiscoveredRoom)
    func didLoseRoom(peerId: String)
    func didReceiveJoinRequest(from peerId: MCPeerID, roomCode: String)
    func didConnect(to peerId: MCPeerID)
    func didDisconnect(from peerId: MCPeerID)
    func didReceiveRoomCode(_ roomCode: String, from peerId: MCPeerID)
}

/// Manages Multipeer Connectivity for nearby game room discovery and joining
class MultipeerManager: NSObject {
    
    // MARK: - Constants
    private let serviceType = "worldquizzes" // Must be 1-15 chars, lowercase, no spaces
    
    // MARK: - Properties
    private var localPeerId: MCPeerID
    private var advertiser: MCNearbyServiceAdvertiser?
    private var browser: MCNearbyServiceBrowser?
    
    private(set) var isAdvertising = false
    private(set) var isBrowsing = false
    private(set) var currentRoomInfo: NearbyRoomInfo?
    
    private(set) var discoveredRooms: [String: DiscoveredRoom] = [:] // keyed by peerId.displayName
    private(set) var pendingInvitationHandlers: [String: (Bool, MCSession?) -> Void] = [:]
    
    weak var delegate: MultipeerManagerDelegate?
    
    /// The current multipeer session
    private(set) var session: MCSession?
    
    // MARK: - Singleton
    static let shared = MultipeerManager()
    
    // MARK: - Initialization
    private override init() {
        // Create a unique peer ID for this device
        let deviceName = UIDevice.current.name
        self.localPeerId = MCPeerID(displayName: deviceName)
        super.init()
    }
    
    // MARK: - Advertising (Host)
    
    /// Start advertising a room to nearby devices
    func startAdvertising(roomInfo: NearbyRoomInfo) {
        guard !isAdvertising else {
            print("[NearbyConnections] Already advertising")
            return
        }
        
        self.currentRoomInfo = roomInfo
        
        // Create session
        session = MCSession(peer: localPeerId, securityIdentity: nil, encryptionPreference: .required)
        session?.delegate = self
        
        // Encode room info as discovery info
        var discoveryInfo: [String: String] = [
            "roomCode": roomInfo.roomCode,
            "roomName": roomInfo.roomName,
            "hostNickname": roomInfo.hostNickname,
            "playerCount": String(roomInfo.playerCount),
            "maxPlayers": String(roomInfo.maxPlayers)
        ]
        
        if let category = roomInfo.category {
            discoveryInfo["category"] = category
        }
        if let avatar = roomInfo.hostAvatar {
            discoveryInfo["hostAvatar"] = avatar
        }
        
        // Create and start advertiser
        advertiser = MCNearbyServiceAdvertiser(
            peer: localPeerId,
            discoveryInfo: discoveryInfo,
            serviceType: serviceType
        )
        advertiser?.delegate = self
        advertiser?.startAdvertisingPeer()
        
        isAdvertising = true
        print("[NearbyConnections] Started advertising room: \(roomInfo.roomCode)")
    }
    
    /// Stop advertising the room
    func stopAdvertising() {
        advertiser?.stopAdvertisingPeer()
        advertiser = nil
        isAdvertising = false
        currentRoomInfo = nil
        print("[NearbyConnections] Stopped advertising")
    }
    
    /// Update the room info while advertising (e.g., player count changed)
    func updateAdvertising(roomInfo: NearbyRoomInfo) {
        if isAdvertising {
            stopAdvertising()
            startAdvertising(roomInfo: roomInfo)
        }
    }
    
    // MARK: - Browsing (Joiner)
    
    /// Start browsing for nearby rooms
    func startBrowsing() {
        guard !isBrowsing else {
            print("[NearbyConnections] Already browsing")
            return
        }
        
        // Create session if not exists
        if session == nil {
            session = MCSession(peer: localPeerId, securityIdentity: nil, encryptionPreference: .required)
            session?.delegate = self
        }
        
        // Create and start browser
        browser = MCNearbyServiceBrowser(peer: localPeerId, serviceType: serviceType)
        browser?.delegate = self
        browser?.startBrowsingForPeers()
        
        isBrowsing = true
        discoveredRooms.removeAll()
        print("[NearbyConnections] Started browsing for nearby rooms")
    }
    
    /// Stop browsing for nearby rooms
    func stopBrowsing() {
        browser?.stopBrowsingForPeers()
        browser = nil
        isBrowsing = false
        discoveredRooms.removeAll()
        print("[NearbyConnections] Stopped browsing")
    }
    
    // MARK: - Connection
    
    /// Request to join a room (invite the host to connect)
    func requestToJoin(peerId: MCPeerID) {
        guard let currentSession = session else {
            print("[NearbyConnections] No session available")
            return
        }
        
        // Invite the peer to connect
        browser?.invitePeer(peerId, to: currentSession, withContext: nil, timeout: 30)
        print("[NearbyConnections] Sent join request to \(peerId.displayName)")
    }
    
    /// Accept a pending invitation from a peer
    func acceptInvitation(from peerId: String) {
        if let handler = pendingInvitationHandlers.removeValue(forKey: peerId) {
            handler(true, session)
            print("[NearbyConnections] Accepted invitation from \(peerId)")
        }
    }
    
    /// Decline a pending invitation from a peer
    func declineInvitation(from peerId: String) {
        if let handler = pendingInvitationHandlers.removeValue(forKey: peerId) {
            handler(false, nil)
            print("[NearbyConnections] Declined invitation from \(peerId)")
        }
    }
    
    /// Send the room code to a connected peer (host -> joiner)
    func sendRoomCode(_ roomCode: String, to peer: MCPeerID) {
        guard let currentSession = session else { return }
        
        let message = "ROOMCODE:\(roomCode)"
        if let data = message.data(using: .utf8) {
            do {
                try currentSession.send(data, toPeers: [peer], with: .reliable)
                print("[NearbyConnections] Sent room code to \(peer.displayName)")
            } catch {
                print("[NearbyConnections] Failed to send room code: \(error)")
            }
        }
    }
    
    /// Disconnect from all peers
    func disconnect() {
        // Decline all pending invitations
        for (_, handler) in pendingInvitationHandlers {
            handler(false, nil)
        }
        pendingInvitationHandlers.removeAll()
        
        session?.disconnect()
        session = nil
        stopAdvertising()
        stopBrowsing()
    }
    
    // MARK: - Helpers
    
    private func parseDiscoveryInfo(_ info: [String: String]?) -> NearbyRoomInfo? {
        guard let info = info,
              let roomCode = info["roomCode"],
              let roomName = info["roomName"],
              let hostNickname = info["hostNickname"],
              let playerCountStr = info["playerCount"],
              let playerCount = Int(playerCountStr),
              let maxPlayersStr = info["maxPlayers"],
              let maxPlayers = Int(maxPlayersStr) else {
            return nil
        }
        
        return NearbyRoomInfo(
            roomCode: roomCode,
            roomName: roomName,
            hostNickname: hostNickname,
            hostAvatar: info["hostAvatar"],
            category: info["category"],
            playerCount: playerCount,
            maxPlayers: maxPlayers
        )
    }
}

// MARK: - MCSessionDelegate
extension MultipeerManager: MCSessionDelegate {
    
    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        DispatchQueue.main.async { [weak self] in
            switch state {
            case .connected:
                print("[NearbyConnections] Connected to \(peerID.displayName)")
                self?.delegate?.didConnect(to: peerID)
                
                // If we're the host and have a room, send the room code
                if let roomInfo = self?.currentRoomInfo {
                    self?.sendRoomCode(roomInfo.roomCode, to: peerID)
                }
                
            case .notConnected:
                print("[NearbyConnections] Disconnected from \(peerID.displayName)")
                self?.delegate?.didDisconnect(from: peerID)
                
            case .connecting:
                print("[NearbyConnections] Connecting to \(peerID.displayName)")
                
            @unknown default:
                break
            }
        }
    }
    
    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        guard let message = String(data: data, encoding: .utf8) else { return }
        
        DispatchQueue.main.async { [weak self] in
            if message.hasPrefix("ROOMCODE:") {
                let roomCode = String(message.dropFirst("ROOMCODE:".count))
                print("[NearbyConnections] Received room code: \(roomCode) from \(peerID.displayName)")
                self?.delegate?.didReceiveRoomCode(roomCode, from: peerID)
            }
        }
    }
    
    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {
        // Not used
    }
    
    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {
        // Not used
    }
    
    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {
        // Not used
    }
}

// MARK: - MCNearbyServiceAdvertiserDelegate
extension MultipeerManager: MCNearbyServiceAdvertiserDelegate {
    
    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        print("[NearbyConnections] Received invitation from \(peerID.displayName)")
        
        DispatchQueue.main.async { [weak self] in
            // Store the invitation handler for later accept/decline
            self?.pendingInvitationHandlers[peerID.displayName] = invitationHandler
            
            // Notify the JS layer about the join request
            if let roomCode = self?.currentRoomInfo?.roomCode {
                self?.delegate?.didReceiveJoinRequest(from: peerID, roomCode: roomCode)
            }
            
            // Auto-decline after 30 seconds if not responded
            DispatchQueue.main.asyncAfter(deadline: .now() + 30) { [weak self] in
                if let handler = self?.pendingInvitationHandlers.removeValue(forKey: peerID.displayName) {
                    handler(false, nil)
                    print("[NearbyConnections] Auto-declined invitation from \(peerID.displayName) due to timeout")
                }
            }
        }
    }
    
    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didNotStartAdvertisingPeer error: Error) {
        print("[NearbyConnections] Failed to start advertising: \(error)")
        isAdvertising = false
    }
}

// MARK: - MCNearbyServiceBrowserDelegate
extension MultipeerManager: MCNearbyServiceBrowserDelegate {
    
    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String: String]?) {
        print("[NearbyConnections] Found peer: \(peerID.displayName)")
        
        guard let roomInfo = parseDiscoveryInfo(info) else {
            print("[NearbyConnections] Could not parse discovery info")
            return
        }
        
        let discoveredRoom = DiscoveredRoom(
            peerId: peerID,
            roomInfo: roomInfo,
            discoveredAt: Date()
        )
        
        DispatchQueue.main.async { [weak self] in
            self?.discoveredRooms[peerID.displayName] = discoveredRoom
            self?.delegate?.didDiscoverRoom(discoveredRoom)
        }
    }
    
    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
        print("[NearbyConnections] Lost peer: \(peerID.displayName)")
        
        DispatchQueue.main.async { [weak self] in
            self?.discoveredRooms.removeValue(forKey: peerID.displayName)
            self?.delegate?.didLoseRoom(peerId: peerID.displayName)
        }
    }
    
    func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) {
        print("[NearbyConnections] Failed to start browsing: \(error)")
        isBrowsing = false
    }
}
