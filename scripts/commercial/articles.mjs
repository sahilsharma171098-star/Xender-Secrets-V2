// XEND-GSC-INDEXING-001 — the guides we want indexed. Each is a complete, practical answer for
// a small-business owner deciding on (or briefing) a website. Rules: no invented statistics,
// clients or results; demos are labelled as demos; prices are the published ones (+ GST).
// Thin legacy articles stay live but noindex until rewritten to this standard
// (docs/SEO_INDEXING.md → "Article rewrite queue").

export const ARTICLES = [
  {
    file: "article-small-business-website-features.html",
    kicker: "Buying a website",
    title: "Small Business Website Checklist: What You Need (and What to Skip) | Xender Secrets",
    description: "A practical checklist for Indian small businesses: what a website must have to win enquiries, what builds trust, what local SEO needs, and what you can safely skip at first.",
    h1: "Small business website checklist: what you need, and what you can skip",
    deck: "Most small-business websites have one job — turn a visitor into a call, WhatsApp message or visit. This checklist sorts features by whether they help that job.",
    published: "2026-10-04", modified: "2026-10-07",
    related: [["/services", "Website packages & prices"], ["/website-cost-calculator", "Website cost calculator"], ["/article-website-project-planning", "How to brief a website project"]],
    body: `
<h2>Start with the job, not the features</h2>
<p>Before choosing a template or a developer, write one sentence: <strong>"A good visitor should leave having ___."</strong> For a clinic that is "requested an appointment"; for a CA firm "booked a consultation"; for a restaurant "reserved a table or ordered". Every feature below either helps that sentence happen or it can wait.</p>

<h2>1. The first screen (what people see before scrolling)</h2>
<p>On a phone, the first screen decides whether people stay. It should answer four questions without scrolling:</p>
<ul>
  <li><strong>What do you do?</strong> "Dental clinic in Sector 56, Gurugram" beats a slogan.</li>
  <li><strong>Who is it for?</strong> Families, businesses, students — whoever your best customers are.</li>
  <li><strong>Why you?</strong> One concrete reason: years in practice, a specialisation, opening hours, a guarantee you actually offer.</li>
  <li><strong>What do I do next?</strong> One primary button — usually WhatsApp or call — that is visible without hunting.</li>
</ul>
<p>Skip auto-playing sliders here. They push the important text down and most visitors never see slide two.</p>

<h2>2. Contact paths that work on a phone</h2>
<ul>
  <li><strong>WhatsApp click-to-chat</strong> using a link in the form <code>https://wa.me/91XXXXXXXXXX?text=…</code>. Pre-fill the message with the service ("Hi, I'd like to book a teeth cleaning") so the customer doesn't face a blank box.</li>
  <li><strong>Tap-to-call</strong> (<code>tel:</code> link) for businesses where people prefer to talk.</li>
  <li><strong>A short form</strong> — name, phone or email, and one question — for people who want to write. Every extra field loses some people; ask only what you need for the first reply.</li>
  <li><strong>Test all three yourself</strong> from a phone before launch, and again after any change. A broken form is invisible until you notice enquiries have stopped.</li>
</ul>

<h2>3. Trust: show what a careful customer checks</h2>
<p>People who have never met you look for signs that you are real and accountable:</p>
<ul>
  <li><strong>Your real name, address or service area</strong>, written exactly the same way as on your Google Business Profile.</li>
  <li><strong>Registration details you are happy to publish</strong> — GSTIN, Udyam registration, professional registrations (ICAI, medical council, RERA) where relevant.</li>
  <li><strong>Real photos</strong> of your place, team or work. Stock photos are fine for backgrounds, not as "our clinic".</li>
  <li><strong>Reviews and testimonials only if they are genuine</strong> and you have permission to show them. Linking to your Google reviews is often more convincing than quotes on your own site.</li>
  <li><strong>Clear prices, or a clear way to get one</strong>. "From ₹X" or "Free quote in 24 hours" both reduce hesitation.</li>
</ul>

<h2>4. Pages: fewer, more specific</h2>
<table>
  <thead><tr><th>Business</th><th>Usually enough to start</th><th>Add later if needed</th></tr></thead>
  <tbody>
    <tr><td>Single-service local business</td><td>One page: about, service, location, contact</td><td>FAQ, gallery</td></tr>
    <tr><td>Clinic, CA firm, consultant</td><td>Home, services, contact (3 pages)</td><td>One page per major service, team profiles</td></tr>
    <tr><td>Several services or locations</td><td>Home, one page per service, contact</td><td>Location pages, guides</td></tr>
  </tbody>
</table>
<p>A page per real service helps both customers and search engines understand exactly what you offer. A page per city you don't actually serve does the opposite.</p>

<h2>5. Mobile and speed basics</h2>
<ul>
  <li>Design and check on a phone first; most local visitors arrive on mobile.</li>
  <li>Compress photos before uploading (modern formats like WebP are much smaller than camera JPEGs).</li>
  <li>Avoid heavy effects, background videos and many third-party widgets on the first screen.</li>
  <li>Text should be readable without zooming, and buttons large enough to tap.</li>
</ul>

<h2>6. Local search basics (no tricks needed)</h2>
<ul>
  <li><strong>Page titles that say what and where</strong>: "Physiotherapy Clinic in Indore | Name".</li>
  <li><strong>The same name, address and phone</strong> on your site, Google Business Profile and directories.</li>
  <li><strong>A verified Google Business Profile</strong> linked to your website. For many local businesses this brings more enquiries than the website itself.</li>
  <li><strong>Words customers use</strong> — "teeth cleaning", "ITR filing", "PG near metro" — rather than internal jargon.</li>
</ul>
<p>Nobody can honestly promise a ranking. Getting these basics right makes sure search engines can understand you; reviews, links and time do the rest.</p>

<h2>7. Policies and data</h2>
<p>If your site has a form, publish a short privacy policy explaining what you collect and why, and collect only what you need. India's Digital Personal Data Protection Act, 2023 sets out duties for businesses that handle personal data; if you collect anything sensitive (health details, documents), ask a professional what applies to you. Add refund or cancellation terms if you take payments online.</p>

<h2>8. What you can safely skip at first</h2>
<ul>
  <li>A blog — unless you will genuinely publish useful posts. An empty "News" page looks abandoned.</li>
  <li>Chatbots — a WhatsApp button answered by a person usually works better for small businesses.</li>
  <li>Multiple languages — add one only when a real share of customers needs it.</li>
  <li>Animations, sliders, pop-ups and newsletter boxes on the first visit.</li>
  <li>Custom features (booking engines, portals) before you know customers will use them.</li>
</ul>

<h2>Quick checklist</h2>
<ul class="checks">
  <li>First screen says what, where, why you, and what to do next</li>
  <li>WhatsApp, call and form tested from a phone</li>
  <li>Name, address/area and phone match your Google Business Profile</li>
  <li>Registration details and real photos where they matter</li>
  <li>One page per real service</li>
  <li>Titles say what you do and where</li>
  <li>Photos compressed; page loads quickly on mobile data</li>
  <li>Privacy policy if you collect personal data</li>
  <li>You own the domain and have every login</li>
</ul>
<p>If you'd like a second opinion on your current site against this list, our <a href="#start">free website check</a> is a personal review, not an automated report.</p>`,
  },
  {
    file: "article-website-project-planning.html",
    kicker: "Buying a website",
    title: "How to Brief a Website Project: One-Page Plan & Questions to Ask | Xender Secrets",
    description: "Plan a website before you pay anyone: a one-page brief template, the content to gather, who should own the domain, and the questions to ask any developer or agency.",
    h1: "How to brief a website project before you pay anyone",
    deck: "A clear one-page brief is the cheapest way to get an accurate quote, a realistic deadline and a website that does what you need.",
    published: "2026-10-04", modified: "2026-10-07",
    related: [["/article-small-business-website-features", "Small business website checklist"], ["/website-cost-calculator", "Website cost calculator"], ["/services", "Fixed-price packages"]],
    body: `
<h2>Why a brief matters more than a big budget</h2>
<p>Most website projects that go wrong do so for ordinary reasons: the goal was never written down, content arrived late, nobody knew who approves changes, or "small extras" appeared halfway through. A one-page brief fixes most of that before any money changes hands, and it lets you compare quotes from different developers on the same basis.</p>

<h2>The one-page brief (copy this)</h2>
<table>
  <tbody>
    <tr><th scope="row">Business</th><td>Name, what you sell, where you operate</td></tr>
    <tr><th scope="row">Goal</th><td>The one action a good visitor should take (call, WhatsApp, book, buy, apply)</td></tr>
    <tr><th scope="row">Customers</th><td>Who they are and the two or three questions they ask before buying</td></tr>
    <tr><th scope="row">Pages</th><td>List each page and its purpose — e.g. Home, Services, Contact</td></tr>
    <tr><th scope="row">Must-have features</th><td>WhatsApp button, enquiry form, map, menu, booking link…</td></tr>
    <tr><th scope="row">Nice-to-have</th><td>Things that can wait for phase two</td></tr>
    <tr><th scope="row">Content owner</th><td>Who writes text and supplies photos, and by when</td></tr>
    <tr><th scope="row">Integrations</th><td>Google Business Profile, payment provider, booking tool, email</td></tr>
    <tr><th scope="row">Examples</th><td>Two or three sites you like, and what you like about each</td></tr>
    <tr><th scope="row">Deadline</th><td>A real date and the reason for it (launch, season, event)</td></tr>
    <tr><th scope="row">Budget</th><td>A range — it helps a developer suggest the right scope</td></tr>
    <tr><th scope="row">Approver</th><td>The one person who signs off on designs and text</td></tr>
  </tbody>
</table>

<h2>Gather content before design starts</h2>
<p>Content is the most common cause of delay. Collect these early:</p>
<ul>
  <li>Logo (the original file if you have it) and brand colours</li>
  <li>A list of services, each with a sentence or two in plain language</li>
  <li>Prices, price ranges, or a clear "ask for a quote" message</li>
  <li>Your own photos of the premises, team and work</li>
  <li>The questions customers ask you most — they become your FAQ</li>
  <li>Address, timings, phone, WhatsApp number, email</li>
  <li>Registration details you want shown (GSTIN, Udyam, professional or RERA numbers)</li>
  <li>Genuine reviews you have permission to use, or a link to your Google reviews</li>
</ul>

<h2>Own your domain and logins</h2>
<p>Register your domain in your own name and account, even if the developer helps set it up. At handover you should have the logins (or transfer) for the domain, hosting, website files or editor, email and any analytics or Google accounts created for you. Keep them somewhere safe. If a developer disappears, this is what lets someone else take over.</p>

<h2>Questions to ask any developer or agency</h2>
<ul>
  <li>What exactly is included — how many pages, sections and revision rounds?</li>
  <li>Who writes the text, and who supplies photos?</li>
  <li>What is the delivery date, and what does it depend on?</li>
  <li>Who owns the design, code and content after payment?</li>
  <li>What will I pay every year after launch (domain, hosting, plugins, support)? Is anything compulsory?</li>
  <li>Can I see a preview before launch, on my own phone?</li>
  <li>How are changes after launch priced?</li>
  <li>Will you test the forms, WhatsApp and call buttons before handover?</li>
</ul>
<p>Get the answers in writing — a quote or a short email is enough.</p>

<h2>Fixed price or hourly?</h2>
<p>For a small business site with a clear brief, a fixed price is usually simpler: you know the total in advance and scope changes are discussed explicitly. Hourly billing suits open-ended or exploratory work where the scope genuinely can't be known yet. Either way, a written scope protects both sides.</p>

<h2>Red flags</h2>
<ul>
  <li>No written scope, or a price that changes once work starts</li>
  <li>The domain registered in the developer's name with no plan to transfer it</li>
  <li>Guaranteed first-page Google rankings</li>
  <li>Compulsory monthly fees that aren't explained</li>
  <li>No preview before you pay the final amount</li>
</ul>

<h2>A realistic timeline</h2>
<p>For a one- to five-page business site, the steps are: brief and quote → content collected → first preview → one or two rounds of changes → final checks on phone and desktop → launch and handover. The biggest variable is usually how quickly content and feedback arrive, so agree dates for those too.</p>

<p>Want a quick reality check on scope and budget? Try the <a href="/website-cost-calculator">website cost calculator</a>, or send us your brief for a <a href="#start">fixed-price quote</a>.</p>`,
  },
  {
    file: "article-lead-generation-guide.html",
    kicker: "Getting enquiries",
    title: "How to Get More Enquiries From Your Website: A Simple Lead System | Xender Secrets",
    description: "A simple lead system for service businesses: one clear call to action, WhatsApp and forms that work, a lead sheet, fast replies, follow-ups, and how to see which channels bring customers.",
    h1: "How to get more enquiries from your website: a simple lead system",
    deck: "Traffic is only useful if it becomes conversations you follow up. This is the minimum system a small service business needs — no paid tools required.",
    published: "2026-10-04", modified: "2026-10-07",
    related: [["/article-small-business-website-features", "Small business website checklist"], ["/services", "Website packages"], ["#start", "Free website check"]],
    body: `
<h2>The four stages to look after</h2>
<p>Every enquiry goes through the same stages: <strong>visit → enquiry → reply and quote → customer</strong>. Most small businesses only look at the first. The cheapest gains are usually in the middle two, because those leads have already raised their hand.</p>

<h2>1. One clear call to action per page</h2>
<p>Decide the single action you want — WhatsApp, call, form or visit — and make it the most visible button on every screen. Secondary options can exist, but a page with five equal buttons asks visitors to make a decision they didn't come to make.</p>
<ul>
  <li>Use specific button text: "Book a free consultation" is clearer than "Submit".</li>
  <li>Repeat the button after each major section so it's always within reach on a phone.</li>
  <li>Say what happens next: "We reply on WhatsApp within working hours."</li>
</ul>

<h2>2. Make contacting you effortless</h2>
<ul>
  <li><strong>Pre-filled WhatsApp messages</strong> — a different message per page ("Hi, I'm asking about GST filing") tells you which page the lead came from.</li>
  <li><strong>Short forms</strong> — name, phone or email, and one open question. Add fields only when they change your reply.</li>
  <li><strong>An acknowledgement</strong> — a thank-you message that says when they'll hear back.</li>
  <li><strong>Spam protection that doesn't punish people</strong> — a hidden "honeypot" field stops many bots without a puzzle for humans.</li>
</ul>

<h2>3. Keep every lead in one place</h2>
<p>A spreadsheet is enough to start. Use one row per enquiry with these columns:</p>
<table>
  <thead><tr><th>Column</th><th>Why it matters</th></tr></thead>
  <tbody>
    <tr><td>Date &amp; time</td><td>Shows how fast you replied</td></tr>
    <tr><td>Name &amp; contact</td><td>So anyone on the team can follow up</td></tr>
    <tr><td>Source</td><td>Website page, Google profile, Instagram, referral…</td></tr>
    <tr><td>Need</td><td>What they asked for, in their words</td></tr>
    <tr><td>Status</td><td>New → replied → quoted → won / lost</td></tr>
    <tr><td>Quote value</td><td>Shows pipeline, not just lead count</td></tr>
    <tr><td>Next action &amp; date</td><td>The single most important column</td></tr>
    <tr><td>Lost reason</td><td>Price, timing, went elsewhere, no reply — patterns appear quickly</td></tr>
  </tbody>
</table>

<h2>4. Reply fast, and usefully</h2>
<p>People who enquire often contact several businesses at once. A quick, specific first reply — answering their actual question and proposing a next step — tends to win over a slow, generic one. If you can't give a full answer immediately, acknowledge the message and say when you will.</p>

<h2>5. Follow up (politely) more than once</h2>
<p>Many enquiries go quiet because people get busy, not because they said no. A simple pattern:</p>
<ul>
  <li>Day 0: useful reply with a clear next step</li>
  <li>Day 2: short check-in, answer any likely question</li>
  <li>Day 7: final note offering to help later — then stop</li>
</ul>
<p>Only contact people who contacted you, keep it personal, and respect a "no".</p>

<h2>6. Know which channels bring customers</h2>
<p>Ask every new customer "How did you find us?" and record it. On links you share (Instagram bio, WhatsApp status, email signature), add simple campaign tags — for example <code>?utm_source=instagram</code> — so your analytics can separate them. Judge channels by <strong>customers and revenue</strong>, not by visits or likes.</p>

<h2>7. Fix the common leaks</h2>
<ul>
  <li>Forms that silently fail — test monthly from a phone.</li>
  <li>WhatsApp numbers that nobody checks, or a business account with notifications off.</li>
  <li>No reply outside office hours — an auto-acknowledgement with your hours helps.</li>
  <li>Quotes sent without a follow-up date.</li>
  <li>Reviews never requested. After a job is genuinely done well, ask for an honest Google review; never offer incentives or write them yourself.</li>
</ul>

<h2>What to measure each week</h2>
<ul class="checks">
  <li>Enquiries received, by source</li>
  <li>Median time to first reply</li>
  <li>Quotes sent and their value</li>
  <li>Customers won and revenue collected</li>
  <li>Top lost reasons</li>
</ul>
<p>Five numbers, ten minutes a week. They tell you whether to spend effort on more traffic, better pages or faster follow-up.</p>`,
  },
  {
    file: "article-full-stack-development-guide.html",
    kicker: "Custom builds",
    title: "Full-Stack Web Apps for Small Businesses: When You Need One | Xender Secrets",
    description: "When a small business needs a full-stack web app (booking, quotes, portals), what the parts are, when an existing tool is the better choice, what drives cost, and the security basics.",
    h1: "Full-stack web apps for small businesses: when you need one, and what it involves",
    deck: "A brochure website shows information. A full-stack app stores and changes information — bookings, quotes, orders, records. Here is how to tell which you need.",
    published: "2026-10-04", modified: "2026-10-07",
    related: [["/website-catalog#fullstack", "Full-stack concept demos"], ["/services", "Custom work from ₹4,999 + GST"], ["/article-website-project-planning", "How to brief a project"]],
    body: `
<h2>Website or web app?</h2>
<p>If your site only needs to explain what you do and let people contact you, you need a website — pages, a form, a WhatsApp button. You need a <strong>web application</strong> when the site has to <em>remember</em> things and act on them: available time slots, a customer's previous orders, a quote that changes with options, staff who log in to update records.</p>
<p>Typical small-business examples:</p>
<ul>
  <li>Appointment or site-visit booking that blocks taken slots</li>
  <li>Instant quotes from a few inputs (area, rooms, service level)</li>
  <li>A simple CRM to track enquiries across a small team</li>
  <li>A client portal to share documents or project status</li>
  <li>Order or reservation management for a restaurant or shop</li>
</ul>

<h2>Check for an existing tool first</h2>
<p>Many of these needs are already solved by booking, invoicing or CRM software. If an existing tool fits your process, it is usually cheaper and faster to adopt it and link it from your website. A custom build makes sense when your process is genuinely specific, when you need several tools to work together, or when per-user subscription costs outgrow a one-time build.</p>

<h2>The parts of a full-stack app</h2>
<table>
  <thead><tr><th>Layer</th><th>What it does</th><th>Small-business example</th></tr></thead>
  <tbody>
    <tr><td>Frontend</td><td>The screens people use, in the browser</td><td>Pick a date, enter details, see confirmation</td></tr>
    <tr><td>Backend / API</td><td>Rules that must not be bypassed</td><td>"Don't allow two bookings in one slot"</td></tr>
    <tr><td>Database</td><td>Where records are stored</td><td>Customers, appointments, staff</td></tr>
    <tr><td>Authentication</td><td>Who is allowed to do what</td><td>Customers book; staff can reschedule; owner sees reports</td></tr>
    <tr><td>Hosting &amp; deployment</td><td>Where it runs and how updates ship</td><td>Serverless hosting, automatic backups, a test copy</td></tr>
    <tr><td>Notifications</td><td>Telling people something happened</td><td>Email or WhatsApp confirmation, staff alert</td></tr>
  </tbody>
</table>

<h2>Worked example: appointment booking</h2>
<ol>
  <li><strong>Map the flow first:</strong> choose service → choose date and slot → enter name and phone → confirm → both sides notified → staff can reschedule or cancel.</li>
  <li><strong>Define the records:</strong> Service (name, duration), Slot (date, time, capacity), Booking (customer, slot, status), Staff (name, role).</li>
  <li><strong>Write the rules:</strong> a slot can't be over-booked; cancellations free the slot; bookings close a set time before the slot.</li>
  <li><strong>Decide permissions:</strong> what customers, staff and the owner can each see and change.</li>
  <li><strong>Plan the failure cases:</strong> slot taken while the customer was typing, duplicate submissions, network errors — each needs a clear message, not a blank screen.</li>
</ol>
<p>Written down, this fits on one page and makes quotes comparable. You can try a working concept of this flow in our <a href="/sample-preview?type=fullstack&amp;id=FS-01">booking demo</a> (a demo we built, not a client project).</p>

<h2>What drives cost</h2>
<ul>
  <li>Number of user roles and permission rules</li>
  <li>Number of screens and the states each can be in</li>
  <li>Integrations: payments, calendars, WhatsApp/email, accounting</li>
  <li>Importing existing data from spreadsheets or old systems</li>
  <li>Reporting and exports</li>
</ul>
<p>The cheapest reliable build is usually the smallest version that solves the main problem, launched, then extended once people use it.</p>

<h2>Security and reliability basics to insist on</h2>
<ul>
  <li>Validation on the server, not only in the browser</li>
  <li>Each role can access only what it needs</li>
  <li>Passwords never stored in plain text; sessions that expire</li>
  <li>Regular backups, and a test that restoring them works</li>
  <li>Error logs someone actually looks at</li>
  <li>Collect only the personal data you need, and say how you use it</li>
</ul>

<h2>After launch</h2>
<p>An app is never "finished" in the way a brochure site is. Budget a little time for fixes, small improvements and keeping dependencies up to date, and make sure you own the code, the hosting account and the data. Ask how you would export your data if you ever switched provider.</p>

<p>We scope custom builds after a short conversation and suggest the simplest version that works — often a configured existing tool rather than new code. <a href="#start">Tell us what you need</a>.</p>`,
  },
];
