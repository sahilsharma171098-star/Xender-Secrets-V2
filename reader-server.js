const http = require("http");

const BOOKS = {
  "9603": {
    title: "Hung Lou Meng, or, The Dream of the Red Chamber — Book I",
    author: "Cao Xueqin",
    translator: "H. Bencraft Joly",
    source: "https://www.gutenberg.org/cache/epub/9603/pg9603.txt"
  },
  "9604": {
    title: "Hung Lou Meng, or, The Dream of the Red Chamber — Book II",
    author: "Cao Xueqin",
    translator: "H. Bencraft Joly",
    source: "https://www.gutenberg.org/cache/epub/9604/pg9604.txt"
  },
  "43627": {
    title: "Strange Stories from a Chinese Studio — Vol. 1",
    author: "Pu Songling",
    translator: "Herbert A. Giles",
    source: "https://www.gutenberg.org/cache/epub/43627/pg43627.txt"
  },
  "43628": {
    title: "Strange Stories from a Chinese Studio — Vol. 2",
    author: "Pu Songling",
    translator: "Herbert A. Giles",
    source: "https://www.gutenberg.org/cache/epub/43628/pg43628.txt"
  },
  "43629": {
    title: "Strange Stories from a Chinese Studio — Volumes 1 & 2",
    author: "Pu Songling",
    translator: "Herbert A. Giles",
    source: "https://www.gutenberg.org/cache/epub/43629/pg43629.txt"
  },
  "77416": {
    title: "San Kuo; or, Romance of the Three Kingdoms — Vol. 1",
    author: "Luo Guanzhong",
    translator: "C. H. Brewitt-Taylor",
    source: "https://www.gutenberg.org/cache/epub/77416/pg77416.txt"
  },
  "12086": {
    title: "Eastern Shame Girl",
    author: "Traditional Chinese stories",
    translator: "G. Soulié de Morant",
    source: "https://www.gutenberg.org/cache/epub/12086/pg12086.txt"
  },
  "37766": {
    title: "Strange Stories from the Lodge of Leisures",
    author: "Pu Songling",
    translator: "G. Soulié de Morant",
    source: "https://www.gutenberg.org/cache/epub/37766/pg37766.txt"
  },
  "29939": {
    title: "The Chinese Fairy Book",
    author: "Traditional Chinese stories",
    translator: "Frederick H. Martens",
    source: "https://www.gutenberg.org/cache/epub/29939/pg29939.txt"
  }
};

function cors(res, status=200, type="application/json; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "cache-control": "public, max-age=3600",
    "x-content-type-options": "nosniff"
  });
}

const server = http.createServer(async (req,res) => {
  if (req.method === "OPTIONS") { cors(res,204); return res.end(); }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") {
    cors(res);
    return res.end(JSON.stringify({ok:true,service:"Xender Reader API",books:Object.keys(BOOKS).length}));
  }
  if (url.pathname === "/books") {
    cors(res);
    const books = Object.entries(BOOKS).map(([id,b]) => ({id,title:b.title,author:b.author,translator:b.translator}));
    return res.end(JSON.stringify({ok:true,books}));
  }
  if (url.pathname === "/book") {
    const id = url.searchParams.get("id") || "";
    const book = BOOKS[id];
    if (!book) { cors(res,404); return res.end(JSON.stringify({ok:false,error:"Book not found."})); }
    try {
      const upstream = await fetch(book.source, {
        headers: {"user-agent":"XenderSecretsReader/1.0 (+https://xendersecrets.com)"}
      });
      if (!upstream.ok) throw new Error("Upstream "+upstream.status);
      const text = await upstream.text();
      cors(res,200,"text/plain; charset=utf-8");
      return res.end(text);
    } catch (e) {
      cors(res,502);
      return res.end(JSON.stringify({ok:false,error:"Unable to load the reading text right now."}));
    }
  }
  cors(res,404);
  res.end(JSON.stringify({ok:false,error:"Route not found."}));
});

const port = Number(process.env.PORT || 10000);
server.listen(port, "0.0.0.0", () => console.log("Xender Reader API listening on", port));
