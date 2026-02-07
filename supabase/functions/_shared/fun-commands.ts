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

// ==================== DEVELOPER COMMANDS ====================

// Fake bugs for /debug
const FAKE_BUGS = [
  { error: "NullPointerException", message: "Cannot read property 'undefined' of undefined of undefined", file: "chaos.js", line: 404 },
  { error: "StackOverflow", message: "Recursion exceeded: developer ego too large", file: "ego.ts", line: 9000 },
  { error: "OutOfCoffeeException", message: "Fatal error: caffeine levels critically low", file: "developer.java", line: 7 },
  { error: "SyntaxError", message: "Unexpected token 'happiness' at work", file: "monday.js", line: 1 },
  { error: "TypeError", message: "undefined is not a function (but it was working yesterday)", file: "magic.ts", line: 42 },
  { error: "InfiniteLoopError", message: "Task 'go home' never completes", file: "worklife.py", line: 247 },
  { error: "MemoryLeak", message: "Chrome has consumed all RAM on this planet", file: "browser.exe", line: 999 },
  { error: "GitConflictException", message: "Both versions are wrong", file: "CONFLICT", line: 0 },
  { error: "CSS Error", message: "Element centered... in alternate universe only", file: "styles.css", line: 666 },
  { error: "DatabaseTimeout", message: "Query started in 2019, still running", file: "query.sql", line: 1 },
  { error: "DeploymentFailed", message: "Works on my machine ¯\\_(ツ)_/¯", file: "production.log", line: 500 },
  { error: "npm ERR!", message: "node_modules has achieved sentience and refuses to install", file: "package.json", line: 13 },
  { error: "CORS Error", message: "Your request was personally denied by the server", file: "api.ts", line: 401 },
  { error: "SegmentationFault", message: "Memory accessed memories it wasn't supposed to", file: "core.c", line: 1337 },
  { error: "RuntimeException", message: "Code worked in testing, panicked in production", file: "murphy.js", line: 101 },
];

// Funny git commit messages for /commit
const FAKE_COMMITS = [
  "Fixed bug that wasn't a bug, created 3 new bugs",
  "Removed code that was definitely doing something important",
  "Added TODO comment, will never come back to it",
  "Made it work, don't ask how, don't touch it",
  "Reverted revert of reverted revert",
  "Emergency fix for the emergency fix",
  "Refactored code I don't understand",
  "WIP: Will probably never finish",
  "Friday 5pm deployment, YOLO",
  "Oops, forgot to remove console.log",
  "Fixed typo in previous 'Fixed typo' commit",
  "Implemented feature from 6 months ago that everyone forgot about",
  "Removed feature nobody used (CEO's favorite feature)",
  "Updated dependencies, broke everything",
  "Added comments for future me who will hate past me",
  "Merged develop into main, said 3 prayers",
  "Performance optimization: removed tests",
  "Security fix: deleted everything",
  "Hotfix for hotfix for hotfix",
  "git commit -m 'idk what i did but it works now'",
];

// Code review comments for /codereview
const CODE_REVIEWS = [
  { verdict: "APPROVED", comment: "LGTM 👍 (didn't actually read it)", emoji: "✅" },
  { verdict: "CHANGES REQUESTED", comment: "This variable name... I'm calling HR", emoji: "🔴" },
  { verdict: "APPROVED", comment: "Bold choice not using any comments whatsoever", emoji: "🤔" },
  { verdict: "APPROVED", comment: "It works and I'm scared to understand why", emoji: "😰" },
  { verdict: "CHANGES REQUESTED", comment: "Have you considered... not doing this?", emoji: "💀" },
  { verdict: "APPROVED", comment: "Approved before I look too closely", emoji: "🙈" },
  { verdict: "CHANGES REQUESTED", comment: "The code is great! It's the logic I have questions about", emoji: "🧐" },
  { verdict: "APPROVED", comment: "Ship it! (We have rollback, right?)", emoji: "🚀" },
  { verdict: "CHANGES REQUESTED", comment: "I see you've chosen chaos today", emoji: "🌀" },
  { verdict: "APPROVED", comment: "Future you will definitely understand this... probably", emoji: "🔮" },
  { verdict: "CHANGES REQUESTED", comment: "This deserves its own horror movie", emoji: "🎬" },
  { verdict: "APPROVED", comment: "If it compiles, it ships", emoji: "📦" },
  { verdict: "CHANGES REQUESTED", comment: "Have you tried turning it off and rewriting from scratch?", emoji: "🔄" },
  { verdict: "APPROVED", comment: "I've seen worse. Approved out of exhaustion", emoji: "😴" },
];

// StackOverflow responses for /stackoverflow
const STACKOVERFLOW_RESPONSES = [
  { status: "CLOSED", reason: "Marked as duplicate of a question from 2009 that uses jQuery", votes: -3 },
  { status: "ANSWERED", reason: "Just use a regex", votes: 147 },
  { status: "CLOSED", reason: "Needs more focus, details, clarity, and coffee", votes: 0 },
  { status: "ANSWERED", reason: "Have you tried turning it off and on again?", votes: 42 },
  { status: "CLOSED", reason: "This is clearly a homework assignment", votes: -7 },
  { status: "ANSWERED", reason: "Works for me™", votes: 1 },
  { status: "CLOSED", reason: "Please read the documentation that doesn't exist", votes: -2 },
  { status: "ANSWERED", reason: "Just import leftpad and move on with your life", votes: 89 },
  { status: "CLOSED", reason: "Opinion-based: the correct answer is obviously subjective", votes: 0 },
  { status: "ANSWERED", reason: "Have you considered using a different programming language?", votes: -15 },
  { status: "ANSWERED", reason: "npm install problem-solver", votes: 256 },
  { status: "CLOSED", reason: "OP edited the question 17 times and now nobody knows what they're asking", votes: 3 },
];

// Rubber duck debugging advice for /rubberduck
const RUBBER_DUCK_WISDOM = [
  { advice: "Have you tried explaining your code to me? I'm all ears. Well, I would be if I had ears.", emoji: "🦆" },
  { advice: "Quack! That means 'have you checked if it's actually plugged in' in duck.", emoji: "🔌" },
  { advice: "The bug is in line 42. It's always line 42. Or maybe line 1. Have you tried both?", emoji: "🔍" },
  { advice: "Perhaps the real bug was the friends we made along the way... just kidding, check your semicolons.", emoji: "😌" },
  { advice: "I've reviewed your code. My professional opinion: Quack.", emoji: "📋" },
  { advice: "Your code is like modern art - I don't understand it but I'm sure it means something.", emoji: "🎨" },
  { advice: "Have you tried adding more console.log statements? There's never enough.", emoji: "📝" },
  { advice: "The answer is probably in the stack trace you didn't fully read.", emoji: "📚" },
  { advice: "Quack quack quack. Translation: 'Did you clear your cache?'", emoji: "🗑️" },
  { advice: "I believe in you! Also, check that API endpoint URL for typos.", emoji: "💪" },
  { advice: "Your logic is flawless. That's why it's not working - computers hate perfection.", emoji: "🤖" },
  { advice: "Sleep on it. Literally. Just go to bed. It'll work tomorrow.", emoji: "😴" },
];

export function handleDebug(): { error: string; message: string; file: string; line: number } {
  return getRandomElement(FAKE_BUGS);
}

export function handleCommit(): string {
  return getRandomElement(FAKE_COMMITS);
}

export function handleCodeReview(): { verdict: string; comment: string; emoji: string } {
  return getRandomElement(CODE_REVIEWS);
}

export function handleStackOverflow(): { status: string; reason: string; votes: number } {
  return getRandomElement(STACKOVERFLOW_RESPONSES);
}

export function handleRubberDuck(): { advice: string; emoji: string } {
  return getRandomElement(RUBBER_DUCK_WISDOM);
}

// ==================== MEMES ====================
const MEMES = [
  // Development-related memes (majority)
  { title: "When the code works on the first try", gif: "https://media1.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", category: "dev" },
  { title: "Debugging at 3am be like", gif: "https://media1.giphy.com/media/unQ3IJU2RG7DO/giphy.gif", category: "dev" },
  { title: "When you finally fix that bug", gif: "https://media1.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif", category: "dev" },
  { title: "Me explaining my code to the rubber duck", gif: "https://media1.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif", category: "dev" },
  { title: "When someone asks if my code has tests", gif: "https://media1.giphy.com/media/kGdXSdl6EoQec/giphy.gif", category: "dev" },
  { title: "Deploying to production on Friday", gif: "https://media1.giphy.com/media/HUkOv6BNWc1HO/giphy.gif", category: "dev" },
  { title: "When the client changes requirements again", gif: "https://media1.giphy.com/media/NTur7XlVDUdqM/giphy.gif", category: "dev" },
  { title: "npm install be like", gif: "https://media1.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif", category: "dev" },
  { title: "When the intern pushes to main", gif: "https://media1.giphy.com/media/3oKIPwoeGErMmaI43S/giphy.gif", category: "dev" },
  { title: "Reading my own code from 6 months ago", gif: "https://media1.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif", category: "dev" },
  { title: "When Stack Overflow is down", gif: "https://media1.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif", category: "dev" },
  { title: "CSS: I'm working! Also CSS:", gif: "https://media1.giphy.com/media/yYSSBtDgbbRzq/giphy.gif", category: "dev" },
  { title: "When someone says 'it's just a small change'", gif: "https://media1.giphy.com/media/ceeN6U57leAhi/giphy.gif", category: "dev" },
  { title: "Me vs the production database", gif: "https://media1.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif", category: "dev" },
  { title: "When the code review has 47 comments", gif: "https://media1.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif", category: "dev" },
  { title: "Trying to center a div", gif: "https://media1.giphy.com/media/l41lGvinEgARjB2HC/giphy.gif", category: "dev" },
  { title: "When git says there's a merge conflict", gif: "https://media1.giphy.com/media/3oEjI67Egb8G9jqs3m/giphy.gif", category: "dev" },
  { title: "The API response format", gif: "https://media1.giphy.com/media/WpaVhEcp3Qo2TjwyI1/giphy.gif", category: "dev" },
  { title: "When the meeting could've been an email", gif: "https://media1.giphy.com/media/lkO1VbjLZIlEI/giphy.gif", category: "dev" },
  { title: "Documentation? What documentation?", gif: "https://media1.giphy.com/media/l0IylOPCNkiqOgMyA/giphy.gif", category: "dev" },
  // General funny memes
  { title: "When you're pretending to work", gif: "https://media1.giphy.com/media/LRVnPYqM8DLag/giphy.gif", category: "general" },
  { title: "It's fine, everything is fine", gif: "https://media1.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif", category: "general" },
  { title: "Confused math lady", gif: "https://media1.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif", category: "general" },
  { title: "My brain during important moments", gif: "https://media1.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif", category: "general" },
  { title: "When they say the deadline moved up", gif: "https://media1.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif", category: "general" },
];

export function handleMeme(): { title: string; gif: string; category: string } {
  return getRandomElement(MEMES);
}

// Fishing outcomes for /fish command
const FISHING_OUTCOMES = [
  { catch: "🐟 Common Fish", description: "You caught a regular fish. Nothing special, but it's honest work!", rarity: "common", gif: "https://media1.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif" },
  { catch: "🐠 Tropical Fish", description: "Ooh, colorful! This one's from somewhere exotic.", rarity: "uncommon", gif: "https://media1.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif" },
  { catch: "🦈 Shark!", description: "JAWS THEME INTENSIFIES. You somehow survived!", rarity: "rare", gif: "https://media1.giphy.com/media/3ohs7YMlUQ6Jk8w0rS/giphy.gif" },
  { catch: "🥾 Old Boot", description: "Classic. Someone's missing their left boot.", rarity: "junk", gif: "https://media1.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif" },
  { catch: "🐙 Octopus", description: "Eight arms to hug you! Or strangle you. Same thing.", rarity: "rare", gif: "https://media1.giphy.com/media/l3q2zCKqx8Eiuf3SE/giphy.gif" },
  { catch: "🗑️ Trash", description: "You caught someone's old code. It's still in production.", rarity: "junk", gif: "https://media1.giphy.com/media/26ufnwz3wDUli7GU0/giphy.gif" },
  { catch: "🐡 Pufferfish", description: "Don't poke it! ...You poked it, didn't you?", rarity: "uncommon", gif: "https://media1.giphy.com/media/VkMV9TldsPd28/giphy.gif" },
  { catch: "🦑 Giant Squid", description: "Release the Kraken! Wait, that's you holding it.", rarity: "legendary", gif: "https://media1.giphy.com/media/26xBFT1F9BgskEvTO/giphy.gif" },
  { catch: "🎣 Another Fishing Rod", description: "Yo dawg, I heard you like fishing...", rarity: "junk", gif: "https://media1.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif" },
  { catch: "🐋 Whale", description: "HOW?! Your rod should've snapped! You're built different.", rarity: "legendary", gif: "https://media1.giphy.com/media/3oKIPjzfv0sI2p7fDW/giphy.gif" },
  { catch: "🦀 Crab", description: "It's giving you the side-eye. Menacingly.", rarity: "common", gif: "https://media1.giphy.com/media/2dQ3FMaMFccpi/giphy.gif" },
  { catch: "🐢 Sea Turtle", description: "It's older than your code architecture!", rarity: "uncommon", gif: "https://media1.giphy.com/media/lXiRJ8IRz5QH6wTQc/giphy.gif" },
  { catch: "💀 Skeleton", description: "It's holding a sign: 'I waited for npm install'", rarity: "spooky", gif: "https://media1.giphy.com/media/l2JJKs3I69qfaQleE/giphy.gif" },
  { catch: "🧜‍♀️ Mermaid", description: "She asked if you have games on your phone.", rarity: "mythical", gif: "https://media1.giphy.com/media/3oEduKVQdG4c0JVPSo/giphy.gif" },
  { catch: "📱 Someone's Phone", description: "Still has 47 unread Discord pings.", rarity: "junk", gif: "https://media1.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif" },
  { catch: "🐊 Alligator", description: "Wrong body of water?! It doesn't care, it's angry!", rarity: "rare", gif: "https://media1.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
  { catch: "🎁 Mystery Box", description: "Could be anything! It's a mass of seaweed. Disappointing.", rarity: "uncommon", gif: "https://media1.giphy.com/media/3oriNZoNvn73MZaFYk/giphy.gif" },
  { catch: "🌊 Nothing", description: "The fish saw your code commits and swam away.", rarity: "fail", gif: "https://media1.giphy.com/media/l1J9yTco40EU5JzTW/giphy.gif" },
];

export function handleFishing(): { catch: string; description: string; rarity: string; gif: string; color: number } {
  const outcome = getRandomElement(FISHING_OUTCOMES);
  
  // Color based on rarity
  const colors: Record<string, number> = {
    common: 0x9ca3af,
    uncommon: 0x22c55e,
    rare: 0x3b82f6,
    legendary: 0xfbbf24,
    mythical: 0xa855f7,
    junk: 0x78716c,
    spooky: 0x1f2937,
    fail: 0xef4444,
  };
  
  return {
    ...outcome,
    color: colors[outcome.rarity] || 0x6b7280,
  };
}

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
