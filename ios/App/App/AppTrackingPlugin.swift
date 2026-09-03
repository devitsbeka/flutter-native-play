import Foundation
import UIKit
import Capacitor
import AppTrackingTransparency

/**
 * App Tracking Transparency, spoken to directly.
 *
 * The app used to reach ATT only through `@capacitor-community/admob`'s
 * `requestTrackingAuthorization()`. That coupled a *store requirement* to an
 * ad SDK's dynamic import: when the import failed, `trackingService` marked
 * itself non-native, the status resolved to `unavailable`, and the prompt was
 * never requested — silently, with the app otherwise working. Build 34 was
 * rejected under guideline 2.1 for a prompt the reviewer could not find.
 *
 * So the prompt gets its own path, owned here, with no dependency on whether
 * ads are available or even wanted.
 *
 * ## The active-state rule
 *
 * `ATTrackingManager.requestTrackingAuthorization` only presents its dialog
 * when the app is `UIApplication.State.active`. Called at any other moment —
 * during launch, behind the splash, while backgrounded — it does not throw
 * and does not queue: it invokes the completion handler immediately with the
 * *current* status and shows nothing. The caller sees `notDetermined` and no
 * dialog, which is indistinguishable from the user having dismissed it.
 *
 * That is why `request` waits for `didBecomeActiveNotification` rather than
 * asking straight away. Costing one notification cycle is worth more than a
 * prompt that silently no-ops on a slow device.
 */
@objc(AppTrackingPlugin)
public class AppTrackingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppTrackingPlugin"
    public let jsName = "AppTracking"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise)
    ]

    /// Guards against two `request` calls racing into two observers. iOS would
    /// show one dialog and strand the other call, and the JS side treats an
    /// unresolved promise as "no answer yet" forever.
    private var isRequesting = false
    private var activeObserver: NSObjectProtocol?

    // MARK: - Status

    @objc public func getStatus(_ call: CAPPluginCall) {
        call.resolve(["status": Self.statusString()])
    }

    private static func statusString() -> String {
        switch ATTrackingManager.trackingAuthorizationStatus {
        case .authorized:    return "authorized"
        case .denied:        return "denied"
        case .restricted:    return "restricted"
        case .notDetermined: return "notDetermined"
        @unknown default:    return "unavailable"
        }
    }

    // MARK: - Request

    @objc public func request(_ call: CAPPluginCall) {
        // Capacitor dispatches plugin calls off the main thread, and
        // `UIApplication.shared.applicationState` may only be read on it.
        // Hopping first also confines `isRequesting` to one thread, so the
        // guard below is a guard rather than a race.
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            // Already answered: iOS will not show the dialog again, and asking
            // is a no-op that returns the stored answer. Report it without churn.
            if ATTrackingManager.trackingAuthorizationStatus != .notDetermined {
                call.resolve(["status": Self.statusString(), "shown": false])
                return
            }

            if self.isRequesting {
                call.reject("A tracking authorization request is already in flight")
                return
            }
            self.isRequesting = true

            self.whenActive {
                ATTrackingManager.requestTrackingAuthorization { _ in
                    // The completion arrives on an arbitrary queue. Read the
                    // manager's own status rather than trusting the passed
                    // value, and hand back on main so the bridge is happy.
                    DispatchQueue.main.async { [weak self] in
                        self?.isRequesting = false
                        call.resolve(["status": Self.statusString(), "shown": true])
                    }
                }
            }
        }
    }

    /// Run `work` once the app is genuinely active — immediately if it already is.
    private func whenActive(_ work: @escaping () -> Void) {
        if UIApplication.shared.applicationState == .active {
            work()
            return
        }

        // One-shot: removed the moment it fires, so a later background/foreground
        // cycle cannot re-trigger a request that has already been answered.
        activeObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            if let observer = self.activeObserver {
                NotificationCenter.default.removeObserver(observer)
                self.activeObserver = nil
            }
            work()
        }
    }

    deinit {
        if let observer = activeObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}
