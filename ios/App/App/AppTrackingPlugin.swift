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
                        // `shown` used to be hardcoded true. It is the caller's
                        // only way to tell "the player answered" from "iOS
                        // declined to ask", and since the deadline above can now
                        // reach this while the app is inactive — where iOS
                        // presents nothing and reports the stored status — the
                        // honest answer is whether the status left
                        // `notDetermined`. A still-undetermined status is
                        // retried on the next launch.
                        let status = Self.statusString()
                        call.resolve(["status": status, "shown": status != "notDetermined"])
                    }
                }
            }
        }
    }

    /// How long to wait for the app to become active before asking anyway.
    ///
    /// See `whenActive`. Long enough to cover a slow cold start, short enough
    /// that nothing downstream is left waiting on a notification that is not
    /// coming.
    private static let activeDeadline: TimeInterval = 5

    /// Run `work` once the app is genuinely active — immediately if it already
    /// is, and at the latest after `activeDeadline`.
    ///
    /// ## Why there is a deadline
    ///
    /// This used to wait on `didBecomeActiveNotification` and nothing else, and
    /// that notification is not guaranteed to arrive. `applicationState` is
    /// `.inactive` for reasons that do not end in a fresh activation — behind
    /// the splash, mid-transition, while a system alert is up — and if the app
    /// was already foregrounded, the notification has been and gone before this
    /// observer existed. `work()` was then never called, so `call` was never
    /// resolved.
    ///
    /// An unresolved `CAPPluginCall` is a JavaScript promise that never
    /// settles, and this one is awaited by everything: `ensureTrackingConsent`
    /// keeps it as its in-flight promise forever, `ensureAdConsent` awaits that
    /// before it does anything, `PushRegistrar` awaits both before showing the
    /// notification explainer, and the rewarded-ad gate awaits it on every tap.
    /// One missing notification took out the notification prompt and every ad
    /// in the app, with no error anywhere. That was reported from a device on
    /// build 50 and is what this deadline exists to make impossible.
    ///
    /// Asking while inactive is a recoverable failure and hanging is not: iOS
    /// invokes the completion handler immediately with the current status and
    /// presents nothing, so the status stays `notDetermined`, `shown` reports
    /// false, and the prompt is simply retried on the next launch.
    private func whenActive(_ work: @escaping () -> Void) {
        if UIApplication.shared.applicationState == .active {
            work()
            return
        }

        // Both the observer and the deadline can fire; whichever is first wins.
        var done = false
        let runOnce = { [weak self] in
            guard !done else { return }
            done = true
            if let self = self, let observer = self.activeObserver {
                NotificationCenter.default.removeObserver(observer)
                self.activeObserver = nil
            }
            work()
        }

        // One-shot: removed the moment it fires, so a later background/foreground
        // cycle cannot re-trigger a request that has already been answered.
        activeObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in runOnce() }

        DispatchQueue.main.asyncAfter(deadline: .now() + Self.activeDeadline) {
            if !done {
                NSLog("[AppTracking] Still not active after \(Self.activeDeadline)s — requesting anyway rather than leaving the call unresolved.")
            }
            runOnce()
        }
    }

    deinit {
        if let observer = activeObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}
