import Foundation
import Capacitor
import MultipeerConnectivity

/// Capacitor plugin for Nearby Connections using Multipeer Connectivity
@objc(NearbyConnectionsPlugin)
public class NearbyConnectionsPlugin: CAPPlugin, CAPBridgedPlugin {
    
    public let identifier = "NearbyConnectionsPlugin"
    public let jsName = "NearbyConnections"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startAdvertising", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopAdvertising", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateAdvertising", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startBrowsing", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopBrowsing", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDiscoveredRooms", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestToJoin", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "respondToJoinRequest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise)
    ]
    
    private var pendingJoinCalls: [String: CAPPluginCall] = [:]
    
    public override func load() {
        MultipeerManager.shared.delegate = self
    }
    
    // MARK: - Plugin Methods
    
    /// Check if Nearby Connections is supported on this device
    @objc func isSupported(_ call: CAPPluginCall) {
        // Multipeer Connectivity is available on iOS 7+, so always supported
        call.resolve(["supported": true])
    }
    
    /// Start advertising a room to nearby devices
    @objc func startAdvertising(_ call: CAPPluginCall) {
        guard let roomCode = call.getString("roomCode"),
              let roomName = call.getString("roomName"),
              let hostNickname = call.getString("hostNickname") else {
            call.reject("Missing required parameters: roomCode, roomName, hostNickname")
            return
        }
        
        let roomInfo = NearbyRoomInfo(
            roomCode: roomCode,
            roomName: roomName,
            hostNickname: hostNickname,
            hostAvatar: call.getString("hostAvatar"),
            category: call.getString("category"),
            playerCount: call.getInt("playerCount") ?? 1,
            maxPlayers: call.getInt("maxPlayers") ?? 10
        )
        
        DispatchQueue.main.async {
            MultipeerManager.shared.startAdvertising(roomInfo: roomInfo)
            call.resolve(["advertising": true])
        }
    }
    
    /// Stop advertising
    @objc func stopAdvertising(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            MultipeerManager.shared.stopAdvertising()
            call.resolve(["advertising": false])
        }
    }
    
    /// Update advertising info (e.g., player count changed)
    @objc func updateAdvertising(_ call: CAPPluginCall) {
        guard let roomCode = call.getString("roomCode"),
              let roomName = call.getString("roomName"),
              let hostNickname = call.getString("hostNickname") else {
            call.reject("Missing required parameters")
            return
        }
        
        let roomInfo = NearbyRoomInfo(
            roomCode: roomCode,
            roomName: roomName,
            hostNickname: hostNickname,
            hostAvatar: call.getString("hostAvatar"),
            category: call.getString("category"),
            playerCount: call.getInt("playerCount") ?? 1,
            maxPlayers: call.getInt("maxPlayers") ?? 10
        )
        
        DispatchQueue.main.async {
            MultipeerManager.shared.updateAdvertising(roomInfo: roomInfo)
            call.resolve(["advertising": true])
        }
    }
    
    /// Start browsing for nearby rooms
    @objc func startBrowsing(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            MultipeerManager.shared.startBrowsing()
            call.resolve(["browsing": true])
        }
    }
    
    /// Stop browsing
    @objc func stopBrowsing(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            MultipeerManager.shared.stopBrowsing()
            call.resolve(["browsing": false])
        }
    }
    
    /// Get all discovered rooms
    @objc func getDiscoveredRooms(_ call: CAPPluginCall) {
        let rooms = MultipeerManager.shared.discoveredRooms.map { (key, room) -> [String: Any] in
            return [
                "peerId": key,
                "roomCode": room.roomInfo.roomCode,
                "roomName": room.roomInfo.roomName,
                "hostNickname": room.roomInfo.hostNickname,
                "hostAvatar": room.roomInfo.hostAvatar ?? "",
                "category": room.roomInfo.category ?? "",
                "playerCount": room.roomInfo.playerCount,
                "maxPlayers": room.roomInfo.maxPlayers
            ]
        }
        
        call.resolve(["rooms": rooms])
    }
    
    /// Request to join a room
    @objc func requestToJoin(_ call: CAPPluginCall) {
        guard let peerId = call.getString("peerId") else {
            call.reject("Missing peerId parameter")
            return
        }
        
        guard let discoveredRoom = MultipeerManager.shared.discoveredRooms[peerId] else {
            call.reject("Room not found for peerId: \(peerId)")
            return
        }
        
        // Store the call for later resolution when we receive the room code
        pendingJoinCalls[peerId] = call
        
        DispatchQueue.main.async {
            MultipeerManager.shared.requestToJoin(peerId: discoveredRoom.peerId)
        }
        
        // Set a timeout for the join request
        DispatchQueue.main.asyncAfter(deadline: .now() + 30) { [weak self] in
            if let pendingCall = self?.pendingJoinCalls.removeValue(forKey: peerId) {
                pendingCall.reject("Join request timed out")
            }
        }
    }
    
    /// Respond to a join request (host accepts or declines)
    @objc func respondToJoinRequest(_ call: CAPPluginCall) {
        guard let peerId = call.getString("peerId") else {
            call.reject("Missing peerId parameter")
            return
        }
        
        let accept = call.getBool("accept") ?? false
        
        DispatchQueue.main.async {
            if accept {
                MultipeerManager.shared.acceptInvitation(from: peerId)
            } else {
                MultipeerManager.shared.declineInvitation(from: peerId)
            }
            call.resolve(["accepted": accept])
        }
    }
    
    /// Disconnect from all peers
    @objc func disconnect(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            MultipeerManager.shared.disconnect()
            call.resolve()
        }
    }
    
    /// Get current state
    @objc func getState(_ call: CAPPluginCall) {
        call.resolve([
            "isAdvertising": MultipeerManager.shared.isAdvertising,
            "isBrowsing": MultipeerManager.shared.isBrowsing,
            "roomCount": MultipeerManager.shared.discoveredRooms.count
        ])
    }
    
    // MARK: - Helper to convert room to JS object
    
    private func roomToJSObject(_ room: DiscoveredRoom) -> [String: Any] {
        return [
            "peerId": room.peerId.displayName,
            "roomCode": room.roomInfo.roomCode,
            "roomName": room.roomInfo.roomName,
            "hostNickname": room.roomInfo.hostNickname,
            "hostAvatar": room.roomInfo.hostAvatar ?? "",
            "category": room.roomInfo.category ?? "",
            "playerCount": room.roomInfo.playerCount,
            "maxPlayers": room.roomInfo.maxPlayers
        ]
    }
}

// MARK: - MultipeerManagerDelegate
extension NearbyConnectionsPlugin: MultipeerManagerDelegate {
    
    func didDiscoverRoom(_ room: DiscoveredRoom) {
        notifyListeners("roomDiscovered", data: roomToJSObject(room))
    }
    
    func didLoseRoom(peerId: String) {
        notifyListeners("roomLost", data: ["peerId": peerId])
    }
    
    func didReceiveJoinRequest(from peerId: MCPeerID, roomCode: String) {
        notifyListeners("joinRequestReceived", data: [
            "peerId": peerId.displayName,
            "roomCode": roomCode
        ])
    }
    
    func didConnect(to peerId: MCPeerID) {
        notifyListeners("peerConnected", data: ["peerId": peerId.displayName])
    }
    
    func didDisconnect(from peerId: MCPeerID) {
        notifyListeners("peerDisconnected", data: ["peerId": peerId.displayName])
    }
    
    func didReceiveRoomCode(_ roomCode: String, from peerId: MCPeerID) {
        // Resolve any pending join call
        if let call = pendingJoinCalls.removeValue(forKey: peerId.displayName) {
            call.resolve(["roomCode": roomCode])
        }
        
        // Also notify listeners
        notifyListeners("roomCodeReceived", data: [
            "peerId": peerId.displayName,
            "roomCode": roomCode
        ])
    }
}
