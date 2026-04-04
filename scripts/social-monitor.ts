import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';

// NOTE: Run this script with `npx tsx scripts/social-monitor.ts`

const resend = new Resend(process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY);
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SEARCH_TERMS = [
  "City of Cape Town bill",
  "Joburg municipality water",
  "eThekwini electricity",
  "Tshwane rates"
];

const TARGET_EMAIL = "jason.ripplemedia@gmail.com";

interface Lead {
  platform: string;
  author: string;
  text: string;
  url: string;
}

/**
 * Very basic XML/RSS tag extractor for demonstration and lightweight parsing
 */
function extractXmlTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gs');
  const matches = [...xml.matchAll(regex)];
  return matches.map((m) => m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim());
}

async function fetchGoogleNewsRss(): Promise<Lead[]> {
  console.log('[Monitor] Fetching Google News RSS...');
  const leads: Lead[] = [];
  try {
    const response = await fetch('https://news.google.com/rss/search?q=municipality+billing+South+Africa');
    const xml = await response.text();
    const items = xml.split('<item>');
    // Skip the first block (channel header)
    for (let i = 1; i < Math.min(items.length, 5); i++) {
      const item = items[i];
      const title = extractXmlTags(item, 'title')[0] || '';
      const link = extractXmlTags(item, 'link')[0] || '';
      const description = extractXmlTags(item, 'description')[0] || '';
      
      leads.push({
        platform: 'Google News / Press',
        author: 'News Outlet',
        text: `${title}\n${description}`,
        url: link
      });
    }
  } catch (error) {
    console.error('[Monitor] Google News error:', error);
  }
  return leads;
}

async function fetchRedditRss(): Promise<Lead[]> {
  console.log('[Monitor] Fetching Reddit RSS...');
  const leads: Lead[] = [];
  try {
    // Reddit often blocks direct fetch without a distinct User-Agent
    const response = await fetch('https://www.reddit.com/r/southafrica/search.rss?q=municipality+bill', {
        headers: { 'User-Agent': 'BilldogSocialMonitor/1.0' }
    });
    const xml = await response.text();
    
    // Atom feed uses <entry>
    const entries = xml.split('<entry>');
    for (let i = 1; i < Math.min(entries.length, 5); i++) {
        const entry = entries[i];
        const title = extractXmlTags(entry, 'title')[0] || '';
        const author = extractXmlTags(entry, 'name')[0] || 'Unknown Redditor';
        const linkMatches = entry.match(/<link[^>]+href="([^"]+)"/);
        const link = linkMatches ? linkMatches[1] : '';
        
        leads.push({
            platform: 'Reddit',
            author,
            text: title,
            url: link
        });
    }
  } catch (error) {
    console.error('[Monitor] Reddit RSS error:', error);
  }
  return leads;
}

async function processLead(lead: Lead) {
  try {
    console.log(`[Monitor] Analysing lead from ${lead.platform}...`);
    
    // Use Claude to triage the complaint
    const triageResponse = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: `You are Billdog's social listening triage agent.
Read the user's complaint. If it is about incorrect municipal billing, overcharges, or estimated reading disputes in South Africa, reply strictly with roughly 2-3 sentences of an empathetic drafted response that Jason can copy-paste to reply to them online, ending by directing them to billdog.co.za.
If the complaint is about potholes, general service delivery, politics, or something unrelated to billing, reply strictly with the exact word "IGNORE".`,
      messages: [
        { role: 'user', content: `Author: ${lead.author}\nPlatform: ${lead.platform}\nText:\n${lead.text}` }
      ],
    });

    const aiText = triageResponse.content[0].type === 'text' ? triageResponse.content[0].text : 'IGNORE';

    if (aiText.includes('IGNORE')) {
      console.log(`[Monitor] Lead rejected by AI (Not billing related).`);
      return;
    }

    // AI drafted a response — email Jason!
    const emailBody = `
New municipal billing complaint found!

PLATFORM: ${lead.platform}
USER: ${lead.author}
LINK: ${lead.url}

ORIGINAL POST:
-------------------
${lead.text}
-------------------

SUGGESTED REPLY (Click to copy & post):
-------------------
${aiText}
-------------------
`;

    await resend.emails.send({
      from: 'Billdog Social <reports@billdog.co.za>',
      to: [TARGET_EMAIL],
      subject: `[Billdog Lead] New complaint found on ${lead.platform}`,
      text: emailBody,
    });

    console.log(`[Monitor] Lead approved. Email sent to Jason!`);

  } catch (error) {
    console.error(`[Monitor] Failed to process lead:`, error);
  }
}

async function run() {
  console.log('=== Starting Billdog Social Monitor ===');
  
  if (!process.env.ANTHROPIC_API_KEY || !process.env.RESEND_API_KEY) {
      console.warn("⚠️ ERROR: ANTHROPIC_API_KEY and RESEND_API_KEY must be set in environment.");
      console.warn("Run via: npx tsx --env-file=.env scripts/social-monitor.ts");
      process.exit(1);
  }

  const allLeads: Lead[] = [];
  
  // 1. Fetch free RSS sources
  const newsLeads = await fetchGoogleNewsRss();
  const redditLeads = await fetchRedditRss();
  
  allLeads.push(...newsLeads, ...redditLeads);

  // 2. Triage & Send Emails
  for (const lead of allLeads) {
      await processLead(lead);
      // sleep 1s to prevent rate limiting from Claude/Resend
      await new Promise(r => setTimeout(r, 1000));
  }

  console.log('=== Social Monitor Completed ===');
}

// Execute
run().catch(console.error);
