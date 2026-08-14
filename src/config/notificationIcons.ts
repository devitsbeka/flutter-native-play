import friendrequestIcon from "@/assets/notifications/friend_request.png";
import friendacceptedIcon from "@/assets/notifications/friend_accepted.png";
import newmessageIcon from "@/assets/notifications/new_message.png";
import challengeIcon from "@/assets/notifications/challenge.png";
import roominviteIcon from "@/assets/notifications/room_invite.png";
import roompingIcon from "@/assets/notifications/room_ping.png";
import gamestartedIcon from "@/assets/notifications/game_started.png";
import gameresultIcon from "@/assets/notifications/game_result.png";
import rewardIcon from "@/assets/notifications/reward.png";
import dailyrewardIcon from "@/assets/notifications/daily_reward.png";
import streakIcon from "@/assets/notifications/streak.png";
import levelupIcon from "@/assets/notifications/level_up.png";
import achievementIcon from "@/assets/notifications/achievement.png";
import triviaplayedIcon from "@/assets/notifications/trivia_played.png";
import trivialikedIcon from "@/assets/notifications/trivia_liked.png";
import triviasavedIcon from "@/assets/notifications/trivia_saved.png";
import aigenerationIcon from "@/assets/notifications/ai_generation.png";
import billingIcon from "@/assets/notifications/billing.png";
import subscriptionIcon from "@/assets/notifications/subscription.png";
import welcomeIcon from "@/assets/notifications/welcome.png";
import systemIcon from "@/assets/notifications/system.png";

/**
 * The drawn icon for each notification type — one per member of the
 * NotificationType union, so nothing falls back to a generic mark.
 *
 * Kept apart from notificationConfig's colours and labels because this is
 * artwork: the config is read on the server-ish side of the app too, and a
 * map of image imports has no business being pulled in with it.
 */
export const NOTIFICATION_ICONS: Record<string, string> = {
  friend_request: friendrequestIcon,
  friend_accepted: friendacceptedIcon,
  new_message: newmessageIcon,
  challenge: challengeIcon,
  room_invite: roominviteIcon,
  room_ping: roompingIcon,
  game_started: gamestartedIcon,
  game_result: gameresultIcon,
  reward: rewardIcon,
  daily_reward: dailyrewardIcon,
  streak: streakIcon,
  level_up: levelupIcon,
  achievement: achievementIcon,
  trivia_played: triviaplayedIcon,
  trivia_liked: trivialikedIcon,
  trivia_saved: triviasavedIcon,
  ai_generation: aigenerationIcon,
  billing: billingIcon,
  subscription: subscriptionIcon,
  welcome: welcomeIcon,
  system: systemIcon,
};
