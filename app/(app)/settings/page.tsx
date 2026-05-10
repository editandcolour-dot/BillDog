import { redirect } from 'next/navigation';

/**
 * Redirect /settings → /account for backwards compatibility.
 * The old settings page has been renamed to /account.
 */
export default function SettingsRedirect() {
  redirect('/account');
}
