(()=> {
const styles=[
["Minimal","Clean, focused and fast","minimal"],["Premium","Polished trust-first presentation","premium"],["Luxury","High-end visual storytelling","luxury"],["Modern","Contemporary conversion layout","modern"],["Corporate","Structured professional presence","corporate"],
["Bold","High-contrast attention design","bold"],["Local","Local-service lead generation","local"],["Lead Gen","Form-first acquisition layout","lead"],["Conversion","CTA-heavy performance layout","conversion"],["Dark","Dark premium interface","dark"],
["Light","Bright editorial interface","light"],["Editorial","Story and authority led","editorial"],["Visual","Image-led showcase","visual"],["Professional","Credibility and proof focused","professional"],["Startup","Fast-moving modern brand","startup"],
["One Page","Compact single-page funnel","onepage"],["Multi Page","Complete business website","multipage"],["Booking","Appointment/reservation focused","booking"],["WhatsApp","Conversation-first lead flow","whatsapp"],["Flagship","High-end complete experience","flagship"]
];
const businessTypes=[
["real-estate","REAL","Real Estate","Property","🏙️",["Luxury Property Showcase","Local Broker Hub","Commercial Realty","Rental Discovery","Property Listings","New Project Launch","Investor Portal","Open House Funnel","Builder Portfolio","Neighborhood Guide"]],
["restaurants","REST","Restaurants","Hospitality","🍽️",["Chef's Table","Menu & Reservations","Fine Dining","Family Restaurant","Cloud Kitchen","Multi-location Dining","Seasonal Menu","Private Events","Delivery Funnel","Signature Cuisine"]],
["cafes","CAFE","Cafes","Hospitality","☕",["Coffee House","Artisan Roastery","Neighborhood Cafe","Brunch Bar","Bakery Cafe","Study Cafe","Coffee Subscription","Seasonal Specials","Community Cafe","Specialty Brew"]],
["hotels","HOTL","Hotels","Hospitality","🏨",["Boutique Stay","Luxury Rooms","Business Hotel","Resort Escape","City Stay","Heritage Hotel","Extended Stay","Family Resort","Wellness Retreat","Room Booking"]],
["travel-agencies","TRVL","Travel Agencies","Travel","✈️",["Holiday Packages","Luxury Tours","Adventure Trips","Visa Assistance","Corporate Travel","Honeymoon Planner","Group Tours","Weekend Escapes","International Tours","Custom Itineraries"]],
["clinics","CLIN","Doctors & Clinics","Healthcare","🩺",["Specialist Clinic","Family Practice","Multi Doctor","Teleconsultation","Preventive Care","Women's Health","Child Care","Diagnostics","Appointment Hub","Health Programs"]],
["dentists","DENT","Dentists","Healthcare","🦷",["Smile Studio","Dental Clinic","Cosmetic Dentistry","Family Dental","Implant Centre","Orthodontics","Emergency Dental","Kids Dental","Dental Booking","Premium Smile"]],
["hospitals","HOSP","Hospitals","Healthcare","🏥",["Multi Specialty","Emergency Care","Patient Services","Specialist Network","Health Packages","Diagnostics","International Patients","Hospital Departments","Doctor Directory","Care Centre"]],
["gyms","GYM","Gyms & Fitness","Fitness","🏋️",["Strength Club","Personal Training","Transformation Gym","Cross Training","Women's Fitness","Yoga & Mobility","Premium Fitness","Membership Sales","Class Booking","Fitness Community"]],
["salons","SALN","Salons & Spas","Beauty","💇",["Beauty Studio","Luxury Salon","Spa Retreat","Hair Studio","Nail Bar","Bridal Beauty","Men's Grooming","Wellness Spa","Appointment Salon","Beauty Membership"]],
["lawyers","LAW","Lawyers & Law Firms","Professional","⚖️",["Corporate Law","Litigation Firm","Family Law","Property Law","Criminal Defence","Startup Counsel","Tax Law","Legal Consultation","Multi Practice Firm","Premium Counsel"]],
["accountants","CA","Accountants & CA Firms","Professional","📊",["CA Practice","Tax Advisory","Audit Firm","GST Services","CFO Services","Startup Finance","Compliance Hub","Business Accounting","Consultation Funnel","Advisory Firm"]],
["recruitment","RECR","Recruitment Agencies","Professional","🧑‍💼",["Talent Agency","Executive Search","Tech Hiring","Volume Hiring","Staffing Firm","Employer Portal","Candidate Hub","Global Recruitment","HR Consulting","Hiring Funnel"]],
["consultants","CONS","Consultants","Professional","🧠",["Strategy Consultant","Business Advisory","Growth Consulting","Operations Expert","HR Consultant","Finance Consultant","Transformation Advisory","Independent Expert","Consultation Funnel","Thought Leader"]],
["marketing","MKTG","Digital Marketing Agencies","Agency","📣",["Growth Agency","Performance Marketing","SEO Agency","Social Studio","Creative Agency","B2B Marketing","Lead Gen Agency","Content Studio","Full Service Agency","Campaign Lab"]],
["construction","CNST","Construction Companies","Built Environment","🏗️",["General Contractor","Commercial Builds","Residential Builder","Infrastructure","Turnkey Projects","Industrial Construction","Project Portfolio","Tender Ready","Construction Leads","Flagship Builder"]],
["interiors","INTR","Interior Designers","Built Environment","🛋️",["Luxury Interiors","Home Design","Office Interiors","Turnkey Studio","Hospitality Interiors","Minimal Studio","Portfolio Showcase","Consultation Funnel","Design Process","Flagship Studio"]],
["architects","ARCH","Architects","Built Environment","📐",["Architecture Studio","Residential Design","Commercial Architecture","Sustainable Design","Urban Practice","Interior Architecture","Project Journal","Award Portfolio","Consultation Studio","Flagship Practice"]],
["coaching","COCH","Coaching Institutes","Education","🎓",["Exam Prep","Professional Courses","Entrance Coaching","Skill Academy","Online Coaching","Hybrid Classes","Results Focused","Batch Enrollment","Faculty Showcase","Learning Centre"]],
["schools","SCHL","Schools","Education","🏫",["Modern School","International School","Primary School","Senior School","Admissions Hub","Parent Information","Campus Showcase","Academic Programs","School Community","Flagship Campus"]],
["tutors","TUTR","Tutors","Education","📚",["Private Tutor","Online Tutor","Math Tutor","Language Tutor","Science Tutor","Exam Tutor","Small Group Classes","Parent Leads","Book a Lesson","Tutor Brand"]],
["ecommerce","ECOM","Ecommerce Brands","Commerce","🛍️",["Product Launch","Premium Store","Lifestyle Shop","Single Product","Catalog Store","DTC Brand","Subscription Store","Sale Funnel","Mobile Commerce","Flagship Store"]],
["retail","RETL","Local Retail Stores","Commerce","🏪",["Neighborhood Store","Specialty Retail","Store Locator","Product Showcase","WhatsApp Orders","Local Deals","Multi Branch","New Arrivals","Retail Catalog","Flagship Retail"]],
["car-dealers","AUTO","Car Dealers","Automotive","🚗",["New Cars","Used Cars","Luxury Auto","EV Dealer","Vehicle Inventory","Test Drive Funnel","Car Finance","Multi Brand Dealer","Trade In","Auto Flagship"]],
["repair","REPR","Repair Services","Local Services","🔧",["Appliance Repair","Mobile Repair","Computer Repair","AC Service","Vehicle Repair","Emergency Repair","Service Booking","Local Technician","Repair Pricing","Trusted Service"]],
["home-services","HOME","Home Services","Local Services","🏠",["Home Maintenance","Cleaning Service","Plumbing","Electrical","Pest Control","Painting","Moving Service","Handyman","Instant Quote","Service Marketplace"]],
["photography","PHOTO","Photography","Creative","📷",["Wedding Photography","Portrait Studio","Commercial Photo","Fashion Portfolio","Event Photography","Family Studio","Product Photography","Photo Journal","Booking Portfolio","Signature Studio"]],
["events","EVNT","Wedding & Event Planners","Creative","🎉",["Wedding Planner","Luxury Events","Corporate Events","Destination Wedding","Party Planner","Venue Styling","Event Portfolio","Vendor Network","Consultation Funnel","Signature Events"]],
["logistics","LOGI","Logistics","B2B","🚚",["Freight Company","Last Mile","Warehousing","Transport Fleet","Cold Chain","International Logistics","Shipment Quote","B2B Logistics","Supply Chain","Logistics Platform"]],
["saas","SAAS","SaaS & Startups","Technology","🚀",["SaaS Launch","AI Startup","B2B Software","Developer Tool","Fintech SaaS","Product-led Growth","Waitlist Launch","Enterprise SaaS","App Landing","Startup Flagship"]],
["small-business","SMB","Small Businesses","Local Business","🏪",["Local Business Starter","Professional Presence","Service Showcase","Lead Generation","Neighborhood Brand","Owner-led Business","Multi Service","Trust Builder","WhatsApp Enquiries","Small Business Flagship"]],
["personal","PERS","Freelancers & Personal Brands","Creator","✨",["Consultant Brand","Creator Portfolio","Freelancer Services","Speaker Profile","Coach Brand","Writer Portfolio","Designer Portfolio","Developer Portfolio","Newsletter Brand","Personal Flagship"]]
].map(x=>({id:x[0],code:x[1],name:x[2],group:x[3],emoji:x[4],focuses:x[5]}));

const commonFeatures=["Responsive design","SEO-ready structure","Contact/enquiry flow","WhatsApp CTA","Trust sections","Analytics-ready"];
const variants=styles.map((s,i)=>({
 number:i+1,name:s[0],description:s[1],style:s[2],
 layout:["split","center","cards","editorial","sidebar","banner","local","form","proof","dark","airy","story","gallery","authority","startup","single","multi","booking","chat","flagship"][i],
 extras:[
 ["Fast loading","Focused CTA"],["Premium typography","Testimonials"],["Large visuals","High-end positioning"],["Interactive sections","Modern cards"],["Service architecture","Case studies"],
 ["Bold hero","Strong CTAs"],["Maps-ready","Local proof"],["Lead form","Qualification fields"],["Sticky CTA","Social proof"],["Dark UI","Metric blocks"],
 ["Light UI","Whitespace"],["Long-form story","Editorial blocks"],["Gallery","Portfolio grid"],["Credentials","Proof sections"],["Product blocks","Waitlist CTA"],
 ["Single-scroll journey","Compact navigation"],["Multi-page nav","Detailed services"],["Booking form","Availability CTA"],["WhatsApp-first","Quick enquiry"],["Full feature set","Premium presentation"]
 ][i]
}));

function pagesFor(b,v){
 if(v.number===16)return["Home"];
 const base=["Home","About","Services","Contact"];
 if(["ecommerce","car-dealers","real-estate","retail"].includes(b.id))base.splice(2,0,"Catalog");
 if(["restaurants","cafes"].includes(b.id))base.splice(2,0,"Menu");
 if(["hotels","travel-agencies"].includes(b.id))base.splice(2,0,"Experiences");
 if(["clinics","dentists","hospitals"].includes(b.id))base.splice(2,0,"Doctors");
 if(v.number===18)base.push("Booking");
 if(v.number===17||v.number===20)base.push("FAQ","Reviews");
 return [...new Set(base)];
}
function featuresFor(b,v){
 const industry={
 "Healthcare":["Appointment requests","Doctor/service profiles"],"Hospitality":["Reservations","Menu/room showcase"],"Property":["Property cards","Lead capture"],"Education":["Course/program cards","Admissions/enrolment"],"Commerce":["Product catalog","Order enquiry"],"Automotive":["Inventory cards","Test drive CTA"],"Creative":["Portfolio gallery","Project enquiry"],"Technology":["Product features","Demo CTA"],"Local Services":["Service areas","Quick quote"],"Professional":["Credentials","Consultation CTA"]
 };
 return [...new Set([...commonFeatures,...(industry[b.group]||["Service showcase","Lead capture"]),...v.extras])].slice(0,8);
}
const templates=businessTypes.flatMap(b=>variants.map(v=>{
 const rawFocus=b.focuses[(v.number-1)%b.focuses.length];
 const focus=v.number===20?(rawFocus.replace(/flagship/ig,"").trim()||b.name):rawFocus;
 return {
  id:b.code+"-"+String(v.number).padStart(2,"0"),
  slug:b.id+"-"+v.style,
  name:(v.number===20?"Flagship ":v.name+" ")+focus,
  businessType:b.id,businessName:b.name,group:b.group,emoji:b.emoji,
  style:v.name,styleKey:v.style,layout:v.layout,variant:v.number,
  description:v.description+" tailored for "+b.name.toLowerCase()+".",
  pages:pagesFor(b,v),features:featuresFor(b,v),
  tags:[b.group,b.name,v.name,focus],
  recommendedFor:focus,
  primaryCTA:v.number===18?"Book Now":v.number===19?"Chat on WhatsApp":"Get a Quote"
 };
}));

const frontend=[
["FE-01","SaaS Landing Page","saas","Pricing toggle, FAQ accordion, CTA flows"],
["FE-02","Ecommerce Storefront","store","Search, category filters, cart drawer"],
["FE-03","Analytics Dashboard","analytics","KPI cards, chart controls, date filters"],
["FE-04","CRM Dashboard","crm","Pipeline filters, lead search, detail modal"],
["FE-05","AI Product Landing","ai","Prompt demo, feature tabs, waitlist"],
["FE-06","Fintech Dashboard","fintech","Balances, transactions, filters"],
["FE-07","Travel Booking UI","travel","Destination search, date cards, filters"],
["FE-08","Real Estate Listings","property","Property search, filters, saved cards"],
["FE-09","Food Delivery UI","food","Cuisine filters, basket, order panel"],
["FE-10","Creative Portfolio","portfolio","Project filters, lightbox, contact CTA"],
["FE-11","Social Dashboard","social","Feed tabs, composer, engagement cards"],
["FE-12","Project Manager","project","Kanban interactions, task modal"],
["FE-13","Education Dashboard","education","Course filters, progress, lesson drawer"],
["FE-14","Healthcare Portal","health","Doctor filters, appointment modal"],
["FE-15","Event Landing Page","event","Agenda tabs, ticket selector, FAQ"],
["FE-16","Service Marketplace","marketplace","Search, provider cards, compare"],
["FE-17","Pricing & Subscription UI","pricing","Monthly/yearly toggle, plan compare"],
["FE-18","Admin Dashboard","admin","Table search, status filters, actions"],
["FE-19","News & Media Platform","media","Topic filters, reading list, search"],
["FE-20","Mobile App Landing","mobile","Feature carousel, download CTAs, FAQ"]
].map(x=>({id:x[0],title:x[1],key:x[2],summary:x[3],kind:"frontend"}));

const backend=[
["BE-01","REST API Console","rest-api","GET","/api/demo/rest-api","Resource routing and JSON responses"],
["BE-02","Authentication API","authentication","GET","/api/auth/status","Session/auth availability"],
["BE-03","Lead CRM API","lead-crm","GET","/api/demo/lead-crm","Lead records and pipeline state"],
["BE-04","Contact Form Backend","contact-form","GET","/api/demo/contact-form","Validated enquiries"],
["BE-05","Booking Engine","booking-engine","GET","/api/slots","Live slot availability"],
["BE-06","Product Catalog API","product-catalog","GET","/api/products","Server-backed products"],
["BE-07","Search API","search-api","GET","/api/demo/search-api","Searchable indexed records"],
["BE-08","User Management","user-management","GET","/api/demo/user-management","User lifecycle records"],
["BE-09","Role Access API","role-access","GET","/api/demo/role-access","Role and permission model"],
["BE-10","File Metadata API","file-metadata","GET","/api/demo/file-metadata","File metadata records"],
["BE-11","Notification API","notifications","GET","/api/demo/notifications","Notification queue"],
["BE-12","Webhook Receiver","webhooks","GET","/api/demo/webhooks","Webhook event log"],
["BE-13","Quote Calculator","quote-api","GET","/api/demo/quote-api","Quote inputs and calculations"],
["BE-14","Order Management","orders-api","GET","/api/demo/orders-api","Order state workflow"],
["BE-15","Inventory API","inventory-api","GET","/api/demo/inventory-api","Stock and SKU records"],
["BE-16","Task Manager API","tasks-api","GET","/api/tasks","Persistent task records"],
["BE-17","Analytics Events","analytics-events","GET","/api/demo/analytics-events","Event collection"],
["BE-18","Review & Rating API","reviews-api","GET","/api/demo/reviews-api","Ratings and moderation"],
["BE-19","Subscriber API","subscriber-api","GET","/api/demo/subscriber-api","Newsletter subscribers"],
["BE-20","Support Ticket API","support-api","GET","/api/demo/support-api","Ticket workflow"]
].map(x=>({id:x[0],title:x[1],key:x[2],method:x[3],endpoint:x[4],summary:x[5],kind:"backend"}));

const fullstack=[
["FS-01","Appointment Booking","appointment","Appointment","name"],
["FS-02","Mini CRM","mini-crm","Lead","name"],
["FS-03","Project Management SaaS","project-saas","Task","title"],
["FS-04","Ecommerce App","commerce","Order","name"],
["FS-05","Lead Management Dashboard","lead-dashboard","Lead","name"],
["FS-06","Restaurant Reservations","restaurant-reservations","Reservation","name"],
["FS-07","Property Enquiry Platform","property-enquiries","Enquiry","name"],
["FS-08","Recruitment Portal","recruitment-portal","Candidate","name"],
["FS-09","Customer Support Portal","support-portal","Ticket","title"],
["FS-10","Membership System","membership","Member","name"],
["FS-11","Course Dashboard","course-dashboard","Course","title"],
["FS-12","Inventory Manager","inventory-manager","Item","name"],
["FS-13","Sales Dashboard","sales-dashboard","Opportunity","name"],
["FS-14","Event Booking","event-booking","Booking","name"],
["FS-15","Quote & Invoice App","quote-invoice","Invoice","name"],
["FS-16","Client Portal","client-portal","Request","title"],
["FS-17","Review Management","review-manager","Review","title"],
["FS-18","Content Manager","content-manager","Content","title"],
["FS-19","Service Marketplace","service-marketplace","Provider","name"],
["FS-20","Subscription SaaS","subscription-saas","Subscription","name"]
].map(x=>({id:x[0],title:x[1],key:"fs-"+x[2],entity:x[3],field:x[4],kind:"fullstack",summary:"Interactive "+x[1].toLowerCase()+" with live Worker API and persistent demo records."}));

window.XENDER_CATALOG={businessTypes,variants,templates,frontend,backend,fullstack};
})();