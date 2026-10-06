// XEND-IG-001 week-1 Instagram content (Gurugram / Delhi NCR SMB owners).
// Every claim here is checked against public/index.html (offer, prices, process) as of 2026-10-06.
// Concept mockups use fictional "Example …" names and carry a CONCEPT DEMO badge.

const TAGS_BASE = "#Gurugram #Gurgaon #DelhiNCR #SmallBusinessIndia #WebsiteDesign #WebsiteDevelopment";

export const POSTS = [
  {
    id: "d1-founding-offer",
    date: "2026-10-07",
    caption: `Gurugram small-business owners: a proper website shouldn't cost you a month's rent.

Our Founding Website is ₹999 + 18% GST (₹1,178.82 total, one-time):
• 1 mobile-first page, up to 6 sections
• WhatsApp, call and Google Maps buttons
• Basic on-page SEO setup
• Live preview link before you approve
• Full handover. No compulsory maintenance, no lock-in.

Domain and any paid hosting are billed at cost, separately. Scope is confirmed in writing first.

Open to our first 10 businesses only. DM us "WEBSITE" or tap the link in bio.

${TAGS_BASE} #LocalBusiness #GurugramBusiness`,
    slides: [
      { type: "cover", kicker: "Gurugram & Delhi NCR businesses", title: "A proper website for **₹999** + GST.", sub: "One page. Mobile-first. WhatsApp, call & map buttons. Yours to keep." },
      { type: "list", theme: "light", kicker: "Founding Website", title: "What you get", items: ["1 page, up to **6 sections**||Services, location, contact — built for phones", "**WhatsApp, call & map** buttons||One tap from visitor to enquiry", "Basic on-page **SEO** setup||Google-ready from day one", "**Live preview** before you approve||See it on your own phone first", "**Full handover**||No compulsory maintenance or lock-in"] },
      { type: "list", kicker: "How it works", title: "Four steps. **No surprises.**", items: ["Tell us about your business||Short form or WhatsApp", "Get a **fixed quote** in writing||Pages, features, price and date agreed first", "Review a **live preview**||Revisions as agreed", "Launch & handover||Domain connected, enquiries tested"] },
      { type: "cta", theme: "blue", kicker: "First 10 businesses only", title: "₹999 + 18% GST.\n**₹1,178.82** total, one-time.", sub: "Domain and paid hosting, if needed, are billed at cost. DM **WEBSITE** or tap the link in bio.", button: "DM “WEBSITE”" },
    ],
  },
  {
    id: "d2-free-check",
    date: "2026-10-08",
    caption: `Not sure your website is helping? Get a free website check.

Send us your website, or your Google Business / Instagram page if you don't have one. We reply personally with specific fixes for mobile, speed, trust and enquiries.

• Personal review, not an automated PDF
• A clear list of what to fix first
• No obligation to buy

DM us "CHECK" with your link, or use the form via the link in bio.

${TAGS_BASE} #FreeWebsiteCheck #SmallBusinessTips`,
    slides: [
      { type: "cover", kicker: "Free · no obligation", title: "Is your website **losing enquiries?**", sub: "Send us your link. We'll tell you exactly what to fix — free." },
      { type: "list", theme: "light", kicker: "What we check", title: "6 things customers notice", icons: ["📱", "⚡", "📞", "📍", "🔒", "📝"], items: ["Does it work on a **phone**?", "Does it load **fast**?", "Can people **call or WhatsApp** in one tap?", "Is your **address & map** easy to find?", "Is it **secure** (https)?", "Is there a clear **enquiry** path?"] },
      { type: "list", kicker: "What you get back", title: "A personal review, **not a PDF dump**", items: ["Specific fixes for your site||Mobile, speed, trust, enquiries", "What to fix **first**||Ordered by impact", "**No obligation** to buy||Fix it yourself if you like"] },
      { type: "cta", theme: "blue", kicker: "No website yet?", title: "Send your **Google Business** or **Instagram** page instead.", sub: "DM **CHECK** with your link.", button: "DM “CHECK”" },
    ],
  },
  {
    id: "d3-ca-firms",
    date: "2026-10-09",
    caption: `CA & accounting firms: many new clients look you up before they call.

If all they find is a directory listing, they move to the next firm. A simple site that lists your services (GST, ITR, audit, registrations), your office location and a one-tap call/WhatsApp button does a lot of quiet selling.

This is a concept demo we built to show the format. It is not a client site. Want one for your firm? Start with a free website check. DM "CHECK" or tap the link in bio.

${TAGS_BASE} #CharteredAccountant #CAFirm #GSTIndia`,
    slides: [
      { type: "cover", kicker: "For CA & accounting firms", title: "Clients **Google you** before they call.", sub: "What do they find: a directory listing, or your firm?" },
      { type: "mock", theme: "light", kicker: "Concept demo · not a client site", title: "A CA site that **gets calls**", items: ["Services clients search for", "One-tap call & WhatsApp", "Office address & map", "About the partners"], config: { vertical: "pro", name: "Example CA & Co.", tagline: "GST, income tax and audit support for Gurugram businesses.", city: "Gurugram", area: "Sector 44" } },
      { type: "cta", theme: "blue", kicker: "Gurugram CA firms", title: "Start with a **free website check**.", sub: "Founding Website from ₹999 + GST. DM **CHECK** or tap the link in bio.", button: "DM “CHECK”" },
    ],
  },
  {
    id: "d4-clinics",
    date: "2026-10-10",
    caption: `Clinics & dentists: many patients pick a clinic on their phone.

They want to see your treatments, timings, location and a way to book. If that takes more than a tap or two, they call the next clinic.

Concept demo below, built by us to show the format (not a client site). Want one for your clinic? Free website check first. DM "CHECK" or tap the link in bio.

${TAGS_BASE} #DentalClinic #GurugramDoctors #ClinicMarketing`,
    slides: [
      { type: "cover", kicker: "For clinics & dentists", title: "Patients choose you **on their phone.**", sub: "Treatments, timings, location and booking, in a tap or two." },
      { type: "mock", theme: "light", kicker: "Concept demo · not a client site", title: "A clinic site that **books visits**", items: ["Treatments, clearly listed", "Book on WhatsApp in one tap", "Timings & Google Maps", "Meet-the-doctor section"], config: { vertical: "dental", name: "Example Dental Clinic", tagline: "Gentle, modern dental care in Gurugram.", city: "Gurugram", area: "DLF Phase 4" } },
      { type: "cta", theme: "blue", kicker: "Gurugram clinics", title: "Get a **free website check**.", sub: "Founding Website from ₹999 + GST. DM **CHECK** or tap the link in bio.", button: "DM “CHECK”" },
    ],
  },
  {
    id: "d5-pricing",
    date: "2026-10-11",
    caption: `Website prices, out in the open. All prices + 18% GST, one-time.

• Free website check: ₹0
• Founding Website: ₹999 (₹1,178.82 incl. GST), 1 page, up to 6 sections, WhatsApp/call/map, basic SEO. First 10 businesses.
• Business Starter: ₹1,999 (₹2,358.82 incl. GST), up to 3 pages, enquiry form, city & service SEO basics.
• Business Pro: ₹3,499 (₹4,128.82 incl. GST), up to 5 pages, forms & analytics, service-by-service pages.
• Redesign or custom build: from ₹4,999 + GST, quoted after a short chat.

Domain and paid hosting, if needed, are billed at cost. No compulsory maintenance.

DM "PRICE" or tap the link in bio.

${TAGS_BASE} #WebsitePrice #AffordableWebsite`,
    slides: [
      { type: "prices", kicker: "Fixed prices · + 18% GST · one-time", title: "Simple, **clear prices.**", cards: [
        { name: "Free website check", desc: "Personal review of your site or page", price: "₹0", small: "no obligation" },
        { name: "Founding Website", desc: "1 page · WhatsApp, call & map · basic SEO", price: "₹999", small: "first 10 businesses", hi: true },
        { name: "Business Starter", desc: "Up to 3 pages · enquiry form · city SEO", price: "₹1,999", small: "+ GST" },
        { name: "Business Pro", desc: "Up to 5 pages · forms & analytics", price: "₹3,499", small: "+ GST" },
        { name: "Redesign / custom", desc: "Booking, quotes, dashboards, automation", price: "₹4,999+", small: "quoted" },
      ], note: "Domain and any paid hosting are billed at cost, separately. No compulsory maintenance." },
    ],
  },
  {
    id: "d6-real-estate",
    date: "2026-10-12",
    caption: `Real-estate agents in Gurugram: many buyers shortlist agents online before the first call.

Your own site with your areas, property types and a "schedule a site visit" button makes you look established next to people who only have a portal listing.

Concept demo below, built by us to show the format (not a client site). Free website check first. DM "CHECK" or tap the link in bio.

${TAGS_BASE} #GurugramRealEstate #RealEstateAgent #PropertyGurgaon`,
    slides: [
      { type: "cover", kicker: "For real-estate agents", title: "Look established, **not just listed.**", sub: "Your areas, your properties, one tap to book a site visit." },
      { type: "mock", theme: "light", kicker: "Concept demo · not a client site", title: "An agent site that **books visits**", items: ["Buy, rent, sell & commercial", "Site visit on WhatsApp", "Areas you cover", "Your story & experience"], config: { vertical: "realestate", name: "Example Homes Gurugram", tagline: "Apartments and builder floors across Golf Course Road and Sohna Road.", city: "Gurugram", area: "Golf Course Road" } },
      { type: "cta", theme: "blue", kicker: "Gurugram agents", title: "Get a **free website check**.", sub: "Founding Website from ₹999 + GST. DM **CHECK** or tap the link in bio.", button: "DM “CHECK”" },
    ],
  },
  {
    id: "d7-gyms-cafes",
    date: "2026-10-13",
    caption: `Gyms and cafés: a directory listing isn't a website.

Listings are crowded with competitors and ads. Your own page shows your programs or menu, your timings and location, and puts "Book a free trial" or "Reserve a table" one tap away.

Concept demos below, built by us to show the format (not client sites). Free website check first. DM "CHECK" or tap the link in bio.

${TAGS_BASE} #GurugramGym #GurugramCafe #RestaurantMarketing`,
    slides: [
      { type: "cover", kicker: "For gyms & cafés", title: "A listing **isn't a website.**", sub: "Your own page, your menu or programs, one tap to book." },
      { type: "mock", theme: "light", kicker: "Concept demo · not a client site", title: "Gyms: **book a free trial**", items: ["Programs & trainers", "Trial booking on WhatsApp", "Timings & location"], config: { vertical: "fitness", name: "Example Fitness Studio", tagline: "Strength, weight-loss and group classes in Gurugram.", city: "Gurugram", area: "Sector 56" } },
      { type: "mock", theme: "light", kicker: "Concept demo · not a client site", title: "Cafés: **reserve a table**", items: ["Menu highlights", "Reservations on WhatsApp", "Timings & map"], config: { vertical: "restaurant", name: "Example Café", tagline: "All-day breakfast and coffee in Gurugram.", city: "Gurugram", area: "Cyber Hub" } },
      { type: "cta", theme: "blue", kicker: "Gurugram gyms & cafés", title: "Get a **free website check**.", sub: "Founding Website from ₹999 + GST. DM **CHECK** or tap the link in bio.", button: "DM “CHECK”" },
    ],
  },
];
