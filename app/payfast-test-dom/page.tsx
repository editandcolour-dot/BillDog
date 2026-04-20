'use client';
import { useEffect, useState } from 'react';

export default function TestDomPage() {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const data = {
      action: 'https://sandbox.payfast.co.za/eng/process',
      fields: {
        amount: '5.00',
        cancel_url: 'https://billdog.co.za',
        email_address: 'test@example.com',
        item_name: 'Billdog',
        merchant_id: '10000100',
        merchant_key: '46f0cd694581a',
        m_payment_id: '1234',
        name_first: 'Test',
        notify_url: 'https://billdog.co.za',
        return_url: 'https://billdog.co.za',
        subscription_type: '2',
        signature: '123'
      }
    };

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = data.action;
    for (const [key, value] of Object.entries(data.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    }
    
    // Instead of appending to body, we extract outerHTML so we can render it visibly
    setHtml(form.outerHTML.replace(/></g, '>\n<'));
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'pre' }}>
      <h1>DOM Representation of Injected Form</h1>
      <div style={{ background: '#f4f4f4', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        {html}
      </div>
    </div>
  );
}
