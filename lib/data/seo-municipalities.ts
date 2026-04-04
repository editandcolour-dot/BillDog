export interface MunicipalitySeoData {
  slug: string;
  name: string;
  ombudsman: string;
  avgResponseDays: number;
  commonErrors: string[];
  heroHeadline: string;
  heroSubheadline: string;
  faq: { question: string; answer: string }[];
  newsCase: { title: string; source: string; url: string; date: string }[];
}

export const municipalitiesSeoData: Record<string, MunicipalitySeoData> = {
  "cape-town": {
    slug: "cape-town",
    name: "City of Cape Town",
    ombudsman: "ombudsman@capetown.gov.za",
    avgResponseDays: 30,
    commonErrors: ["Estimated readings spanning several months", "Water meter faults causing massive usage spikes", "Property valuation errors inflating rates"],
    heroHeadline: "City of Cape Town Overcharging You? We'll Fight It.",
    heroSubheadline: "AI-powered dispute letters citing Section 102 of the Municipal Systems Act. 20% only if we win.",
    faq: [
      { question: "How do I dispute a City of Cape Town bill?", answer: "To dispute a municipal bill in South Africa, you must submit a formal written dispute to the Municipal Manager citing Section 102 of the Municipal Systems Act (No. 32 of 2000). The City of Cape Town has 30 days to respond and cannot disconnect your services while the dispute is active." },
      { question: "How long does City of Cape Town take to respond?", answer: "On average, the City of Cape Town takes 30 days to officially respond to a formally lodged Section 102 dispute letter. Follow-ups are critical during this period." },
      { question: "Can the City of Cape Town disconnect my water or electricity while I'm disputing?", answer: "No. Under Section 102 of the Municipal Systems Act, if a formal dispute is lodged over a specific amount, the municipality may not disconnect your services or implement debt collection measures on that specific disputed amount until the matter is resolved." }
    ],
    newsCase: [
      { title: "Cape Town residents shocked by massive water bills", source: "IOL", url: "#", date: "Recent" },
      { title: "City of Cape Town admits to billing system glitches", source: "Daily Maverick", url: "#", date: "Recent" }
    ]
  },
  "johannesburg": {
    slug: "johannesburg",
    name: "City of Johannesburg",
    ombudsman: "ombud@joburg.org.za",
    avgResponseDays: 45,
    commonErrors: ["Consecutive estimated readings instead of actuals", "Account linking errors misallocating funds", "Duplicate charges appearing on statements"],
    heroHeadline: "City of Johannesburg Overcharging You? We'll Fight It.",
    heroSubheadline: "AI-powered dispute letters citing Section 102 of the Municipal Systems Act. 20% only if we win.",
    faq: [
      { question: "How do I dispute a City of Johannesburg bill?", answer: "To dispute a municipal bill in South Africa, you must submit a formal written dispute to the Municipal Manager citing Section 102 of the Municipal Systems Act (No. 32 of 2000). The City of Johannesburg generally requires 45 days to resolve issues." },
      { question: "How long does Joburg take to respond?", answer: "The City of Johannesburg has an average response time of 45 days for formal disputes. We automatically track this timeline and escalate if ignored." },
      { question: "Can Joburg disconnect me while I'm disputing?", answer: "No. The law protects CoJ residents from disconnection on the specific disputed amount while a Section 102 dispute is active. However, you must continue paying your undisputed current charges." }
    ],
    newsCase: [
      { title: "Joburg billing crisis continues for residents", source: "The Citizen", url: "#", date: "Recent" },
      { title: "Incorrect tariffs applied to thousands in Johannesburg", source: "TimesLive", url: "#", date: "Recent" }
    ]
  },
  "tshwane": {
    slug: "tshwane",
    name: "City of Tshwane",
    ombudsman: "ombudsman@tshwane.gov.za",
    avgResponseDays: 30,
    commonErrors: ["Incorrect property rates valuation applied", "Unexplained electricity estimated readings", "Refuse removal charged irregularly"],
    heroHeadline: "City of Tshwane Overcharging You? We'll Fight It.",
    heroSubheadline: "AI-powered dispute letters citing Section 102 of the Municipal Systems Act. 20% only if we win.",
    faq: [
      { question: "How do I dispute a City of Tshwane bill?", answer: "To dispute a municipal bill in South Africa, you must submit a formal written dispute to the Municipal Manager citing Section 102 of the Municipal Systems Act (No. 32 of 2000). Tshwane must investigate the matter formally." },
      { question: "How long does Tshwane take to respond?", answer: "Tshwane typically takes around 30 days to respond to properly structured legal disputes. Incorrectly formatted disputes are often ignored." },
      { question: "Can Tshwane disconnect me while I'm disputing?", answer: "Section 102 protects you from credit control actions (like disconnections) strictly on the amount you have formally disputed. You are still legally obligated to pay the undisputed portions of your account." }
    ],
    newsCase: [
      { title: "Tshwane residents face steep municipal hikes and errors", source: "Pretoria News", url: "#", date: "Recent" }
    ]
  },
  "ethekwini": {
    slug: "ethekwini",
    name: "eThekwini Municipality",
    ombudsman: "ombudsman@durban.gov.za",
    avgResponseDays: 60,
    commonErrors: ["Massive water consumption spikes", "Sewerage charges calculated incorrectly", "Refuse removal billing errors"],
    heroHeadline: "eThekwini Municipality Overcharging You? We'll Fight It.",
    heroSubheadline: "AI-powered dispute letters citing Section 102 of the Municipal Systems Act. 20% only if we win.",
    faq: [
      { question: "How do I dispute an eThekwini municipal bill?", answer: "To dispute a municipal bill in South Africa, you must submit a formal written dispute to the Municipal Manager citing Section 102 of the Municipal Systems Act (No. 32 of 2000). eThekwini is legally bound to review this." },
      { question: "How long does eThekwini take to respond to disputes?", answer: "Due to high backlogs, eThekwini has an average response time of 60 days. Persistent follow-up and escalation to the ombudsman is frequently required." },
      { question: "Can eThekwini disconnect my water?", answer: "It is illegal for eThekwini to disconnect services for an amount actively under a formal Section 102 dispute. Do not stop paying your normal monthly usage, only withhold the disputed error." }
    ],
    newsCase: [
      { title: "Durban ratepayers declare war on municipality over billing", source: "Daily News", url: "#", date: "Recent" }
    ]
  },
  "ekurhuleni": {
    slug: "ekurhuleni",
    name: "Ekurhuleni Municipality",
    ombudsman: "ombudsman@ekurhuleni.gov.za",
    avgResponseDays: 45,
    commonErrors: ["Electricity billing based on consecutive estimates", "Property rates valuation incorrectly categorised", "Unread meters leading to catch-up shocks"],
    heroHeadline: "Ekurhuleni Municipality Overcharging You? We'll Fight It.",
    heroSubheadline: "AI-powered dispute letters citing Section 102 of the Municipal Systems Act. 20% only if we win.",
    faq: [
      { question: "How do I dispute an Ekurhuleni municipal bill?", answer: "To dispute a municipal bill in South Africa, you must submit a formal written dispute to the Municipal Manager citing Section 102 of the Municipal Systems Act (No. 32 of 2000). Ekurhuleni will assign a reference number." },
      { question: "How long does Ekurhuleni take to process disputes?", answer: "Ekurhuleni typically takes around 45 days to finalise internal investigations regarding billing errors." },
      { question: "Can Ekurhuleni disconnect me while I'm disputing?", answer: "Under national law, municipalities cannot disconnect services for non-payment of a formally disputed amount. Always pay your undisputed regular charges to maintain this protection." }
    ],
    newsCase: [
      { title: "Ekurhuleni billing crisis leaves residents in the dark", source: "Boksburg Advertiser", url: "#", date: "Recent" }
    ]
  },
  "nelson-mandela-bay": {
    slug: "nelson-mandela-bay",
    name: "Nelson Mandela Bay Municipality",
    ombudsman: "ombudsman@nmbm.gov.za",
    avgResponseDays: 60,
    commonErrors: ["Faulty water meters registering ghost usage", "Sundry charges applied without explanation", "Duplicate billing periods overlaid"],
    heroHeadline: "Nelson Mandela Bay Overcharging You? We'll Fight It.",
    heroSubheadline: "AI-powered dispute letters citing Section 102 of the Municipal Systems Act. 20% only if we win.",
    faq: [
      { question: "How do I dispute a NMBM bill?", answer: "To dispute a municipal bill in South Africa, you must submit a formal written dispute to the Municipal Manager citing Section 102 of the Municipal Systems Act (No. 32 of 2000)." },
      { question: "How long does Nelson Mandela Bay take to respond?", answer: "Nelson Mandela Bay typically takes around 60 days to process complex billing disputes, though delays are common. We act on your behalf to force an answer." },
      { question: "Can NMBM disconnect services during a dispute?", answer: "No. The Section 102 protection ensures you cannot be disconnected or handed over to debt collectors for the specific amount under review." }
    ],
    newsCase: [
      { title: "Gqeberha residents battle mysterious water bills", source: "HeraldLIVE", url: "#", date: "Recent" }
    ]
  },
  "buffalo-city": {
    slug: "buffalo-city",
    name: "Buffalo City Municipality",
    ombudsman: "ombudsman@buffalocity.gov.za",
    avgResponseDays: 60,
    commonErrors: ["Wild estimates due to lack of meter reading staff", "Rates calculation errors on property zoning", "Sewage calculations disproportionate to water use"],
    heroHeadline: "Buffalo City Municipality Overcharging You? We'll Fight It.",
    heroSubheadline: "AI-powered dispute letters citing Section 102 of the Municipal Systems Act. 20% only if we win.",
    faq: [
      { question: "How do I dispute a Buffalo City bill?", answer: "To dispute a municipal bill in South Africa, you must submit a formal written dispute to the Municipal Manager citing Section 102 of the Municipal Systems Act (No. 32 of 2000)." },
      { question: "How long does Buffalo City take to respond?", answer: "Responses frequently take up to 60 days. BCM relies heavily on formal escalations before acting on frozen accounts." },
      { question: "Will Buffalo City disconnect me if I dispute?", answer: "Not legally on the disputed amount. Section 102 is a national law that protects your services while the dispute is pending." }
    ],
    newsCase: [
      { title: "BCM billing chaos as rates skyrocket", source: "Daily Dispatch", url: "#", date: "Recent" }
    ]
  },
  "mangaung": {
    slug: "mangaung",
    name: "Mangaung Municipality",
    ombudsman: "ombudsman@mangaung.co.za",
    avgResponseDays: 60,
    commonErrors: ["Estimated water readings applied retrospectively", "Electricity billing glitches on prepaid handovers", "Missing payments not allocated to account"],
    heroHeadline: "Mangaung Municipality Overcharging You? We'll Fight It.",
    heroSubheadline: "AI-powered dispute letters citing Section 102 of the Municipal Systems Act. 20% only if we win.",
    faq: [
      { question: "How do I dispute a Mangaung municipal bill?", answer: "To dispute a municipal bill in South Africa, you must submit a formal written dispute to the Municipal Manager citing Section 102 of the Municipal Systems Act (No. 32 of 2000)." },
      { question: "How long does Mangaung take to resolve a dispute?", answer: "Due to administrative backlogs, Mangaung disputes average around 60 days before a resolution is met. Having a legally tight letter forces them to act." },
      { question: "Can Mangaung cut my electricity while disputing?", answer: "You cannot be disconnected for non-payment of the disputed fraction of your bill. You are, however, required to pay your undisputed average usage." }
    ],
    newsCase: [
      { title: "Bloemfontein residents furious over inaccurate utility bills", source: "News24", url: "#", date: "Recent" }
    ]
  }
};
