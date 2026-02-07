// Fun community engagement commands for Discord bot
// Games, Daily Rewards, XP System, and Fun Responses

// ==================== 8-BALL RESPONSES ====================
const MAGIC_8BALL_RESPONSES = [
  // Affirmative
  { text: "It is certain.", emoji: "🟢" },
  { text: "Without a doubt.", emoji: "🟢" },
  { text: "Yes, definitely!", emoji: "🟢" },
  { text: "You may rely on it.", emoji: "🟢" },
  { text: "As I see it, yes.", emoji: "🟢" },
  { text: "Most likely.", emoji: "🟢" },
  { text: "Outlook good.", emoji: "🟢" },
  { text: "Signs point to yes.", emoji: "🟢" },
  { text: "Absolutely!", emoji: "🟢" },
  // Neutral
  { text: "Reply hazy, try again.", emoji: "🟡" },
  { text: "Ask again later.", emoji: "🟡" },
  { text: "Better not tell you now.", emoji: "🟡" },
  { text: "Cannot predict now.", emoji: "🟡" },
  { text: "Concentrate and ask again.", emoji: "🟡" },
  // Negative
  { text: "Don't count on it.", emoji: "🔴" },
  { text: "My reply is no.", emoji: "🔴" },
  { text: "My sources say no.", emoji: "🔴" },
  { text: "Outlook not so good.", emoji: "🔴" },
  { text: "Very doubtful.", emoji: "🔴" },
  { text: "Absolutely not!", emoji: "🔴" },
];

// ==================== JOKES ====================
const JOKES = [
  { setup: "Why do programmers prefer dark mode?", punchline: "Because light attracts bugs!" },
  { setup: "Why did the developer go broke?", punchline: "Because he used up all his cache!" },
  { setup: "What do you call a computer that sings?", punchline: "A-Dell!" },
  { setup: "Why do Java developers wear glasses?", punchline: "Because they don't C#!" },
  { setup: "What's a computer's favorite snack?", punchline: "Microchips!" },
  { setup: "Why was the JavaScript developer sad?", punchline: "Because he didn't Node how to Express himself!" },
  { setup: "What do you call 8 hobbits?", punchline: "A hobbyte!" },
  { setup: "Why did the computer go to the doctor?", punchline: "Because it had a virus!" },
  { setup: "What's the object-oriented way to become wealthy?", punchline: "Inheritance!" },
  { setup: "Why do programmers hate nature?", punchline: "It has too many bugs!" },
  { setup: "A SQL query walks into a bar, walks up to two tables and asks...", punchline: "'Can I join you?'" },
  { setup: "Why did the Roblox player bring a ladder?", punchline: "To reach the next level!" },
  { setup: "What's a Roblox developer's favorite food?", punchline: "Lua-nguine!" },
  { setup: "Why don't robots ever get scared?", punchline: "They have nerves of steel!" },
  { setup: "What did the server say to the client?", punchline: "\"200 OK, but I'm exhausted!\"" },
];

// ==================== QUOTES ====================
const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { text: "The most disastrous thing that you can ever learn is your first programming language.", author: "Alan Kay" },
  { text: "Every great developer you know got there by solving problems they were unqualified to solve until they actually did it.", author: "Patrick McKenzie" },
  { text: "The function of good software is to make the complex appear to be simple.", author: "Grady Booch" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
];

// ==================== FUN FACTS ====================
const FUN_FACTS = [
  "The first computer bug was an actual bug - a moth found in the Harvard Mark II computer in 1947!",
  "The first website ever created is still online at info.cern.ch",
  "The name 'Bluetooth' comes from a 10th-century Danish king, Harald Bluetooth!",
  "There are more possible iterations of a game of chess than there are atoms in the known universe.",
  "The first computer programmer was a woman - Ada Lovelace, in the 1840s!",
  "Google's original name was 'BackRub' before it was changed in 1997.",
  "The first computer mouse was made of wood!",
  "Over 6,000 new computer viruses are released every month.",
  "The average computer user blinks 7 times a minute, compared to the normal 20 times.",
  "About 70% of virus writers work for organized crime syndicates.",
  "The first alarm clock could only ring at 4 AM!",
  "Email existed before the World Wide Web was invented.",
  "The Firefox logo isn't a fox - it's a red panda!",
  "More than 30,000 websites are hacked every day.",
  "A group of 12 engineers built the first IBM computer!",
  "Roblox was originally called 'DynaBlocks' before being renamed in 2005!",
  "The most expensive virtual item ever sold in Roblox was a Dominus for over £100,000!",
];

// ==================== COMPLIMENTS ====================
const COMPLIMENTS = [
  "You're an absolute legend! 🌟",
  "Your code probably compiles on the first try! 💻",
  "You brighten up this server like RGB lighting! 🌈",
  "You're more reliable than a solid internet connection! 📶",
  "Your debugging skills are *chef's kiss*! 👨‍🍳",
  "You're the reason Stack Overflow exists - to help others like you shine! ⭐",
  "You're smoother than a 144fps experience! 🎮",
  "Your vibes are immaculate! ✨",
  "You're more valuable than a rare Roblox item! 💎",
  "The server is better with you in it! 🏆",
  "You're absolutely crushing it today! 💪",
  "Your potential is limitless! 🚀",
];

// ==================== ROASTS (Friendly) ====================
const ROASTS = [
  "Your code runs... eventually. Progress! 🐌",
  "You probably use light mode. In public. 😱",
  "I've seen better loops in cereal boxes. 🥣",
  "Your git commits say 'fixed bug' but did you though? 🤔",
  "You're the human equivalent of a 404 error - not found where expected! 🔍",
  "Your debugging technique is just adding more print statements, isn't it? 📝",
  "You probably Google 'how to exit vim' at least once a week. 😅",
  "Your code comments are just '// TODO: fix this later'. It's been 6 months. 📅",
  "You're the reason we have try-catch blocks. 🎣",
  "Your internet connection during important moments: ⚰️",
  "You're like JavaScript - unpredictable but somehow it works! 🎲",
];

// ==================== HELPER FUNCTIONS ====================

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==================== GAME HANDLERS ====================

export function handle8Ball(question: string): { response: string; emoji: string; color: number } {
  const answer = getRandomElement(MAGIC_8BALL_RESPONSES);
  const color = answer.emoji === "🟢" ? 0x22c55e : answer.emoji === "🟡" ? 0xeab308 : 0xef4444;
  return { response: answer.text, emoji: answer.emoji, color };
}

export function handleCoinFlip(): { result: "Heads" | "Tails"; emoji: string } {
  const isHeads = Math.random() < 0.5;
  return { 
    result: isHeads ? "Heads" : "Tails", 
    emoji: isHeads ? "🪙" : "💫" 
  };
}

export function handleDiceRoll(sides: number = 6, count: number = 1): { rolls: number[]; total: number } {
  const validSides = Math.min(Math.max(sides, 2), 100);
  const validCount = Math.min(Math.max(count, 1), 10);
  
  const rolls: number[] = [];
  for (let i = 0; i < validCount; i++) {
    rolls.push(Math.floor(Math.random() * validSides) + 1);
  }
  
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) };
}

export function handleRPS(userChoice: string): { 
  userChoice: string; 
  botChoice: string; 
  result: "win" | "lose" | "tie";
  emoji: string;
} {
  const choices = ["rock", "paper", "scissors"];
  const emojis: Record<string, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };
  
  const normalizedUser = userChoice.toLowerCase();
  const botChoice = getRandomElement(choices);
  
  let result: "win" | "lose" | "tie";
  
  if (normalizedUser === botChoice) {
    result = "tie";
  } else if (
    (normalizedUser === "rock" && botChoice === "scissors") ||
    (normalizedUser === "paper" && botChoice === "rock") ||
    (normalizedUser === "scissors" && botChoice === "paper")
  ) {
    result = "win";
  } else {
    result = "lose";
  }
  
  return { 
    userChoice: normalizedUser, 
    botChoice, 
    result,
    emoji: emojis[botChoice] || "❓"
  };
}

// ==================== FUN RESPONSE HANDLERS ====================

export function handleJoke(): { setup: string; punchline: string } {
  return getRandomElement(JOKES);
}

export function handleQuote(): { text: string; author: string } {
  return getRandomElement(QUOTES);
}

export function handleFunFact(): string {
  return getRandomElement(FUN_FACTS);
}

export function handleCompliment(): string {
  return getRandomElement(COMPLIMENTS);
}

export function handleRoast(): string {
  return getRandomElement(ROASTS);
}

// ==================== DAILY REWARD CALCULATION ====================

export function calculateDailyReward(streakDay: number): { 
  baseXP: number; 
  streakBonus: number; 
  totalXP: number;
  milestoneBonus?: { type: string; amount: number };
} {
  const baseXP = 50;
  const streakBonus = Math.min(streakDay * 5, 100); // Max +100 XP from streak
  
  let milestoneBonus: { type: string; amount: number } | undefined;
  
  // Milestone bonuses
  if (streakDay === 7) {
    milestoneBonus = { type: "🎉 Weekly Streak!", amount: 100 };
  } else if (streakDay === 30) {
    milestoneBonus = { type: "🏆 Monthly Streak!", amount: 500 };
  } else if (streakDay === 100) {
    milestoneBonus = { type: "👑 Century Streak!", amount: 1000 };
  } else if (streakDay % 7 === 0 && streakDay > 7) {
    milestoneBonus = { type: `📅 ${streakDay / 7} Week Streak!`, amount: 50 };
  }
  
  const totalXP = baseXP + streakBonus + (milestoneBonus?.amount || 0);
  
  return { baseXP, streakBonus, totalXP, milestoneBonus };
}

// ==================== XP LEVEL HELPERS ====================

export function calculateLevelFromXP(xp: number): number {
  if (xp < 100) return 1;
  return Math.floor(1 + Math.sqrt(xp / 50));
}

export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 50;
}

export function getXPProgress(currentXP: number, level: number): { 
  currentLevelXP: number; 
  nextLevelXP: number; 
  progress: number;
  progressBar: string;
} {
  const currentLevelXP = calculateXPForLevel(level);
  const nextLevelXP = calculateXPForLevel(level + 1);
  const xpInLevel = currentXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progress = Math.min((xpInLevel / xpNeeded) * 100, 100);
  
  // Generate progress bar
  const filled = Math.round(progress / 10);
  const empty = 10 - filled;
  const progressBar = "█".repeat(filled) + "░".repeat(empty);
  
  return { currentLevelXP, nextLevelXP, progress, progressBar };
}

export function getLevelEmoji(level: number): string {
  if (level >= 100) return "👑";
  if (level >= 75) return "💎";
  if (level >= 50) return "🌟";
  if (level >= 25) return "⭐";
  if (level >= 10) return "✨";
  if (level >= 5) return "🔥";
  return "🌱";
}

// ==================== TRIVIA (Simple) ====================

const TRIVIA_QUESTIONS = [
  { q: "What year was Roblox officially released?", a: "2006", options: ["2004", "2006", "2008", "2010"] },
  { q: "What programming language does Roblox use?", a: "Lua", options: ["Python", "JavaScript", "Lua", "C++"] },
  { q: "What is the name of Roblox's virtual currency?", a: "Robux", options: ["Robux", "Coins", "V-Bucks", "Credits"] },
  { q: "What color is the default Roblox avatar?", a: "Gray", options: ["Blue", "Gray", "White", "Yellow"] },
  { q: "What does HTML stand for?", a: "HyperText Markup Language", options: ["HighText Machine Language", "HyperText Markup Language", "Home Tool Markup Language", "Hyperlinks Text Mark Language"] },
  { q: "What company created JavaScript?", a: "Netscape", options: ["Microsoft", "Google", "Netscape", "Apple"] },
  { q: "What does CPU stand for?", a: "Central Processing Unit", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"] },
  { q: "What year was Discord founded?", a: "2015", options: ["2013", "2014", "2015", "2016"] },
];

export function getRandomTrivia(): { 
  question: string; 
  answer: string; 
  options: string[];
  shuffledOptions: string[];
} {
  const trivia = getRandomElement(TRIVIA_QUESTIONS);
  const shuffledOptions = [...trivia.options].sort(() => Math.random() - 0.5);
  return {
    question: trivia.q,
    answer: trivia.a,
    options: trivia.options,
    shuffledOptions
  };
}
