import { getResendClient } from '@/lib/resend/client';
import { getClaudeClient } from '@/lib/claude/client';

export interface Lead {
  platform: string;
  author: string;
  text: string;
  url: string;
}

const TARGET_EMAIL = process.env.ADMIN_EMAIL || "jason.ripplemedia@gmail.com";

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
    for (let i = 1; i < Math.min(items.length, 5); i++) {
      const item = items[i];
      const title = extractXmlTags(item, 'title')[0] || '';
      const link = extractXmlTags(item, 'link')[0] || '';
      const description = extractXmlTags(item, 'description')[0] || '';
      leads.push({ platform: 'Google News / Press', author: 'News Outlet', text: `${title}\n${description}`, url: link });
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
    const response = await fetch('https://www.reddit.com/r/southafrica/search.rss?q=municipality+bill', {
        headers: { 'User-Agent': 'BilldogSocialMonitor/1.0' }
    });
    const xml = await response.text();
    const entries = xml.split('<entry>');
    for (let i = 1; i < Math.min(entries.length, 5); i++) {
        const entry = entries[i];
        const title = extractXmlTags(entry, 'title')[0] || '';
        const author = extractXmlTags(entry, 'name')[0] || 'Unknown Redditor';
        const linkMatches = entry.match(/<link[^>]+href="([^"]+)"/);
        const link = linkMatches ? linkMatches[1] : '';
        leads.push({ platform: 'Reddit', author, text: title, url: link });
    }
  } catch (error) {
    console.error('[Monitor] Reddit RSS error:', error);
  }
  return leads;
}

async function processLead(lead: Lead) {
  try {
    console.log(`[Monitor] Analysing lead from ${lead.platform}...`);
    const claude = getClaudeClient();
    const triageResponse = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are Billdog's social listening triage agent.
Read the user's complaint. If it is about incorrect municipal billing, overcharges, or estimated reading disputes in South Africa, reply strictly with roughly 2-3 sentences of an empathetic drafted response that Jason can copy-paste to reply to them online, ending by directing them to billdog.co.za and stating: "No win, no fee — we only charge 20% of what we recover for you."
If the complaint is about potholes, general service delivery, politics, or something unrelated to billing, reply strictly with the exact word "IGNORE".`,
      messages: [{ role: 'user', content: `Author: ${lead.author}\nPlatform: ${lead.platform}\nText:\n${lead.text}` }]
    });

    const aiText = triageResponse.content[0].type === 'text' ? triageResponse.content[0].text : 'IGNORE';

    if (aiText.includes('IGNORE')) {
      console.log(`[Monitor] Lead rejected by AI.`);
      return;
    }

    const emailBody = `\nNew municipal billing complaint found!\n\nPLATFORM: ${lead.platform}\nUSER: ${lead.author}\nLINK: ${lead.url}\n\nORIGINAL POST:\n-------------------\n${lead.text}\n-------------------\n\nSUGGESTED REPLY (Click to copy & post):\n-------------------\n${aiText}\n-------------------\n`;

    if (process.env.DRY_RUN === 'true') {
        console.log(`[DRY RUN] Would send email:\n${emailBody}`);
    } else {
        const resend = getResendClient();
        await resend.emails.send({
          from: 'Billdog Social <reports@billdog.co.za>',
          to: [TARGET_EMAIL],
          subject: `[Billdog Lead] New complaint found on ${lead.platform}`,
          text: emailBody,
        });
        console.log(`[Monitor] Email sent to Jason!`);
    }
  } catch (error) {
    console.error(`[Monitor] Failed to process lead:`, error);
  }
}

export async function runSocialMonitor() {
  if (process.env.SOCIAL_MONITOR_ENABLED !== 'true') {
     console.log('[Monitor] Disabled via env.');
     return;
  }
  const newsLeads = await fetchGoogleNewsRss();
  const redditLeads = await fetchRedditRss();
  const allLeads = [...newsLeads, ...redditLeads];

  for (const lead of allLeads) {
      await processLead(lead);
      // sleep 1s to prevent rate limiting
      await new Promise(r => setTimeout(r, 1000));
  }
}
