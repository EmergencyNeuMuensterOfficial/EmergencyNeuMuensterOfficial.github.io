export const LINKS = {
  invite:
    "https://discord.com/oauth2/authorize?client_id=1399710116449878017&permissions=268446800&scope=bot%20applications.commands",
  support: "https://discord.gg/FWJDzEthnc",
  topgg: "https://top.gg/bot/1399710116449878017",
} as const;

export const STATS = [
  { value: "100+", label: "Servers" },
  { value: "250+", label: "Members protected" },
  { value: "95.9%", label: "Uptime" },
] as const;

export const FEATURES = [
  {
    title: "CAPTCHA verification",
    text: "Stop raids and fake accounts at the door with a verification flow that real members can finish in seconds.",
  },
  {
    title: "Welcome system",
    text: "Greet new members with custom messages, role assignment, and a clear first step into your community.",
  },
  {
    title: "Custom commands",
    text: "Build responses with variables and permissions so the bot matches how your server actually runs.",
  },
  {
    title: "Moderation tools",
    text: "Keep channels clean with role gates, verification timeouts, and controls that work at any server size.",
  },
] as const;

export const UPTIME_DAYS = [
  99.9, 100, 99.8, 100, 99.4, 100, 100, 98.7, 99.9, 100, 100, 99.6, 100, 100,
  99.2, 100, 100, 99.8, 100, 97.1, 99.5, 100, 100, 99.9, 100, 100, 99.7, 100, 100, 95.9,
];
