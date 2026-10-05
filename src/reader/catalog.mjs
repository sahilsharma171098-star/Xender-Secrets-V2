// Shared, dependency-free reader logic used by BOTH the Cloudflare Worker (src/index.js)
// and the build script (scripts/build-novel-data.mjs).
// Ported verbatim from reader-server.js (the Render service) so output stays identical;
// reader-server.js is intentionally left untouched as the rollback path.

export const GUTENBERG_SERIALS = {
  "journey-to-the-west-zh": {
    title: "Journey to the West — Complete Chinese Edition",
    author: "Wu Cheng'en",
    finalChapter: 100,
    language: "zh-CN",
    genres: ["Chinese Classic","Cultivation","Mythology","Adventure","Supernatural"],
    summary: "The complete 100-chapter Chinese classic following Sun Wukong, Xuanzang and their supernatural pilgrimage to obtain Buddhist scriptures.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23962",url:"https://www.gutenberg.org/cache/epub/23962/pg23962.txt",from:1,to:100,mode:"chinese"}]
  },
  "romance-three-kingdoms-zh": {
    title: "Romance of the Three Kingdoms — Complete Chinese Edition",
    author: "Luo Guanzhong",
    finalChapter: 120,
    language: "zh-CN",
    genres: ["Chinese Classic","War","Strategy","Power","Revenge"],
    summary: "The complete 120-chapter Chinese epic of warlords, sworn brothers, betrayal, strategy and the struggle to rule a fractured empire.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23950",url:"https://www.gutenberg.org/cache/epub/23950/pg23950.txt",from:1,to:120,mode:"chinese"}]
  },
  "water-margin-zh": {
    title: "Water Margin — Complete 70-Chapter Chinese Edition",
    author: "Shi Nai'an",
    finalChapter: 70,
    language: "zh-CN",
    genres: ["Chinese Classic","Outlaws","Martial Arts","Rebellion","Brotherhood"],
    summary: "A complete 70-chapter Chinese edition of the classic story of outlaws who gather at Mount Liang against corrupt authority.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23863",url:"https://www.gutenberg.org/cache/epub/23863/pg23863.txt",from:1,to:70,mode:"chinese"}]
  },
  "dream-red-chamber-zh": {
    title: "Dream of the Red Chamber — Complete Chinese Edition",
    author: "Cao Xueqin",
    finalChapter: 120,
    language: "zh-CN",
    genres: ["Chinese Classic","Family","Romance","Supernatural","Drama"],
    summary: "The complete 120-chapter Chinese edition chronicling the rise and decline of an aristocratic family through love, dreams and spiritual symbolism.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"24264",url:"https://www.gutenberg.org/cache/epub/24264/pg24264.txt",from:1,to:120,mode:"chinese"}]
  },
  "flowers-in-the-mirror-zh": {
    title: "Flowers in the Mirror — Complete Chinese Edition",
    author: "Li Ruzhen",
    finalChapter: 100,
    language: "zh-CN",
    genres: ["Chinese Classic","Fantasy","Adventure","Mythology","Satire"],
    summary: "A complete 100-chapter Chinese fantasy about banished flower spirits, strange kingdoms, adventure and social satire.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"25377",url:"https://www.gutenberg.org/cache/epub/25377/pg25377.txt",from:1,to:100,mode:"chinese"}]
  },
  "three-heroes-five-gallants-zh": {
    title: "Three Heroes and Five Gallants — Complete Chinese Edition",
    author: "Shi Yukun",
    finalChapter: 120,
    language: "zh-CN",
    genres: ["Chinese Classic","Wuxia","Justice","Martial Arts","Mystery"],
    summary: "A complete 120-chapter Chinese侠义 classic of martial heroes, intrigue, loyalty and Judge Bao's pursuit of justice.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"25376",url:"https://www.gutenberg.org/cache/epub/25376/pg25376.txt",from:1,to:120,mode:"chinese"}]
  },
  "sui-tang-romance-zh": {
    title: "Romance of Sui and Tang Dynasties — Complete Chinese Edition",
    author: "Chu Renhu",
    finalChapter: 100,
    language: "zh-CN",
    genres: ["Chinese Classic","War","Strategy","Dynasty","Adventure"],
    summary: "A complete 100-chapter historical epic of the fall of Sui, the rise of Tang, rebellion, court intrigue and battlefield ambition.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23835",url:"https://www.gutenberg.org/cache/epub/23835/pg23835.txt",from:1,to:100,mode:"chinese"}]
  },
  "han-xiangzi-zh": {
    title: "The Story of Han Xiangzi — Complete Chinese Edition",
    author: "Yang Erzeng",
    finalChapter: 30,
    language: "zh-CN",
    genres: ["Chinese Classic","Cultivation","Daoism","Immortals","Supernatural"],
    summary: "A complete 30-chapter Daoist fantasy about Han Xiangzi's spiritual cultivation, immortals and the tension between worldly duty and transcendence.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"24231",url:"https://www.gutenberg.org/cache/epub/24231/pg24231.txt",from:1,to:30,mode:"chinese"}]
  },
  "heroic-sons-daughters-zh": {
    title: "The Tale of Heroic Sons and Daughters — Complete Chinese Edition",
    author: "Wenkang",
    finalChapter: 40,
    language: "zh-CN",
    genres: ["Chinese Classic","Wuxia","Romance","Adventure","Justice"],
    summary: "A complete 40-chapter Qing novel combining martial heroism, romance, family duty and adventure.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"25327",url:"https://www.gutenberg.org/cache/epub/25327/pg25327.txt",from:1,to:40,mode:"chinese"}]
  },
  "travels-lao-can-zh": {
    title: "The Travels of Lao Can — Complete Chinese Edition",
    author: "Liu E",
    finalChapter: 20,
    language: "zh-CN",
    genres: ["Chinese Classic","Mystery","Satire","Travel","Justice"],
    summary: "A complete 20-chapter late-Qing novel following a wandering physician through injustice, investigation, social decay and reform.",
    sourceSite: "Project Gutenberg",
    sources: [{bookId:"23850",url:"https://www.gutenberg.org/cache/epub/23850/pg23850.txt",from:1,to:20,mode:"chinese"}]
  }
};

export const XH_COMPLETED = {
  "billionaire-god-of-war": {
    title: "Billionaire God of War",
    sourceSite: "XperimentalHamid",
    indexUrl: "https://xperimentalhamid.com/news/billionaire-god-of-war-novel-complete-links-new/",
    finalChapter: 2495,
    genres: ["Urban", "War God", "Hidden Power", "Romance"],
    summary: "A long translated urban power fantasy with revenge, hidden strength, family conflict and war-god escalation.",
    verifiedEnding: "Chapter 2495 contains THE END.",
    supplementalRanges: [
      {start:427,end:428,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-427-428-new/",postId:9971},
      {start:593,end:594,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-593-594-new/",postId:10523},
      {start:621,end:622,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-621-622-new/",postId:10568},
      {start:675,end:676,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-675-677-new/",postId:10849},
      {start:1001,end:1002,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-1002-1003-new/",postId:12461},
      {start:1033,end:1034,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-1033-1034-new/",postId:12477},
      {start:1795,end:1796,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-1795-1796-new/",postId:16140},
      {start:1997,end:1998,url:"https://xperimentalhamid.com/novels/billionaire-god-of-war-novel-chapter-1998-1999-new/",postId:16884}
    ]
  },
  "my-husband-warm-the-bed": {
    title: "My Husband Warm The Bed",
    sourceSite: "XperimentalHamid",
    indexUrl: "https://xperimentalhamid.com/news/top/my-husband-warm-the-bed-novel-links-new/",
    finalChapter: 1985,
    genres: ["Urban Romance", "Marriage", "CEO", "Family"],
    summary: "A very long translated marriage and family romance built around Kevin/Karen and later generations.",
    verifiedEnding: "XH source states the novel ends at chapter 1985.",
    supplementalRanges: [
      {start:455,end:469,url:"https://xperimentalhamid.com/novels/my-husband-warm-the-bed-chapter-455-469-free-reading-online-new/",postId:3280}
    ]
  },
  "take-my-breath-away": {
    title: "Take My Breath Away",
    sourceSite: "XperimentalHamid",
    indexUrl: "https://xperimentalhamid.com/novels/take-my-breath-away-complete-chapters-new/",
    finalChapter: 1476,
    genres: ["Urban Romance", "Marriage", "CEO", "Drama"],
    summary: "A completed translated romance following a broken marriage, reunion, family growth and long-form relationship drama.",
    verifiedEnding: "Chapter 1476 contains THE END.",
    supplementalRanges: [
      {start:1,end:2,url:"https://xperimentalhamid.com/novels/chapter-01-02-of-take-my-breath-away-novel-new/"},
      {start:46,end:50,url:"https://xperimentalhamid.com/novels/chapter-50-51-of-take-my-breath-away-novel-free-online-new/",postId:11158},
      {start:1296,end:1300,url:"https://xperimentalhamid.com/novels/chapter-1296-1-300-of-take-my-breath-away-novel-free-online-new/",postId:14906},
      {start:1396,end:1400,url:"https://xperimentalhamid.com/novels/chapter-1396-1400-of-take-my-breath-away-novel-free-online-new/",postId:15214}
    ]
  }
};
