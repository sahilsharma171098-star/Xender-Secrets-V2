// Content for every generated commercial page. Copy rules (docs/REVENUE_ARCHITECTURE.md):
// no fake clients/results, demos labelled as demos, no promised rankings or timelines.
import fs from "node:fs";
import { page, leadForm, faqBlock, faqJsonLd, ORG_JSONLD, ORG_ID, breadcrumbJsonLd, serviceJsonLd, canonicalUrl, esc, wa, EMAIL, SITE } from "./layout.mjs";
import { ARTICLES } from "./articles.mjs";
import { hero, offerCard, pricingBlock, processBlock, cardsBlock, buildListBlock, templatesBlock, includedAside, relatedBlock } from "./blocks.mjs";

/** Bump when generated page content changes materially (used for sitemap lastmod). */
export const CONTENT_DATE = "2026-10-07";

const COMMON_FAQ = [
  ["How long does it take?", "It depends on the package and how quickly we receive your logo, photos and text. We agree a delivery date in writing with your quote, before any payment."],
  ["How do payments work?", "You receive a written quote with scope, price and delivery date first. Payment terms are stated on the quote, and every payment gets a GST-compliant invoice."],
  ["Are prices inclusive of GST?", "No — package prices are shown before GST, and 18% GST is added on the invoice. For example, the Founding Website is ₹999 + ₹179.82 GST = ₹1,178.82. Xender Secrets is GST-registered (GSTIN 06IQFPS4456B1ZP), so you receive a proper tax invoice; GST-registered businesses can usually claim the GST as input tax credit — confirm with your CA."],
  ["Do I have to pay every month?", "No. There is no compulsory maintenance or retainer. You pay only for hosting or a domain if your setup needs them, and only for support if you choose it."],
  ["Who owns the website?", "You do. We hand over the files, content and access at launch."],
];

const FOUNDER = `<section class="section alt">
      <div class="wrap split">
        <div>
          <p class="kicker">Who you'll work with</p>
          <h2>A small studio that <span>sells for a living.</span></h2>
          <p>Xender Secrets is a GST-registered business in Gurugram, founded by Sahil Kumar Sharma, who has spent years in sales and customer operations. That's why every site we build is designed around one question: <strong>how does a visitor become a customer you can call back?</strong></p>
          <p>You talk directly to the person responsible for your project — no account managers, no hand-offs.</p>
          <p class="credential">Registered Micro Enterprise under the Government of India Udyam (MSME) scheme — Udyam No. <strong>UDYAM-HR-05-0152992</strong> (<a href="https://udyamregistration.gov.in/Udyam_Verify.aspx" target="_blank" rel="noopener">verify on the official portal</a>) · GSTIN 06IQFPS4456B1ZP.</p>
        </div>
        ${includedAside()}
      </div>
    </section>`;

// ---------------------------------------------------------------- industries
export const INDUSTRIES = [
  {
    file: "accountant-website-development.html", slug: "ca", business: "accountants", code: "CA", label: "CA firm",
    title: "Website for CA Firms & Accountants from ₹999 + GST | Xender Secrets",
    description: "Mobile-first websites for CA firms, accountants and tax consultants — service pages for GST, ITR, audit and payroll, WhatsApp consultation buttons. From ₹999 + GST, fixed price.",
    eyebrow: "Websites for CA firms &amp; accountants",
    h1: "A CA firm website that earns trust <em>before the first call.</em>",
    lede: "Clients choose an accountant they feel they can trust with their numbers. We build clean, professional sites that explain your services — GST, ITR, audit, payroll, company registration — and make booking a consultation one tap away.",
    needs: [
      ["Which services you handle", "GST returns, ITR filing, audit, bookkeeping, payroll, ROC compliance — prospects scan for their exact need."],
      ["Who they will deal with", "Partner names, qualifications (CA, CS, CMA) and ICAI membership details build confidence."],
      ["Where you are and when", "Office address on a map, working hours, and whether you take clients from other cities online."],
      ["An easy first step", "\"Book a consultation\" on WhatsApp or call — not a long contact form."],
    ],
    build: ["Home page with a clear list of your services", "Service sections or pages for GST, income tax, audit and business registration", "Team / partner profiles with qualifications", "Consultation button on WhatsApp and call, visible on every screen", "Office location, hours and Google Maps", "Basic on-page SEO for \"CA in {your city}\" style searches"],
    rec: "business-starter-1999", recWhy: "Most CA firms need at least home, services and contact pages to show their range.",
    faq: [
      ["Can you list our ICAI membership and partner details?", "Yes — you share the details you're comfortable publishing, and we present them clearly. We don't invent credentials, client names or numbers."],
      ["Can clients upload documents on the site?", "Not in the basic packages. A secure document-upload or client portal is custom work, quoted after a short discussion."],
      ["Will this get us to the top of Google?", "Nobody can honestly promise rankings. We set up the on-page basics properly (titles, service and city wording, speed, mobile) so Google can understand your firm; your Google Business profile and reviews matter just as much."],
    ],
    wa: "Hi Xender Secrets, I want a website for my CA firm.",
  },
  {
    file: "clinic-website-development.html", slug: "clinic", business: "dentists", code: "DENT", label: "Clinic",
    title: "Clinic & Dental Website from ₹999 + GST | Appointment-ready | Xender Secrets",
    description: "Websites for dental clinics, doctors and physiotherapy clinics — treatments, doctor profiles, timings, map and one-tap WhatsApp appointment requests. From ₹999 + GST, fixed price.",
    eyebrow: "Websites for clinics &amp; dentists",
    h1: "Clinic websites that turn searches into <em>appointment requests.</em>",
    lede: "Patients look up a clinic on their phone, often minutes before deciding. We build fast, calm, mobile-first sites that show your treatments, doctors, timings and location — with a one-tap WhatsApp or call button to request an appointment.",
    needs: [
      ["Is this clinic near me and open?", "Address, map, timings and days off — the first things a patient checks."],
      ["Who is the doctor?", "Qualifications, registration and experience, written plainly."],
      ["Do they treat my problem?", "A clear list of treatments — e.g. root canal, implants, braces, cleaning — in patients' words."],
      ["How do I book?", "A visible WhatsApp / call button for appointment requests, not a hidden form."],
    ],
    build: ["Home page with treatments and clinic highlights", "Doctor profile with qualifications and registration", "Treatments section or pages", "Timings, location map and directions", "WhatsApp / call appointment-request buttons on every screen", "Basic on-page SEO for \"dentist in {area}\" style searches"],
    rec: "business-starter-1999", recWhy: "Clinics usually need home, treatments and contact/timings pages.",
    templates: [["DENT-01", "Minimal"], ["DENT-02", "Premium"], ["CLIN-01", "General practice"]],
    faq: [
      ["Can patients book a specific time slot online?", "The packages include WhatsApp/call appointment requests. A real slot-booking calendar is custom work — try our booking demo in the catalog and ask for a quote."],
      ["Can we show patient reviews?", "Yes, if they are genuine and you have permission to publish them. We can also link to your Google reviews. We never write or invent reviews."],
      ["Can we show before/after photos?", "Only with patient consent and in line with the rules that apply to your profession — you decide what is appropriate to publish."],
    ],
    wa: "Hi Xender Secrets, I want a website for my clinic.",
  },
  {
    file: "real-estate-website-development.html", slug: "realestate", business: "real-estate", code: "REAL", label: "Real estate",
    title: "Real Estate Agent Website from ₹999 + GST | Property Enquiries | Xender Secrets",
    description: "Websites for real-estate agents, brokers and builders — property listings, locality pages, site-visit and WhatsApp enquiry buttons. From ₹999 + GST, fixed price.",
    eyebrow: "Websites for real-estate agents &amp; brokers",
    h1: "A property website that gets you <em>site-visit enquiries.</em>",
    lede: "Buyers and tenants shortlist on their phones. We build fast real-estate sites that show your listings and localities clearly and turn interest into a WhatsApp message or call about a specific property.",
    needs: [
      ["What is available", "Listings with price range, configuration (2/3 BHK), area and photos."],
      ["Where exactly", "Localities and projects you specialise in — e.g. sectors, societies, landmarks."],
      ["Can I trust this agent?", "Your name, RERA registration (where applicable), office and years in the area."],
      ["Ask about this property", "A WhatsApp button on each listing that says which property they mean."],
    ],
    build: ["Home page with featured properties and localities", "Listing cards with configuration, price range and photos", "Property-specific WhatsApp enquiry buttons", "Locality / project sections", "About you, RERA details (if applicable) and office location", "Site-visit request CTA"],
    rec: "business-pro-3499", recWhy: "Agents with several projects benefit from separate locality/listing pages.",
    faq: [
      ["Can I update listings myself?", "For a few listings, we update them on request. If you change listings often, a simple listing manager is custom work — ask for a quote."],
      ["Can you connect to property portals?", "Portal integrations depend on each portal's terms and APIs and are custom work. Many agents simply link to their portal profiles."],
      ["Do you add RERA numbers?", "Yes — you provide them and we display them clearly where required."],
    ],
    wa: "Hi Xender Secrets, I want a website for my real-estate business.",
  },
  {
    file: "recruitment-agency-website-development.html", slug: "recruitment", business: "recruitment", code: "RECR", label: "Recruitment",
    title: "Recruitment Agency Website from ₹1,999 + GST | Employer Enquiries | Xender Secrets",
    description: "Websites for recruitment and staffing agencies — employer hiring enquiries, sectors you hire for, open roles and candidate applications. From ₹999 + GST, fixed price.",
    eyebrow: "Websites for recruitment &amp; staffing agencies",
    h1: "A recruitment site that brings in <em>employers, not just CVs.</em>",
    lede: "Most agency sites attract candidates but leave employers unsure what you do. We build sites with a clear employer path — sectors, roles you fill, how you work — plus a simple route for candidates.",
    needs: [
      ["Can you fill my roles?", "Sectors, functions and levels you recruit for, stated plainly."],
      ["How do you work?", "Your process, timelines you're comfortable stating, and commercial model in outline."],
      ["Who are you?", "Founder/team profiles and where you operate."],
      ["Two clear paths", "\"I'm hiring\" for employers and \"I'm looking for a job\" for candidates."],
    ],
    build: ["Home page with separate employer and candidate paths", "Sectors / roles you recruit for", "Employer hiring-enquiry form and WhatsApp button", "Open roles section (updated on request)", "Candidate application path", "About and contact"],
    rec: "business-starter-1999", recWhy: "Employer page, candidate page and contact cover most agencies.",
    faq: [
      ["Can candidates upload CVs?", "A CV upload with secure storage is custom work. In the packages, candidates can apply by email or WhatsApp."],
      ["Can enquiries be routed to different recruiters?", "Yes, as custom work — e.g. routing by sector with automatic acknowledgement. Ask for a quote."],
      ["Can you show logos of companies we've placed with?", "Only with their permission. We never add logos or claims you can't back up."],
    ],
    wa: "Hi Xender Secrets, I want a website for my recruitment agency.",
  },
  {
    file: "consultant-website-development.html", slug: "consultant", business: "consultants", code: "CONS", label: "Consultant",
    title: "Consultant Website from ₹999 + GST | Book Discovery Calls | Xender Secrets",
    description: "Websites for consultants and advisors — clear positioning, services, approach and a direct path to a discovery call. From ₹999 + GST, fixed price.",
    eyebrow: "Websites for consultants &amp; advisors",
    h1: "A consulting site that makes your expertise <em>easy to buy.</em>",
    lede: "Prospects hire consultants who are specific. We build focused sites that state who you help, the problem you solve and how an engagement works — ending in a simple request for a discovery call.",
    needs: [
      ["Is this for someone like me?", "Your niche and typical client, in one sentence."],
      ["What will change?", "The problems you solve and how you approach them."],
      ["Why you?", "Background, credentials and genuine work samples or articles."],
      ["What's the next step?", "A discovery-call request on WhatsApp, email or form."],
    ],
    build: ["One-page or 3-page positioning site", "Services / engagement types", "About, background and credentials", "Articles or insights section (optional)", "Discovery-call CTA on every screen", "LinkedIn and email integration"],
    rec: "founding-website-999", recWhy: "Many independent consultants start well with one sharp page.",
    faq: [
      ["Can I add a calendar booking link?", "Yes — if you use a free scheduling tool, we place your booking link prominently."],
      ["Can you write the copy?", "We draft clear copy from a short conversation with you; you approve every word before launch."],
      ["Can I add a blog later?", "Yes. Start with one page and add articles or pages when you're ready."],
    ],
    wa: "Hi Xender Secrets, I'm a consultant and need a website.",
  },
  {
    file: "coaching-website-development.html", slug: "coaching", business: "coaching", code: "COCH", label: "Coaching institute",
    title: "Coaching Institute Website from ₹999 + GST | Admission Enquiries | Xender Secrets",
    description: "Websites for coaching institutes, tutors and academies — courses, batches, faculty, fees and WhatsApp admission enquiries for parents and students. From ₹999 + GST.",
    eyebrow: "Websites for coaching institutes &amp; tutors",
    h1: "Coaching websites that bring <em>admission enquiries</em> from parents.",
    lede: "Parents and students compare institutes on their phones. We build clear sites with your courses, batches, faculty and location — and an easy WhatsApp path to ask about admission or a demo class.",
    needs: [
      ["Which courses and batches?", "Exams or subjects, batch timings, online/offline mode."],
      ["Who teaches?", "Faculty profiles and teaching approach."],
      ["Where and how much?", "Centre location, and fee structure or \"ask for fees\" if you prefer."],
      ["Book a demo class", "WhatsApp or call button for admission and demo-class enquiries."],
    ],
    build: ["Home page with courses and batch highlights", "Course / batch details", "Faculty profiles", "Centre location, timings and map", "Admission and demo-class WhatsApp buttons", "Optional results page — only genuine, permitted results"],
    rec: "business-starter-1999", recWhy: "Courses, faculty and contact pages fit most institutes.",
    faq: [
      ["Can we publish student results?", "Yes, when the results are genuine and you have permission from students/parents. We don't create or embellish results."],
      ["Can students pay fees online?", "Online payments need a payment provider account in your name; integrating it is custom work and the provider charges its own fees."],
      ["Can we add an online test or LMS?", "That is custom work. Tell us what you need and we'll suggest the simplest version."],
    ],
    wa: "Hi Xender Secrets, I want a website for my coaching institute.",
  },
  {
    file: "gym-website-development.html", slug: "gym", business: "gyms", code: "GYM", label: "Gym",
    title: "Gym & Fitness Studio Website from ₹999 + GST | Free-Trial Enquiries | Xender Secrets",
    description: "Websites for gyms, fitness studios and personal trainers — programs, trainers, timings, membership enquiries and one-tap WhatsApp free-trial bookings. From ₹999 + GST.",
    eyebrow: "Websites for gyms &amp; fitness studios",
    h1: "A gym website that turns scrollers into <em>free-trial bookings.</em>",
    lede: "People choose a gym on their phone — usually after checking location, timings and what a session feels like. We build fast, energetic sites that show your programs, trainers and timings, with a one-tap WhatsApp button to book a free trial.",
    needs: [
      ["Is it close and open when I'm free?", "Location, map and timings — including early-morning and late-evening slots."],
      ["What can I do here?", "Strength, weight loss, personal training, group classes — explained in plain words."],
      ["Who will train me?", "Trainer profiles and certifications you're comfortable publishing."],
      ["How much, and can I try first?", "Membership plans or \"ask for prices\", plus a free-trial or visit button."],
    ],
    build: ["Home page with programs and gym highlights you choose", "Programs / classes section with timings", "Trainer profiles", "Membership plans (or \"ask for pricing\")", "Location, map and opening hours", "Free-trial WhatsApp button on every screen"],
    rec: "founding-website-999", recWhy: "Most single-location gyms start well with one strong page.",
    faq: [
      ["Can members pay or renew online?", "Online payments need a payment-provider account in your name; integrating it is custom work and the provider charges its own fees. Many gyms start with WhatsApp enquiries and pay-at-desk."],
      ["Can we show member transformations?", "Only with the member's written permission, and only genuine results. We never create or edit results."],
      ["Can we post a class timetable that we update?", "Yes. For a timetable that changes weekly we can make it easy to update — ask and we'll quote the simplest option."],
    ],
    wa: "Hi Xender Secrets, I want a website for my gym.",
  },
  {
    file: "restaurant-website-development.html", slug: "restaurant", business: "restaurants", code: "REST", label: "Restaurant",
    title: "Restaurant & Café Website from ₹999 + GST | Menu, Reservations | Xender Secrets",
    description: "Websites for restaurants, cafés and cloud kitchens — menu, photos, timings, map, table reservations and WhatsApp orders. From ₹999 + GST, no commission.",
    eyebrow: "Websites for restaurants &amp; cafés",
    h1: "A restaurant website with your menu, <em>bookings and orders</em> one tap away.",
    lede: "Diners check the menu, prices, timings and location before they visit or order. We build quick, appetising sites that show your menu clearly and let guests reserve a table or order on WhatsApp — without paying a commission on every order.",
    needs: [
      ["What's on the menu?", "A readable menu with prices, not a blurry photo of a printed card."],
      ["Is it open now, and where is it?", "Timings, map, parking or delivery area."],
      ["What's it like?", "Your own photos of the food and the space."],
      ["Book or order", "Reserve-a-table and order-on-WhatsApp buttons that work on a phone."],
    ],
    build: ["Home page with signature dishes and photos you provide", "Menu section with prices (easy to update)", "Timings, location map and directions", "Reserve-a-table and WhatsApp-order buttons", "Links to your delivery-app and Google pages", "Basic on-page SEO for \"restaurant near {area}\" style searches"],
    rec: "business-starter-1999", recWhy: "Home, menu and contact pages suit most restaurants and cafés.",
    faq: [
      ["Do you take a commission on orders?", "No. The website is a one-time fixed price. Orders that come through WhatsApp go straight to you."],
      ["Can customers pay online for orders?", "That needs a payment-provider account in your name and is custom work; the provider charges its own fees."],
      ["How do we update the menu?", "Send us changes and we update them, or for frequent changes we can make the menu easy for you to edit — ask for a quote."],
    ],
    wa: "Hi Xender Secrets, I want a website for my restaurant.",
  },
];

function industryPage(ind) {
  const ctaPrefix = ind.slug;
  const templates = ind.templates || [[`${ind.code}-01`, "Minimal"], [`${ind.code}-02`, "Premium"], [`${ind.code}-03`, "Luxury"]];
  const body = [
    hero({
      eyebrow: ind.eyebrow, h1: ind.h1, lede: ind.lede, waText: ind.wa, ctaPrefix,
      card: offerCard({ offer: ind.rec, title: "Recommended to start", bullets: [ind.recWhy, ...["Mobile-first design with your branding", "WhatsApp, call and enquiry buttons", "Live preview before you approve", "Complete handover"]], ctaPrefix }),
    }),
    cardsBlock({ kicker: "What visitors look for", heading: `What your clients check <span>before they contact you.</span>`, items: ind.needs }),
    buildListBlock({ heading: `Your ${esc(ind.label.toLowerCase())} website, <span>built around enquiries.</span>`, intro: "A typical build includes the following — we confirm the exact pages and sections in your written quote.", items: ind.build, aside: includedAside() }),
    templatesBlock({ business: ind.business, ids: templates, label: ind.label, ctaPrefix }),
    pricingBlock({ ctaPrefix, featured: ind.rec, intro: "The same fixed prices for every business. Pick a package, or start with a free check of your current site." }),
    processBlock(),
    faqBlock([...ind.faq, ...COMMON_FAQ]),
    leadForm({ cta: `${ctaPrefix}-start-form`, waText: ind.wa }),
    relatedBlock([["/services.html", "All packages"], [`/business-templates.html?business=${ind.business}`, `${ind.label} templates`], ["/website-development-gurugram.html", "Websites in Gurgaon (Gurugram)"], ["/website-development-delhi.html", "Websites in Delhi NCR"], ["/website-development-noida.html", "Websites in Noida"], ["/small-business-website-india.html", "Small business websites in India"], ["/website-cost-calculator.html", "Website cost calculator"]]),
  ].join("\n\n    ");
  const service = serviceJsonLd({ path: "/" + ind.file, name: `${ind.label} website development`, serviceType: "Website development",
    description: ind.description, areaServed: [{ "@type": "Country", name: "India" }], audience: ind.eyebrow.replace(/^Websites for /, "").replace(/&amp;/g, "&") });
  return page({
    path: "/" + ind.file, title: ind.title, description: ind.description, body,
    jsonld: [ORG_JSONLD, service, faqJsonLd([...ind.faq, ...COMMON_FAQ]), breadcrumbJsonLd([["Home", "/"], ["Pricing", "/services.html"], [ind.label + " websites", "/" + ind.file]])],
  });
}

// ---------------------------------------------------------------- locations
export const LOCATIONS = [
  {
    file: "website-development-gurugram.html", slug: "gurugram", city: "Gurugram", searchName: "Gurgaon (Gurugram)",
    title: "Website Development in Gurgaon (Gurugram) from ₹999 + GST | Xender Secrets",
    description: "Website development in Gurgaon (Gurugram) by a local studio — mobile-first business websites with WhatsApp and call buttons, fixed prices from ₹999 + GST.",
    h1: "Website development in Gurgaon, <em>from a Gurugram studio.</em>",
    lede: "Xender Secrets is based in Gurugram (still Gurgaon to most of our customers). We build fast, mobile-first websites for local clinics, CA firms, real-estate agents, coaching centres, gyms, restaurants and shops — and we can meet you in person or work entirely over WhatsApp.",
    areaServed: { "@type": "City", name: "Gurugram", alternateName: "Gurgaon", containedInPlace: { "@type": "State", name: "Haryana" } },
    local: [
      ["Local, not outsourced", "You deal directly with the founder in Gurugram — not a call centre or a reseller."],
      ["Built for local search", "Pages that mention your sector, area and services the way Gurgaon customers search for them, plus a link to your Google Business profile."],
      ["Meet when it helps", "A short in-person meeting in Gurugram can be arranged when it makes the brief easier; most projects run smoothly on WhatsApp."],
    ],
    areas: ["Cyber City &amp; DLF Phases 1–5", "Golf Course Road &amp; Golf Course Extension Road", "Sohna Road", "MG Road &amp; Sikanderpur", "Udyog Vihar", "Old Gurgaon (Sectors 4–17, 29)", "New Gurgaon (Sectors 80–95)", "Manesar"],
    guide: [
      ["Use both names", "Customers still type \"Gurgaon\" more often than \"Gurugram\". Your site should say both, naturally — e.g. \"dental clinic in Sector 56, Gurgaon (Gurugram)\"."],
      ["Name the sector and a landmark", "Gurgaon is searched sector by sector. Put your sector, society or market and a nearby landmark on the page and in your Google Business profile, written the same way in both places."],
      ["Make WhatsApp the first button", "Most local enquiries start on a phone. A visible WhatsApp button that pre-fills your service name usually beats a long contact form."],
      ["Show timings and parking", "For clinics, gyms, salons and restaurants, opening hours and parking or metro access answer the questions people ask before visiting."],
    ],
    faq: [["Can we meet in person?", "Yes, in Gurugram, by appointment. Many clients prefer WhatsApp and a quick video call — both work."], ["Is Gurgaon the same as Gurugram?", "Yes. The city was officially renamed Gurugram in 2016, but most people still search for \"Gurgaon\". We write your site so it can be found under both names."], ["Do you only work with Gurugram businesses?", "No — we work across India and abroad. Being local simply makes meetings easy for Gurugram and Delhi NCR businesses."]],
  },
  {
    file: "website-development-delhi.html", slug: "delhi", city: "Delhi", searchName: "Delhi NCR",
    title: "Website Development in Delhi & Delhi NCR from ₹999 + GST | Xender Secrets",
    description: "Website development for Delhi and Delhi NCR businesses from an NCR studio — mobile-first sites, WhatsApp enquiry buttons, fixed prices from ₹999 + GST, full handover.",
    h1: "Website development for <em>Delhi &amp; Delhi NCR</em> businesses.",
    lede: "We're a Delhi NCR studio based in Gurugram, building fast websites for Delhi's clinics, CA firms, agents, institutes, restaurants and shops. Most projects run over WhatsApp and video calls; meeting in person in NCR can be arranged.",
    areaServed: [{ "@type": "City", name: "New Delhi" }, { "@type": "AdministrativeArea", name: "Delhi NCR" }],
    local: [
      ["NCR-based", "Same region, same working hours, easy to reach — no time-zone or language gap."],
      ["Built for local search", "Service and neighbourhood wording that matches how Delhi customers search, linked to your Google Business profile."],
      ["Simple communication", "English or Hindi, on WhatsApp — whichever is easier for you."],
    ],
    areas: ["South Delhi — Saket, Hauz Khas, Greater Kailash", "Lajpat Nagar &amp; South Extension", "Connaught Place &amp; Karol Bagh", "Dwarka &amp; Janakpuri", "Rohini &amp; Pitampura", "Laxmi Nagar &amp; Preet Vihar"],
    guide: [
      ["Search is by neighbourhood", "People rarely search just \"Delhi\" — they search \"physiotherapist in Dwarka\" or \"CA near Lajpat Nagar\". Name the neighbourhoods you actually serve."],
      ["One page per real service", "If you offer distinct services (e.g. GST filing and company registration), a short page for each helps both customers and Google understand you."],
      ["Hindi where your customers use it", "A Hindi line or button can help when many of your customers search or message in Hindi. We only add it where you want it."],
      ["Match your Google profile", "Business name, address and phone number should read exactly the same on your website and your Google Business profile."],
    ],
    faq: [["Do you have an office in Delhi?", "We are based in Gurugram, Delhi NCR. We work with Delhi businesses over WhatsApp/video and can meet in NCR by appointment."], ["Do you cover the whole of Delhi NCR?", "Yes — Delhi, Gurugram, Noida, Greater Noida, Ghaziabad and Faridabad. The process and prices are the same everywhere."]],
  },
  {
    file: "website-development-noida.html", slug: "noida", city: "Noida", searchName: "Noida",
    title: "Website Development in Noida & Greater Noida from ₹999 + GST | Xender Secrets",
    description: "Mobile-first websites for Noida and Greater Noida businesses from a Delhi NCR studio — WhatsApp enquiries, fixed prices from ₹999 + GST, full handover.",
    h1: "Websites for <em>Noida</em> businesses that bring enquiries.",
    lede: "From our Delhi NCR base in Gurugram, we build mobile-first websites for Noida and Greater Noida businesses — coaching centres, clinics, real-estate agents, consultants, restaurants and shops — with fixed prices and full handover.",
    areaServed: [{ "@type": "City", name: "Noida" }, { "@type": "City", name: "Greater Noida" }],
    local: [
      ["NCR-based", "Same region and working hours; we understand how local customers search and enquire."],
      ["Enquiries first", "Every page is designed to end in a WhatsApp message, call or form — not just to look nice."],
      ["Remote-friendly", "Brief, preview and feedback all work over WhatsApp; meet in NCR by appointment if useful."],
    ],
    areas: ["Sector 18 &amp; Atta Market", "Sectors 62 &amp; 63", "Noida Expressway sectors", "Sectors 50–76", "Greater Noida", "Greater Noida West (Noida Extension)"],
    guide: [
      ["Sector numbers are the address", "Noida customers search and navigate by sector. Put your sector number in your page title, address and Google Business profile."],
      ["Cover both names your area has", "Greater Noida West is also called Noida Extension. Mention both where it applies so you're found under either."],
      ["Coaching and clinics: show batches and timings", "Parents and patients compare several options at once — timings, batches and fees (or \"ask for fees\") decide who they message first."],
      ["Keep it fast on mobile data", "A light page with compressed photos loads quickly on a phone, which matters more than visual effects."],
    ],
    faq: [["Do you work with Greater Noida businesses too?", "Yes. The process is the same: free check or brief, written quote, preview, launch."]],
  },
  {
    file: "small-business-website-india.html", slug: "india", city: "India", searchName: "India",
    areaServed: { "@type": "Country", name: "India" },
    title: "Small Business Website in India from ₹999 + GST | Xender Secrets",
    description: "Affordable, professional small business websites for Indian businesses — mobile-first, WhatsApp and call buttons, basic SEO, full handover. From ₹999 + GST, no monthly fees.",
    h1: "A professional small-business website <em>from ₹999 + GST.</em>",
    lede: "For shops, clinics, gyms, salons, tutors, trades and service businesses anywhere in India. We build fast, mobile-first websites with WhatsApp and call buttons, set up the SEO basics and hand everything over — with no compulsory monthly fees.",
    local: [
      ["Works anywhere in India", "Brief, preview, feedback and launch all happen over WhatsApp — no need to meet."],
      ["Made for phones", "Most of your customers will see your site on a phone; we design for that first."],
      ["Fixed, upfront prices", "₹999, ₹1,999 or ₹3,499 (+ 18% GST) — you know the full price before we start."],
    ],
    guide: [
      ["City + service in the title", "\"Physiotherapy clinic in Indore\" tells customers and Google exactly what you do and where — far more than a slogan does."],
      ["A Google Business profile is free", "Verify it yourself as the owner, then link it to your website. Most local customers see that profile before they see your site."],
      ["One clear next step", "Pick the action you want — WhatsApp, call or visit — and make it the most visible button on every screen."],
      ["Write the way customers ask", "Use the words customers actually use (\"teeth cleaning\", \"ITR filing\") rather than internal jargon."],
    ],
    faq: [["Do you build sites for businesses outside Delhi NCR?", "Yes — anywhere in India, entirely over WhatsApp and video calls."], ["Can you set up my Google Business profile?", "We can guide you and link your website to it. The profile itself must be verified by you as the owner."]],
  },
];

const LOCATION_LINKS = [
  ["/website-development-gurugram.html", "Gurgaon (Gurugram)"],
  ["/website-development-delhi.html", "Delhi NCR"],
  ["/website-development-noida.html", "Noida"],
  ["/small-business-website-india.html", "All of India"],
];

function locationPage(loc) {
  const ctaPrefix = loc.slug;
  const waText = `Hi Xender Secrets, I want a website for my business in ${loc.city}.`;
  const place = loc.searchName || loc.city;
  const body = [
    hero({ eyebrow: loc.city === "India" ? "Small business websites · all over India" : `Website development · ${esc(place)}`, h1: loc.h1, lede: loc.lede, waText, ctaPrefix,
      card: offerCard({ offer: "founding-website-999", title: "Founding offer · first 10 businesses", bullets: ["Mobile-first design with your branding", "WhatsApp, call and enquiry buttons", "Services, location and contact sections", "Basic on-page SEO setup", "Live preview before you approve", "Complete handover"], cta: "Claim a ₹999 website", ctaPrefix }) }),
    cardsBlock({ kicker: `Why Xender for ${esc(place)}`, heading: `Practical websites, <span>clear terms.</span>`, items: loc.local }),
    loc.guide ? cardsBlock({ kicker: "Free advice", id: "local-search", heading: `How customers in ${esc(place)} <span>find a local business.</span>`, intro: "Whether or not you hire us, these four things decide whether a local search turns into a call.", items: loc.guide }) : "",
    loc.areas ? `<section class="section" id="areas">
      <div class="wrap">
        <p class="kicker">Areas we work with</p>
        <h2>Businesses across ${esc(loc.city)} — <span>including:</span></h2>
        <div class="chips left">${loc.areas.map((a) => `<span class="chip">${a}</span>`).join("")}</div>
        <p>Not on the list? We work with businesses anywhere in ${loc.city === "Gurugram" ? "Gurugram and Delhi NCR" : esc(loc.city)} — and across India over WhatsApp.</p>
      </div>
    </section>` : "",
    cardsBlock({ kicker: "Industries", id: "industries", alt: true, heading: `Built for the businesses <span>${loc.city === "India" ? "we know best" : "in " + esc(place)}.</span>`, items: [
      ['<a href="/accountant-website-development.html">CA firms &amp; accountants</a>', "Service pages for GST, ITR and audit, with consultation buttons."],
      ['<a href="/clinic-website-development.html">Clinics &amp; dentists</a>', "Treatments, doctor profiles, timings and appointment requests."],
      ['<a href="/real-estate-website-development.html">Real-estate agents</a>', "Listings, localities and property-specific WhatsApp enquiries."],
      ['<a href="/coaching-website-development.html">Coaching institutes</a>', "Courses, batches, faculty and admission enquiries."],
      ['<a href="/gym-website-development.html">Gyms &amp; fitness studios</a>', "Programs, trainers, timings and free-trial bookings."],
      ['<a href="/restaurant-website-development.html">Restaurants &amp; cafés</a>', "Menu, photos, reservations and WhatsApp orders."],
      ['<a href="/recruitment-agency-website-development.html">Recruitment agencies</a>', "Employer hiring enquiries and candidate paths."],
      ['<a href="/consultant-website-development.html">Consultants</a>', "Sharp positioning and discovery-call requests."],
    ] }),
    pricingBlock({ ctaPrefix }),
    processBlock(),
    faqBlock([...loc.faq, ...COMMON_FAQ]),
    leadForm({ cta: `${ctaPrefix}-start-form`, waText }),
    relatedBlock([["/services.html", "All packages &amp; prices"], ...LOCATION_LINKS.filter(([href]) => href !== "/" + loc.file), ["/website-cost-calculator.html", "Website cost calculator"]]),
  ].filter(Boolean).join("\n\n    ");
  const service = serviceJsonLd({ path: "/" + loc.file, name: `Website development in ${place}`, serviceType: "Website development",
    description: loc.description, areaServed: loc.areaServed, audience: "Small and local businesses" });
  return page({ path: "/" + loc.file, title: loc.title, description: loc.description, body,
    jsonld: [ORG_JSONLD, service, faqJsonLd([...loc.faq, ...COMMON_FAQ]), breadcrumbJsonLd([["Home", "/"], ["Pricing", "/services.html"], [`Websites in ${place}`, "/" + loc.file]])] });
}

// ---------------------------------------------------------------- core pages
const HOME_FAQ = [
  ["Is the ₹999 website real? What's the catch?", "It's a genuine launch price for our first 10 businesses — ₹999 + 18% GST (₹1,178.82 in total): a one-page, mobile-first site with your branding, WhatsApp/contact integration and full handover. The catch is scope — it's one page. If you need more pages later, you can upgrade."],
  ...COMMON_FAQ,
  ["Can you redesign my existing website?", "Yes. Start with the free website check — we'll tell you whether a few fixes are enough or a redesign is worth it."],
  ["Are the demos your client projects?", "No. The catalog contains concept demos we built ourselves to show capability, and they are labelled that way. We don't publish fake clients or testimonials."],
  ["Do you work with businesses outside India?", "Yes — we work with businesses in the UK, US and Canada too. Conversion-focused landing pages start from US$299."],
];

function homePage() {
  const body = [
    hero({
      eyebrow: "Websites for small businesses · from ₹999 + GST",
      h1: "Business websites that turn visitors into <em>enquiries.</em>",
      lede: "Xender Secrets designs and builds fast, mobile-first websites and landing pages for clinics, CA firms, real-estate agents, recruiters and local services. Fixed prices, clear scope, full handover — no compulsory maintenance.",
      waText: "Hi Xender Secrets, I want a website for my business.", ctaPrefix: "home",
      card: offerCard({ offer: "founding-website-999", title: "Founding offer · first 10 businesses", bullets: ["Mobile-first design with your branding", "WhatsApp, call and enquiry buttons", "Services, location and contact sections", "Basic on-page SEO and Google-ready setup", "Live preview link before you approve", "Complete handover of files and access"], cta: "Claim a ₹999 website", ctaPrefix: "home" }),
    }),
    `<section class="who" aria-label="Who we build for">
      <div class="wrap">
        <p class="kicker">Built for businesses where one new enquiry pays for the website</p>
        <div class="chips">
          <a href="/accountant-website-development.html">CA &amp; accounting firms</a>
          <a href="/clinic-website-development.html">Clinics &amp; dentists</a>
          <a href="/real-estate-website-development.html">Real-estate agents</a>
          <a href="/recruitment-agency-website-development.html">Recruitment agencies</a>
          <a href="/consultant-website-development.html">Consultants</a>
          <a href="/coaching-website-development.html">Coaches &amp; institutes</a>
          <a href="/gym-website-development.html">Gyms &amp; fitness</a>
          <a href="/restaurant-website-development.html">Restaurants &amp; cafés</a>
          <a href="/small-business-website-india.html">Salons, shops &amp; local services</a>
        </div>
      </div>
    </section>`,
    pricingBlock({ ctaPrefix: "home" }),
    `<section id="work" class="section alt">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">Work you can inspect</p>
          <h2>See real builds <span>before you pay.</span></h2>
          <p>Every item in the catalog is a working concept demo built by Xender Secrets to show what we can deliver. They are clearly labelled demos, not client projects — and you can open any of them now.</p>
        </div>
        <div class="grid3">
          <a class="card work" href="/business-templates.html" data-cta="work-business-templates">
            <span class="tag">Business websites</span>
            <h3>Industry website templates</h3>
            <p>Clinics, real estate, restaurants, gyms, salons, CA firms and more — pick a starting point and we customise it.</p>
            <span class="more">Browse templates →</span>
          </a>
          <a class="card work" href="/website-catalog.html#frontend" data-cta="work-frontend">
            <span class="tag">Landing pages &amp; UI</span>
            <h3>Frontend samples</h3>
            <p>Landing pages, dashboards and storefront interfaces that work on any phone.</p>
            <span class="more">Explore samples →</span>
          </a>
          <a class="card work" href="/website-catalog.html#fullstack" data-cta="work-fullstack">
            <span class="tag">Forms, bookings &amp; data</span>
            <h3>Full-stack builds</h3>
            <p>Booking, quote, CRM and enquiry systems with a real backend you can try.</p>
            <span class="more">Try a live demo →</span>
          </a>
        </div>
        <p class="center"><a class="btn ghost" href="/website-catalog.html" data-cta="work-full-catalog">Open the full catalog</a></p>
      </div>
    </section>`,
    processBlock(),
    `<section class="section" id="areas" aria-labelledby="areas-h">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">Where we work</p>
          <h2 id="areas-h">Based in Gurugram. <span>Working across India.</span></h2>
          <p>Meet in person anywhere in Delhi NCR, or run the whole project over WhatsApp from anywhere in India — or the UK, US and Canada.</p>
        </div>
        <div class="chips">
          ${LOCATION_LINKS.map(([href, label]) => `<a href="${href}" data-cta="home-area-${href.slice(1, -5)}">${label === "All of India" ? "Small business websites across India" : "Website development in " + label}</a>`).join("\n          ")}
        </div>
        <p class="center">Not sure what a website should cost? Try the free <a href="/website-cost-calculator.html" data-cta="home-calculator">website cost calculator</a>.</p>
      </div>
    </section>`,
    FOUNDER,
    `<section class="section alt" id="guides" aria-labelledby="guides-h">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">Free guides</p>
          <h2 id="guides-h">Planning a website? <span>Start here.</span></h2>
          <p>Practical, no-jargon guides for small-business owners — useful whether or not you hire us.</p>
        </div>
        <div class="grid3 grid-auto">
          ${ARTICLES.map((a) => `<a class="card work" href="/${a.file}" data-cta="home-guide-${a.file.replace(/^article-|\.html$/g, "")}">
            <span class="tag">${esc(a.kicker)}</span>
            <h3>${esc(a.h1.split(":")[0])}</h3>
            <p>${esc(a.deck)}</p>
            <span class="more">Read the guide →</span>
          </a>`).join("\n          ")}
        </div>
        <p class="center"><a class="btn ghost" href="/articles.html" data-cta="home-all-guides">All guides</a> <a class="btn ghost" href="/faq.html" data-cta="home-faq-page">Full FAQ</a> <a class="btn ghost" href="/about.html" data-cta="home-about">About Xender</a></p>
      </div>
    </section>`,
    faqBlock(HOME_FAQ),
    leadForm({ cta: "home-start-form" }),
    `<section class="novel-strip">
      <div class="wrap novel-inner">
        <p><strong>Also from Xender:</strong> completed novels you can read free, start to finish.</p>
        <a class="btn ghost" href="/novels.html">Browse novels →</a>
      </div>
    </section>`,
  ].join("\n\n    ");
  return page({ path: "/index.html", home: true, title: "Website Development for Small Businesses from ₹999 + GST | Xender Secrets",
    ogTitle: "Business websites from ₹999 + GST — Xender Secrets",
    description: "Fast, mobile-first business websites and landing pages for Indian small businesses — from ₹999 + GST. Fixed prices, clear scope, full handover, no compulsory maintenance. Free website check.",
    body, jsonld: [ORG_JSONLD, faqJsonLd(HOME_FAQ)] });
}

function servicesPage() {
  const rows = [
    ["Total incl. 18% GST", "₹1,178.82", "₹2,358.82", "₹4,128.82"],
    ["Pages", "1 (up to 6 sections)", "Up to 3", "Up to 5"],
    ["Mobile-first responsive design", "✓", "✓", "✓"],
    ["WhatsApp &amp; call buttons", "✓", "✓", "✓"],
    ["Location map &amp; contact section", "✓", "✓", "✓"],
    ["Enquiry form", "—", "✓", "✓"],
    ["On-page SEO basics (titles, descriptions, headings)", "Basic", "City &amp; service wording", "Per service page"],
    ["Analytics setup", "—", "—", "✓"],
    ["Revision rounds on the preview", "Agreed in quote", "Agreed in quote", "Agreed in quote"],
    ["Handover of files &amp; access", "✓", "✓", "✓"],
  ];
  const faq = [
    ["What's not included?", "Domain names, paid hosting, paid plugins, stock photos and third-party subscriptions are billed at cost if you need them. Anything outside the agreed scope is quoted before we do it."],
    ["Can I start with ₹999 and upgrade later?", "Yes. Many businesses start with one page and add pages once enquiries come in; you pay only the difference in scope, quoted in writing."],
    ...COMMON_FAQ,
    ["Do you do custom software, AI workflows or automation?", "Yes, as custom work from ₹4,999 + GST — e.g. booking or quote flows, lead routing, dashboards, AI-assisted workflows. We scope it after a short discussion and suggest the simplest version that works."],
  ];
  const body = [
    hero({ eyebrow: "Pricing &amp; packages", h1: "Website packages with <em>fixed prices.</em>", ctaPrefix: "services",
      lede: "Every package is mobile-first, built around enquiries and handed over completely. You get a written quote with scope and delivery date before any payment — and there's no compulsory monthly fee.",
      waText: "Hi Xender Secrets, I want to know which website package fits my business.",
      card: offerCard({ offer: "founding-website-999", title: "Founding offer · first 10 businesses", bullets: ["One-page business website", "WhatsApp, call and map", "Basic SEO setup", "Live preview before you approve", "Complete handover"], cta: "Claim a ₹999 website", ctaPrefix: "services" }) }),
    pricingBlock({ ctaPrefix: "services", id: "pricing", heading: "Choose a package. <span>Upgrade any time.</span>" }),
    `<section class="section alt" id="pay-online">
      <div class="wrap narrow">
        <div class="card">
          <p class="kicker">Secure online payment</p>
          <h2>Already have a confirmed quote?</h2>
          <p>Once your scope and delivery terms are confirmed in writing, you can pay a standard package securely through Razorpay.</p>
          <div class="actions"><a class="btn primary" href="/pay" data-cta="services-pay-online">Pay securely online</a></div>
          <p class="fine">For custom work or a different amount, contact us first so we can send the correct payment request.</p>
        </div>
      </div>
    </section>`,
    `<section class="section alt" id="compare">
      <div class="wrap">
        <div class="section-head"><p class="kicker">Compare</p><h2>What each package <span>includes.</span></h2></div>
        <div class="card table-wrap">
          <table class="compare">
            <thead><tr><th scope="col">Feature</th><th scope="col">Founding · ₹999 + GST</th><th scope="col">Starter · ₹1,999 + GST</th><th scope="col">Pro · ₹3,499 + GST</th></tr></thead>
            <tbody>${rows.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    </section>`,
    cardsBlock({ kicker: "Custom work · from ₹4,999 + GST", heading: "When you need more than <span>a website.</span>", intro: "Quoted after a short discovery chat. We suggest the simplest version that solves the problem.", items: [
      ["Website redesign", "Rebuild an existing site around mobile, speed and enquiries — start with the free check."],
      ["Booking &amp; quote flows", "Appointment, site-visit or quote requests with confirmations. <a href=\"/sample-preview.html?type=fullstack&id=FS-01\">Try a demo →</a>"],
      ["Lead routing &amp; follow-up", "Send enquiries to the right person, acknowledge them instantly, never lose a lead."],
      ["Dashboards &amp; internal tools", "Simple CRMs, trackers and reports for small teams."],
      ["AI-assisted workflows", "Drafting, summarising and research workflows with human review where it matters."],
      ["International landing pages", "Conversion-focused landing pages for UK/US/CA businesses, from US$299."],
    ] }),
    cardsBlock({ kicker: "Industries", id: "industries", heading: "Websites for <span>your industry.</span>", alt: true, items: [
      ['<a href="/accountant-website-development.html">CA firms &amp; accountants</a>', "GST, ITR and audit service pages with consultation buttons."],
      ['<a href="/clinic-website-development.html">Clinics &amp; dentists</a>', "Treatments, doctors, timings and appointment requests."],
      ['<a href="/real-estate-website-development.html">Real-estate agents</a>', "Listings, localities and property enquiries."],
      ['<a href="/recruitment-agency-website-development.html">Recruitment agencies</a>', "Employer enquiries and candidate paths."],
      ['<a href="/consultant-website-development.html">Consultants</a>', "Positioning and discovery-call requests."],
      ['<a href="/coaching-website-development.html">Coaching institutes</a>', "Courses, batches and admission enquiries."],
      ['<a href="/gym-website-development.html">Gyms &amp; fitness studios</a>', "Programs, trainers and free-trial bookings."],
      ['<a href="/restaurant-website-development.html">Restaurants &amp; cafés</a>', "Menu, reservations and WhatsApp orders."],
    ] }),
    relatedBlock([["/website-development-gurugram.html", "Website development in Gurgaon (Gurugram)"], ["/website-development-delhi.html", "Website development in Delhi NCR"], ["/website-development-noida.html", "Website development in Noida"], ["/small-business-website-india.html", "Small business websites across India"], ["/website-cost-calculator.html", "Website cost calculator"]]),
    processBlock(),
    faqBlock(faq),
    leadForm({ cta: "services-start-form", heading: "Tell us what you need <span>— get a fixed quote.</span>" }),
  ].join("\n\n    ");
  return page({ path: "/services.html", title: "Website Packages & Pricing from ₹999 + GST | Xender Secrets",
    description: "Fixed-price website packages: free website check, ₹999 one-page site, ₹1,999 Business Starter, ₹3,499 Business Pro, and custom builds from ₹4,999. All prices + 18% GST. No compulsory monthly fees.",
    body, jsonld: [ORG_JSONLD, faqJsonLd(faq), breadcrumbJsonLd([["Home", "/"], ["Pricing", "/services.html"]])] });
}

function aboutPage() {
  const body = [
    `<section class="hero">
      <div class="wrap narrow">
        <p class="eyebrow">About Xender Secrets</p>
        <h1>Small studio. <em>Straight answers.</em></h1>
        <p class="lede">Xender Secrets is a GST-registered proprietorship in Gurugram, founded by Sahil Kumar Sharma. We build websites and simple digital systems for small businesses — designed around how customers actually enquire and buy.</p>
        <div class="actions"><a class="btn primary lg" href="#start" data-cta="about-hero-primary">Get a free website check</a><a class="btn ghost lg" href="/services.html" data-cta="about-hero-pricing">See pricing</a></div>
      </div>
    </section>`,
    cardsBlock({ kicker: "How we work", heading: "Four promises <span>we can keep.</span>", items: [
      ["Fixed price, in writing", "Scope, price and delivery date are agreed before any work or payment."],
      ["Honest proof", "Our catalog contains concept demos, labelled as demos. We don't publish fake clients, reviews or results."],
      ["You own everything", "Files, content and access are handed over at launch. No lock-in."],
      ["No forced retainers", "Support after launch is optional, never a condition of the sale."],
    ] }),
    `<section class="section alt">
      <div class="wrap split">
        <div>
          <p class="kicker">Founder</p>
          <h2>Sales experience, <span>applied to websites.</span></h2>
          <p>Sahil has spent years in sales and customer operations — understanding what makes someone pick up the phone, what makes them hesitate, and how fast a lead goes cold. Xender applies that to small-business websites: clear offers, visible contact paths, and enquiries that reach you.</p>
          <p>We use modern tools, including AI assistance, to build quickly — and a human reviews and tests everything before it reaches you.</p>
        </div>
        <div class="card included">
          <h3>Business details</h3>
          <ul class="dash"><li>Xender Secrets — proprietorship of Sahil Kumar Sharma</li><li>Gurugram, Haryana, India</li><li>GSTIN: 06IQFPS4456B1ZP</li><li>WhatsApp: +91 98219 41814</li><li>Email: ${EMAIL}</li></ul>
          <p class="fine"><a href="https://www.startupindia.gov.in/bhaskar/profile?bhaskarid=IN-1026-9552QE" target="_blank" rel="noopener">Startup India BHASKAR profile →</a> · <a href="https://www.linkedin.com/in/sahilkumarsharma-operations" target="_blank" rel="noopener">LinkedIn profile →</a></p>
        </div>
      </div>
    </section>`,
    leadForm({ cta: "about-start-form" }),
  ].join("\n\n    ");
  return page({ path: "/about.html", title: "About Xender Secrets | Gurugram Website Studio",
    description: "Xender Secrets is a GST-registered website studio in Gurugram founded by Sahil Kumar Sharma. Fixed prices, honest proof, full handover, no forced retainers.",
    body, jsonld: [ORG_JSONLD, breadcrumbJsonLd([["Home", "/"], ["About", "/about.html"]])] });
}

function contactPage() {
  const body = [
    `<section class="hero">
      <div class="wrap narrow">
        <p class="eyebrow">Contact</p>
        <h1>Talk to us about <em>your website.</em></h1>
        <p class="lede">The fastest way is WhatsApp. You can also email or use the form below — we reply personally.</p>
        <div class="contact-grid">
          <a class="card contact" href="${esc(wa("Hi Xender Secrets, I have an enquiry."))}" data-cta="contact-whatsapp" target="_blank" rel="noopener"><span class="tag">Fastest</span><h3>WhatsApp</h3><p>+91 98219 41814</p></a>
          <a class="card contact" href="mailto:${EMAIL}" data-cta="contact-email"><span class="tag">Email</span><h3>Email</h3><p>${EMAIL}</p></a>
          <a class="card contact" href="https://www.linkedin.com/in/sahilkumarsharma-operations" target="_blank" rel="noopener" data-cta="contact-linkedin"><span class="tag">Profile</span><h3>LinkedIn</h3><p>Sahil Kumar Sharma</p></a>
        </div>
      </div>
    </section>`,
    leadForm({ cta: "contact-form", offer: "not-sure", heading: "Or send a quick <span>enquiry.</span>", intro: "Tell us what you need; we reply on WhatsApp or email.", bullets: ["Websites, redesigns and landing pages", "Custom builds and automation", "Anything else — just ask"] }),
  ].join("\n\n    ");
  return page({ path: "/contact.html", title: "Contact Xender Secrets | WhatsApp, Email",
    description: "Contact Xender Secrets about a business website, redesign or custom build — WhatsApp +91 98219 41814, email or the enquiry form. We reply personally.",
    body, jsonld: [ORG_JSONLD, breadcrumbJsonLd([["Home", "/"], ["Contact", "/contact.html"]])] });
}

// ---------------------------------------------------------------- SiteCheck extension (CLAUDE-EXT-001)
/**
 * Store availability. Set `url` only once the listing is LIVE — until then the page says "Coming soon".
 * Chrome stays "Coming soon" until the US$5 registration is approved (₹0-spend rule).
 */
export const SITECHECK_STORES = [
  { id: "edge", name: "Microsoft Edge", store: "Edge Add-ons", url: null },
  { id: "firefox", name: "Firefox", store: "Firefox Add-ons", url: null },
  { id: "chrome", name: "Chrome", store: "Chrome Web Store", url: null },
];

const SITECHECK_FAQ = [
  ["Is Xender SiteCheck free?", "Yes. The extension is free, with no account and no paid tier. If you want a person to review your site, our website check is free too."],
  ["Does it send my website or browsing data to Xender?", "No. The analysis runs inside your browser when you click the button, and the extension makes no network requests. Nothing is sent unless you choose to copy the report or contact us yourself. Read the <a href=\"/sitecheck-privacy.html\">SiteCheck privacy policy</a>."],
  ["Is the score a Google or Lighthouse score?", "No. It is a Xender SiteCheck heuristic score with a published formula (below). It does not measure page speed or Core Web Vitals, and it isn't a full accessibility (WCAG) audit."],
  ["Does it check broken links?", "It verifies same-page links (for example <code>#pricing</code>) and flags empty, javascript: or mistyped link addresses. It does not request external links over the network, so it never claims an external page is broken without testing it."],
  ["Which browsers are supported?", "Microsoft Edge, Firefox and Google Chrome on desktop. Store listings are being prepared for submission; until a store link appears above, that store's listing isn't live yet."],
];

function sitecheckPage() {
  const storeCards = SITECHECK_STORES.map((s) => s.url
    ? `<a class="card contact" href="${esc(s.url)}" target="_blank" rel="noopener" data-cta="sitecheck-install-${s.id}"><span class="tag">Available</span><h3>Install on ${esc(s.name)}</h3><p>${esc(s.store)}</p></a>`
    : `<div class="card contact" aria-disabled="true"><span class="tag">Coming soon</span><h3>Coming soon on ${esc(s.name)}</h3><p>${esc(s.store)} listing not live yet</p></div>`).join("\n          ");
  const faq = SITECHECK_FAQ;
  const body = [
    `<section class="hero">
      <div class="wrap hero-grid">
        <div>
          <p class="eyebrow">Free browser extension · by Xender Secrets</p>
          <h1>Xender SiteCheck: <em>free website QA &amp; conversion checker.</em></h1>
          <p class="lede">Check the current webpage for SEO basics, accessibility issues, usability problems and conversion friction — directly in your browser. One click gives you a score, a prioritised list of problems, why each one matters and how to fix it.</p>
          <div class="actions">
            <a class="btn primary lg" href="#install" data-cta="sitecheck-hero-install">See supported browsers</a>
            <a class="btn ghost lg" href="#start" data-offer="free-website-check" data-cta="sitecheck-hero-human">Get a free human audit</a>
          </div>
          <ul class="trust" aria-label="Why SiteCheck">
            <li>Runs locally — nothing sent anywhere</li>
            <li>Only 2 permissions</li>
            <li>No account, no tracking</li>
            <li>Plain-language fixes</li>
          </ul>
        </div>
        <aside class="hero-card" aria-labelledby="sc-what">
          <p class="tag">What you get</p>
          <h2 id="sc-what">A health score from 0–100</h2>
          <ul class="checks"><li>Scores for SEO, Accessibility, Usability, Conversion and Technical</li><li>Critical issues, warnings and recommendations, in that order</li><li>Why it matters + recommended fix for every issue</li><li>Copy the report to share with your developer</li></ul>
          <p class="fine">A Xender SiteCheck heuristic score — not a Lighthouse score. <a href="#scoring">How it's calculated</a>.</p>
        </aside>
      </div>
    </section>`,
    `<section class="section" id="install">
      <div class="wrap">
        <div class="section-head">
          <p class="kicker">Supported browsers</p>
          <h2>Get SiteCheck <span>for your browser.</span></h2>
          <p>Store listings are being prepared for submission. A store appears as installable here only once its listing is live.</p>
        </div>
        <div class="contact-grid">
          ${storeCards}
        </div>
        <p class="fine center">Want to try it before the store listings go live? <a href="${esc(wa("Hi Xender Secrets, I'd like to try the SiteCheck browser extension beta."))}" target="_blank" rel="noopener" data-cta="sitecheck-beta-whatsapp">Ask us on WhatsApp</a> and we'll send the package with install steps.</p>
      </div>
    </section>`,
    cardsBlock({ kicker: "What it checks", id: "checks", alt: true, heading: "49 checks across <span>five areas.</span>", intro: "Everything runs on the page as your browser shows it — including pages built with JavaScript.", items: [
      ["SEO basics", "Page title, meta description, canonical URL, mobile viewport, Open Graph tags for link previews, accidental “noindex”, missing or multiple H1 headings."],
      ["Accessibility", "Images without alt text, links and buttons with no name, unlabelled form fields, skipped or empty headings, invalid ARIA, disabled zoom, low text contrast (only where it can be measured reliably)."],
      ["Usability", "Pages that scroll sideways at your window width, forms without a submit button, contact fields without autofill, email/phone fields that show the wrong mobile keyboard."],
      ["Conversion (heuristics)", "Whether there's a clear call to action, generic “Submit” buttons, too many competing buttons, no visible phone/email/WhatsApp, no trust or policy links, long forms, crowded menus, placeholder text."],
      ["Technical &amp; security", "HTTPS, password fields on insecure pages, insecure resources and forms, links that go nowhere, mistyped link addresses, broken same-page links, duplicate ids, missing doctype, oversized images, very large pages."],
      ["What it doesn't do", "No page-speed or Core Web Vitals measurement, no full WCAG audit, no crawling of other pages, and no external link requests — so it never calls a link “broken” without proof."],
    ] }),
    `<section class="section" id="privacy">
      <div class="wrap split">
        <div>
          <p class="kicker">Privacy first</p>
          <h2>Your pages stay <span>in your browser.</span></h2>
          <p>SiteCheck runs only when you click its button, only on the tab you're looking at. The analysis happens locally; the extension makes no network requests and stores nothing.</p>
          <ul class="checks"><li>No browsing history, cookies, passwords or form contents</li><li>No analytics, tracking or ads</li><li>No remote code — everything ships inside the extension</li><li>The “free audit” link never includes the page you checked</li></ul>
          <p><a href="/sitecheck-privacy.html">Read the full SiteCheck privacy policy →</a></p>
        </div>
        <div class="card included">
          <h3>Permissions, and why</h3>
          <ul class="dash"><li><strong>activeTab</strong> — temporary access to the current tab, only after you click the button</li><li><strong>scripting</strong> — runs SiteCheck's own bundled audit script in that tab</li></ul>
          <p class="fine">No “read and change all your data on all websites” permission.</p>
        </div>
      </div>
    </section>`,
    `<section class="section alt" id="scoring">
      <div class="wrap narrow">
        <div class="section-head">
          <p class="kicker">How the score works</p>
          <h2>A simple formula <span>you can check.</span></h2>
          <p>This is a Xender SiteCheck heuristic score, not a Lighthouse score. The same page always gets the same score.</p>
        </div>
        <ol class="steps">
          <li><h3>Every check is weighted</h3><p>Critical checks count 3, warnings 2, recommendations 1. Checks that don't apply (no forms, no images) are left out.</p></li>
          <li><h3>Category score</h3><p>Weight of passed checks ÷ weight of applicable checks × 100, for SEO, Accessibility, Usability, Conversion and Technical.</p></li>
          <li><h3>Overall score</h3><p>Weighted average: SEO 25%, Accessibility 25%, Conversion 20%, Usability 15%, Technical 15%.</p></li>
          <li><h3>Bands</h3><p>90–100 Strong · 75–89 Good · 50–74 Needs work · below 50 Poor.</p></li>
        </ol>
      </div>
    </section>`,
    `<section class="section" id="custom-extensions">
      <div class="wrap split">
        <div>
          <p class="kicker">For businesses</p>
          <h2>Need a custom browser extension <span>for your business?</span></h2>
          <p>We built SiteCheck with the same care we'd bring to yours: minimal permissions, no tracking, tested on Chrome, Edge and Firefox. If your team repeats the same steps in the browser every day, an extension can do them for you.</p>
          <ul class="checks"><li>Repetitive browser workflow automation</li><li>Internal tools for your team</li><li>CRM helpers — capture leads from pages into your CRM</li><li>Browser productivity extensions</li></ul>
          <div class="actions"><a class="btn primary lg" href="#start" data-offer="custom-build" data-cta="sitecheck-custom-extension">Tell us what browser task you want automated</a></div>
        </div>
        <div class="card included">
          <h3>How it works</h3>
          <ul class="dash"><li>Describe the task — what you click, copy and paste today</li><li>We reply with a fixed-scope quote in writing</li><li>You test a private build before anything is published</li><li>You own the code; store publishing optional</li></ul>
        </div>
      </div>
    </section>`,
    faqBlock(faq),
    leadForm({ cta: "sitecheck-start-form", heading: "Want a human review? <span>Get a free website audit.</span>", intro: "SiteCheck catches the obvious problems. A person catches the rest — your offer, your copy, your customers' questions. Send your site and we reply personally with specific fixes.", bullets: ["A person reviews your site, not a bot", "Specific fixes, in priority order", "No obligation"] }),
  ].join("\n\n    ");
  const app = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Xender SiteCheck", applicationCategory: "DeveloperApplication", operatingSystem: "Microsoft Edge, Firefox, Google Chrome",
    description: "Browser extension that checks the current webpage for SEO basics, accessibility, usability and conversion issues, locally in the browser.", url: SITE + "/sitecheck",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" }, publisher: { "@type": "Organization", name: "Xender Secrets", url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/og-xender.png" } } };
  return page({ path: "/sitecheck.html", title: "Xender SiteCheck — Free Website QA & Conversion Checker Extension",
    description: "Free browser extension for Edge, Firefox and Chrome: check any webpage for SEO basics, accessibility, usability and conversion issues. Runs locally, no tracking.",
    ogTitle: "Xender SiteCheck — free website QA & conversion checker", body,
    jsonld: [app, faqJsonLd(faq), breadcrumbJsonLd([["Home", "/"], ["SiteCheck", "/sitecheck.html"]])] });
}

/** Tiny Markdown → HTML for the extension privacy policy (headings, paragraphs, lists, tables, bold, code, links). */
function mdToHtml(md) {
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(^|[\s(])(https:\/\/[^\s<)]+[^\s<).,])/g, '$1<a href="$2">$2</a>');
  const out = [];
  const lines = md.replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith("# ")) continue; // page supplies its own H1
    if (line.startsWith("## ")) { out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
      i--; out.push(`<ul class="dash">${items.join("")}</ul>`); continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      i--;
      const cells = (r) => r.split("|").slice(1, -1).map((c) => c.trim());
      const [head, , ...rest] = rows;
      out.push(`<div class="table-wrap"><table class="compare"><thead><tr>${cells(head).map((c) => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead><tbody>${rest.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    const para = [line];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|- |\|)/.test(lines[i + 1])) para.push(lines[++i]);
    out.push(`<p>${para.map(inline).join("<br>")}</p>`);
  }
  return out.join("\n        ");
}

function sitecheckPrivacyPage() {
  const md = fs.readFileSync(new URL("../../extension/store/privacy-policy.md", import.meta.url), "utf8");
  const body = `<section class="section">
      <div class="wrap narrow">
        <p class="eyebrow">Xender SiteCheck</p>
        <h1>SiteCheck privacy policy</h1>
        ${mdToHtml(md)}
        <p><a class="btn ghost" href="/sitecheck.html">← Back to Xender SiteCheck</a></p>
      </div>
    </section>

    ${leadForm({ cta: "sitecheck-privacy-form", heading: "Questions about SiteCheck <span>or your website?</span>", intro: "Ask us anything about the extension, or send your site for a free human review. We reply personally.", bullets: ["Privacy or permission questions", "Free website check", "Custom browser extensions"] })}`;
  return page({ path: "/sitecheck-privacy.html", title: "Xender SiteCheck Privacy Policy | Xender Secrets",
    description: "Privacy policy for the Xender SiteCheck browser extension: analysis runs locally, no data collected or transmitted, permissions activeTab and scripting only.",
    body, jsonld: [breadcrumbJsonLd([["Home", "/"], ["SiteCheck", "/sitecheck.html"], ["Privacy", "/sitecheck-privacy.html"]])] });
}

// Served by Cloudflare (not_found_handling: "404-page") for any unknown URL, at any depth,
// so every link and asset here is root-relative.
function notFoundPage() {
  const body = `<section class="hero">
      <div class="wrap narrow">
        <p class="eyebrow">404 · Page not found</p>
        <h1>This page <em>doesn't exist.</em></h1>
        <p class="lead">The link may be old or mistyped. Here's where to go instead:</p>
        <div class="actions">
          <a class="btn primary lg" href="/" data-cta="404-home">Go to the homepage</a>
          <a class="btn lg" href="/services.html" data-cta="404-pricing">See pricing</a>
          <a class="btn lg" href="${esc(wa("Hi Xender Secrets, I followed a broken link on your site."))}" data-cta="404-whatsapp" target="_blank" rel="noopener">WhatsApp us</a>
        </div>
      </div>
    </section>\n\n    ` + leadForm({ cta: "404-form" });
  return page({ path: "/404.html", title: "Page not found | Xender Secrets",
    description: "This page doesn't exist. Visit the Xender Secrets homepage, pricing or contact us on WhatsApp.",
    body, robots: "noindex,follow" });
}

/** Every generated page: { file, html }. */
// ---------------------------------------------------------------- FAQ page
// Replaces the legacy shop-era FAQ (2026-10-07): one current reference for buyers, grouped by
// topic, consistent with the published prices. Novels/shop answers kept short at the end.
const FAQ_GROUPS = [
  ["Prices &amp; payment", [
    HOME_FAQ[0],
    ...COMMON_FAQ,
    ["What's not included in the packages?", "Domain names, paid hosting, paid plugins, stock photos and third-party subscriptions are billed at cost if you need them. Anything outside the agreed scope is quoted in writing before we do it."],
    ["Can I start with ₹999 and upgrade later?", "Yes. Many businesses start with one page and add pages once enquiries come in; you pay only the difference in scope, quoted in writing."],
  ]],
  ["Websites &amp; custom builds", [
    ["What's the difference between frontend, backend and full stack?", "Frontend is what visitors see and use in the browser. Backend is the server logic and data behind it — saving an enquiry, checking a booking slot. Full stack means both, connected. Most small-business sites need a good frontend plus a reliable enquiry path; bookings, portals and quote tools need a backend too. Our <a href=\"/article-full-stack-development-guide.html\">full-stack guide</a> explains when that's worth it."],
    ["Are the templates and demos real client projects?", "No. Everything in the <a href=\"/website-catalog.html\">catalog</a> is a concept demo built by Xender Secrets to show what we can deliver, and it is labelled that way. We customise a direction you like with your name, services, photos and contact details."],
    ["Do the full-stack demos use a real backend?", "Yes. They run on Cloudflare Workers with persistent SQLite-backed storage, the same platform as this website, so you can try bookings, enquiries and records yourself."],
    ["Can you add a login, database or online payments?", "Yes, as custom work from ₹4,999 + GST, scoped after a short discussion. Online payments need a payment-provider account in your business's name; the provider charges its own fees."],
    HOME_FAQ.find(([q]) => q.startsWith("Can you redesign")),
    HOME_FAQ.find(([q]) => q.startsWith("Do you work with businesses outside India")),
  ]],
  ["Working with Xender Secrets", [
    ["What do I get from the free website check?", "A personal review of your current website, Google Business Profile or Instagram page, with the specific fixes we'd make first for mobile, speed, trust and enquiries. It's not an automated PDF, and there's no obligation to buy."],
    ["Can we meet in person?", "Yes, in Gurugram and Delhi NCR by appointment. Most projects run entirely over WhatsApp and video calls, which works anywhere in India or abroad."],
    ["How do I contact you?", "Use the form on this page, WhatsApp <a href=\"https://wa.me/919821941814\">+91 98219 41814</a>, or the <a href=\"/contact.html\">contact page</a>. We reply personally."],
    ["What is Xender SiteCheck?", "A free browser extension that checks the page you're on for common SEO, accessibility, usability and conversion issues. It runs locally and doesn't send your data anywhere. <a href=\"/sitecheck.html\">Learn more</a>."],
  ]],
  ["Novels, shop &amp; policies", [
    ["Are the novels hosted by Xender Secrets?", "The classics library links to public-domain source editions (mainly Project Gutenberg) rather than copying or reselling modern translations. Xender Originals are the brand's own web fiction, published separately."],
    ["Why are some Chinese novels in Chinese only?", "Availability varies by title and edition. We link to public-domain editions where available and avoid copyrighted modern translations."],
    ["How do shop orders and payments work?", "Orders are confirmed with you before fulfilment; Cash on Delivery or payment after confirmation is available. A direct online payment gateway is not enabled yet."],
    ["Where are your privacy, terms and refund policies?", "See the <a href=\"/privacy.html\">privacy policy</a>, <a href=\"/terms.html\">terms</a> and <a href=\"/refund.html\">refund &amp; cancellation policy</a>. Project-specific terms are confirmed in your written quote."],
  ]],
];

function faqPage() {
  const all = FAQ_GROUPS.flatMap(([, items]) => items);
  const body = [
    `<section class="hero">
      <div class="wrap narrow">
        <p class="eyebrow">FAQ</p>
        <h1>Questions about websites, <em>prices and process.</em></h1>
        <p class="lede">Straight answers about what we build, what it costs (+ 18% GST), how a project runs and what you own at the end. Can't find yours? Ask us on WhatsApp.</p>
      </div>
    </section>`,
    ...FAQ_GROUPS.map(([heading, items], i) => `<section class="section${i % 2 ? " alt" : ""}" id="faq-${i + 1}">
      <div class="wrap narrow">
        <h2>${heading}</h2>
        <div class="faq">
          ${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n          ")}
        </div>
      </div>
    </section>`),
    relatedBlock([["/services.html", "Packages &amp; prices"], ["/website-catalog.html", "Templates &amp; demos"], ["/articles.html", "Guides"], ["/about.html", "About Xender"]]),
    leadForm({ cta: "faq-start-form", heading: "Still have a question? <span>Ask us directly.</span>" }),
  ].join("\n\n    ");
  return page({ path: "/faq.html", title: "FAQ: Website Prices, GST, Process & Ownership | Xender Secrets",
    description: "Answers about Xender Secrets websites: package prices + 18% GST, payment, timelines, ownership, demos, custom builds, working remotely, and our novels library.",
    body, jsonld: [ORG_JSONLD, faqJsonLd(all), breadcrumbJsonLd([["Home", "/"], ["FAQ", "/faq.html"]])] });
}

// ---------------------------------------------------------------- guides (articles)
const longDate = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const plainText = (html) => String(html).replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ").trim();
export const articleWordCount = (a) => plainText(a.body).split(" ").length;

function articlePage(a) {
  const path = "/" + a.file;
  const body = `<article class="section guide">
      <div class="wrap narrow">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/articles.html">Guides</a> / <span>${esc(a.kicker)}</span></nav>
        <p class="eyebrow">${esc(a.kicker)}</p>
        <h1>${esc(a.h1)}</h1>
        <p class="lede">${esc(a.deck)}</p>
        <p class="byline">Xender Secrets · Published ${longDate(a.published)} · Updated ${longDate(a.modified)}</p>
        <div class="prose">${a.body}
        </div>
      </div>
    </article>

    ${relatedBlock([...a.related, ["/articles.html", "All guides"]])}

    ${leadForm({ cta: "guide-" + a.file.replace(/^article-|\.html$/g, "") + "-form", heading: "Want a second opinion <span>on your website?</span>", intro: "Send your current site (or Google / Instagram page). We reply personally with the specific fixes we'd make first — no obligation." })}`;
  const ld = {
    "@context": "https://schema.org", "@type": "BlogPosting", headline: a.h1, description: a.description,
    image: SITE + "/og-xender.png", datePublished: a.published, dateModified: a.modified, inLanguage: "en-IN",
    author: { "@type": "Organization", "@id": ORG_ID, name: "Xender Secrets", url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/og-xender.png" } },
    publisher: { "@type": "Organization", "@id": ORG_ID, name: "Xender Secrets", logo: { "@type": "ImageObject", url: SITE + "/og-xender.png" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl(path) }, wordCount: articleWordCount(a),
  };
  return page({ path, title: a.title, description: a.description, body, ogType: "article",
    jsonld: [ORG_JSONLD, ld, breadcrumbJsonLd([["Home", "/"], ["Guides", "/articles.html"], [a.h1, path]])] });
}

export function allPages() {
  return [
    { file: "index.html", html: homePage() },
    { file: "services.html", html: servicesPage() },
    { file: "about.html", html: aboutPage() },
    { file: "contact.html", html: contactPage() },
    { file: "404.html", html: notFoundPage() },
    { file: "faq.html", html: faqPage() },
    ...INDUSTRIES.map((i) => ({ file: i.file, html: industryPage(i) })),
    ...LOCATIONS.map((l) => ({ file: l.file, html: locationPage(l) })),
    { file: "sitecheck.html", html: sitecheckPage() },
    { file: "sitecheck-privacy.html", html: sitecheckPrivacyPage() },
    ...ARTICLES.map((a) => ({ file: a.file, html: articlePage(a) })),
  ];
}
