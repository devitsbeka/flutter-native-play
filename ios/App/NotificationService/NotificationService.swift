import Intents
import UserNotifications

/// Dresses incoming pushes: the icon image, and — for a push that comes from
/// another player — the sender's face.
///
/// Two jobs, both of which only iOS can do and only from here:
///
/// 1. **The icon.** Every scheduled push carries an image URL (an icon from
///    the app's own library, served from mytrivia.io/push/). iOS renders it
///    only if an extension downloads and attaches it; without this target the
///    notification is text-only, which is how the app behaved before it
///    existed.
///
/// 2. **The person.** A push sent BY SOMEONE — a game invite, a friend
///    request, a host calling you back — carries `sender_name` and
///    `sender_avatar`. Rebuilding the content from an `INSendMessageIntent`
///    makes iOS draw it as a communication notification: the sender's avatar
///    in the circle with the app icon badged onto it, their name as the
///    title. That is the Messages/Snapchat treatment, and it is the only way
///    to get it — the alert payload has no field for "this came from a
///    person".
///
/// Everything is best-effort. No URL, a failed download, a missing
/// entitlement, a timeout: each falls through to presenting content that is
/// one step less decorated, never to a lost notification.
class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?
    /// iOS kills the extension after one delivery; a second call is a crash
    /// waiting to happen when a slow download lands after the timeout.
    private var hasDelivered = false

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler

        guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
            contentHandler(request.content)
            return
        }
        bestAttemptContent = content

        let userInfo = request.content.userInfo
        let iconURL = Self.imageURL(from: userInfo)
        let senderName = Self.trimmedString(userInfo["sender_name"])
        let avatarURL = Self.httpsURL(Self.trimmedString(userInfo["sender_avatar"]))

        // Nothing to fetch and nobody to attribute it to: deliver as-is.
        if iconURL == nil, senderName == nil {
            deliver(content)
            return
        }

        let group = DispatchGroup()
        // Written on a URLSession queue, read after the group completes — the
        // dispatch group's own ordering is what makes that safe.
        var avatarData: Data?

        if let avatarURL = avatarURL {
            group.enter()
            URLSession.shared.dataTask(with: avatarURL) { data, _, _ in
                avatarData = data
                group.leave()
            }.resume()
        }

        if let iconURL = iconURL {
            group.enter()
            URLSession.shared.downloadTask(with: iconURL) { location, _, _ in
                defer { group.leave() }
                guard let location = location else { return }

                // The temp file vanishes when this closure returns; the
                // attachment API also wants a sensible extension for type
                // detection, so move it under the notification's identifier.
                let ext = iconURL.pathExtension.isEmpty ? "png" : iconURL.pathExtension
                let destination = FileManager.default.temporaryDirectory
                    .appendingPathComponent(request.identifier)
                    .appendingPathExtension(ext)
                do {
                    try? FileManager.default.removeItem(at: destination)
                    try FileManager.default.moveItem(at: location, to: destination)
                    let attachment = try UNNotificationAttachment(identifier: "icon", url: destination)
                    content.attachments = [attachment]
                } catch {
                    // Text-only is a fine notification too.
                }
            }.resume()
        }

        group.notify(queue: .main) { [weak self] in
            guard let self = self else { return }
            let dressed = Self.communicationContent(
                content,
                senderName: senderName,
                avatarData: avatarData
            )
            self.deliver(dressed ?? content)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // Out of time: deliver what we have rather than nothing.
        if let bestAttemptContent = bestAttemptContent {
            deliver(bestAttemptContent)
        }
    }

    /// Delivers once. Both callers are on the main thread (the dispatch
    /// group notifies there, and iOS calls the expiry hook there), so the
    /// flag needs no lock.
    private func deliver(_ content: UNNotificationContent) {
        guard !hasDelivered else { return }
        hasDelivered = true
        contentHandler?(content)
    }

    /// Rebuilds the notification as coming from a person, or returns nil to
    /// leave it alone (no sender, or iOS refused — a missing Communication
    /// Notifications entitlement makes `updating(from:)` throw).
    private static func communicationContent(
        _ content: UNMutableNotificationContent,
        senderName: String?,
        avatarData: Data?
    ) -> UNNotificationContent? {
        guard let senderName = senderName, !senderName.isEmpty else { return nil }

        let avatar = avatarData.flatMap { INImage(imageData: $0) }
        // The handle identifies the sender to iOS. There is no phone number
        // or email in play, so the nickname is the handle — enough for iOS to
        // group a conversation, and it never leaves the device.
        let sender = INPerson(
            personHandle: INPersonHandle(value: senderName, type: .unknown),
            nameComponents: nil,
            displayName: senderName,
            image: avatar,
            contactIdentifier: nil,
            customIdentifier: nil
        )

        // iOS shows the sender's name as the title, so a body that repeats it
        // ("Gloria" / "Gloria invited you to Techno Clan") says it twice.
        // Every localised body is written name-first, so dropping that prefix
        // reads correctly in all seven languages — and a body that does not
        // start with the name is left exactly as it is.
        let body = content.body.hasPrefix(senderName + " ")
            ? String(content.body.dropFirst(senderName.count + 1))
            : content.body

        let intent = INSendMessageIntent(
            recipients: nil,
            outgoingMessageType: .outgoingMessageText,
            content: body,
            speakableGroupName: nil,
            conversationIdentifier: content.threadIdentifier.isEmpty
                ? "mytrivia" : content.threadIdentifier,
            serviceName: nil,
            sender: sender,
            attachments: nil
        )
        if let avatar = avatar {
            intent.setImage(avatar, forParameterNamed: \.sender)
        }

        // Donating is what lets iOS keep the avatar for later notifications
        // from the same person, and puts the app in the share sheet's
        // suggestions. Incoming: this message was received, not sent.
        let interaction = INInteraction(intent: intent, response: nil)
        interaction.direction = .incoming
        interaction.donate(completion: nil)

        guard let updated = try? content.updating(from: intent) else { return nil }
        // `updating(from:)` keeps the original body; the de-duplicated one is
        // ours to set.
        guard let mutable = updated.mutableCopy() as? UNMutableNotificationContent else {
            return updated
        }
        mutable.body = body
        return mutable
    }

    private static func trimmedString(_ value: Any?) -> String? {
        guard let string = value as? String else { return nil }
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private static func httpsURL(_ value: String?) -> URL? {
        guard let value = value, let url = URL(string: value), url.scheme == "https" else {
            return nil
        }
        return url
    }

    private static func imageURL(from userInfo: [AnyHashable: Any]) -> URL? {
        let candidates: [String?] = [
            (userInfo["fcm_options"] as? [String: Any])?["image"] as? String,
            userInfo["image"] as? String,
            userInfo["gcm.notification.image"] as? String,
        ]
        for case let urlString? in candidates {
            if let url = httpsURL(urlString) {
                return url
            }
        }
        return nil
    }
}
