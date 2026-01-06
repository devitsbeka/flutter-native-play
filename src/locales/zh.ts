// Chinese - extending English
import type { KaTranslations } from './ka';
import { en } from './en';
export const zh: KaTranslations = { ...en, common: { ...en.common, play: "玩", back: "返回", next: "下一步", close: "关闭", save: "保存", cancel: "取消", loading: "加载中...", error: "错误", success: "成功!", continue: "继续", coins: "金币", gems: "宝石" }, nav: { ...en.nav, explore: "探索", map: "地图", play: "玩", rank: "排名", profile: "个人资料", settings: "设置", home: "首页", menu: "菜单" }, team: { ...en.team, multiplayer: "多人游戏", signInToPlay: "登录以与朋友一起玩", friends: "朋友", yourRooms: "您的房间", noActiveRooms: "没有活跃房间", join: "加入", recentGames: "最近游戏", noGamesYet: "还没有游戏" }, auth: { ...en.auth, signIn: "登录", signUp: "注册", signOut: "退出" }, featured: { ...en.featured, badgeNew: "新", badgePopular: "热门", badgeBestPrice: "最优价" } };
