import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        clearNotificationBadge()
    }

    /// Take the red dot off the icon once the player is looking at the app.
    ///
    /// Every push this app sends carries `aps.badge = 1` — see
    /// `supabase/functions/_shared/pushPayload.ts` and `notify-new-levels`.
    /// APNs treats that number as the badge's new value, not as an increment,
    /// so one notification pins the icon at 1 and every later one re-pins it
    /// to the same 1.
    ///
    /// Nothing ever set it back. iOS does not clear a badge when the app is
    /// opened, read, or the notification swiped away — the app has to say so.
    /// So the first push a player received left a permanent 1 on their home
    /// screen, whatever they did afterwards. Reported exactly that way: the
    /// badge is always on, and opening the app does not take it off.
    ///
    /// Cleared on *becoming active* rather than on launch, because the common
    /// case is the app already running in the background: a launch-only clear
    /// would leave the badge up for everyone who never fully quits it.
    ///
    /// Delivered notifications are deliberately left in Notification Centre.
    /// There is no in-app inbox, so wiping them would be the only place a
    /// player could still read what arrived while they were away.
    private func clearNotificationBadge() {
        if #available(iOS 16.0, *) {
            // The completion handler is passed explicitly rather than relying
            // on a default: it is an imported Objective-C block parameter,
            // and there is no Swift toolchain in CI to catch it if it has no
            // default value in a given SDK.
            UNUserNotificationCenter.current().setBadgeCount(0, withCompletionHandler: nil)
        } else {
            // Deprecated from iOS 17, and the only option below 16. The
            // project deploys to 15.0.
            UIApplication.shared.applicationIconBadgeNumber = 0
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
