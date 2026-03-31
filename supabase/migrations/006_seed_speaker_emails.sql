-- Migration: 006_seed_speaker_emails.sql
-- Description: Seeds the speaker_office_email and speaker_name for major municipalities.

UPDATE municipalities SET 
  speaker_office_email = 'Contact.Us@capetown.gov.za',
  speaker_name = 'Office of the Speaker'
WHERE name = 'City of Cape Town';

UPDATE municipalities SET 
  speaker_office_email = 'joburgconnect@joburg.org.za',
  speaker_name = 'Office of the Speaker'
WHERE name = 'City of Johannesburg';

UPDATE municipalities SET 
  speaker_office_email = 'meterrecords@tshwane.gov.za',
  speaker_name = 'Office of the Speaker'
WHERE name = 'City of Tshwane';

UPDATE municipalities SET 
  speaker_office_email = 'revline@durban.gov.za',
  speaker_name = 'Office of the Speaker'
WHERE name = 'eThekwini';

UPDATE municipalities SET 
  speaker_office_email = 'callcentre@ekurhuleni.gov.za',
  speaker_name = 'Office of the Speaker'
WHERE name = 'Ekurhuleni';

UPDATE municipalities SET 
  speaker_office_email = 'customercare@mandelametro.gov.za',
  speaker_name = 'Office of the Speaker'
WHERE name = 'Nelson Mandela Bay';

UPDATE municipalities SET 
  speaker_office_email = 'customercare@buffalocity.gov.za',
  speaker_name = 'Office of the Speaker'
WHERE name = 'Buffalo City';

UPDATE municipalities SET 
  speaker_office_email = 'enquiry@mangaung.co.za',
  speaker_name = 'Office of the Speaker'
WHERE name = 'Mangaung';
