import UserNotifications

/// Attaches the icon image to incoming pushes.
///
/// Every push the backend sends carries `mutable-content: 1` and an image
/// URL (an icon from the app's own library, served from mytrivia.io/push/).
/// iOS only renders that image if an extension downloads and attaches it —
/// without this target the notification is text-only, which is exactly how
/// the app behaved before it existed.
///
/// The URL is read from wherever FCM put it: `fcm_options.image` is the
/// documented location for APNs delivery, with a couple of fallbacks in
/// case the payload shape shifts. Anything going wrong — no URL, download
/// failure, timeout — falls through to presenting the untouched content, so
/// the worst case is the old behaviour, never a lost notification.
class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        guard let imageURL = Self.imageURL(from: request.content.userInfo) else {
            contentHandler(bestAttemptContent)
            return
        }

        let task = URLSession.shared.downloadTask(with: imageURL) { location, _, _ in
            defer { contentHandler(bestAttemptContent) }
            guard let location = location else { return }

            // The temp file vanishes when this closure returns; the
            // attachment API also wants a sensible extension for type
            // detection, so move it under the notification's identifier.
            let ext = imageURL.pathExtension.isEmpty ? "png" : imageURL.pathExtension
            let destination = FileManager.default.temporaryDirectory
                .appendingPathComponent(request.identifier)
                .appendingPathExtension(ext)
            do {
                try? FileManager.default.removeItem(at: destination)
                try FileManager.default.moveItem(at: location, to: destination)
                let attachment = try UNNotificationAttachment(identifier: "icon", url: destination)
                bestAttemptContent.attachments = [attachment]
            } catch {
                // Text-only is a fine notification too.
            }
        }
        task.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        // Out of time: deliver what we have rather than nothing.
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    private static func imageURL(from userInfo: [AnyHashable: Any]) -> URL? {
        let candidates: [String?] = [
            (userInfo["fcm_options"] as? [String: Any])?["image"] as? String,
            userInfo["image"] as? String,
            userInfo["gcm.notification.image"] as? String,
        ]
        for case let urlString?? in candidates.map({ $0 }) {
            if let url = URL(string: urlString), url.scheme == "https" {
                return url
            }
        }
        return nil
    }
}
