#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(NearbyConnectionsPlugin, "NearbyConnections",
    CAP_PLUGIN_METHOD(isSupported, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startAdvertising, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopAdvertising, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateAdvertising, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startBrowsing, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopBrowsing, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getDiscoveredRooms, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestToJoin, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(disconnect, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getState, CAPPluginReturnPromise);
)
