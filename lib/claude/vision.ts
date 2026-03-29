import { getClaudeClient } from './client';

export async function extractTextFromImage(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<string> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: [
              'Extract all text from this South African municipal bill image exactly as it appears.',
              'Preserve all numbers, dates, line items, amounts, account numbers, and addresses.',
              'Maintain the structure of tables and line items.',
              'Return only the extracted text, nothing else.',
            ].join(' '),
          },
        ],
      },
    ],
  });

  if (response.content.length === 0 || response.content[0].type !== 'text') {
    throw new Error('Empty Claude Vision response');
  }

  return response.content[0].text;
}
